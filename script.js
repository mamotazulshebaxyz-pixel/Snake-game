const menu = document.getElementById("menu");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const highScoreText = document.getElementById("highScore");
const levelText = document.getElementById("level");

const playBtn = document.getElementById("playBtn");
const cancelBtn = document.getElementById("cancelBtn");
const pauseBtn = document.getElementById("pauseBtn");
const menuRestartBtn = document.getElementById("restart"); // নাম একটু পরিবর্তন করা হলো সংঘাত এড়াতে

// নতুন কাস্টম মোডাল এলিমেন্টসমূহ
const gameOverModal = document.getElementById("gameOverModal");
const finalScoreText = document.getElementById("finalScore");
const modalRestartBtn = document.getElementById("restartBtn");

let gameSpeed = 350;
let snake;
let food;
let direction;
let score;
let level = 1;
let highScore = localStorage.getItem("snakeHighScore") || 0;

let gameLoop;
let specialFood = null;
let specialFoodTimer = null;
let specialFoodStartTime = 0; // স্পেশাল ফুড কখন আসলো তা ট্র্যাক করতে
let normalFoodEatenCount = 0; // সাধারণ খাবার কয়টা খেলো তা গুনতে
let running = false;

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
    }
}

// স্পেশাল ফুড তৈরির গ্লোবাল ফাংশন
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
    }

    // স্পেশাল ফুড তৈরির সময়টি মিলিসেকেন্ডে সেভ করছি
    specialFoodStartTime = Date.now(); 

    clearTimeout(specialFoodTimer);
    specialFoodTimer = setTimeout(() => {
        specialFood = null;
    }, 5000);
}

function resetGame(){
    snake = [{x:200,y:200}];
    createFood();
    
    // স্পেশাল ফুড ও কাউন্টার রিসেট
    specialFood = null;
    normalFoodEatenCount = 0;
    clearTimeout(specialFoodTimer);

    direction = "RIGHT";
    score = 0;
    scoreText.innerHTML = score;
    level = 1;
    gameSpeed = 350;
    levelText.innerHTML = level;
}

function draw(){
    ctx.fillStyle = "#111";
    ctx.fillRect(0,0,400,400);

    // ======= সাধারণ খাবারের জায়গায় ছোট ব্যাঙ (Frog) আঁকা =======
    // ব্যাঙের মূল শরীর (Body)
    ctx.fillStyle = "#4ade80"; // উজ্জ্বল সবুজ রঙ
    ctx.beginPath();
    ctx.ellipse(food.x + 10, food.y + 12, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ব্যাঙের মাথা (Head)
    ctx.beginPath();
    ctx.arc(food.x + 10, food.y + 8, 6, 0, Math.PI * 2);
    ctx.fill();

    // ব্যাঙের চোখ
    ctx.fillStyle = "#fff"; // চোখের সাদা অংশ
    ctx.beginPath(); ctx.arc(food.x + 6, food.y + 4, 2.5, 0, Math.PI * 2); ctx.fill(); 
    ctx.beginPath(); ctx.arc(food.x + 14, food.y + 4, 2.5, 0, Math.PI * 2); ctx.fill(); 

    ctx.fillStyle = "#000"; // চোখের মণি
    ctx.beginPath(); ctx.arc(food.x + 6, food.y + 4, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(food.x + 14, food.y + 4, 1.2, 0, Math.PI * 2); ctx.fill();

    // ব্যাঙের ছোট দুটি পা (Legs)
    ctx.fillStyle = "#22c55e"; 
    ctx.beginPath(); ctx.arc(food.x + 4, food.y + 15, 2, 0, Math.PI * 2); ctx.fill(); 
    ctx.beginPath(); ctx.arc(food.x + 16, food.y + 15, 2, 0, Math.PI * 2); ctx.fill(); 


    // special food (যদি স্ক্রিনে থাকে)
    if (specialFood) {
        // সোনালী গ্লো ইফেক্ট
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#ffd700";
        
        ctx.fillStyle = "#ffd700"; // গোল্ডেন কালার
        ctx.beginPath();
        ctx.arc(specialFood.x + 10, specialFood.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // শ্যাডো ইফেক্ট বন্ধ করা
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(specialFood.x + 7, specialFood.y + 7, 2, 0, Math.PI * 2);
        ctx.fill();

        // ======= লাইভ টাইমার ডিসপ্লে =======
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
    ctx.textAlign = "left"; // সাপের চোখের জন্য টেক্সট অ্যালাইনমেন্ট রিসেট
    snake.forEach((part, index) => {
        if(index === 0){
            // সাপের মাথা (Gradient Effect)
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

            // চোখের সাদা অংশ
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(part.x + 6, part.y + 8, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x + 14, part.y + 8, 3.5, 0, Math.PI * 2); ctx.fill();

            // চোখের কালো মণি
            ctx.fillStyle = "#000000";
            ctx.beginPath(); ctx.arc(part.x + 6, part.y + 8, 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x + 14, part.y + 8, 1.8, 0, Math.PI * 2); ctx.fill();

            // চোখের ছোট লাইটিং ডট
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(part.x + 5.2, part.y + 7.2, 0.6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x + 13.2, part.y + 7.2, 0.6, 0, Math.PI * 2); ctx.fill();
        } else {
            // ======= বডির নির্দিষ্ট দুটি রঙ: আকাশী নীল এবং সাদা =======
            // ইনডেক্স জোড় (Even) হলে Sky Blue, বিজোড় (Odd) হলে White
            if (index % 2 === 0) {
                ctx.fillStyle = "#00bfff"; // উজ্জ্বল আকাশী নীল (Deep Sky Blue)
            } else {
                ctx.fillStyle = "#ffffff"; // ধবধবে সাদা (White)
            }
            
            ctx.beginPath();
            ctx.roundRect(part.x + 1, part.y + 1, 18, 18, 6);
            ctx.fill();
        }
    });
}

function move(){
    let head = {...snake[0]};

    if(direction=="RIGHT") head.x+=20;
    if(direction=="LEFT") head.x-=20;
    if(direction=="UP") head.y-=20;
    if(direction=="DOWN") head.y+=20;

    // wall collision
    if(head.x<0 || head.x>=400 || head.y<0 || head.y>=400){
        gameOver();
        return;
    }

    snake.unshift(head);

    // Body collision
    for(let i = 1; i < snake.length; i++){
        if(head.x === snake[i].x && head.y === snake[i].y){
            gameOver();
            return;
        }
    }

    // ১. সাধারণ খাবার খাওয়া চেক করা
    if(head.x == food.x && head.y == food.y){
        score++;
        normalFoodEatenCount++; 
        scoreText.innerHTML = score;

        if(normalFoodEatenCount % 5 === 0){
            createSpecialFood();
        }

        let newLevel = Math.floor(score / 5) + 1;
        if(newLevel > level){
            level = newLevel;
            levelText.innerHTML = level;
            gameSpeed = Math.max(80, 350 - (level - 1) * 30);
            clearInterval(gameLoop);
            gameLoop = setInterval(game, gameSpeed);
        }

        if(score > highScore){
            highScore = score;
            localStorage.setItem("snakeHighScore", highScore);
            highScoreText.innerHTML = highScore;
        }
        createFood();
    } 
    // ২. স্পেশাল গোল্ডেন ফুড খাওয়া চেক করা
    else if(specialFood && head.x == specialFood.x && head.y == specialFood.y){
        score += 3; 
        scoreText.innerHTML = score;
        
        clearTimeout(specialFoodTimer); 
        specialFood = null; 

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
    // Spacebar চাপলে গেম পজ বা রিজুম হবে
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
