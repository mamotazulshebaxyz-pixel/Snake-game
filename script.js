// 🎵 আপনার আপলোড করা কাস্টম অডিও ফাইলের নাম
const eatSound = new Audio("eat.mp3"); 
const bonusSound = new Audio("bonus.mp3");

// 🔥 FIREBASE কনফিগারেশন সেটআপ
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBYacL6qWCicCFKCOCJ7ajHZc36NoW94sM",
    authDomain: "sky-snake-game.firebaseapp.com",
    projectId: "sky-snake-game",
    storageBucket: "sky-snake-game.firebasestorage.app",
    messagingSenderId: "67376821080",
    appId: "1:67376821080:web:4ee4ce3ac09386bc36e3ed"
};

// Firebase ইনিশিয়াল করা
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let userHighScoreRef = null;

// ==========================================
// 🎮 গেমের গলোবাল ভেরিয়েবলসমূহ (HTML এর সাথে মিলিয়ে আপডেট করা)
// ==========================================
const homepage = document.getElementById("custom-homepage");
const gameContainer = document.getElementById("game-container");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const highScoreText = document.getElementById("highScore");
const levelText = document.getElementById("level");
const livesContainer = document.getElementById("lives-container");

const playBtn = document.getElementById("playBtn");
const cancelBtn = document.getElementById("cancelBtn");
const pauseBtn = document.getElementById("pauseBtn");
const muteBtn = document.getElementById("muteBtn"); 
const menuRestartBtn = document.getElementById("restart");

const BASE_SPEED = 300; 
let gameSpeed = BASE_SPEED;

let snake;
let food;
let direction;
let score;
let level = 1;
let highScore = 0; 
let lives = 3; 

let gameLoop;
let specialFood = null;
let specialFoodTimer = null;
let specialFoodStartTime = 0; 
let normalFoodEatenCount = 0; 
let running = false;
let obstacles = []; 
let bubbles = []; // বাবলস ট্র্যাকিং অ্যারে

let isSnakeMoving = false; 
let isLevelTransition = false;
let nextLevelToStart = 2;
let shouldSpawnBonusAfterTransition = false; 

// 🔊 সাউন্ড অন/অফ ট্র্যাক করার গলোবাল ভেরিয়েবল
let isMuted = false;

// ==========================================
// 🫧 বাবল ইফেক্ট ফাংশন (যা আগে কোডে মিসিং ছিল)
// ==========================================
function initBubbles() {
    bubbles = [];
    for (let i = 0; i < 15; i++) {
        bubbles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 4 + 2,
            speed: Math.random() * 1 + 0.5,
            opacity: Math.random() * 0.3 + 0.1
        });
    }
}

// ==========================================
// 🔒 ফায়ারবেস অথেনটিকেশন ও ডাটাবেজ হ্যান্ডলার
// ==========================================
auth.onAuthStateChanged(async (user) => {
    const loginScreen = document.getElementById('login-screen');
    if (user) {
        currentUser = user;
        loginScreen.classList.add('hidden'); 
        
        userHighScoreRef = db.collection('highscores').doc(user.uid);
        
        try {
            const doc = await userHighScoreRef.get();
            if (doc.exists) {
                highScore = doc.data().score || 0;
            } else {
                highScore = 0;
            }
        } catch (error) {
            console.error("Error loading highscore:", error);
            highScore = 0;
        }
        highScoreText.innerHTML = highScore;
        resetGame();
        draw();
    } else {
        loginScreen.classList.remove('hidden'); 
    }
});

document.getElementById('google-login-btn').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        alert("লগইন ব্যর্থ হয়েছে: " + error.message);
    });
});

