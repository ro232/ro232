const TOTAL_QUESTIONS = 10;
let currentQuestionIndex = 0;
let score = 0;
let userHistory = [];
let currentLevel = 1; // 1: Easy, 2: Medium, 3: Hard
let startTime = 0;
let selectedMode = 'math'; // 'math', 'series', 'neighbors'

function selectMode(mode) {
    selectedMode = mode;
    document.getElementById('mode-selection').classList.add('hidden');
    document.getElementById('level-selection').classList.remove('hidden');
}

function showModes() {
    document.getElementById('mode-selection').classList.remove('hidden');
    document.getElementById('level-selection').classList.add('hidden');
}

// Persistence State
let playerData = {
    coins: 0,
    inventory: [], // IDs of owned items
    equipped: null, // ID of equipped item
    leaderboard: [] // [{score: 10, time: 120, date: '...'}]
};

// Store Items
const storeItems = [
    { id: 'hat_top', name: 'Joben', price: 10, icon: '🎩' },
    { id: 'hat_cowboy', name: 'Pălărie Cowboy', price: 15, icon: '🤠' },
    { id: 'glasses_sun', name: 'Ochelari', price: 20, icon: '🕶️' },
    { id: 'crown', name: 'Coroană', price: 50, icon: '👑' },
    { id: 'bow', name: 'Funda', price: 5, icon: '🎀' }
];

const screens = {
    welcome: document.getElementById('welcome-screen'),
    game: document.getElementById('game-screen'),
    results: document.getElementById('results-screen'),
    store: document.getElementById('store-screen')
};

const mascot = {
    el: document.getElementById('mascot'),
    accessoryEl: document.getElementById('mascot-accessory'),
    msg: document.getElementById('mascot-message'),

    setEmotion: function (emotion) {
        this.el.className = '';
        void this.el.offsetWidth;

        if (emotion === 'happy') {
            this.el.textContent = '🥳';
            this.el.classList.add('bounce');
            this.say("Bravo!");
        } else if (emotion === 'sad') {
            this.el.textContent = '😢';
            this.el.classList.add('shake');
            this.say("Oh nu!");
        } else if (emotion === 'thinking') {
            this.el.textContent = '🤔';
            this.msg.style.opacity = 0;
        } else {
            this.el.textContent = '🐻'; // Idle
            this.msg.style.opacity = 0;
        }
    },
    say: function (text) {
        this.msg.textContent = text;
        this.msg.style.opacity = 1;
    },
    updateAppearance: function () {
        if (playerData.equipped) {
            const item = storeItems.find(i => i.id === playerData.equipped);
            this.accessoryEl.textContent = item ? item.icon : '';
        } else {
            this.accessoryEl.textContent = '';
        }
    },
    cloneToResult: function () {
        const resultContainer = document.getElementById('result-mascot-container');
        resultContainer.innerHTML = ''; // Clear previous

        const wrapper = document.createElement('div');
        wrapper.id = 'mascot-wrapper';

        const bear = document.createElement('div');
        bear.id = 'mascot';
        bear.textContent = '🥳'; // Happy bear
        bear.classList.add('bounce');

        const acc = document.createElement('div');
        acc.id = 'mascot-accessory';
        acc.className = 'accessory';

        if (playerData.equipped) {
            const item = storeItems.find(i => i.id === playerData.equipped);
            acc.textContent = item ? item.icon : '';
        }

        wrapper.appendChild(bear);
        wrapper.appendChild(acc);
        resultContainer.appendChild(wrapper);
    }
};

function loadData() {
    const saved = localStorage.getItem('mathApp_data');
    if (saved) {
        let loaded = JSON.parse(saved);
        // Merge to ensure new fields exist
        playerData = { ...playerData, ...loaded };
        if (!playerData.leaderboard) playerData.leaderboard = [];
    }
    updateCoinDisplay();
    mascot.updateAppearance();
    renderLeaderboard();
}

function saveData() {
    localStorage.setItem('mathApp_data', JSON.stringify(playerData));
    updateCoinDisplay();
}

function updateCoinDisplay() {
    document.getElementById('coin-count').textContent = playerData.coins;
    document.getElementById('store-coin-count').textContent = playerData.coins;
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Helper to migrate old data without names
function renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    // Sort: High score desc, Low time asc
    const sorted = [...playerData.leaderboard].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.time - b.time;
    }).slice(0, 5); // Start with top 5

    sorted.forEach((entry, i) => {
        const tr = document.createElement('tr');
        const name = entry.name ? entry.name : 'Jucător';
        tr.innerHTML = `
            <td>${i + 1}. ${name}</td>
            <td>${entry.score}</td>
            <td>${formatTime(entry.time)}</td>
        `;
        tbody.appendChild(tr);
    });

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Joacă pentru a fi primul!</td></tr>';
    }
}

