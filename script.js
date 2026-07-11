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

function resetGame(){
    snake = [{x:200,y:200}];
    createFood();
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

    // food
    ctx.fillStyle = "#ff3b30";
    ctx.beginPath();
    ctx.arc(food.x + 10, food.y + 10, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(food.x + 10, food.y + 2);
    ctx.lineTo(food.x + 13, food.y - 3);
    ctx.stroke();

    // snake
    snake.forEach((part, index) => {
        if(index === 0){
            if(index === 0){
            // 1. Head (Gradient Effect for 3D look)
            let headGradient = ctx.createRadialGradient(
                part.x + 10, part.y + 10, 2, 
                part.x + 10, part.y + 10, 10
            );
            headGradient.addColorStop(0, "#80ffaa"); // ভেতরের হালকা উজ্জ্বল অংশ
            headGradient.addColorStop(1, "#00ff66"); // বাইরের মূল সবুজ অংশ
            
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.arc(part.x + 10, part.y + 10, 10, 0, Math.PI * 2);
            ctx.fill();

            // 2. Snake Tongue (জিহ্বা - সাপের মুখ যেদিকে, জিহ্বাও সেদিকে বের হবে)
            ctx.strokeStyle = "#ff3b30"; // লাল জিহ্বা
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            
            if(direction === "RIGHT") {
                ctx.moveTo(part.x + 20, part.y + 10);
                ctx.lineTo(part.x + 26, part.y + 10);
                ctx.moveTo(part.x + 26, part.y + 10);
                ctx.lineTo(part.x + 29, part.y + 7);
                ctx.moveTo(part.x + 26, part.y + 10);
                ctx.lineTo(part.x + 29, part.y + 13);
            } else if(direction === "LEFT") {
                ctx.moveTo(part.x, part.y + 10);
                ctx.lineTo(part.x - 6, part.y + 10);
                ctx.moveTo(part.x - 6, part.y + 10);
                ctx.lineTo(part.x - 9, part.y + 7);
                ctx.moveTo(part.x - 6, part.y + 10);
                ctx.lineTo(part.x - 9, part.y + 13);
            } else if(direction === "UP") {
                ctx.moveTo(part.x + 10, part.y);
                ctx.lineTo(part.x + 10, part.y - 6);
                ctx.moveTo(part.x + 10, part.y - 6);
                ctx.lineTo(part.x + 7, part.y - 9);
                ctx.moveTo(part.x + 10, part.y - 6);
                ctx.lineTo(part.x + 13, part.y - 9);
            } else if(direction === "DOWN") {
                ctx.moveTo(part.x + 10, part.y + 20);
                ctx.lineTo(part.x + 10, part.y + 26);
                ctx.moveTo(part.x + 10, part.y + 26);
                ctx.lineTo(part.x + 7, part.y + 29);
                ctx.moveTo(part.x + 10, part.y + 26);
                ctx.lineTo(part.x + 13, part.y + 29);
            }
            ctx.stroke();

            // 3. Cute Cartoon Eyes (চোখের সাদা অংশ)
            ctx.fillStyle = "#ffffff";
            // বাম চোখ
            ctx.beginPath();
            ctx.arc(part.x + 6, part.y + 8, 3.5, 0, Math.PI * 2);
            ctx.fill();
            // ডান চোখ
            ctx.beginPath();
            ctx.arc(part.x + 14, part.y + 8, 3.5, 0, Math.PI * 2);
            ctx.fill();

            // 4. Pupils (চোখের কালো মণি - যা সাপকে দেখতে আরও কিউট করবে)
            ctx.fillStyle = "#000000";
            // বাম মণি
            ctx.beginPath();
            ctx.arc(part.x + 6, part.y + 8, 1.8, 0, Math.PI * 2);
            ctx.fill();
            // ডান মণি
            ctx.beginPath();
            ctx.arc(part.x + 14, part.y + 8, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // চোখের ছোট গ্লো বা লাইটিং ডট
            ctx.fillStyle = "#ffffff";
            ctx.beginPath(); ctx.arc(part.x + 5.2, part.y + 7.2, 0.6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(part.x + 13.2, part.y + 7.2, 0.6, 0, Math.PI * 2); ctx.fill();

        }

            ctx.beginPath();
            ctx.arc(part.x + 14, part.y + 7, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Body
            ctx.fillStyle = "#22c55e";
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

    // eat food
    if(head.x==food.x && head.y==food.y){
        score++;
        scoreText.innerHTML=score;

        let newLevel = Math.floor(score / 5) + 1;
        if(newLevel > level){
            level = newLevel;
            levelText.innerHTML = level;
            gameSpeed = Math.max(80, 350 - (level - 1) * 30);
            clearInterval(gameLoop);
            gameLoop = setInterval(game, gameSpeed);
        }

        if(score>highScore){
            highScore=score;
            localStorage.setItem("snakeHighScore", highScore);
            highScoreText.innerHTML=highScore;
        }
        createFood();
    } else {
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
    if(gameOverModal) gameOverModal.style.display = "none"; // মোডাল খোলা থাকলে বন্ধ করবে
    
    // গেম শুরু হলে নিচের Pause বাটনটি দৃশ্যমান ও স্বাভাবিক থাকবে
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
    
    // টাইটেল এবং বাটন আগের মতো (হোম মেনু) করা
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

    // Cancel বাটনটি আবার লুকিয়ে ফেলা
    if(cancelBtn) {
        cancelBtn.style.display = "none";
    }

    // হোম মেনুতে আসলে নিচের Pause বাটনটি হাইড থাকবে
    if(pauseBtn) {
        pauseBtn.style.display = "none";
    }

    menu.classList.remove("hidden");
    running = false;
}

// গেম ওভার ফাংশন আপডেট
function gameOver(){
    clearInterval(gameLoop);
    running = false;

    // মেনু বক্সটি স্ক্রিনে দেখাবে
    menu.classList.remove("hidden");

    // গেম ওভার টেক্সট ও স্কোর আপডেট
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

    // গেম ওভার হলে Cancel বাটনটি দৃশ্যমান হবে
    if(cancelBtn) {
        cancelBtn.style.display = "block";
    }

    // গেম ওভার অবস্থায় নিচের Pause বাটনটি লুকিয়ে ফেলা হলো
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
    if(e.key=="ArrowUp" && direction!="DOWN") direction="UP";
    if(e.key=="ArrowDown" && direction!="UP") direction="DOWN";
    if(e.key=="ArrowLeft" && direction!="RIGHT") direction="LEFT";
    if(e.key=="ArrowRight" && direction!="LEFT") direction="RIGHT";
});

playBtn.onclick = startGame;
pauseBtn.onclick = pauseGame;
menuRestartBtn.onclick = restartGame;

// কাস্টম Cancel বাটনের ক্লিক অ্যাকশন যোগ করা হলো
if(cancelBtn) {
    cancelBtn.onclick = function() {
        restartGame(); // এটি গেম রিসেট করে আবার মূল হোম মেনু ফিরিয়ে আনবে
    };
}

// কাস্টম পপ-আপের 'Play Again' বাটনে ক্লিক করলে গেম নতুন করে শুরু হবে
if(modalRestartBtn) {
    modalRestartBtn.onclick = function() {
        if(gameOverModal) gameOverModal.style.display = "none";
        startGame(); // সরাসরি গেম রিস্টার্ট করে দেবে
    };
}

// শুরুতে নিচের Pause বাটনটি লুকিয়ে রাখার জন্য (কারণ গেম তখন শুরু হয়নি)
if(pauseBtn) {
    pauseBtn.style.display = "none";
}

resetGame();
draw();
