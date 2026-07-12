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

// বেস স্পিড ভ্যারিয়েবল
const BASE_SPEED = 300;
let gameSpeed = BASE_SPEED;
let snake;
let food;
let direction;
let score;
let level = 1;
let highScore = localStorage.getItem("snakeHighScore") || 0;
let gameLoop = null;
let specialFood = null;
let specialFoodTimer = null;
let specialFoodStartTime = 0;
let normalFoodEatenCount = 0;
let running = false;
let obstacles = [];

// সাপ বর্তমানে মুভ করছে কিনা তা ট্র্যাক করার জন্য
let isSnakeMoving = false;
// লেভেল ট্রানজিশন (ইন্টারমিশন স্ক্রিন) এর জন্য ভ্যারিয়েবল
let isLevelTransition = false;
let nextLevelToStart = 2;

highScoreText.innerHTML = highScore;

function createFood() {
    let valid = false;
    while (!valid) {
        food = {
            x: Math.floor(Math.random() * 20) * 20,
            y: Math.floor(Math.random() * 20) * 20
        };
        valid = true;
        // খাবার যেন সাপের শরীরের ওপর না পড়ে
        for (let part of snake) {
            if (part.x === food.x && part.y === food.y) {
                valid = false;
                break;
            }
        }
        // খাবার যেন বাধার ওপর না পড়ে
        for (let obs of obstacles) {
            if (food.x === obs.x && food.y === obs.y) {
                valid = false;
                break;
            }
        }
    }
}

function createSpecialFood() {
    let valid = false;
    while (!valid) {
        specialFood = {
            x: Math.floor(Math.random() * 20) * 20,
            y: Math.floor(Math.random() * 20) * 20
        };
        valid = true;
        for (let part of snake) {
            if (part.x === specialFood.x && part.y === specialFood.y) {
                valid = false;
                break;
            }
        }
        if (food && specialFood.x === food.x && specialFood.y === food.y) {
            valid = false;
        }
        for (let obs of obstacles) {
            if (specialFood.x === obs.x && specialFood.y === obs.y) {
                valid = false;
                break;
            }
        }
    }
    specialFoodStartTime = Date.now();
    clearTimeout(specialFoodTimer);
    // ৫ সেকেন্ড পর বিশেষ খাবার গায়েব হয়ে যাবে
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
            {x: 200, y: 100}, {x: 200, y: 120}, {x: 200, y: 140}, {x: 200, y: 240}, {x: 200, y: 260}, {x: 200, y: 280},
            {x: 100, y: 200}, {x: 120, y: 200}, {x: 140, y: 200}, {x: 240, y: 200}, {x: 260, y: 200}, {x: 280, y: 200}
        ];
    } else if (lvl === 5) {
        rawObstacles = [
            {x: 100, y: 100}, {x: 120, y: 100}, {x: 120, y: 120}, {x: 260, y: 100}, {x: 280, y: 100}, {x: 260, y: 120},
            {x: 100, y: 280}, {x: 120, y: 280}, {x: 120, y: 260}, {x: 260, y: 280}, {x: 280, y: 280}, {x: 260, y: 260}
        ];
    } else {
        // লেভেল ৫ এর পরের জন্য র্যান্ডম বাধা
        let obstacleCount = Math.min(12 + (lvl - 5) * 2, 32);
        while (rawObstacles.length < obstacleCount) {
            let obsX = Math.floor(Math.random() * 20) * 20;
            let obsY = Math.floor(Math.random() * 20) * 20;
            let exists = rawObstacles.some(obs => obs.x === obsX && obs.y === obsY);
            
            // সেন্টারিং সেফ জোন চেক
            let distanceX = Math.abs(obsX - 200);
            let distanceY = Math.abs(obsY - 200);
            if (!exists && !(distanceX <= 60 && distanceY <= 60)) {
                rawObstacles.push({x: obsX, y: obsY});
            }
        }
    }
    obstacles = rawObstacles;
}

function resetGame() {
    snake = [{x: 200, y: 200}];
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
    generateObstacles(level);
    createFood();
}

function draw() {
    // ক্যানভাস ব্যাকগ্রাউন্ড
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, 400, 400);

    // লেভেলের বাধা (Obstacles) আঁকা
    ctx.fillStyle = "#e74c3c";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#e74c3c";
    obstacles.forEach(obs => {
        ctx.beginPath();
        ctx.roundRect(obs.x + 1, obs.y + 1, 18, 18, 4);
        ctx.fill();
    });
    ctx.shadowBlur = 0; // শ্যাডো বন্ধ করা যাতে অন্য জিনিসে ইফেক্ট না পড়ে

    // সাধারণ খাবার (সবুজ ফ্রগ স্টাইল) আঁকা
    if (food) {
        ctx.fillStyle = "#2ecc71";
        ctx.beginPath();
        ctx.arc(food.x + 10, food.y + 11, 8, 0, Math.PI * 2);
        ctx.fill();
        // ফ্রগের চোখ
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(food.x + 5, food.y + 5, 2.5, 0, Math.PI * 2);
        ctx.arc(food.x + 15, food.y + 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111111";
        ctx.beginPath();
        ctx.arc(food.x + 6, food.y + 5, 1.2, 0, Math.PI * 2);
        ctx.arc(food.x + 14, food.y + 5, 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // বিশেষ খাবার (Special Food - গোল্ডেন স্টাইল উইথ টাইমার)
    if (specialFood) {
        let elapsedTime = Date.now() - specialFoodStartTime;
        let timeLeft = Math.max(0, (5000 - elapsedTime) / 1000);
        
        if (timeLeft > 0 && isSnakeMoving && running) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#ffd700";
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(specialFood.x + 10, specialFood.y + 10, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // বো টাইমার টেক্সট
            ctx.fillStyle = "#fff";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`Bonus: ${timeLeft.toFixed(1)}s`, 200, 385);
        }
    }

    // সাপ আঁকা
    snake.forEach((part, index) => {
        if (index === 0) {
            // সাপের মাথা (গাঢ় নীল/সবুজ মিক্স)
            ctx.fillStyle = "#1abc9c";
        } else {
            // সাপের বডি (গ্রেডিয়েন্ট ফিলিং)
            ctx.fillStyle = index % 2 === 0 ? "#2ecc71" : "#27ae60";
        }
        ctx.beginPath();
        ctx.roundRect(part.x + 1, part.y + 1, 18, 18, 4);
        ctx.fill();
    });

    // লেভেল ট্রানজিশন টেক্সট স্ক্রিন
    if (isLevelTransition) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = "#2ecc71";
        ctx.font = "bold 30px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL UP!", 200, 180);
        ctx.fillStyle = "#fff";
        ctx.font = "18px sans-serif";
        ctx.fillText(`Starting Level ${nextLevelToStart}...`, 200, 220);
    }
}