function showScreen(screenName) {
    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    screens[screenName].classList.remove('hidden');
    screens[screenName].classList.add('active');
}

// Event Listeners
// document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', () => {
    // Save coins from session if any logic needed, actually coins saved immediately on earn
    showScreen('welcome');
    // Ensure we reset to mode selection state
    document.getElementById('mode-selection').classList.remove('hidden');
    document.getElementById('level-selection').classList.add('hidden');
    renderLeaderboard(); // Refresh in case updated
});
document.getElementById('open-store-btn').addEventListener('click', openStore);
document.getElementById('close-store-btn').addEventListener('click', () => showScreen('welcome'));

// Load data on start
loadData();

function startGame(level) {
    currentLevel = level;
    currentQuestionIndex = 0;
    score = 0;
    userHistory = [];
    startTime = Date.now(); // Start Timer
    showScreen('game');
    mascot.setEmotion('idle');
    nextQuestion();
}

function generateQuestion() {
    let type = selectedMode;

    // In expert math mode, random chance to see other types
    if (selectedMode === 'math' && currentLevel >= 2) {
        let rand = Math.random();
        if (rand < 0.2) type = 'series';
        else if (rand < 0.4 && currentLevel >= 2) type = 'neighbors'; // Neighbors mainly for 2+
        else if (rand < 0.6 && currentLevel === 3) type = 'signs';
    }

    if (type === 'series') return generateSeries();
    if (type === 'neighbors') return generateNeighbors();
    if (type === 'signs') return generateSigns();

    // --- MATH MODE (Default) ---
    // Level scaling: 
    // Easy: 1-10 (+/- 1,2)
    // Medium: 1-20 (+/- 1-5)
    // Expert: 1-100 (+/- 1-10) + Mystery Mode Logic

    let num1, num2, operator, isAddition;
    let isValid = false;
    let maxNum = currentLevel >= 2 ? 20 : 10;
    let maxMove = currentLevel >= 2 ? 5 : 2;
    if (currentLevel === 3) { maxNum = 50; maxMove = 10; }

    while (!isValid) {
        num1 = Math.floor(Math.random() * maxNum) + 1;
        num2 = Math.floor(Math.random() * maxMove) + 1;
        isAddition = Math.random() > 0.5;

        if (isAddition) {
            operator = '+';
            isValid = true;
        } else {
            operator = '-';
            if (num1 - num2 >= 0) isValid = true;
        }
    }

    let correctAnswer = isAddition ? num1 + num2 : num1 - num2;
    let questionStr = `${num1} ${operator} ${num2}`;

    // Expert Mode Logic (Mystery) only for Math Mode Level 3
    let isExpert = currentLevel === 3;
    if (isExpert) {
        const type = Math.floor(Math.random() * 3);
        if (type === 1) {
            questionStr = `? ${operator} ${num2} = ${correctAnswer}`;
            correctAnswer = num1;
        } else if (type === 2) {
            questionStr = `${num1} ${operator} ? = ${correctAnswer}`;
            correctAnswer = num2;
        }
    }

    // Render Visuals if not Expert
    const visContainer = document.getElementById('visual-aid');
    visContainer.innerHTML = '';

    if (!isExpert && currentLevel <= 2 && type === 'math') {
        // Simple visuals: render fruits
        // 3 + 2 -> 🍎🍎🍎 + 🍎🍎
        let html = '';
        for (let i = 0; i < num1; i++) html += '🍎';
        html += ` <b>${operator}</b> `;
        for (let i = 0; i < num2; i++) html += '🍌';
        visContainer.innerHTML = html;
    }

    return {
        text: questionStr,
        correct: correctAnswer,
        isExpert: isExpert && questionStr.includes('=') && type === 'math',
        type: 'math'
    };
}

function generateSeries() {
    let maxStart, stepMax;

    switch (currentLevel) {
        case 1: // Easy
            maxStart = 10;
            stepMax = 1;
            break;
        case 2: // Medium
            maxStart = 20;
            stepMax = 2;
            break;
        case 3: // Expert
            maxStart = 50;
            stepMax = 5;
            break;
        default: maxStart = 10; stepMax = 1;
    }

    let start = Math.floor(Math.random() * maxStart) + 1;
    let step = Math.floor(Math.random() * stepMax) + 1;

    let n1 = start;
    let n2 = start + step;
    let n3 = start + step * 2;
    let correct = start + step * 3;

    return {
        text: `${n1}, ${n2}, ${n3}, ?`,
        correct: correct,
        type: 'series'
    };
}