function updateAndSaveHighScore(newScore) {
    if (newScore > highScore) {
        highScore = newScore;
        highScoreText.innerHTML = highScore;

        if (userHighScoreRef) {
            userHighScoreRef.set({
                score: highScore,
                email: currentUser.email,
                name: currentUser.displayName || currentUser.email.split('@')[0], // 👈 এই লাইনটি যোগ করুন
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(error => {
                console.error("Score save error:", error);
            });
        }
    }
}

// ==========================================
// 🎵 সাউন্ড সিস্টেম (কাস্টম অডিও সহ)
// ==========================================
function playSound(type) {
    if (isMuted) return;

    if (type === 'eat' || type === 'eat_bonus') {
        eatSound.currentTime = 0; 
        eatSound.play().catch(e => console.log("Audio play blocked:", e));
    } 
    else if (type === 'bonus_appear') {
        bonusSound.currentTime = 0;
        bonusSound.play().catch(e => console.log("Audio play blocked:", e));
    }
    else if (type === 'die') {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(80, audioCtx.currentTime + 0.35);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.35);
    }
}

function updateLivesUI() {
    let hearts = "";
    for (let i = 0; i < lives; i++) {
        hearts += "❤️ ";
    }
    livesContainer.innerHTML = hearts.trim();
}

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
    specialFoodTimer = null; 
    playSound('bonus_appear'); 
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
    specialFoodTimer = null;
    shouldSpawnBonusAfterTransition = false;

    direction = null; 
    isSnakeMoving = false; 

    score = 0;
    scoreText.innerHTML = score;
    level = 1;
    lives = 3; 
    updateLivesUI(); 
    gameSpeed = BASE_SPEED;
    levelText.innerHTML = level;
    isLevelTransition = false;
    initBubbles();
    createFood();
}

function resetSnakePosition() {
    snake = [{x:200,y:200}];
    direction = null;
    isSnakeMoving = false;
    specialFood = null;
    createFood();
}

function handleSnakeDeath() {
    playSound('die'); 
    lives--; 
    updateLivesUI(); 

    if (lives > 0) {
        resetSnakePosition();
    } else {
        gameOver();
    }
}

