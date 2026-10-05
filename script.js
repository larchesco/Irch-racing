const player = document.getElementById('player-car'); const gameZone = document.getElementById('game-zone');
const scoreDisplay = document.getElementById('score'); const startBtn = document.getElementById('start-btn');
const diffBox = document.getElementById('diff-box'); const gameOverScreen = document.getElementById('game-over-screen');
const goResult = document.getElementById('go-result'); const lbRowsContainer = document.getElementById('leaderboard-rows');

let playerX = 150; let score = 0; let gameInterval; let enemyInterval; let isGameRunning = false;
let currentDifficulty = 'easy'; let baseEnemySpeed = 4; let baseSpawnRate = 1200;
let enemySpeed = 4; let spawnRate = 1200; let lastDifficultyScore = 0; let hardClickCount = 0;
const keys = { left: false, right: false }; let currentLang = 'en'; let playerNickname = ""; let playerEmail = "";

const translations = {
    en: {
        title: "IRCH-RACING", scoreText: "SPEED SCORE", start: "START RACE", restart: "RESTART RACE",
        easy: "Easy", medium: "Medium", hard: "Hard", ultra: "ULTRA HARD 💀", goTitle: "GAME OVER", goScore: "Your Score: ",
        lbTitle: "WORLD TOP 3", emptyLb: "No records yet", emailPrompt: "Enter your Email:", namePrompt: "Enter your Nickname:",
        emailExists: "Email taken!", nameExists: "Nickname taken!"
    },
    ru: {
        title: "ИГРА IRCH-RACING", scoreText: "ОЧКИ СКОРОСТИ", start: "СТАРТ ИГРЫ", restart: "РЕСТАРТ ИГРЫ",
        easy: "Легко", medium: "Средне", hard: "Сложно", ultra: "УЛЬТРА ХАРД 💀", goTitle: "ИГРА ОКОНЧЕНА", goScore: "Твой результат: ",
        lbTitle: "МИРОВОЙ ТОП 3", emptyLb: "Еще нет рекордов", emailPrompt: "Введи свой Email:", namePrompt: "Введи свой Никнейм:",
        emailExists: "Email занят!", nameExists: "Никнейм занят!"
    }
};