function update() {
    if (!running || isLevelTransition || !direction) return;

    // সাপের নতুন মাথার পজিশন
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // দেয়ালের সাথে সংঘর্ষ (Wall collision)
    if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400) {
        gameOver();
        return;
    }

    // বাধার সাথে সংঘর্ষ (Obstacle collision)
    for (let obs of obstacles) {
        if (head.x === obs.x && head.y === obs.y) {
            gameOver();
            return;
        }
    }

    // নিজের শরীরের সাথে সংঘর্ষ (Self collision)
    for (let part of snake) {
        if (head.x === part.x && head.y === part.y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    // সাধারণ খাবার খাওয়া চেক
    if (food && head.x === food.x && head.y === food.y) {
        score += 10;
        scoreText.innerHTML = score;
        normalFoodEatenCount++;

        // প্রতি ৫টি সাধারণ খাবার খাওয়ার পর স্পেশাল খাবার আসবে
        if (normalFoodEatenCount % 5 === 0) {
            createSpecialFood();
        }

        // প্রতি ৩টি খাবার খাওয়ার পর লেভেল আপ হবে
        if (normalFoodEatenCount >= 3) {
            levelUp();
        } else {
            createFood();
        }
    } 
    // বিশেষ খাবার খাওয়া চেক
    else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
        score += 50; // বোনাস পয়েন্ট
        scoreText.innerHTML = score;
        specialFood = null;
        clearTimeout(specialFoodTimer);
    } else {
        snake.pop();
    }
}

function levelUp() {
    isLevelTransition = true;
    running = false;
    nextLevelToStart = level + 1;
    draw();

    setTimeout(() => {
        level++;
        levelText.innerHTML = level;
        normalFoodEatenCount = 0;
        // প্রতি লেভেলে স্পিড একটু করে বাড়বে
        gameSpeed = Math.max(100, BASE_SPEED - (level - 1) * 30); 
        
        snake = [{ x: 200, y: 200 }];
        direction = null;
        isSnakeMoving = false;
        generateObstacles(level);
        createFood();
        specialFood = null;
        
        isLevelTransition = false;
        running = true;
        
        // নতুন স্পিডে গেম লুপ রিসেট
        clearInterval(gameLoop);
        gameLoop = setInterval(main, gameSpeed);
    }, 2000); // ২ সেকেন্ডের ট্রানজিশন পজ
}

function gameOver() {
    running = false;
    isSnakeMoving = false;
    clearInterval(gameLoop);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore", highScore);
        highScoreText.innerHTML = highScore;
    }

    finalScoreText.innerHTML = score;
    gameOverModal.style.display = "flex"; // গেম ওভার মোডাল দেখানো
}

function main() {
    update();
    draw();
}

// কিবোর্ড কন্ট্রোল
window.addEventListener("keydown", e => {
    if (!running || isLevelTransition) return;

    switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
            if (direction?.y !== 20) {
                direction = { x: 0, y: -20 };
                isSnakeMoving = true;
            }
            break;
        case "ArrowDown":
        case "s":
        case "S":
            if (direction?.y !== -20) {
                direction = { x: 0, y: 20 };
                isSnakeMoving = true;
            }
            break;
        case "ArrowLeft":
        case "a":
        case "A":
            if (direction?.x !== 20) {
                direction = { x: -20, y: 0 };
                isSnakeMoving = true;
            }
            break;
        case "ArrowRight":
        case "d":
        case "D":
            if (direction?.x !== -20) {
                direction = { x: 20, y: 0 };
                isSnakeMoving = true;
            }
            break;
    }
});

// বাটন ইভেন্ট লিসেনারসমূহ
playBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    resetGame();
    running = true;
    gameLoop = setInterval(main, gameSpeed);
});

menuRestartBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    resetGame();
    running = true;
    clearInterval(gameLoop);
    gameLoop = setInterval(main, gameSpeed);
});

pauseBtn.addEventListener("click", () => {
    if (isLevelTransition) return;
    if (running) {
        running = false;
        pauseBtn.innerHTML = "▶ Resume";
    } else {
        running = true;
        pauseBtn.innerHTML = "⏸ Pause";
    }
});

modalRestartBtn.addEventListener("click", () => {
    gameOverModal.style.display = "none";
    resetGame();
    running = true;
    gameLoop = setInterval(main, gameSpeed);
});

cancelBtn.addEventListener("click", () => {
    gameOverModal.style.display = "none";
    menu.classList.remove("hidden");
    resetGame();
    draw();
});

// গেম লোড হওয়ার সময় প্রাথমিক স্ক্রিন রেন্ডার করা
resetGame();
draw();
