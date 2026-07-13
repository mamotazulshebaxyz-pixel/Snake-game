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

let isSnakeMoving = false; 
let isLevelTransition = false;
let nextLevelToStart = 2;

// ======= [NEW] হাই-কোয়ালিটি গেম স্প্রাইট ইমেজেস =======
const fishImage = new Image();
fishImage.src = "https://cdn-icons-png.flaticon.com/512/2911/2911132.png"; // কিউট বড় গোল্ডফিশ

const diamondImage = new Image();
diamondImage.src = "https://cdn-icons-png.flaticon.com/512/3067/3067439.png"; // চকচকে বড় লাক্সারি ডায়মন্ড

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

    direction = null; 
    isSnakeMoving = false; 

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

    // ======= Obstacles =======
    ctx.fillStyle = "#e74c3c"; 
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#e74c3c";
    obstacles.forEach(obs => {
        ctx.beginPath();
        ctx.roundRect(obs.x + 1, obs.y + 1, 18, 18, 4);
        ctx.fill();
    });
    ctx.shadowBlur = 0; 

    // ======= [FIXED] HD Goldfish Food (সাইজ বড় এবং স্পষ্ট) =======
    // গ্রিড থেকে ২ পিক্সেল বাড়িয়ে ২৪x২৪ সাইজে ড্র করা হয়েছে যাতে একদম ক্লিয়ার দেখা যায়
    ctx.drawImage(fishImage, food.x - 2, food.y - 2, 24, 24);

    // ======= [FIXED] HD Diamond Special Food =======
    if (specialFood) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00cec9"; // ডায়মন্ডের চারপাশে চমৎকার গ্লো ইফেক্ট

        // একটু বড় সাইজে (২৬x২৬ পিক্সেল) ডায়মন্ড রেন্ডার
        ctx.drawImage(diamondImage, specialFood.x - 3, specialFood.y - 3, 26, 26);
        ctx.shadowBlur = 0; 

        // বোনাস টাইমার
        let elapsedTime = Date.now() - specialFoodStartTime;
        let timeLeft = Math.max(0, (5000 - elapsedTime) / 1000); 

        if (timeLeft > 0 && isSnakeMoving) {
            ctx.fillStyle = "#ffd700"; 
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`⏱ Bonus: ${timeLeft.toFixed(1)}s`, 200, 385); 
        }
    }

    // ======= [GOOGLE STYLE SMOOTH BLUE SNAKE] =======
    ctx.textAlign = "left"; 
    
    ctx.strokeStyle = "#3b82f6"; 
    ctx.lineWidth = 18;           
    ctx.lineCap = "round";        
    ctx.lineJoin = "round";       

    for (let i = 1; i < snake.length; i++) {
        let prev = snake[i - 1];
        let curr = snake[i];

        if (Math.abs(prev.x - curr.x) > 20 || Math.abs(prev.y - curr.y) > 20) {
            continue; 
        }

        ctx.beginPath();
        ctx.moveTo(prev.x + 10, prev.y + 10);
        ctx.lineTo(curr.x + 10, curr.y + 10);
        ctx.stroke();
    }

    // সাপের মাথার স্পেশাল অ্যানিমেশন
    let head = snake[0];
    let centerX = head.x + 10;
    let centerY = head.y + 10;

    let isNearNormalFood = Math.abs(head.x - food.x) <= 40 && Math.abs(head.y - food.y) <= 40;
    let isNearSpecialFood = specialFood && Math.abs(head.x - specialFood.x) <= 40 && Math.abs(head.y - specialFood.y) <= 40;
    let isEatingTime = (isNearNormalFood || isNearSpecialFood) && isSnakeMoving;

    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, centerY);
    
    if (direction === "UP") ctx.rotate(-Math.PI / 2);
    else if (direction === "DOWN") ctx.rotate(Math.PI / 2);
    else if (direction === "LEFT") ctx.rotate(Math.PI);

    // চোখ
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -6, 4.5, 0, Math.PI * 2); 
    ctx.arc(0, 6, 4.5, 0, Math.PI * 2);  
    ctx.fill();

    ctx.fillStyle = "#1d4ed8"; 
    ctx.beginPath();
    ctx.arc(1, -6, 2, 0, Math.PI * 2);
    ctx.arc(1, 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // মুখ হাঁ করা ও দাঁত
    if (isEatingTime) {
        ctx.fillStyle = "#1e3a8a"; 
        ctx.beginPath();
        ctx.arc(4, 0, 8, -Math.PI/2, Math.PI/2, false);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(7, -4); ctx.lineTo(9, -3); ctx.lineTo(6, -2); 
        ctx.moveTo(7, 4); ctx.lineTo(9, 3); ctx.lineTo(6, 2);   
        ctx.fill();
    } else {
        ctx.strokeStyle = "#1e3a8a";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(2, 0, 4, -Math.PI/3, Math.PI/3, false);
        ctx.stroke();
    }

    ctx.restore(); 

    // ======= UI ও মেসেজ =======
    if (running && !isSnakeMoving && !isLevelTransition) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, 400, 400);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎮 Press any Arrow Key to Start Move", 200, 190);
    }

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
    
    snake = [{x: 200, y: 200}]; 
    direction = null; 
    isSnakeMoving = false; 
    
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
    if (!isSnakeMoving) return; 

    let head = {...snake[0]};

    if(direction=="RIGHT") head.x+=20;
    if(direction=="LEFT") head.x-=20;
    if(direction=="UP") head.y-=20;
    if(direction=="DOWN") head.y+=20;

    if(head.x < 0) head.x = 380;
    if(head.x >= 400) head.x = 0;
    if(head.y < 0) head.y = 380;
    if(head.y >= 400) head.y = 0;

    for(let obs of obstacles){
        if(head.x === obs.x && head.y === obs.y){
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    for(let i = 1; i < snake.length; i++){
        if(head.x === snake[i].x && head.y === snake[i].y){
            gameOver();
            return;
        }
    }

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
    if (!isSnakeMoving) return; 
    
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
        if(menu.classList.contains("hidden") && isSnakeMoving){ 
            pauseGame();
        }
        return;
    }

    if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)){
        if (!isSnakeMoving) {
            isSnakeMoving = true;
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