function generateNeighbors() {
    let maxCenter;
    switch (currentLevel) {
        case 1: maxCenter = 10; break;
        case 2: maxCenter = 30; break;
        case 3: maxCenter = 100; break;
        default: maxCenter = 10;
    }

    // Ensure center is at least 2 so we have a left neighbor
    let center = Math.floor(Math.random() * (maxCenter - 2)) + 2;
    let correct = `${center - 1} și ${center + 1}`;

    return {
        text: `_ ${center} _`,
        correct: correct,
        center: center,
        type: 'neighbors'
    };
}

function generateSigns() {
    // Detectiv Mode: Identify Operator or Rule

    // Level 1: Operator (+ or -)
    // 3 ? 1 = 4 -> Answer: "+"
    if (currentLevel === 1) {
        let num1 = Math.floor(Math.random() * 8) + 2;
        let num2 = Math.floor(Math.random() * 2) + 1;
        let res = Math.random() > 0.5 ? num1 + num2 : num1 - num2;
        let isAdd = (num1 + num2 === res); // Determine if it was addition or subtraction

        return {
            text: `${num1} [ ? ] ${num2} = ${res}`,
            correct: isAdd ? '+' : '-',
            type: 'signs'
        };
    }

    // Level 2 & 3: Series Rule (e.g. 2 -> 4 -> 6)
    // Answer: "+2"
    let start = Math.floor(Math.random() * 10) + 1;
    let step = Math.floor(Math.random() * (currentLevel === 3 ? 4 : 2)) + 1; // 1 to 2 or 4
    let isAdd = true; // For simplicity in series usually going up, but can add down later

    let n1 = start;
    let n2 = start + step;
    let n3 = start + step * 2;

    return {
        text: `${n1} ➡ ${n2} ➡ ${n3}`,
        correct: `+${step}`,
        type: 'signs'
    };
}

function nextQuestion() {
    if (currentQuestionIndex >= TOTAL_QUESTIONS) {
        showResults();
        return;
    }

    mascot.setEmotion('thinking');

    const progressFill = document.getElementById('progress-fill');
    progressFill.style.width = `${((currentQuestionIndex) / TOTAL_QUESTIONS) * 100}%`;

    const q = generateQuestion();
    // If expert mode already has =, don't add " = ?"
    if (q.isExpert || q.type === 'signs') {
        document.getElementById('question-text').textContent = q.text;
    } else {
        document.getElementById('question-text').textContent = `${q.text} = ?`;
    }

    generateAnswers(q.correct, q.text);
}

// Store Logic
function openStore() {
    showScreen('store');
    renderStore();
}