function draw(){
    // ======= ডার্ক ওয়াটার ব্যাকগ্রাউন্ড =======
    let waterGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    waterGradient.addColorStop(0, "#0f2027");   
    waterGradient.addColorStop(0.5, "#203a43"); 
    waterGradient.addColorStop(1, "#2c5364");   
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ======= ওয়াটার গ্রিড ইফেক্ট =======
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for(let i = 0; i < canvas.width; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // ======= বাবলস ড্রয়িং =======
    bubbles.forEach(b => {
        ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        b.y -= b.speed;
        if(b.y < -10) {
            b.y = canvas.height + 10;
            b.x = Math.random() * canvas.width;
        }
    });

    // ======= Obstacles =======
    ctx.fillStyle = "#e74c3c"; 
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#e74c3c";
    obstacles.forEach(obs => {
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(obs.x + 1, obs.y + 1, 18, 18, 4);
        } else {
            ctx.rect(obs.x + 1, obs.y + 1, 18, 18);
        }
        ctx.fill();
    });
    ctx.shadowBlur = 0; 

    // ======= গোল্ডফিশ ফুড =======
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

    // ======= ক্রিস্টাল ডায়মন্ড (বোনাস ফুড) =======
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
        }

        if (specialFood && timeLeft > 0) {
            ctx.fillStyle = "#ffd700"; 
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`⏱ Bonus: ${timeLeft.toFixed(1)}s`, canvas.width / 2, canvas.height - 15); 
        }
    }

    // ======= প্রিমিয়াম সি-গ্রিন সাপ =======
    ctx.textAlign = "left"; 
    ctx.strokeStyle = "#14b8a6"; 
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

    let head = snake[0];
    let centerX = head.x + 10;
    let centerY = head.y + 10;

    let isNearNormalFood = Math.abs(head.x - food.x) <= 40 && Math.abs(head.y - food.y) <= 40;
    let isNearSpecialFood = specialFood && Math.abs(head.x - specialFood.x) <= 40 && Math.abs(head.y - specialFood.y) <= 40;
    let isEatingTime = (isNearNormalFood || isNearSpecialFood) && isSnakeMoving;

    ctx.fillStyle = "#14b8a6"; 
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, centerY);
    
    if (direction === "UP") ctx.rotate(-Math.PI / 2);
    else if (direction === "DOWN") ctx.rotate(Math.PI / 2);
    else if (direction === "LEFT") ctx.rotate(Math.PI);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -6, 4.5, 0, Math.PI * 2); 
    ctx.arc(0, 6, 4.5, 0, Math.PI * 2);  
    ctx.fill();

    ctx.fillStyle = "#0f766e"; 
    ctx.beginPath();
    ctx.arc(1, -6, 2, 0, Math.PI * 2);
    ctx.arc(1, 6, 2, 0, Math.PI * 2);
    ctx.fill();

    if (isEatingTime) {
        ctx.fillStyle = "#115e59"; 
        ctx.beginPath();
        ctx.arc(4, 0, 8, -Math.PI/2, Math.PI/2, false);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(7, -4); ctx.lineTo(9, -3); ctx.lineTo(6, -2); 
        ctx.moveTo(7, 4); ctx.lineTo(9, 3); ctx.lineTo(6, 2);   
        ctx.fill();
    } else {
        ctx.strokeStyle = "#115e59";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(2, 0, 4, -Math.PI/3, Math.PI/3, false);
        ctx.stroke();
    }

    ctx.restore(); 

    if (running && !isSnakeMoving && !isLevelTransition) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🎮 Swipe or Slide on Screen to Move", canvas.width / 2, canvas.height / 2 - 10);
    }

    if (isLevelTransition) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#00bfff";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`LEVEL ${nextLevelToStart}`, canvas.width / 2, canvas.height / 2 - 40);

        ctx.fillStyle = "#fff";
        ctx.font = "16px sans-serif";
        ctx.fillText(nextLevelToStart > 5 ? "⚠️ Random Obstacles Active!" : "Get ready for new challenges!", canvas.width / 2, canvas.height / 2);

        ctx.fillStyle = "#2ecc71";
        ctx.beginPath();
        ctx.if = function(cond) { return cond; };
        if (ctx.roundRect) {
            ctx.roundRect(canvas.width / 2 - 80, canvas.height / 2 + 40, 160, 45, 10);
        } else {
            ctx.rect(canvas.width / 2 - 80, canvas.height / 2 + 40, 160, 45);
        }
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("Click to Start", canvas.width / 2, canvas.height / 2 + 68);
    }
}

canvas.addEventListener("click", function(e) {
    if (isLevelTransition) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x >= canvas.width / 2 - 80 && x <= canvas.width / 2 + 80 && y >= canvas.height / 2 + 40 && y <= canvas.height / 2 + 85) {
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
    
    clearTimeout(specialFoodTimer);
    specialFoodTimer = null;
    
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
            handleSnakeDeath();
            return;
        }
    }

    snake.unshift(head);

    for(let i = 1; i < snake.length; i++){
        if(head.x === snake[i].x && head.y === snake[i].y){
            handleSnakeDeath();
            return;
        }
    }

    if(head.x == food.x && head.y == food.y){
        playSound('eat'); 
        score++;
        normalFoodEatenCount++; 
        scoreText.innerHTML = score;

        let targetLevel = Math.floor((score - 1) / 20) + 1;
        if(score === 0) targetLevel = 1; 

        if(normalFoodEatenCount % 5 === 0){
            if(targetLevel > level) {
                shouldSpawnBonusAfterTransition = true; 
            } else {
                createSpecialFood();
            }
        }

        if(targetLevel > level){
            triggerLevelTransition(targetLevel);
        } else {
            let scoreInCurrentLevel = (score - 1) % 20; 
            let currentLevelBaseSpeed = Math.max(BASE_SPEED - Math.min((level - 1) * 15, 180), 80);
            gameSpeed = Math.max(currentLevelBaseSpeed - (scoreInCurrentLevel * 7), 60); 
            
            clearInterval(gameLoop);
            gameLoop = setInterval(game, gameSpeed);
        }

        updateAndSaveHighScore(score);

        if (!isLevelTransition) createFood();
    } 
    else if(specialFood && head.x == specialFood.x && head.y == specialFood.y){
        playSound('eat_bonus'); 
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

        updateAndSaveHighScore(score);
    } 
    else {
        snake.pop();
    }
}

