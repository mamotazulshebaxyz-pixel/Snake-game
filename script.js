// ==========================================
// 🔥 FIREBASE কনফিগারেশন সেটআপ
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBYacL6qWCicCFKCOCJ7ajHZc36NoW94sM",
  authDomain: "sky-snake-game.firebaseapp.com",
  projectId: "sky-snake-game",
  storageBucket: "sky-snake-game.firebasestorage.app",
  messagingSenderId: "673768221080",
  appId: "1:673768221080:web:4ee4ce3ac09386bc36e3ed"
};

// ফায়ারবেস ইনিশিয়ালাইজ করা
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// ==========================================
// 🎮 গেমের গ্লোবাল ভেরিয়েবলসমূহ
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
let gameSpeed = 100; // মিলিসেকেন্ড
let gameInterval = null;

let specialFoodTimer = null;
let specialFoodRemainingTime = 5000; // বোনাস ফুডের সময় (৫ সেকেন্ড = ৫০০০ মিলি-সেকেন্ড)
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

// সাউন্ড প্লেয়ার ফাংশন
function playSound(type) {
    if (sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].play().catch(() => {});
    }
}

// ==========================================
// 🛠️ UI উপাদানসমূহ (HTML আইডি অনুযায়ী নির্ধারণ)
// ==========================================
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const stageEl = document.getElementById("stage");
const startBtn = document.getElementById("startBtn");

// লগইন এবং মেনু স্ক্রিন ভেরিয়েবল
const loginScreen = document.getElementById("login-screen");
const gameContainer = document.querySelector(".game");
const googleLoginBtn = document.getElementById("google-login-btn");
const menuScreen = document.getElementById("menu");

// এইচটিএমএল এ যদি "leaderboardBtn" নামে কোনো বাটন থেকে থাকে তা খোঁজা
const leaderboardBtn = document.getElementById("leaderboardBtn") || document.getElementById("viewLeaderboardBtn");

highScoreEl.innerText = highScore;

// ==========================================
// 🔐 গুগল অথেন্টিকেশন (Firebase Login Logic)
// ==========================================
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        // লগইন সফল হলে লগইন স্ক্রিন লুকিয়ে গেম স্ক্রিন দেখাবে
        if (loginScreen) loginScreen.style.display = "none";
        if (gameContainer) gameContainer.style.display = "block";
        if (menuScreen) menuScreen.style.display = "flex";
        
        // ডাটাবেজ থেকে ইউজারের হাই স্কোর সিঙ্ক করা
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
            alert("লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
        });
    });
}

// ==========================================
// 🛠️ গেম কন্ট্রোল এবং লজিক ফাংশন
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
    stageEl.innerText = currentStage;
    
    createFood();
    if(gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(game, gameSpeed);
}

function createFood() {
    let valid = false;
    while(!valid){
        food = {
            x: Math.floor(Math.random() * (canvas.width / 20)) * 20,
            y: Math.floor(Math.random() * (canvas.height / 20)) * 20
        };
        valid = true;
        for(let part of snake){
            if(part.x === food.x && part.y === food.y) valid = false;
        }
        for(let obs of obstacles){
            if(food.x === obs.x && food.y === obs.y) valid = false;
        }
    }
}

function createSpecialFood() {
    let valid = false;
    while(!valid){
        specialFood = {
            x: Math.floor(Math.random() * (canvas.width / 20)) * 20,
            y: Math.floor(Math.random() * (canvas.height / 20)) * 20
        };
        valid = true;
        for(let part of snake){
            if(part.x === specialFood.x && part.y === specialFood.y) valid = false;
        }
        if(food && specialFood.x === food.x && specialFood.y === food.y) valid = false;
        for(let obs of obstacles){
            if(specialFood.x === obs.x && specialFood.y === obs.y) valid = false;
        }
    }
    specialFoodRemainingTime = 5000; // বোনাস টাইমার ৫ সেকেন্ড রিসেট
    playSound('bonus_appear');
}

