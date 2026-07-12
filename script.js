const menu = document.getElementById("menu");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const highScoreText = document.getElementById("highScore");
const levelText = document.getElementById("level");

const playBtn = document.getElementById("playBtn");
const cancelBtn = document.getElementById("cancelBtn");
const pauseBtn = document.getElementById("pauseBtn");
const menuRestartBtn = document.getElementById("restart");

const gameOverModal = document.getElementById("gameOverModal");
const finalScoreText = document.getElementById("finalScore");
const modalRestartBtn = document.getElementById("restartBtn");

// বেস স্পিড ভ্যারিয়েবল
const BASE_SPEED = 300; 
let gameSpeed = BASE_SPEED;

let snake;
let food;
let direction;
let score;
let level = 1;
let highScore = localStorage.getItem("snakeHighScore") || 0;

let gameLoop;
let specialFood = null;
let specialFoodTimer = null;
let specialFoodStartTime = 0; 
let normalFoodEatenCount = 0; 
let running = false;
let obstacles = []; 

// [NEW STATE] সাপ বর্তমানে মুভ করছে কিনা তা ট্র্যাক করার জন্য
let isSnakeMoving = false; 

// লেভেল ট্রানজিশন (ইন্টারমিশন স্ক্রিন) এর জন্য ভ্যারিয়েবল
let isLevelTransition = false;
let nextLevelToStart = 2;

highScoreText.innerHTML = highScore;

function createFood(){
    let valid = false;
    while(!valid){
        food = {
            x: Math.floor(Math.random()*20)*20,
            y: Math.floor(Math.random()*20)*20
        };
        valid = true;
        for(let part of snake){
            if(part.x === food.x && part.y === food.y){
                valid = false;
                break;
            }
        }
        for(let obs of obstacles){
            if(food.x === obs.x && food.y === obs.y){
                valid = false;
                break;
            }
        }
    }
}

function createSpecialFood() {
    let valid = false;
    while(!valid){
        specialFood = {
            x: Math.floor(Math.random()*20)*20,
            y: Math.floor(Math.random()*20)*20
        };
        valid = true;
        
        for(let part of snake){
            if(part.x === specialFood.x && part.y === specialFood.y){
                valid = false;
                break;
            }
        }
        if(food && specialFood.x === food.x && specialFood.y === food.y) {
            valid = false;
        }
        for(let obs of obstacles){
            if(specialFood.x === obs.x && specialFood.y === obs.y){
                valid = false;
                break;
            }
        }
    }

    specialFoodStartTime = Date.now(); 

    clearTimeout(specialFoodTimer);
    specialFoodTimer = setTimeout(() => {
        specialFood = null;
    }, 5000);
}

