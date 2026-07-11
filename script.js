const menu = document.getElementById("menu");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const highScoreText = document.getElementById("highScore");
const levelText = document.getElementById("level");

const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const menuRestartBtn = document.getElementById("restart"); // নাম একটু পরিবর্তন করা হলো সংঘাত এড়াতে

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
            // Head
            ctx.fillStyle = "#00ff66";
            ctx.beginPath();
            ctx.arc(part.x + 10, part.y + 10, 10, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(part.x + 6, part.y + 7, 2, 0, Math.PI * 2);
            ctx.fill();

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
    menu.classList.remove("hidden");
    if(gameOverModal) gameOverModal.style.display = "none"; // মোডাল বন্ধ করবে
    running = false;
}

// কাস্টম গেম ওভার ফাংশন আপডেট করা হলো
function gameOver(){
    clearInterval(gameLoop);
    running = false;

    // ক্যানভাসের ভেতরের টেক্সট ড্র করা বন্ধ করে সরাসরি কাস্টম মোডাল উইন্ডোটি শো করবে
    if(finalScoreText) finalScoreText.innerText = score;
    if(gameOverModal) gameOverModal.style.display = "flex";
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

// কাস্টম পপ-আপের 'Play Again' বাটনে ক্লিক করলে গেম নতুন করে শুরু হবে
if(modalRestartBtn) {
    modalRestartBtn.onclick = function() {
        if(gameOverModal) gameOverModal.style.display = "none";
        startGame(); // সরাসরি গেম রিস্টার্ট করে দেবে
    };
}

resetGame();
draw();
