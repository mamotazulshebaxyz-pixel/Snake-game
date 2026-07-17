// ==========================================
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

// ফায়ারবেস ইনিশিয়ালাইজ করা
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// ==========================================
// 🎮 গেমের গ্লোবাল ভেরিয়েবলসমূহ
// ==========================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let snake = [{x: 200, y: 200}];
let food = null;
let specialFood = null;
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let running = false;
let isSnakeMoving = false;
let gameSpeed = 100; // মিলি-সেকেন্ড
let gameInterval = null;

let specialFoodTimer = null;
let specialFoodRemainingTime = 5000; // বোনাস ফুডের সময় (৫ সেকেন্ড)
let foodEatenCount = 0;
let obstacles = [];
let currentStage = 1;
let shouldSpawnBonusAfterTransition = false;
let currentUser = null;

// সাউন্ড এফেক্টস
const sounds = {
    eat: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav'),
    bonus_appear: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav'),
    bonus_eat: new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-84.wav'),
    gameover: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-84.wav'),
    stage_up: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-84.wav')
};

function playSound(type) {
    if (sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].play().catch(() => {});
    }
}

// ==========================================
// 🛠️ HTML উপাদানসমূহ (আপনার HTML আইডি অনুযায়ী)
// ==========================================
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const levelEl = document.getElementById("level");

// স্ক্রিন এবং বাটনসমূহ
const loginScreen = document.getElementById("login-screen");
const gameContainer = document.querySelector(".game");
const googleLoginBtn = document.getElementById("google-login-btn");
const menuScreen = document.getElementById("menu");

const playBtn = document.getElementById("playBtn");
const pauseBtn = document.getElementById("pauseBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");
const closeLeaderboard = document.getElementById("closeLeaderboard");
const leaderboardModal = document.getElementById("leaderboard-modal");
const leaderboardList = document.getElementById("leaderboard-list");

const restartBtn = document.getElementById("restart");
const cancelBtn = document.getElementById("cancelBtn");

// প্রাথমিক হাই স্কোর প্রদর্শন
highScoreEl.innerText = highScore;

// ==========================================
// 🔐 গুগল অথেন্টিকেশন (Firebase Login Logic)
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // লগইন সফল হলে লগইন স্ক্রিন সরিয়ে গেমের মূল স্ক্রিন ও মেনু দেখানো
        if (loginScreen) loginScreen.style.display = "none";
        if (gameContainer) gameContainer.style.display = "block";
        if (menuScreen) menuScreen.style.display = "flex";
        
        // ডাটাবেজ থেকে ইউজারের আগের হাই স্কোর নিয়ে আসা
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists && doc.data().highScore) {
                if (doc.data().highScore > highScore) {
                    highScore = doc.data().highScore;
                    localStorage.setItem("highScore", highScore);
                    highScoreEl.innerText = highScore;
                }
            }
        });
    } else {
        currentUser = null;
        if (loginScreen) loginScreen.style.display = "flex";
        if (gameContainer) gameContainer.style.display = "none";
        if (menuScreen) menuScreen.style.display = "none";
    }
});

// গুগল লগইন বাটনে ক্লিক ইভেন্ট
if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", () => {
        auth.signInWithPopup(provider).catch((error) => {
            console.error("Login Failed:", error);
            alert("লগইন করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
        });
    });
}

// ==========================================
// ⚙️ গেমের মেকানিজম ফাংশনসমূহ
// ==========================================
function initGame() {
    snake = [{x: 200, y: 200}];
    dx = 0;
    dy = 0;
    score = 0;
    foodEatenCount = 0;
    currentStage = 1;
    gameSpeed = 100;
    obstacles = [];
    specialFood = null;
    specialFoodRemainingTime = 0;
    isSnakeMoving = false;
    
    scoreEl.innerText = score;
    levelEl.innerText = currentStage;
    
    createFood();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(game, gameSpeed);
}

function createFood() {
    let valid = false;
    while (!valid) {
        food = {
            x: Math.floor(Math.random() * (canvas.width / 20)) * 20,
            y: Math.floor(Math.random() * (canvas.height / 20)) * 20
        };
        valid = true;
        for (let part of snake) {
            if (part.x === food.x && part.y === food.y) valid = false;
        }
        for (let obs of obstacles) {
            if (food.x === obs.x && food.y === obs.y) valid = false;
        }
    }
}

