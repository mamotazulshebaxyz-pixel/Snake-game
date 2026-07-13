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

// ======= [SMOOTH MOVEMENT TUNING] =======
const SEGMENT_DIST = 16;  // বডি পার্টসগুলোর মধ্যকার পারফেক্ট গ্যাপ
let moveSpeed = 1.8;      // [FIXED] স্পিড কিছুটা কমিয়ে পারফেক্ট করা হলো

let snake = [];          
let snakePath = [];      

let food;
let direction = null;
let nextDirection = null; 
let score;
let level = 1;
let highScore = localStorage.getItem("snakeHighScore") || 0;

let specialFood = null;
let specialFoodTimer = null;
let specialFoodStartTime = 0; 
let normalFoodEatenCount = 0; 
let running = false;
let obstacles = []; 

let isSnakeMoving = false; 
let isLevelTransition = false;
let nextLevelToStart = 2;

highScoreText.innerHTML = highScore;

function createFood(){
    let valid = false;
    while(!valid){
        food = {
            x: Math.floor(Math.random() * 18 + 1) * 20,
            y: Math.floor(Math.random() * 18 + 1) * 20
        };
        valid = true;
        
        let dist = Math.hypot(snake[0].x - food.x, snake[0].y - food.y);
        if(dist < 40) valid = false;

        for(let obs of obstacles){
            if(Math.hypot(food.x - obs.x, food.y - obs.y) < 20){
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
            x: Math.floor(Math.random() * 18 + 1) * 20,
            y: Math.floor(Math.random() * 18 + 1) * 20
        };
        valid = true;
        
        let dist = Math.hypot(snake[0].x - specialFood.x, snake[0].y - specialFood.y);
        if(dist < 40) valid = false;

        if(food && Math.hypot(specialFood.x - food.x, specialFood.y - food.y) < 20) {
            valid = false;
        }
        for(let obs of obstacles){
            if(Math.hypot(specialFood.x - obs.x, specialFood.y - obs.y) < 20){
                valid = false;
                break;
            }
        }
    }
    specialFoodStartTime = 0; 
    clearTimeout(specialFoodTimer);
    specialFoodTimer = null; 
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
            let obsX = Math.floor(Math.random() * 18 + 1) * 20;
            let obsY = Math.floor(Math.random() * 18 + 1) * 20;
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
    snake = [{x: 200, y: 200}];
    // শুরুর ডিফল্ট সাইজ ছোট রাখা হলো
    for(let i = 1; i <= 3; i++) {
        snake.push({x: 200, y: 200});
    }

    // প্যাথ ক্লিয়ার করা হলো
    snakePath = []; 
    for(let i = 0; i < 300; i++) {
        snakePath.push({x: 200, y: 200});
    }

    obstacles = [];
    specialFood = null;
    normalFoodEatenCount = 0;
    clearTimeout(specialFoodTimer);
    specialFoodTimer = null;

    direction = null; 
    nextDirection = null;
    isSnakeMoving = false; 

    score = 0;
    scoreText.innerHTML = score;
    level = 1;
    updateSpeed();
    levelText.innerHTML = level;
    isLevelTransition = false;
    createFood();
}

function updateSpeed() {
    // লেভেল ভিত্তিক স্পিড কন্ট্রোল
    moveSpeed = 1.8 + (level - 1) * 0.25; 
    if (moveSpeed > 4.0) moveSpeed = 4.0; 
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

    // ======= Vector Big Goldfish =======
    let fx = food.x + 10;
    let fy = food.y + 10;
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff7675";

    ctx.fillStyle = "#ff7675";
    ctx.beginPath();
    ctx.moveTo(fx + 2, fy);
    ctx.lineTo(fx + 13, fy - 9);
    ctx.lineTo(fx + 9, fy);
    ctx.lineTo(fx + 13, fy + 9);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ff7675";
    ctx.beginPath();
    ctx.ellipse(fx - 3, fy, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fab1a0";
    ctx.beginPath();
    ctx.ellipse(fx - 3, fy + 2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(fx - 8, fy - 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath(); ctx.arc(fx - 8.5, fy - 2, 1.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.ellipse(fx - 1, fy + 3, 4, 2.5, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; 

    // ======= Vector Crystal Diamond =======
    if (specialFood) {
        let sx = specialFood.x + 10;
        let sy = specialFood.y + 10;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#00cec9";

        ctx.fillStyle = "#00aea9";
        ctx.beginPath();
        ctx.moveTo(sx, sy - 11);
        ctx.lineTo(sx + 6, sy - 11);
        ctx.lineTo(sx + 12, sy - 4);
        ctx.lineTo(sx, sy + 11);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#00cec9";
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy - 11);
        ctx.lineTo(sx, sy - 11);
        ctx.lineTo(sx, sy + 11);
        ctx.lineTo(sx - 12, sy - 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#81ecec";
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy - 11);
        ctx.lineTo(sx + 6, sy - 11);
        ctx.lineTo(sx, sy - 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx + 4, sy - 4);
        ctx.lineTo(sx, sy + 6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0; 

        let timeLeft = 5.0;
        if (specialFoodStartTime > 0) {
            let elapsedTime = Date.now() - specialFoodStartTime;
            timeLeft = Math.max(0, (5000 - elapsedTime) / 1000);
            if (timeLeft <= 0) specialFood = null;
        }

        if (specialFood && timeLeft > 0) {
            ctx.fillStyle = "#ffd700"; 
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`⏱ Bonus: ${timeLeft.toFixed(1)}s`, 200, 385); 
        }
    }

    // ======= SMOOTH RENDERING =======
    ctx.textAlign = "left"; 
    ctx.strokeStyle = "#3b82f6"; 
    ctx.lineWidth = 16;           
    ctx.lineCap = "round";        
    ctx.lineJoin = "round";       

    // বডি পার্টসগুলোর জয়েন্ট লাইন ড্র
    ctx.beginPath();
    ctx.moveTo(snake[0].x + 10, snake[0].y + 10);
    for (let i = 1; i < snake.length; i++) {
        ctx.lineTo(snake[i].x + 10, snake[i].y + 10);
    }
    ctx.stroke();

    let head = snake[0];
    let centerX = head.x + 10;
    let centerY = head.y + 10;

    let isNearNormalFood = Math.abs(head.x - food.x) <= 35 && Math.abs(head.y - food.y) <= 35;
    let isNearSpecialFood = specialFood && Math.abs(head.x - specialFood.x) <= 35 && Math.abs(head.y - specialFood.y) <= 35;
    let isEatingTime = (isNearNormalFood || isNearSpecialFood) && isSnakeMoving;

    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 9.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, centerY);
    
    if (direction === "UP") ctx.rotate(-Math.PI / 2);
    else if (direction === "DOWN") ctx.rotate(Math.PI / 2);
    else if (direction === "LEFT") ctx.rotate(Math.PI);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -5, 4, 0, Math.PI * 2); 
    ctx.arc(0, 5, 4, 0, Math.PI * 2);  
    ctx.fill();

    ctx.fillStyle = "#1d4ed8"; 
    ctx.beginPath();
    ctx.arc(1, -5, 1.8, 0, Math.PI * 2);
    ctx.arc(1, 5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    if (isEatingTime) {
        ctx.fillStyle = "#1e3a8a"; 
        ctx.beginPath();
        ctx.arc(3, 0, 7, -Math.PI/2, Math.PI/2, false);
        ctx.fill();
    } else {
        ctx.strokeStyle = "#1e3a8a";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(2, 0, 3.5, -Math.PI/3, Math.PI/3, false);
        ctx.stroke();
    }
    ctx.restore(); 

    // UI Overlay
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
    for(let i = 1; i <= 3; i++) { 
        snake.push({x: 200, y: 200});
    }
    
    snakePath = [];
    for(let i = 0; i < 300; i++) {
        snakePath.push({x: 200, y: 200});
    }
    
    direction = null; 
    nextDirection = null;
    isSnakeMoving = false; 
    
    updateSpeed();
    generateObstacles(level); 
    createFood(); 
    isLevelTransition = false;
}

function triggerLevelTransition(targetLevel) {
    isLevelTransition = true;
    nextLevelToStart = targetLevel;
    clearTimeout(specialFoodTimer);
    specialFoodTimer = null;
    generateObstacles(targetLevel); 
}

// ======= MOVEMENT ENGINE =======
function move(){
    if (isLevelTransition || !isSnakeMoving) return; 

    if (nextDirection) {
        direction = nextDirection;
        nextDirection = null;
    }

    let head = {...snake[0]};
    let oldHead = {...head}; // টেলিপোর্ট চেক করার জন্য পুরনো পজিশন সেভ

    if(direction == "RIGHT") head.x += moveSpeed;
    if(direction == "LEFT") head.x -= moveSpeed;
    if(direction == "UP") head.y -= moveSpeed;
    if(direction == "DOWN") head.y += moveSpeed;

    // ======= [FIXED SCREEN CROSSING & PATH TELEPORT] =======
    let teleported = false;
    let offsetX = 0;
    let offsetY = 0;

    if(head.x < -10) { head.x = 390; offsetX = 400; teleported = true; }
    if(head.x > 390) { head.x = -10; offsetX = -400; teleported = true; }
    if(head.y < -10) { head.y = 390; offsetY = 400; teleported = true; }
    if(head.y > 390) { head.y = -10; offsetY = -400; teleported = true; }

    // অবস্ট্যাকল কলিশন চেক
    for(let obs of obstacles){
        if(Math.abs(head.x - obs.x) < 15 && Math.abs(head.y - obs.y) < 15){
            gameOver();
            return;
        }
    }

    // সেলফ কলিশন চেক (স্পন সেফটি শিল্ড সহ)
    let stepGap = Math.round(SEGMENT_DIST / moveSpeed);
    let hasMovedFromSpawn = Math.hypot(head.x - 200, head.y - 200) > 30;

    for(let i = 3; i < snake.length; i++){
        if(!hasMovedFromSpawn && Math.hypot(snake[i].x - 200, snake[i].y - 200) < 2) {
            continue; 
        }
        if(Math.hypot(head.x - snake[i].x, head.y - snake[i].y) < 7){
            gameOver();
            return;
        }
    }

    snake[0] = head;
    
    // [FIXED] যদি সাপ দেয়াল পার হয়, তবে পেছনের প্যাথ হিস্ট্রিকেও অফসেট শিফট করে দেওয়া হবে যেন লম্বা লাইন না টানে
    if (teleported) {
        for (let i = 0; i < snakePath.length; i++) {
            snakePath[i].x += offsetX;
            snakePath[i].y += offsetY;
        }
    }
    
    snakePath.unshift({...head});

    for (let i = 1; i < snake.length; i++) {
        let targetIndex = i * stepGap;
        if (targetIndex < snakePath.length) {
            snake[i] = snakePath[targetIndex];
        } else {
            snake[i] = snakePath[snakePath.length - 1];
        }
    }

    if (snakePath.length > snake.length * stepGap + 30) {
        snakePath.pop();
    }

    // গোল্ডফিশ খাওয়া (১টি করে বডি পার্ট বাড়বে)
    let distToFood = Math.hypot(head.x - food.x, head.y - food.y);
    if(distToFood < 18){
        score++;
        normalFoodEatenCount++; 
        scoreText.innerHTML = score;

        // [FIXED] গ্রোথ রেট কমানো হলো, নিখুঁত ১ স্টেপ বাড়বে
        for(let k=0; k < stepGap; k++) {
            snake.push({...snake[snake.length-1]});
        }

        if(normalFoodEatenCount % 5 === 0){
            createSpecialFood();
        }

        let targetLevel = Math.floor((score - 1) / 20) + 1;
        if(score === 0) targetLevel = 1; 

        if(targetLevel > level){
            triggerLevelTransition(targetLevel);
        } else {
            updateSpeed();
        }

        if(score > highScore){
            highScore = score;
            localStorage.setItem("snakeHighScore", highScore);
            highScoreText.innerHTML = highScore;
        }
        if (!isLevelTransition) createFood();
    } 
    
    // স্পেশাল ডায়মন্ড খাওয়া
    if(specialFood){
        let distToSpecial = Math.hypot(head.x - specialFood.x, head.y - specialFood.y);
        if(distToSpecial < 18){
            score += 3; 
            scoreText.innerHTML = score;
            
            for(let k=0; k < stepGap * 2; k++) {
                snake.push({...snake[snake.length-1]});
            }
            
            clearTimeout(specialFoodTimer); 
            specialFood = null; 

            let targetLevel = Math.floor((score - 1) / 20) + 1;
            if(targetLevel > level){
                triggerLevelTransition(targetLevel);
            } else {
                updateSpeed();
            }

            if(score > highScore){
                highScore = score;
                localStorage.setItem("snakeHighScore", highScore);
                highScoreText.innerHTML = highScore;
            }
        }
    }
}

function gameLoopTicker(){
    if(running) {
        move();
        draw();
    }
    requestAnimationFrame(gameLoopTicker);
}

function startGame(){
    resetGame();
    menu.classList.add("hidden");
    if(gameOverModal) gameOverModal.style.display = "none"; 
    if(pauseBtn) {
        pauseBtn.style.display = "block";
        pauseBtn.innerHTML = "⏸ Pause";
    }
    running = true;
}

function pauseGame(){
    if (isLevelTransition || !isSnakeMoving) return; 
    if(running){
        running = false;
        pauseBtn.innerHTML = "▶ Resume";
    }else{
        running = true;
        pauseBtn.innerHTML = "⏸ Pause";
    }
}

function restartGame(){
    resetGame();
    draw();
    const menuTitle = menu.querySelector("h1") || menu.querySelector("h2") || menu.querySelector(".title");
    if(menuTitle) menuTitle.innerHTML = `🐍 SKY SNAKE`;
    if(playBtn) playBtn.innerHTML = "▶ Play";
    if(menuRestartBtn) menuRestartBtn.style.display = "block";
    if(cancelBtn) cancelBtn.style.display = "none";
    if(pauseBtn) pauseBtn.style.display = "none";
    menu.classList.remove("hidden");
    running = false;
}

function gameOver(){
    running = false;
    isSnakeMoving = false;
    clearTimeout(specialFoodTimer); 
    specialFoodTimer = null;
    menu.classList.remove("hidden");

    const menuTitle = menu.querySelector("h1") || menu.querySelector("h2") || menu.querySelector(".title");
    if(menuTitle) {
        menuTitle.innerHTML = `🐍 Game Over!<br><span style="font-size: 20px; color: #fff;">Your Score: ${score}</span>`;
    }
    if(playBtn) playBtn.innerHTML = "▶ Play Again";
    if(menuRestartBtn) menuRestartBtn.style.display = "none";
    if(cancelBtn) cancelBtn.style.display = "block";
    if(pauseBtn) pauseBtn.style.display = "none";
}

// ======= Controls =======
document.addEventListener("keydown", function(e){
    if (isLevelTransition) {
        if(e.key === "Enter") startNextLevel();
        return;
    }

    if(e.key === " " || e.key === "Spacebar"){
        e.preventDefault(); 
        if(menu.classList.contains("hidden") && isSnakeMoving) pauseGame();
        return;
    }

    if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)){
        if (!isSnakeMoving) {
            isSnakeMoving = true;
            if (specialFood && specialFoodStartTime === 0) {
                specialFoodStartTime = Date.now();
            }
        }
    }

    if(e.key=="ArrowUp" && direction!="DOWN") nextDirection="UP";
    if(e.key=="ArrowDown" && direction!="UP") nextDirection="DOWN";
    if(e.key=="ArrowLeft" && direction!="RIGHT") nextDirection="LEFT";
    if(e.key=="ArrowRight" && direction!="LEFT") nextDirection="RIGHT";
});

// Mobile Controls
let touchStartX = 0; let touchStartY = 0;
canvas.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener("touchend", e => {
    if (isLevelTransition) return; 
    let dx = e.changedTouches[0].clientX - touchStartX;
    let dy = e.changedTouches[0].clientY - touchStartY;
    if(Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    if (!isSnakeMoving) {
        isSnakeMoving = true;
        if (specialFood && specialFoodStartTime === 0) specialFoodStartTime = Date.now();
    }

    if(Math.abs(dx) > Math.abs(dy)){
        if(dx > 0 && direction != "LEFT") nextDirection = "RIGHT";
        if(dx < 0 && direction != "RIGHT") nextDirection = "LEFT";
    }else{
        if(dy > 0 && direction != "UP") nextDirection = "DOWN";
        if(dy < 0 && direction != "DOWN") nextDirection = "UP";
    }
}, { passive: true });

playBtn.onclick = startGame;
pauseBtn.onclick = pauseGame;
menuRestartBtn.onclick = restartGame;
if(cancelBtn) cancelBtn.onclick = restartGame;
if(modalRestartBtn) modalRestartBtn.onclick = () => { gameOverModal.style.display = "none"; startGame(); };

if(pauseBtn) pauseBtn.style.display = "none";

resetGame();

if(!window.loopStarted) {
    requestAnimationFrame(gameLoopTicker);
    window.loopStarted = true;
}