function generateObstacles() {
    obstacles = [];
    let count = currentStage * 3; 
    for(let i=0; i<count; i++){
        let valid = false;
        let obs = {};
        while(!valid){
            obs = {
                x: Math.floor(Math.random() * (canvas.width / 20)) * 20,
                y: Math.floor(Math.random() * (canvas.height / 20)) * 20
            };
            valid = true;
            if(Math.abs(obs.x - 200) < 60 && Math.abs(obs.y - 200) < 60) valid = false;
            for(let o of obstacles){
                if(o.x === obs.x && o.y === obs.y) valid = false;
            }
        }
        obstacles.push(obs);
    }
}

function updateStage() {
    currentStage++;
    stageEl.innerText = currentStage;
    playSound('stage_up');
    
    // স্পিড বাড়ানো
    gameSpeed = Math.max(40, 100 - (currentStage * 8));
    clearInterval(gameInterval);
    gameInterval = setInterval(game, gameSpeed);
    
    generateObstacles();
    createFood();
    
    // স্টেজ পার হওয়ার পর বোনাস ফুড দেওয়ার ফ্ল্যাগ
    shouldSpawnBonusAfterTransition = true; 
}

// ==========================================
// 🔁 মেইন গেম লুপ (Game Loop)
// ==========================================
function game() {
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
    if(!isSnakeMoving || !running) return;

    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    // দেয়াল পারাপার (Wall Wrap)
    if(head.x < 0) head.x = canvas.width - 20;
    if(head.x >= canvas.width) head.x = 0;
    if(head.y < 0) head.y = canvas.height - 20;
    if(head.y >= canvas.height) head.y = 0;

    // নিজের শরীর বা অবস্ট্যাকলের সাথে ধাক্কা লাগলে গেম ওভার
    for(let part of snake){
        if(head.x === part.x && head.y === part.y) { gameOver(); return; }
    }
    for(let obs of obstacles){
        if(head.x === obs.x && head.y === obs.y) { gameOver(); return; }
    }

    snake.unshift(head);

    // সাধারণ খাবার খাওয়া
    if(head.x === food.x && head.y === food.y){
        score += 10;
        foodEatenCount++;
        scoreEl.innerText = score;
        playSound('eat');
        createFood();

        if(foodEatenCount % 5 === 0){
            updateStage();
        } else if(foodEatenCount % 3 === 0 && !specialFood){
            createSpecialFood();
        }
    } 
    // বোনাস ক্রিস্টাল খাওয়া
    else if(specialFood && head.x === specialFood.x && head.y === specialFood.y){
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
// 🎨 গ্রাফিক্স ও ক্যানভাস ড্রয়িং (Drawing)
// ==========================================
function draw() {
    ctx.fillStyle = "#1e272e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // অবস্ট্যাকল (বাঁধা) আঁকা
    ctx.fillStyle = "#ea2027";
    for(let obs of obstacles){
        ctx.fillRect(obs.x + 2, obs.y + 2, 16, 16);
    }

    // সাধারণ খাবার (আপেল) আঁকা
    if(food){
        ctx.fillStyle = "#ffdd59";
        ctx.beginPath();
        ctx.arc(food.x + 10, food.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // 💎 বোনাস ক্রিস্টাল এবং স্টপ-ওয়াচ টাইমার আঁকা
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

        // ⏱️ পজ-বান্ধব ভিজ্যুয়াল টাইমার
        let timeLeft = Math.max(0, specialFoodRemainingTime / 1000);
        if (timeLeft > 0) {
            ctx.fillStyle = "#ffd700"; 
            ctx.font = "bold 13px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(`⏱️ Bonus: ${timeLeft.toFixed(1)}s`, canvas.width / 2, canvas.height - 15); 
        }
    }

    // সাপ আঁকা (Neon Green Style)
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

    if(score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        highScoreEl.innerText = highScore;

        if (currentUser) {
            db.collection("users").doc(currentUser.uid).set({
                highScore: highScore
            }, { merge: true });
        }
    }

    // নাম চাওয়া এবং লিডারবোর্ডে যুক্ত করা
    setTimeout(() => {
        let playerName = currentUser ? currentUser.displayName : prompt(`Game Over! আপনার স্কোর: ${score}\nগ্লোবাল লিডারবোর্ডের জন্য আপনার নাম লিখুন:`);
        if (playerName && playerName.trim() !== "") {
            db.collection("leaderboard").add({
                name: playerName.trim(),
                score: score,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                alert("আপনার স্কোর লিডারবোর্ডে সফলভাবে যুক্ত হয়েছে! 🏆");
                showLeaderboard(); 
            }).catch((error) => {
                console.error("Error writing document: ", error);
            });
        }
    }, 300);

    if (startBtn) {
        startBtn.innerText = "Play Again";
        startBtn.style.background = "#0be881";
        startBtn.style.color = "#fff";
    }
}

// ==========================================
// 🏆 গ্লোবাল লিডারবোর্ড ভিউ ফাংশন
// ==========================================
function showLeaderboard() {
    db.collection("leaderboard")
      .orderBy("score", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => {
          let listHtml = `<div style="text-align:left; font-family:sans-serif; max-height:300px; overflow-y:auto;">
                            <h3 style="text-align:center; color:#0be881; margin-top:0;">🏆 Top 10 High Scores</h3>
                            <ol style="padding-left:20px; color:#fff;">`;
          querySnapshot.forEach((doc) => {
              let data = doc.data();
              listHtml += `<li style="margin-bottom:8px; border-bottom:1px solid #444; padding-bottom:4px;">
                            <strong>${data.name}</strong>: <span style="color:#ffdd59;">${data.score} Pts</span>
                          </li>`;
          });
          listHtml += `</ol></div>`;

          // লিডারবোর্ড দেখানোর জন্য পপআপ তৈরি
          let modal = document.createElement("div");
          modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:9999;";
          modal.innerHTML = `
            <div style="background:#2c3e50; padding:25px; border-radius:12px; width:320px; text-align:center; box-shadow:0 0 20px rgba(11,232,129,0.3); border:2px solid #0be881;">
                ${listHtml}
                <button id="closeLeaderboardBtn" style="background:#ea2027; color:#fff; border:none; padding:8px 20px; border-radius:6px; cursor:pointer; font-weight:bold; margin-top:10px;">Close</button>
            </div>
          `;
          document.body.appendChild(modal);
          document.getElementById("closeLeaderboardBtn").onclick = () => modal.remove();
      });
}

// ==========================================
// ⌨️ Controls & Event Listeners
// ==========================================
window.addEventListener("keydown", e => {
    if(!running) return;
    
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyS","KeyA","KeyD"].includes(e.code)){
        isSnakeMoving = true;
    }

    switch(e.code) {
        case "ArrowUp":
        case "KeyW":
            if(dy === 0) { dx = 0; dy = -20; }
            break;
        case "ArrowDown":
        case "KeyS":
            if(dy === 0) { dx = 0; dy = 20; }
            break;
        case "ArrowLeft":
        case "KeyA":
            if(dx === 0) { dx = -20; dy = 0; }
            break;
        case "ArrowRight":
        case "KeyD":
            if(dx === 0) { dx = 20; dy = 0; }
            break;
    }
});

// স্টার্ট / পজ বাটনের কাজ
if (startBtn) {
    startBtn.addEventListener("click", () => {
        if(!running) {
            running = true;
            startBtn.innerText = "Pause";
            startBtn.style.background = "#ffdd59";
            startBtn.style.color = "#000";
            if(snake.length === 1 && dx === 0 && dy === 0) {
                initGame();
            } else {
                gameInterval = setInterval(game, gameSpeed);
            }
        } else {
            running = false;
            clearInterval(gameInterval);
            startBtn.innerText = "Resume";
            startBtn.style.background = "#0be881";
            startBtn.style.color = "#fff";
        }
    });
}

// গ্লোবাল লিডারবোর্ড বাটন ক্লিকের কাজ (নিরাপদ চেক সহ)
if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", showLeaderboard);
}