// সাপের মাথার চারপাশে (৬০ পিক্সেল রেডিয়াসে) অবস্ট্যাকল ক্লিয়ার করার লজিক
function generateObstacles(targetLevel) {
    let rawObstacles = [];
    let lvl = targetLevel || level;
    
    if (lvl === 1) {
        rawObstacles = [];
    } else if (lvl === 2) {
        rawObstacles = [
            {x: 100, y: 200}, {x: 120, y: 200}, {x: 140, y: 200},
            {x: 240, y: 200}, {x: 260, y: 200}, {x: 280, y: 200}
        ];
    } else if (lvl === 3) {
        rawObstacles = [
            {x: 60, y: 60}, {x: 80, y: 60}, {x: 60, y: 80},
            {x: 320, y: 60}, {x: 300, y: 60}, {x: 320, y: 80},
            {x: 60, y: 320}, {x: 80, y: 320}, {x: 60, y: 300},
            {x: 320, y: 320}, {x: 300, y: 320}, {x: 320, y: 300}
        ];
    } else if (lvl === 4) {
        rawObstacles = [
            {x: 200, y: 100}, {x: 200, y: 120}, {x: 200, y: 140},
            {x: 200, y: 240}, {x: 200, y: 260}, {x: 200, y: 280},
            {x: 100, y: 200}, {x: 120, y: 200}, {x: 140, y: 200},
            {x: 240, y: 200}, {x: 260, y: 200}, {x: 280, y: 200}
        ];
    } else if (lvl === 5) {
        rawObstacles = [
            {x: 100, y: 100}, {x: 120, y: 100}, {x: 100, y: 120}, {x: 120, y: 120},
            {x: 260, y: 100}, {x: 280, y: 100}, {x: 260, y: 120}, {x: 280, y: 120},
            {x: 100, y: 260}, {x: 100, y: 280}, {x: 120, y: 260}, {x: 120, y: 280},
            {x: 260, y: 260}, {x: 260, y: 280}, {x: 280, y: 260}, {x: 280, y: 280}
        ];
    } else {
        let obstacleCount = Math.min(12 + (lvl - 5) * 2, 32); 
        while (rawObstacles.length < obstacleCount) {
            let obsX = Math.floor(Math.random() * 20) * 20;
            let obsY = Math.floor(Math.random() * 20) * 20;
            let exists = rawObstacles.some(obs => obs.x === obsX && obs.y === obsY);
            if (!exists) {
                rawObstacles.push({x: obsX, y: obsY});
            }
        }
    }

    // যেহেতু সাপ যেকোনো দিকে যেতে পারে, তাই (২০০, ২০০)-এর চারপাশের ৬০ পিক্সেলের ভেতর সব অবস্ট্যাকল পুরো পরিষ্কার রাখা হবে
    obstacles = rawObstacles.filter(obs => {
        let distanceX = Math.abs(obs.x - 200);
        let distanceY = Math.abs(obs.y - 200);
        return !(distanceX <= 60 && distanceY <= 60);
    });
}

function resetGame(){
    snake = [{x:200,y:200}]; 
    obstacles = [];
    
    specialFood = null;
    normalFoodEatenCount = 0;
    clearTimeout(specialFoodTimer);

    direction = null; // শুরুতে কোনো ডিরেকশন থাকবে না
    isSnakeMoving = false; // সাপ স্থির থাকবে

    score = 0;
    scoreText.innerHTML = score;
    level = 1;
    gameSpeed = BASE_SPEED;
    levelText.innerHTML = level;
    isLevelTransition = false;
    createFood();
}