function createSpecialFood() {
    let valid = false;
    while (!valid) {
        specialFood = {
            x: Math.floor(Math.random() * (canvas.width / 20)) * 20,
            y: Math.floor(Math.random() * (canvas.height / 20)) * 20
        };
        valid = true;
        for (let part of snake) {
            if (part.x === specialFood.x && part.y === specialFood.y) valid = false;
        }
        if (food && specialFood.x === food.x && specialFood.y === food.y) valid = false;
        for (let obs of obstacles) {
            if (specialFood.x === obs.x && specialFood.y === obs.y) valid = false;
        }
    }
    specialFoodRemainingTime = 5000; // বোনাস টাইমার ৫ সেকেন্ড বরাদ্দ
    playSound('bonus_appear');
}

function generateObstacles() {
    obstacles = [];
    let count = currentStage * 3; 
    for (let i = 0; i < count; i++) {
        let valid = false;
        let obs = {};
        while (!valid) {
            obs = {
                x: Math.floor(Math.random() * (canvas.width / 20)) * 20,
                y: Math.floor(Math.random() * (canvas.height / 20)) * 20
            };
            valid = true;
            if (Math.abs(obs.x - 200) < 60 && Math.abs(obs.y - 200) < 60) valid = false;
            for (let o of obstacles) {
                if (o.x === obs.x && o.y === obs.y) valid = false;
            }
        }
        obstacles.push(obs);
    }
}

function updateStage() {
    currentStage++;
    levelEl.innerText = currentStage;
    playSound('stage_up');
    
    gameSpeed = Math.max(40, 100 - (currentStage * 8));
    clearInterval(gameInterval);
    gameInterval = setInterval(game, gameSpeed);
    
    generateObstacles();
    createFood();
    shouldSpawnBonusAfterTransition = true; 
}

// ==========================================
// 🔁 মেইন গেম লুপ (Game Loop)
// ==========================================
function game() {
    // 💡 ফিক্স: গেম যখন রানিং এবং সাপ নড়াচড়া করছে তখনই শুধু টাইমার কমবে (Pause-বান্ধব)
    if (isSnakeMoving && running) {
        if (shouldSpawnBonusAfterTransition) {
            createSpecialFood();
            shouldSpawnBonusAfterTransition = false;
        }

        if (specialFood) {
            specialFoodRemainingTime -= gameSpeed; 
            if (specialFoodRemainingTime <= 0) {
                specialFood = null;
                specialFoodRemainingTime = 0;
            }
        }
    }

    move();
    draw();
}

function move() {
    if (!isSnakeMoving || !running) return;

    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    if (head.x < 0) head.x = canvas.width - 20;
    if (head.x >= canvas.width) head.x = 0;
    if (head.y < 0) head.y = canvas.height - 20;
    if (head.y >= canvas.height) head.y = 0;

    for (let part of snake) {
        if (head.x === part.x && head.y === part.y) { gameOver(); return; }
    }
    for (let obs of obstacles) {
        if (head.x === obs.x && head.y === obs.y) { gameOver(); return; }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        foodEatenCount++;
        scoreEl.innerText = score;
        playSound('eat');
        createFood();

        if (foodEatenCount % 5 === 0) {
            updateStage();
        } else if (foodEatenCount % 3 === 0 && !specialFood) {
            createSpecialFood();
        }
    } 
    else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
        score += 50;
        scoreEl.innerText = score;
        playSound('bonus_eat');
        specialFood = null;
        specialFoodRemainingTime = 0;
    } 
    else {
        snake.pop();
    }
}

// ==========================================
// 🎨 গ্রাফিক্স ও ক্যানভাস ড্রয়িং (Drawing)
// ==========================================
function draw() {
    ctx.fillStyle = "#1e272e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let obs of obstacles) {
        ctx.fillStyle = "#ea2027";
        ctx.fillRect(obs.x + 2, obs.y + 2, 16, 16);
    }

    if (food) {
        ctx.fillStyle = "#ffdd59";
        ctx.beginPath();
        ctx.arc(food.x + 10, food.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
    }

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

        ctx.shadowBlur = 0; 

        let timeLeft = Math.max(0, specialFoodRemainingTime / 1000);
        if (timeLeft > 0) {
            ctx.fillStyle = "#ffd700"; 
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`⏱️ Bonus: ${timeLeft.toFixed(1)}s`, canvas.width / 2, canvas.height - 15); 
        }
    }

    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? "#0be881" : "#05c46b";
        ctx.fillRect(part.x + 1, part.y + 1, 18, 18);
    });
}