function game(){
    if (isSnakeMoving) {
        if (shouldSpawnBonusAfterTransition) {
            createSpecialFood();
            shouldSpawnBonusAfterTransition = false;
        }

        if (specialFood && specialFoodStartTime > 0) {
            let elapsedTime = Date.now() - specialFoodStartTime;
            if (elapsedTime >= 5000) {
                specialFood = null;
                specialFoodStartTime = 0;
            }
        }
    } else {
        if (specialFood && specialFoodStartTime > 0) {
            specialFoodStartTime = Date.now();
        }
    }

    move();
    draw();
}

function startGame(){
    clearInterval(gameLoop);
    resetGame();
    
    // হোমপেজ স্কিন হাইড করে গেম স্কিন ভিজিবল করা
    if(homepage) homepage.classList.add("hidden");
    if(gameContainer) gameContainer.classList.remove("hidden-layout");
    
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
    
    // 💡 বাটন থেকে ফোকাস সরিয়ে নেওয়া হচ্ছে যেন কিবোর্ডের স্পেসবার ঠিকমতো কাজ করে
    if(pauseBtn) {
        pauseBtn.blur();
    }
}

function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
        muteBtn.innerHTML = "🔇 Sound: Off";
        muteBtn.style.background = "#7f8c8d"; 
    } else {
        muteBtn.innerHTML = "🔊 Sound: On";
        muteBtn.style.background = "#3498db"; 
    }
}

function restartGame(){
    clearInterval(gameLoop);
    resetGame();
    draw();
    
   // 💡 এখানে আপনার ৮০২ নম্বর লাইনের পারফেক্ট কোডসহ পুরো ফাংশনটি দেওয়া হলো
    const menuTitle = document.getElementById("homeTitleText");
    if(menuTitle) {
        menuTitle.innerHTML = `🐍 NOKIA SNAKE 2.0`;
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

    if(homepage) homepage.classList.remove("hidden");
    if(gameContainer) gameContainer.classList.add("hidden-layout");
    running = false;
}

function gameOver(){
    clearInterval(gameLoop);
    running = false;
    isSnakeMoving = false;
    clearTimeout(specialFoodTimer); 
    specialFoodTimer = null;
    shouldSpawnBonusAfterTransition = false;

    if(homepage) homepage.classList.remove("hidden");
    if(gameContainer) gameContainer.classList.add("hidden-layout");

    const menuTitle = document.getElementById("homeTitleText");
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

// =========================================================================
// 🔄 টাচ কন্ট্রোল (মোবাইলের জন্য)
// =========================================================================
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", function(e){
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener("touchmove", function(e){
    if (isLevelTransition) return; 

    let currentX = e.touches[0].clientX;
    let currentY = e.touches[0].clientY;

    let dx = currentX - touchStartX;
    let dy = currentY - touchStartY;

    const threshold = 15; 

    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > threshold) {
            if (!isSnakeMoving) isSnakeMoving = true; 

            if (dx > 0 && direction !== "LEFT") direction = "RIGHT";
            else if (dx < 0 && direction !== "RIGHT") direction = "LEFT";
            
            touchStartX = currentX;
            touchStartY = currentY;
        }
    } else {
        if (Math.abs(dy) > threshold) {
            if (!isSnakeMoving) isSnakeMoving = true;

            if (dy > 0 && direction !== "UP") direction = "DOWN";
            else if (dy < 0 && direction !== "DOWN") direction = "UP";
            
            touchStartX = currentX;
            touchStartY = currentY;
        }
    }
}, { passive: true });