function draw(){
    ctx.fillStyle = "#111";
    ctx.fillRect(0,0,400,400);

    // ======= লেভেলের বাধা (Obstacles) =======
    ctx.fillStyle = "#e74c3c"; 
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#e74c3c";
    obstacles.forEach(obs => {
        ctx.beginPath();
        ctx.roundRect(obs.x + 1, obs.y + 1, 18, 18, 4);
        ctx.fill();
    });
    ctx.shadowBlur = 0; 

    // ======= চিবি ব্যাঙ (Frog) =======
    ctx.fillStyle = "#2ecc71"; 
    ctx.beginPath();
    ctx.arc(food.x + 10, food.y + 11, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2ecc71";
    ctx.beginPath(); ctx.arc(food.x + 5, food.y + 5, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(food.x + 15, food.y + 5, 3.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(food.x + 5, food.y + 5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(food.x + 15, food.y + 5, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#111111";
    ctx.beginPath(); ctx.arc(food.x + 6, food.y + 5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(food.x + 14, food.y + 5, 1.2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#ff7675"; 
    ctx.beginPath(); ctx.arc(food.x + 4, food.y + 12, 1.5, 0, Math.PI * 2); ctx.fill(); 
    ctx.beginPath(); ctx.arc(food.x + 16, food.y + 12, 1.5, 0, Math.PI * 2); ctx.fill(); 

    ctx.fillStyle = "#27ae60"; 
    ctx.beginPath(); ctx.arc(food.x + 6, food.y + 18, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(food.x + 14, food.y + 18, 1.8, 0, Math.PI * 2); ctx.fill();

    // special food
    if (specialFood) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ffd700";
        ctx.fillStyle = "#ffd700"; 
        ctx.beginPath();
        ctx.arc(specialFood.x + 10, specialFood.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(specialFood.x + 7, specialFood.y + 7, 2, 0, Math.PI * 2);
        ctx.fill();

        let elapsedTime = Date.now() - specialFoodStartTime;
        let timeLeft = Math.max(0, (5000 - elapsedTime) / 1000); 

        if (timeLeft > 0 && isSnakeMoving) {
            ctx.fillStyle = "#ffd700"; 
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`⏱ Bonus: ${timeLeft.toFixed(1)}s`, 200, 385); 
        }
    }

    // ======= কিউট কার্টুন সাপ ড্রয়িং =======
    ctx.textAlign = "left"; 
    
    for (let i = snake.length - 1; i >= 0; i--) {
        let part = snake[i];
        let centerX = part.x + 10;
        let centerY = part.y + 10;

        if (i === 0) {
            // --- সাপের মাথা ---
            ctx.fillStyle = "#ff3838";
            ctx.beginPath();
            ctx.arc(centerX + 2, centerY + 11, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(centerX - 1, centerY + 8, 5, 6);

            let headGrad = ctx.createRadialGradient(centerX - 3, centerY - 3, 2, centerX, centerY, 12);
            headGrad.addColorStop(0, "#a2ff00"); 
            headGrad.addColorStop(0.5, "#4cd137"); 
            headGrad.addColorStop(1, "#44bd32"); 
            
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 12, 0, Math.PI * 2); 
            ctx.fill();

            // কার্টুন চোখ
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(centerX - 5, centerY - 2, 5, 0, Math.PI * 2);
            ctx.arc(centerX + 3, centerY - 2, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(centerX - 4, centerY - 2, 3, 0, Math.PI * 2);
            ctx.arc(centerX + 4, centerY - 2, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(centerX - 5, centerY - 3, 1.2, 0, Math.PI * 2);
            ctx.arc(centerX + 3, centerY - 3, 1.2, 0, Math.PI * 2);
            ctx.fill();

            // স্মাইল
            ctx.strokeStyle = "#2f3640";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY + 4, 4, 0, Math.PI);
            ctx.stroke();

        } else {
            // --- বডি বাবলস ---
            let bodyGrad = ctx.createRadialGradient(centerX - 3, centerY - 3, 1, centerX, centerY, 10);
            bodyGrad.addColorStop(0, "#adff2f"); 
            bodyGrad.addColorStop(0.6, "#4cd137"); 
            bodyGrad.addColorStop(1, "#3b9c24"); 
            
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 10, 0, Math.PI * 2); 
            ctx.fill();
            
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }

    // [NEW GUIDE TEXT] সাপ স্থির থাকলে স্ক্রিনে ডিরেকশন দেওয়ার মেসেজ দেখাবে
    if (running && !isSnakeMoving && !isLevelTransition) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, 400, 400);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎮 Press any Arrow Key to Start Move", 200, 190);
    }

    // ======= লেভেল আপ ট্রানজিশন স্ক্রিন ওভারলে =======
    if (isLevelTransition) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; 
        ctx.fillRect(0, 0, 400, 400);

        ctx.fillStyle = "#00bfff";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`LEVEL ${nextLevelToStart}`, 200, 160);

        ctx.fillStyle = "#fff";
        ctx.font = "16px sans-serif";
        ctx.fillText(nextLevelToStart > 5 ? "⚠️ Random Obstacles Active!" : "Get ready for new challenges!", 200, 200);

        ctx.fillStyle = "#2ecc71";
        ctx.beginPath();
        ctx.roundRect(120, 240, 160, 45, 10);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("Click to Start", 200, 268);
    }
}

canvas.addEventListener("click", function(e) {
    if (isLevelTransition) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x >= 120 && x <= 280 && y >= 240 && y <= 285) {
            startNextLevel();
        }
    }
});

function startNextLevel() {
    level = nextLevelToStart;
    levelText.innerHTML = level;
    
    // রিসেট পজিশন ও মুভমেন্ট স্টেট স্থগিতকরণ
    snake = [{x: 200, y: 200}]; 
    direction = null; 
    isSnakeMoving = false; // কিউ না চাপা পর্যন্ত সাপ চলবে না
    
    let speedFactor = Math.min((level - 1) * 15, 180);
    gameSpeed = Math.max(BASE_SPEED - speedFactor, 80);
    
    generateObstacles(level); 
    createFood(); 
    isLevelTransition = false;
    
    clearInterval(gameLoop);
    gameLoop = setInterval(game, gameSpeed);
}

function triggerLevelTransition(targetLevel) {
    isLevelTransition = true;
    nextLevelToStart = targetLevel;
    clearInterval(gameLoop); 
    
    generateObstacles(targetLevel); 
    draw(); 
}

function move(){
    if (isLevelTransition) return; 
    if (!isSnakeMoving) return; // [CRITICAL] সাপ স্থির থাকলে মুভমেন্ট প্রসেস হবে না

    let head = {...snake[0]};

    if(direction=="RIGHT") head.x+=20;
    if(direction=="LEFT") head.x-=20;
    if(direction=="UP") head.y-=20;
    if(direction=="DOWN") head.y+=20;

    if(head.x < 0) head.x = 380;
    if(head.x >= 400) head.x = 0;
    if(head.y < 0) head.y = 380;
    if(head.y >= 400) head.y = 0;

    // Obstacle collision
    for(let obs of obstacles){
        if(head.x === obs.x && head.y === obs.y){
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    // Body collision
    for(let i = 1; i < snake.length; i++){
        if(head.x === snake[i].x && head.y === snake[i].y){
            gameOver();
            return;
        }
    }

    // ১. খাবার খাওয়া
    if(head.x == food.x && head.y == food.y){
        score++;
        normalFoodEatenCount++; 
        scoreText.innerHTML = score;

        if(normalFoodEatenCount % 5 === 0){
            createSpecialFood();
        }

        let targetLevel = Math.floor((score - 1) / 20) + 1;
        if(score === 0) targetLevel = 1; 

        if(targetLevel > level){
            triggerLevelTransition(targetLevel);
        } else {
            let scoreInCurrentLevel = (score - 1) % 20; 
            let currentLevelBaseSpeed = Math.max(BASE_SPEED - Math.min((level - 1) * 15, 180), 80);
            gameSpeed = Math.max(currentLevelBaseSpeed - (scoreInCurrentLevel * 7), 60); 
            
            clearInterval(gameLoop);
            gameLoop = setInterval(game, gameSpeed);
        }

        if(score > highScore){
            highScore = score;
            localStorage.setItem("snakeHighScore", highScore);
            highScoreText.innerHTML = highScore;
        }
        if (!isLevelTransition) createFood();
    } 
    // ২. স্পেশাল গোল্ডেন ফুড
    else if(specialFood && head.x == specialFood.x && head.y == specialFood.y){
        score += 3; 
        scoreText.innerHTML = score;
        
        clearTimeout(specialFoodTimer); 
        specialFood = null; 

        let targetLevel = Math.floor((score - 1) / 20) + 1;
        if(targetLevel > level){
            triggerLevelTransition(targetLevel);
        } else {
            let scoreInCurrentLevel = (score - 1) % 20;
            let currentLevelBaseSpeed = Math.max(BASE_SPEED - Math.min((level - 1) * 15, 180), 80);
            gameSpeed = Math.max(currentLevelBaseSpeed - (scoreInCurrentLevel * 7), 60);
            clearInterval(gameLoop);
            gameLoop = setInterval(game, gameSpeed);
        }

        if(score > highScore){
            highScore = score;
            localStorage.setItem("snakeHighScore", highScore);
            highScoreText.innerHTML = highScore;
        }
    } 
    else {
        snake.pop();
    }
}

function game(){
    move();
    draw();
}

function startGame(){
    clearInterval(gameLoop);
    resetGame();
    menu.classList.add("hidden");
    if(gameOverModal) gameOverModal.style.display = "none"; 
    
    if(pauseBtn) {
        pauseBtn.style.display = "block";
        pauseBtn.innerHTML = "⏸ Pause";
    }
    
    running = true;
    gameLoop = setInterval(game, gameSpeed);
}

function pauseGame(){
    if (isLevelTransition) return; 
    if (!isSnakeMoving) return; // সাপ মুভ না করা পর্যন্ত পজ কাজ করবে না
    
    if(running){
        clearInterval(gameLoop);
        gameLoop = null;
        running = false;
        pauseBtn.innerHTML = "▶ Resume";
    }else{
        gameLoop = setInterval(game, gameSpeed);
        running = true;
        pauseBtn.innerHTML = "⏸ Pause";
    }
}

function restartGame(){
    clearInterval(gameLoop);
    resetGame();
    draw();
    
    const menuTitle = menu.querySelector("h1") || menu.querySelector("h2") || menu.querySelector(".title");
    if(menuTitle) {
        menuTitle.innerHTML = `🐍 SKY SNAKE`;
    }
    if(playBtn) {
        playBtn.innerHTML = "▶ Play";
    }
    if(menuRestartBtn) {
        menuRestartBtn.style.display = "block";
    }
    if(cancelBtn) {
        cancelBtn.style.display = "none";
    }
    if(pauseBtn) {
        pauseBtn.style.display = "none";
    }

    menu.classList.remove("hidden");
    running = false;
}

function gameOver(){
    clearInterval(gameLoop);
    running = false;
    isSnakeMoving = false;
    clearTimeout(specialFoodTimer); 

    menu.classList.remove("hidden");

    const menuTitle = menu.querySelector("h1") || menu.querySelector("h2") || menu.querySelector(".title");
    if(menuTitle) {
        menuTitle.innerHTML = `🐍 Game Over!<br><span style="font-size: 20px; color: #fff;">Your Score: ${score}</span>`;
    }

    if(playBtn) {
        playBtn.innerHTML = "▶ Play Again";
    }
    if(menuRestartBtn) {
        menuRestartBtn.style.display = "none";
    }
    if(cancelBtn) {
        cancelBtn.style.display = "block";
    }
    if(pauseBtn) {
        pauseBtn.style.display = "none";
    }
}

// ===== Swipe Control =====
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", function(e){
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener("touchend", function(e){
    if (isLevelTransition) return; 
    
    let touchEndX = e.changedTouches[0].clientX;
    let touchEndY = e.changedTouches[0].clientY;

    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;

    if(Math.abs(dx) < 30 && Math.abs(dy) < 30){
        return;
    }

    // প্রথম মুভমেন্ট এক্টিভেট করার হ্যান্ডলার
    if (!isSnakeMoving) {
        isSnakeMoving = true;
    }

    if(Math.abs(dx) > Math.abs(dy)){
        if(dx > 0 && direction != "LEFT") direction = "RIGHT";
        if(dx < 0 && direction != "RIGHT") direction = "LEFT";
    }else{
        if(dy > 0 && direction != "UP") direction = "DOWN";
        if(dy < 0 && direction != "DOWN") direction = "UP";
    }
}, { passive: true });

document.addEventListener("keydown", function(e){
    if (isLevelTransition) {
        if(e.key === "Enter") {
            startNextLevel();
        }
        return;
    }

    if(e.key === " " || e.key === "Spacebar"){
        e.preventDefault(); 
        if(!menu.classList.contains("hidden") && isSnakeMoving){ 
            pauseGame();
        }
        return;
    }

    // [ARROW KEY CHECK]: যেকোনো Arrow Key চাপলে সাপ প্রথম মুভ করা শুরু করবে
    if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)){
        if (!isSnakeMoving) {
            isSnakeMoving = true;
            // প্রথম মুভমেন্টে স্পেশাল টাইমারের স্টার্ট টাইম সেট করা হলো
            if(specialFood) specialFoodStartTime = Date.now();
        }
    }

    if(e.key=="ArrowUp" && direction!="DOWN") direction="UP";
    if(e.key=="ArrowDown" && direction!="UP") direction="DOWN";
    if(e.key=="ArrowLeft" && direction!="RIGHT") direction="LEFT";
    if(e.key=="ArrowRight" && direction!="LEFT") direction="RIGHT";
});

playBtn.onclick = startGame;
pauseBtn.onclick = pauseGame;
menuRestartBtn.onclick = restartGame;

if(cancelBtn) {
    cancelBtn.onclick = function() {
        restartGame(); 
    };
}

if(modalRestartBtn) {
    modalRestartBtn.onclick = function() {
        if(gameOverModal) gameOverModal.style.display = "none";
        startGame(); 
    };
}

if(pauseBtn) {
    pauseBtn.style.display = "none";
}

resetGame();
draw();