async function checkPlayerOnlineAuth() {
    playerEmail = localStorage.getItem('lrch_user_email'); playerNickname = localStorage.getItem('lrch_user_name');
    if (!db) { playerNickname = "Local_Racer"; return; } // Безпечний режим, якщо Google заблоковано
    
    if (!playerEmail || !playerNickname) {
        let uniqueAuth = false;
        while (!uniqueAuth) {
            let emailInput = prompt(translations[currentLang].emailPrompt);
            if (!emailInput || emailInput.trim() === "") emailInput = "guest" + Math.floor(Math.random() * 10000) + "@lrch.com";
            emailInput = emailInput.trim().toLowerCase();
            let nameInput = prompt(translations[currentLang].namePrompt);
            if (!nameInput || nameInput.trim() === "") nameInput = "Racer_" + Math.floor(Math.random() * 900 + 100);
            nameInput = nameInput.trim().substring(0, 12);
            const emailCheck = await db.collection("users").where("email", "==", emailInput).get();
            const nameCheck = await db.collection("users").where("name", "==", nameInput).get();
            if (!emailCheck.empty) { alert(translations[currentLang].emailExists); }
            else if (!nameCheck.empty) { alert(translations[currentLang].nameExists); }
            else {
                await db.collection("users").add({ email: emailInput, name: nameInput });
                localStorage.setItem('lrch_user_email', emailInput); localStorage.setItem('lrch_user_name', nameInput);
                playerEmail = emailInput; playerNickname = nameInput; uniqueAuth = true;
            }
        }
    }
    updateLeaderboardDisplay();
}
async function updateLeaderboardDisplay() {
    lbRowsContainer.innerHTML = '';
    if (!db) { lbRowsContainer.innerHTML = `<div class="lb-row" style="justify-content: center; color: #646469;">Offline Mode</div>`; return; }
    try {
        const snapshot = await db.collection(`records_${currentDifficulty}`).orderBy("score", "desc").limit(3).get();
        if (snapshot.empty) { lbRowsContainer.innerHTML = `<div class="lb-row" style="justify-content: center; color: #646469;">${translations[currentLang].emptyLb}</div>`; return; }
        let index = 0;
        snapshot.forEach(doc => {
            const data = doc.data(); const row = document.createElement('div'); row.classList.add('lb-row');
            row.innerHTML = `<div><span class="lb-rank">#${index+1}</span><span class="lb-name">${data.name}</span></div><div class="lb-score">${data.score}</div>`;
            lbRowsContainer.appendChild(row); index++;
        });
    } catch (e) { lbRowsContainer.innerHTML = `<div class="lb-row" style="justify-content: center; color: #646469;">Loading...</div>`; }
}
async function checkAndSaveRecord(finalScore) {
    if (!playerNickname || !db) return;
    try {
        const snapshot = await db.collection(`records_${currentDifficulty}`).orderBy("score", "desc").limit(3).get();
        let isTopRecord = false; let records = []; snapshot.forEach(doc => records.push(doc.data()));
        if (records.length < 3 || finalScore > records[records.length - 1].score) isTopRecord = true;
        if (isTopRecord) {
            await db.collection(`records_${currentDifficulty}`).add({ name: playerNickname, score: finalScore, email: playerEmail, date: new Date() });
            updateLeaderboardDisplay();
        }
    } catch (e) { console.log("Error: ", e); }
}
function setLanguage(lang) {
    currentLang = lang; document.getElementById('game-title').innerText = translations[lang].title;
    document.getElementById('score-text').innerText = translations[lang].scoreText; document.getElementById('go-title').innerText = translations[lang].goTitle;
    document.getElementById('lb-title-text').innerText = translations[lang].lbTitle; goResult.innerText = translations[lang].goScore + score;
    if (!isGameRunning) startBtn.innerText = startBtn.innerText.includes('RESTART') || startBtn.innerText.includes('РЕСТАРТ') ? translations[lang].restart : translations[lang].start;
    document.getElementById('diff-easy').innerText = translations[lang].easy; document.getElementById('diff-medium').innerText = translations[lang].medium;
    document.getElementById('diff-hard').innerText = currentDifficulty === 'ultra' ? translations[lang].ultra : translations[lang].hard;
    document.getElementById('btn-en').classList.remove('active'); document.getElementById('btn-ru').classList.remove('active');
    document.getElementById('btn-' + lang).classList.add('active'); updateLeaderboardDisplay();
}
function selectDifficulty(level) {
    if (isGameRunning) return; const hardBtn = document.getElementById('diff-hard');
    if (level === 'hard') {
        hardClickCount++;
        if (hardClickCount >= 5) {
            level = 'ultra'; currentDifficulty = 'ultra'; hardBtn.innerText = translations[currentLang].ultra;
            hardBtn.style.backgroundColor = '#9146ff'; hardBtn.style.borderColor = '#9146ff'; hardBtn.style.color = '#fff'; hardBtn.style.boxShadow = '0 0 25px #9146ff';
        }
    } else { hardClickCount = 0; hardBtn.style = ""; hardBtn.innerText = translations[currentLang].hard; }
    currentDifficulty = level; document.getElementById('diff-easy').classList.remove('active'); document.getElementById('diff-medium').classList.remove('active'); hardBtn.classList.remove('active');
    if (level === 'ultra') hardBtn.classList.add('active'); else document.getElementById('diff-' + level).classList.add('active');
    if (level === 'easy') { baseEnemySpeed = 4; baseSpawnRate = 1200; } else if (level === 'medium') { baseEnemySpeed = 6; baseSpawnRate = 900; }
    else if (level === 'hard') { baseEnemySpeed = 8; baseSpawnRate = 650; } else if (level === 'ultra') { baseEnemySpeed = 12; baseSpawnRate = 400; }
    updateLeaderboardDisplay();
}
document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A' || event.key === 'ф' || event.key === 'Ф') keys.left = true;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D' || event.key === 'в' || event.key === 'В') keys.right = true;
});
document.addEventListener('keyup', function(event) {
    if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A' || event.key === 'ф' || event.key === 'Ф') keys.left = false;
    if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D' || event.key === 'в' || event.key === 'В') keys.right = false;
});
const btnLeft = document.getElementById('btn-left'); const btnRight = document.getElementById('btn-right');
btnLeft.addEventListener('mousedown', () => keys.left = true); btnLeft.addEventListener('mouseup', () => keys.left = false);
btnRight.addEventListener('mousedown', () => keys.right = true); btnRight.addEventListener('mouseup', () => keys.right = false);
btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; }); btnLeft.addEventListener('touchend', () => keys.left = false);
btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; }); btnRight.addEventListener('touchend', () => keys.right = false);
function gameLoop() {
    if (!isGameRunning) return;
    if (keys.left && playerX > 10) playerX -= 5; if (keys.right && playerX < 285) playerX += 5;
    player.style.left = playerX + 'px'; requestAnimationFrame(gameLoop);
}
function startGame() {
    if (isGameRunning) return; document.querySelectorAll('.enemy-car').forEach(enemy => enemy.remove());
    gameOverScreen.style.display = 'none'; isGameRunning = true; score = 0; playerX = 150;
    enemySpeed = baseEnemySpeed; spawnRate = baseSpawnRate; lastDifficultyScore = 0;
    player.style.left = playerX + 'px'; scoreDisplay.innerText = score; startBtn.style.display = 'none'; diffBox.style.display = 'none';
    keys.left = false; keys.right = false; requestAnimationFrame(gameLoop);
    gameInterval = setInterval(() => {
        score += 1; scoreDisplay.innerText = score;
        if (score - lastDifficultyScore >= 200) {
            lastDifficultyScore = score; enemySpeed += 1;
            if (spawnRate > 200) { spawnRate -= 80; clearInterval(enemyInterval); enemyInterval = setInterval(spawnSystem, spawnRate); }
        }
    }, 100);
    enemyInterval = setInterval(spawnSystem, spawnRate);
}
function spawnSystem() {
    if (!isGameRunning) return; createEnemy();
    let secondCarChance = currentDifficulty === 'ultra' ? 0.95 : (currentDifficulty === 'hard' ? 0.8 : (currentDifficulty === 'medium' ? 0.5 : 0.3));
    let secondCarScoreTrigger = currentDifficulty === 'ultra' ? 0 : (currentDifficulty === 'hard' * 100 ? 100 : (currentDifficulty === 'medium' ? 250 : 400));
    if (score >= secondCarScoreTrigger && Math.random() < secondCarChance) setTimeout(createEnemy, 120);
    let thirdCarChance = currentDifficulty === 'ultra' ? 0.75 : (currentDifficulty === 'hard' ? 0.5 : 0.2);
    let thirdCarScoreTrigger = currentDifficulty === 'ultra' ? 50 : 600;
    if (score >= thirdCarScoreTrigger && Math.random() < thirdCarChance) setTimeout(createEnemy, 240);
}
function createEnemy() {
    if (!isGameRunning) return; const enemy = document.createElement('div'); enemy.classList.add('enemy-car');
    let enemyX = Math.floor(Math.random() * 285); enemy.style.left = enemyX + 'px'; enemy.style.top = '-70px';
    gameZone.appendChild(enemy); let enemyY = -70;
    let moveEnemyInterval = setInterval(() => {
        if (!isGameRunning) { clearInterval(moveEnemyInterval); return; }
        enemyY += enemySpeed; enemy.style.top = enemyY + 'px';
        let pLeft = playerX; let pRight = playerX + 40; let pTop = 350; let pBottom = 420;
        let eLeft = enemyX; let eRight = enemyX + 45; let eTop = enemyY; let eBottom = enemyY + 70;
        if (pLeft < eRight && pRight > eLeft && pTop < eBottom && pBottom > eTop) { endGame(); clearInterval(moveEnemyInterval); }
        if (enemyY > 420) { enemy.remove(); clearInterval(moveEnemyInterval); }
    }, 10);
}
function endGame() {
    isGameRunning = false; clearInterval(gameInterval); clearInterval(enemyInterval);
    goResult.innerText = translations[currentLang].goScore + score; gameOverScreen.style.display = 'flex';
    startBtn.innerText = translations[currentLang].restart; startBtn.style.display = 'block'; diffBox.style.display = 'flex';
    checkAndSaveRecord(score); hardClickCount = 0;
}
checkPlayerOnlineAuth();
