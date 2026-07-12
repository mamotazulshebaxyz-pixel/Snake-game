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
let obstacles = []; // বাধা রাখার জন্য

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

// প্রতিটি লেভেলের জন্য ইউনিক দেয়াল তৈরি করার মেকানিজম
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
        // লেভেল ৬ বা তার উপরে র্যান্ডম জেনারেশন
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

    // [CRITICAL FIX]: সাপের স্টার্ট পজিশন (200, 200) এবং সে যেদিকে যাবে (ডানে)
    // সেই চলার পথের আশেপাশে ৬০ পিক্সেলের ভেতর কোনো অবস্ট্যাকল ফিল্টার করে বাদ দেওয়া হবে।
    obstacles = rawObstacles.filter(obs => {
        // সাপের মাথা (200, 200) এর একদম উপরে বা সামনে যেন কোনো ব্লক না থাকে
        let distanceX = Math.abs(obs.x - 200);
        let distanceY = Math.abs(obs.y - 200);
        return !(distanceX <= 60 && distanceY <= 40);
    });
}

function resetGame(){
    snake = [{x:200,y:200}]; 
    obstacles = [];
    
    specialFood = null;
    normalFoodEatenCount = 0;
    clearTimeout(specialFoodTimer);

    direction = "RIGHT"; // সবসময় ডানে চলা শুরু করবে
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

        if (timeLeft > 0) {
            ctx.fillStyle = "#ffd700"; 
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`⏱ Bonus: ${timeLeft.toFixed(1)}s`, 200, 385); 
        }
    }

    // snake
    ctx.textAlign = "left"; 
    snake.forEach((part, index) => {
        if(index === 0){
            let headGradient = ctx.createRadialGradient(
                part.x + 10, part.y + 10, 2, 
                part.x + 10, part.y + 10, 10
            );
            headGradient.addColorStop(0, "#80ffaa");
            headGradient.addColorStop(1, "#00ff66");
            
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.arc(part.x + 10, part.y + 10, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(part.x + 6, part.y + 8, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x + 14, part.y + 8, 3.5, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = "#000000";
            ctx.beginPath(); ctx.arc(part.x + 6, part.y + 8, 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x + 14, part.y + 8, 1.8, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(part.x + 5.2, part.y + 7.2, 0.6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x + 13.2, part.y + 7.2, 0.6, 0, Math.PI * 2); ctx.fill();
        } else {
            if (index % 2 === 0) {
                ctx.fillStyle = "#00bfff"; 
            } else {
                ctx.fillStyle = "#ffffff"; 
            }
            ctx.beginPath();
            ctx.roundRect(part.x + 1, part.y + 1, 18, 18, 6);
            ctx.fill();
        }
    });

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

// ট্রানজিশন বোতামে ক্লিক হ্যান্ডেল করা
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
    
    // সাপ সবসময় স্ক্রিনের মাঝখানে (২০০, ২০০) রিসেট হবে এবং ডান দিকে মুখ করে থাকবে
    snake = [{x: 200, y: 200}]; 
    direction = "RIGHT"; 
    
    let speedFactor = Math.min((level - 1) * 15, 180);
    gameSpeed = Math.max(BASE_SPEED - speedFactor, 80);
    
    generateObstacles(level); // সঠিক লেভেল পাস করে অবস্ট্যাকল জেনারেট করা হলো
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

    // ১. সাধারণ খাবার খাওয়া
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
    // ২. স্পেশাল গোল্ডেন ফুড খাওয়া
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
        if(!menu.classList.contains("hidden") === false){ 
            pauseGame();
        }
        return;
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