canvas.addEventListener("touchend", function(){
    touchStartX = 0;
    touchStartY = 0;
}, { passive: true });


// =========================================================================
// ⌨️ কি-বোর্ড কন্ট্রোল (পিসির জন্য)
// =========================================================================
document.addEventListener("keydown", function(e){
    if (isLevelTransition) {
        if(e.key === "Enter") {
            startNextLevel();
        }
        return;
    }

    if(e.key === " " || e.key === "Spacebar"){
        e.preventDefault(); 
        if(isSnakeMoving){ 
            pauseGame();
        }
        return;
    }

    if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)){
        if (!isSnakeMoving) {
            isSnakeMoving = true;
        }
    }

    if(e.key=="ArrowUp" && direction!="DOWN") direction="UP";
    if(e.key=="ArrowDown" && direction!="UP") direction="DOWN";
    if(e.key=="ArrowLeft" && direction!="RIGHT") direction="LEFT";
    if(e.key=="ArrowRight" && direction!="LEFT") direction="RIGHT";
});

// =========================================================================
// 🏆 গ্লোবাল লিডারবোর্ড লজিক
// =========================================================================
const leaderboardModal = document.getElementById("leaderboard-modal");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const closeLeaderboard = document.getElementById("closeLeaderboard");
const leaderboardList = document.getElementById("leaderboard-list");

leaderboardBtn.onclick = async function() {
    leaderboardModal.classList.remove("hidden");
    leaderboardList.innerHTML = "<p style='padding: 15px; color: #94a3b8;'>লোডিং...</p>";

    try {
        const snapshot = await db.collection("highscores")
            .orderBy("score", "desc")
            .limit(10)
            .get();

        leaderboardList.innerHTML = ""; 
        
        if (snapshot.empty) {
            leaderboardList.innerHTML = "<p style='padding: 15px; color: #94a3b8;'>এখনো কোনো হাই স্কোর নেই!</p>";
            return;
        }

        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            // প্রথমে ডেটাবেজের 'name' ফিল্ড চেক করবে, না থাকলে মেইলের প্রথম অংশ নেবে
let userName = data.name || (data.email ? data.email.split('@')[0] : "Player");

// যদি নামে কোনো ডট (.) থাকে (যেমন: mamotazul.sheba.xyz), তবে ডটের আগের অংশটুকু শুধু দেখাবে
if (userName.includes('.')) {
    userName = userName.split('.')[0];
}

// প্রথম অক্ষর বড় হাতের (Capitalize) করার জন্য (ঐচ্ছিক, দেখতে সুন্দর লাগবে)
userName = userName.charAt(0).toUpperCase() + userName.slice(1);
            const userScore = data.score || 0;

            let rankClass = `rank-${rank}`;
            let medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;

            const item = document.createElement("div");
            item.className = "leaderboard-item";
            item.innerHTML = `
                <span class="${rank <= 3 ? rankClass : ''}">${medal} ${userName}</span>
                <span style="font-weight: bold; color: #22c55e;">${userScore}</span>
            `;
            leaderboardList.appendChild(item);
            rank++;
        });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        leaderboardList.innerHTML = "<p style='padding: 15px; color: #ef4444;'>স্কোর লোড করতে সমস্যা হয়েছে!</p>";
    }
};

closeLeaderboard.onclick = function() {
    leaderboardModal.classList.add("hidden");
};

window.onclick = function(event) {
    if (event.target == leaderboardModal) {
        leaderboardModal.classList.add("hidden");
    }
};

playBtn.onclick = startGame;
pauseBtn.onclick = pauseGame;
menuRestartBtn.onclick = restartGame;

if(muteBtn) {
    muteBtn.onclick = toggleMute;
}

if(cancelBtn) {
    cancelBtn.onclick = function() {
        restartGame(); 
    };
}

initBubbles();