function renderStore() {
    const grid = document.getElementById('store-grid');
    grid.innerHTML = '';

    storeItems.forEach(item => {
        const isOwned = playerData.inventory.includes(item.id);
        const isEquipped = playerData.equipped === item.id;

        const el = document.createElement('div');
        el.className = `store-item ${isOwned ? 'owned' : ''}`;

        let actionBtn = '';
        if (isOwned) {
            if (isEquipped) {
                actionBtn = `<button class="equip-btn" disabled>Purtat</button>`;
            } else {
                actionBtn = `<button class="equip-btn" onclick="equipItem('${item.id}')">Poartă</button>`;
            }
        } else {
            const canAfford = playerData.coins >= item.price;
            actionBtn = `<button class="buy-btn" onclick="buyItem('${item.id}')" ${canAfford ? '' : 'disabled'}>Cumpără 🪙${item.price}</button>`;
        }

        el.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <strong>${item.name}</strong>
            ${actionBtn}
        `;
        grid.appendChild(el);
    });
}

function buyItem(id) {
    const item = storeItems.find(i => i.id === id);
    if (item && playerData.coins >= item.price) {
        playerData.coins -= item.price;
        playerData.inventory.push(id);
        saveData();
        renderStore();
        SoundSystem.playCorrect(); // Reuse sound
    } else {
        SoundSystem.playWrong();
    }
}

function equipItem(id) {
    if (playerData.inventory.includes(id)) {
        playerData.equipped = id;
        saveData();
        renderStore();
        mascot.updateAppearance();
    }
}

function generateAnswers(correct, questionText) {
    const container = document.getElementById('answers-container');
    container.innerHTML = '';

    let answers = new Set();
    answers.add(correct);

    // Check if it's a "Neighbors" question or "Signs" (string answers)
    const isStringAnswer = typeof correct === 'string';

    while (answers.size < 3) {
        if (isStringAnswer) {
            // Logic for Signs/Neighbors distractors
            if (correct === '+' || correct === '-') {
                answers.add(correct === '+' ? '-' : '+');
                answers.add('='); // Just a dummy
            } else if (correct.startsWith('+')) {
                // Rule like +2
                let num = parseInt(correct.substring(1));
                answers.add(`+${num + 1}`);
                answers.add(`+${num + 2}`);
                answers.add(`-${num}`);
            } else if (correct.includes('și')) {
                // Neighbor logic
                let rnd = Math.floor(Math.random() * 10) + 1;
                let fake = `${rnd - 1} și ${rnd + 1}`;
                if (fake !== correct && rnd > 1) answers.add(fake);
            }
        } else {
            // Normal Number Logic
            let offset = Math.floor(Math.random() * 5) - 2;
            if (offset === 0) continue;

            let wrong = correct + offset;
            if (wrong >= 0) {
                answers.add(wrong);
            } else {
                answers.add(correct + Math.abs(offset));
            }
        }
    }

    const answersArray = Array.from(answers).sort(() => Math.random() - 0.5);

    answersArray.forEach(ans => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = ans; // Works for both numbers and strings
        // For visual consistency, maybe make text smaller if string is long
        if (isStringAnswer) btn.style.fontSize = '1.2rem';

        btn.onclick = () => handleAnswer(ans, correct, questionText, btn);
        container.appendChild(btn);
    });
}

// --- Sound System ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = false;

document.getElementById('mute-btn').addEventListener('click', () => {
    isMuted = !isMuted;
    const btn = document.getElementById('mute-btn');
    btn.textContent = isMuted ? '🔇' : '🔊';
});

document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Sigur vrei să ștergi tot progresul (bani, accesorii, clasament)?')) {
        localStorage.removeItem('mathApp_data');
        location.reload();
    }
});

const SoundSystem = {
    playTone: function (freq, type, duration) {
        if (isMuted) return;
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },

    playCorrect: function () {
        // High pitch happy sound
        this.playTone(600, 'sine', 0.1);
        setTimeout(() => this.playTone(800, 'sine', 0.2), 100);
    },

    playWrong: function () {
        // Low pitch "womp womp"
        this.playTone(150, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.4), 200);
    },

    playWin: function () {
        // Victory fanfare
        const now = audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'square', 0.3), i * 150);
        });
    }
};

function handleAnswer(selected, correct, questionText, btnElement) {
    // Disable all buttons
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(b => b.disabled = true);

    const isCorrect = selected === correct;

    if (isCorrect) {
        btnElement.classList.add('correct');
        SoundSystem.playCorrect();
        mascot.setEmotion('happy');
        score++;
        // Reward Coin
        playerData.coins++;
        saveData();
    } else {
        btnElement.classList.add('wrong');
        SoundSystem.playWrong();
        mascot.setEmotion('sad');
        // Arata si raspunsul corect
        buttons.forEach(b => {
            if (parseInt(b.textContent) === correct) {
                b.classList.add('correct');
            }
        });
    }

    userHistory.push({
        question: questionText,
        correct: correct,
        user: selected,
        isCorrect: isCorrect
    });

    currentQuestionIndex++;

    // Asteapta putin inainte de urmatoarea intrebare
    setTimeout(() => {
        nextQuestion();
    }, 1500);
}

// Save Score Button Logic
document.getElementById('save-score-btn').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim() || 'Anonim';

    // Add to leaderboard
    playerData.leaderboard.push({
        score: score,
        time: Math.floor((Date.now() - startTime) / 1000),
        name: name,
        date: new Date().toISOString()
    });

    saveData();
    renderLeaderboard();

    // Disable inputs
    document.getElementById('player-name').disabled = true;
    document.getElementById('save-score-btn').disabled = true;
    document.getElementById('save-score-btn').textContent = "Salvat! ✅";
});

function showResults() {
    showScreen('results');

    // Calculate Time
    const endTime = Date.now();
    const elapsedSeconds = Math.floor((endTime - startTime) / 1000);
    const timeStr = formatTime(elapsedSeconds);

    document.getElementById('final-score').textContent = `${score} / ${TOTAL_QUESTIONS}`;
    document.getElementById('final-time').textContent = timeStr;

    // Show Name Input if Score > 0
    const inputContainer = document.getElementById('name-input-container');
    const nameInput = document.getElementById('player-name');
    const saveBtn = document.getElementById('save-score-btn');

    if (score > 0) {
        inputContainer.classList.remove('hidden');
        nameInput.value = '';
        nameInput.disabled = false;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvează 💾';
    } else {
        inputContainer.classList.add('hidden');
    }

    // Show Mascot
    mascot.cloneToResult();

    // Play sound & Confetti
    if (score > 0) {
        SoundSystem.playWin();
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    const reportContainer = document.getElementById('report-container');
    reportContainer.innerHTML = '';

    userHistory.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = `report-item ${item.isCorrect ? 'correct-item' : 'wrong-item'}`;

        const statusIcon = item.isCorrect ? '✔' : '✘';
        const text = document.createElement('span');
        text.innerHTML = `<strong>${index + 1}.</strong> ${item.question} = <strong>${item.correct}</strong> (Tu: ${item.user}) ${statusIcon}`;

        div.appendChild(text);
        reportContainer.appendChild(div);
    });
}
