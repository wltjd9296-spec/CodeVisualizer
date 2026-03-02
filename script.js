// --- 탭 메뉴 전환 로직 (기존과 동일) ---
const navItems = document.querySelectorAll('.nav-item');
const pageSections = document.querySelectorAll('.page-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        pageSections.forEach(page => page.classList.remove('active-page'));
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active-page');
        if(targetId === 'page-visualizer') resizeCanvas();
    });
});

// --- 오디오 및 시각화 로직 ---
const codeInput = document.getElementById('codeInput');
const convertBtn = document.getElementById('convertBtn');
const stopBtn = document.getElementById('stopBtn');
const canvas = document.getElementById('visualCanvas');
const ctx = canvas.getContext('2d');

const oscTypeSelect = document.getElementById('oscType');
const speedControl = document.getElementById('speedControl');
const statusText = document.getElementById('statusText');
const depthText = document.getElementById('depthText');

function resizeCanvas() {
    if(canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let audioCtx;
let notesData = [];
let isAnimating = false;
let isPlaying = false;

const pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

const ParserEngine = {
    analyze: function(code) {
        let max = 0, current = 0;
        for (let i = 0; i < code.length; i++) {
            if (code[i] === '{') { current++; if (current > max) max = current; } 
            else if (code[i] === '}') { current--; if (current < 0) current = 0; }
        }
        return max;
    }
};

function getRandomNeonColor() {
    const colors = ['102, 252, 241', '255, 0, 255', '0, 255, 204', '255, 215, 0'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 오디오 재생 함수 (8일 차 튜닝 버전)
function playTone(freq, startTime, duration, type) {
    if (!isPlaying) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.value = freq;
    const safeTime = Math.max(startTime, audioCtx.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0, safeTime);
    gainNode.gain.linearRampToValueAtTime(0.2, safeTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, safeTime + duration + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start(safeTime);
    oscillator.stop(safeTime + duration + 0.1);
}

function playKick(startTime) {
    if (!isPlaying) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const safeTime = Math.max(startTime, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, safeTime);
    osc.frequency.exponentialRampToValueAtTime(10, safeTime + 0.1); 
    gain.gain.setValueAtTime(0, safeTime);
    gain.gain.linearRampToValueAtTime(0.4, safeTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, safeTime + 0.1);
    osc.start(safeTime);
    osc.stop(safeTime + 0.1);
}

function playHiHat(startTime) {
    if (!isPlaying) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    const safeTime = Math.max(startTime, audioCtx.currentTime + 0.05);
    osc.type = 'square';
    osc.frequency.value = 4000;
    filter.type = 'highpass';
    filter.frequency.value = 3000; 
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0, safeTime);
    gain.gain.linearRampToValueAtTime(0.03, safeTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, safeTime + 0.05);
    osc.start(safeTime);
    osc.stop(safeTime + 0.05);
}

// 🎨 애니메이션 드로잉 루프
function draw() {
    if (!isAnimating) return;
    requestAnimationFrame(draw);

    ctx.fillStyle = "rgba(6, 6, 8, 0.15)"; // 더 깊은 배경 잔상
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying) return;
    const now = audioCtx.currentTime;

    // 1. 노드 간의 연결 선 먼저 그리기
    ctx.lineWidth = 1;
    for (let i = 0; i < notesData.length; i++) {
        const note = notesData[i];
        if (note.parentIndex !== -1 && now >= note.startTime) {
            const parent = notesData[note.parentIndex];
            
            // 부모와 자식 모두 현재 활성 상태이거나 최근 재생된 경우에만 선 표시
            const timeDiff = now - note.startTime;
            if (timeDiff >= 0 && timeDiff < 1.5) {
                const alpha = Math.max(0, 1 - timeDiff / 1.5);
                ctx.strokeStyle = `rgba(102, 252, 241, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.moveTo(parent.x, parent.y);
                ctx.lineTo(note.x, note.y);
                ctx.stroke();
            }
        }
    }

    // 2. 노드(글자) 그리기
    for (let i = 0; i < notesData.length; i++) {
        const note = notesData[i];
        const endTime = note.startTime + note.duration + 1.0; 
        
        if (now >= note.startTime && now <= endTime) {
            let progress = (now - note.startTime) / note.duration;
            if (progress > 1) progress = 1;

            let alpha = 1;
            if (now > note.startTime + note.duration) {
                alpha = 1 - ((now - (note.startTime + note.duration)) / 1.0);
            }

            // 노드 위치에 작은 원 그리기
            ctx.fillStyle = `rgba(${note.color}, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(note.x, note.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // 글자 텍스트
            const yOffset = Math.sin(progress * Math.PI) * 20; 
            ctx.fillStyle = `rgba(${note.color}, ${alpha})`;
            ctx.shadowColor = `rgb(${note.color})`;
            ctx.shadowBlur = note.isSpecial ? 15 : 5;
            ctx.font = `bold ${14 + progress * 10}px 'Fira Code'`;
            ctx.fillText(note.char, note.x + 10, note.y - yOffset);
            ctx.shadowBlur = 0;
        }
    }
}

convertBtn.addEventListener('click', () => {
    try {
        const code = codeInput.value;
        if (code.trim() === '') return;

        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.resume();
        isPlaying = true;

        const noteDuration = parseFloat(speedControl.value);
        const selectedOscType = oscTypeSelect.value;

        notesData = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const keywords = ['if', 'for', 'while', 'return', 'int', 'void', 'function', 'class', 'printf'];
        const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        let keywordIndices = new Set();
        let match;
        while ((match = keywordRegex.exec(code)) !== null) {
            for (let j = 0; j < match[0].length; j++) keywordIndices.add(match.index + j);
        }

        const now = audioCtx.currentTime + 0.1;
        let validCharCount = 0;
        let currentDepth = 0;
        let depthParentTracker = [-1]; // 각 깊이 레벨의 마지막 노드 인덱스 추적

        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            if (char === ' ' || char === '\n' || char === '\r') continue;

            const startTime = now + (validCharCount * noteDuration);
            const charCode = code.charCodeAt(i);
            let frequency = pentatonicScale[charCode % pentatonicScale.length];

            let charColor = getRandomNeonColor();
            let isSpecial = false;

            // 깊이 및 부모 노드 계산 로직
            if (char === '{') {
                playKick(startTime);
                currentDepth++;
                charColor = '255, 50, 50';
                isSpecial = true;
            } else if (char === '}') {
                playKick(startTime);
                currentDepth = Math.max(0, currentDepth - 1);
                charColor = '255, 50, 50';
                isSpecial = true;
            } else if (keywordIndices.has(i)) {
                playTone(frequency, startTime, noteDuration, selectedOscType);
                playHiHat(startTime);
                charColor = '255, 215, 0';
                isSpecial = true;
            } else {
                playTone(frequency, startTime, noteDuration, selectedOscType);
            }

            // 부모 노드 인덱스 결정 (같은 깊이의 이전 노드 혹은 상위 노드 연결)
            const parentIndex = depthParentTracker[currentDepth] || depthParentTracker[currentDepth - 1] || -1;

            notesData.push({
                char: char,
                startTime: startTime,
                duration: noteDuration,
                x: (currentDepth * 100) + 50 + (Math.random() * 50), // 깊이에 따라 오른쪽으로 배치
                y: (validCharCount % 15) * 40 + 100 + (Math.random() * 30),
                color: charColor,
                isSpecial: isSpecial,
                parentIndex: parentIndex
            });

            // 현재 깊이의 최신 노드로 업데이트
            depthParentTracker[currentDepth] = notesData.length - 1;
            validCharCount++;
        }

        depthText.textContent = ParserEngine.analyze(code);
        statusText.textContent = "연주 중...";
        statusText.className = "status-running";

        if (!isAnimating) {
            isAnimating = true;
            draw();
        }
    } catch (e) { alert(e.message); }
});

stopBtn.addEventListener('click', () => {
    isPlaying = false;
    if (audioCtx) audioCtx.suspend();
    statusText.textContent = "정지됨";
    statusText.className = "status-idle";
});