// ==========================================
// 🛑 গেম ওভার ও লিডারবোর্ড সাবমিশন
// ==========================================
function gameOver() {
    running = false;
    isSnakeMoving = false;
    clearInterval(gameInterval);
    playSound('gameover');

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        highScoreEl.innerText = highScore;

        if (currentUser) {
            db.collection("users").doc(currentUser.uid).set({
                highScore: highScore
            }, { merge: true });
        }
    }

    setTimeout(() => {
        let playerName = currentUser ? currentUser.displayName : prompt(`Game Over! আপনার স্কোর: ${score}\nলিডারবোর্ডের জন্য আপনার নাম লিখুন:`);
        
        if (playerName && playerName.trim() !== "") {
            db.collection("leaderboard").add({
                name: playerName.trim(),
                score: score,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                alert("আপনার স্কোর লিডারবোর্ডে সফলভাবে যুক্ত হয়েছে! 🏆");
                showLeaderboard(); 
            }).catch((error) => {
                console.error("Error writing document: ", error);
            });
        }
    }, 300);

    // মেনু স্ক্রিন ফিরিয়ে আনা
    if (menuScreen) {
        menuScreen.style.display = "flex";
        playBtn.innerText = "Play Again";
    }
}

// ==========================================
// 🏆 গ্লোবাল লিডারবোর্ড ভিউ ফাংশন
// ==========================================
function showLeaderboard() {
    if (leaderboardList) leaderboardList.innerHTML = "<p>লোডিং...</p>";
    if (leaderboardModal) leaderboardModal.classList.remove("hidden");

    db.collection("leaderboard")
      .orderBy("score", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => {
          let listHtml = `<ol style="padding-left:20px; color:#fff; text-align:left;">`;
          querySnapshot.forEach((doc) => {
              let data = doc.data();
              listHtml += `<li style="margin-bottom:8px; border-bottom:1px solid #444; padding-bottom:4px;">
                            <strong>${data.name}</strong>: <span style="color:#ffd700;">${data.score} Pts</span>
                          </li>`;
          });
          listHtml += `</ol>`;
          if (leaderboardList) leaderboardList.innerHTML = listHtml;
      }).catch((error) => {
          console.error("Error fetching leaderboard: ", error);
          if (leaderboardList) leaderboardList.innerHTML = "<p>স্কোর লোড করতে ব্যর্থ হয়েছে।</p>";
      });
}

// ==========================================
// ⌨️ কন্ট্রোল ও ইভেন্ট লিসেনারসমূহ
// ==========================================
window.addEventListener("keydown", e => {
    if (!running) return;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyS","KeyA","KeyD"].includes(e.code)) {
        isSnakeMoving = true;
    }

    switch(e.code) {
        case "ArrowUp":
        case "KeyW":
            if (dy === 0) { dx = 0; dy = -20; }
            break;
        case "ArrowDown":
        case "KeyS":
            if (dy === 0) { dx = 0; dy = 20; }
            break;
        case "ArrowLeft":
        case "KeyA":
            if (dx === 0) { dx = -20; dy = 0; }
            break;
        case "ArrowRight":
        case "KeyD":
            if (dx === 0) { dx = 20; dy = 0; }
            break;
    }
});

// মেনু থেকে প্লে বাটনে ক্লিক
if (playBtn) {
    playBtn.addEventListener("click", () => {
        if (menuScreen) menuScreen.style.display = "none";
        running = true;
        initGame();
    });
}

// গেম খেলার সময় Pause বাটনে ক্লিক
if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
        if (running) {
            running = false;
            clearInterval(gameInterval);
            pauseBtn.innerText = "▶ Resume";
            pauseBtn.style.background = "#0be881";
        } else {
            running = true;
            gameInterval = setInterval(game, gameSpeed);
            pauseBtn.innerText = "⏸ Pause";
            pauseBtn.style.background = ""; // আগের ডিফল্ট রঙে ফিরে যাবে
        }
    });
}

// গ্লোবাল লিডারবোর্ড বাটন ক্লিকের কাজ
if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", showLeaderboard);
}

// লিডারবোর্ড বন্ধ করার ব্যাক বাটন
if (closeLeaderboard) {
    closeLeaderboard.addEventListener("click", () => {
        if (leaderboardModal) leaderboardModal.classList.add("hidden");
    });
}
