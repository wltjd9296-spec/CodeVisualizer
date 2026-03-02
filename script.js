// --- 탭 메뉴 전환 (절대 안 뻗게 수정) ---
const navItems = document.querySelectorAll('.nav-item');
const pageSections = document.querySelectorAll('.page-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        pageSections.forEach(page => page.classList.remove('active-page'));
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        const targetPage = document.getElementById(targetId);
        if (targetPage) targetPage.classList.add('active-page');
        if (targetId === 'page-visualizer') setTimeout(resizeCanvas, 50);
    });
});

// --- 오디오 및 시각화 핵심 로직 ---
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
    if (canvas && canvas.parentElement) {
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

function getRandomNeonColor() {
    const colors = ['102, 252, 241', '255, 0, 255', '0, 255, 204', '255, 215, 0'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 오디오 재생 (더 안전한 타이밍 적용)
function playTone(freq, startTime, duration, type) {
    if (!isPlaying || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const now = audioCtx.currentTime;
    const safeStart = Math.max(startTime, now + 0.05);
    gain.gain.setValueAtTime(0, safeStart);
    gain.gain.linearRampToValueAtTime(0.2, safeStart + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, safeStart + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(safeStart);
    osc.stop(safeStart + duration + 0.1);
}

function playKick(startTime) {
    if (!isPlaying || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    const safeStart = Math.max(startTime, now + 0.05);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, safeStart);
    osc.frequency.exponentialRampToValueAtTime(10, safeStart + 0.1);
    gain.gain.setValueAtTime(0, safeStart);
    gain.gain.linearRampToValueAtTime(0.5, safeStart + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, safeStart + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(safeStart);
    osc.stop(safeStart + 0.1);
}

// 🎨 드로잉 애니메이션 (성능 최적화 및 방어 코드)
function draw() {
    if (!isAnimating) return;
    requestAnimationFrame(draw);
    if (!ctx) return;

    ctx.fillStyle = "rgba(6, 6, 8, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying) return;
    const now = audioCtx ? audioCtx.currentTime : 0;

    // 1. 선 그리기
    ctx.lineWidth = 1;
    notesData.forEach(note => {
        if (note.parentIndex !== -1 && notesData[note.parentIndex]) {
            const parent = notesData[note.parentIndex];
            if (now >= note.startTime && now <= note.startTime + 2.0) {
                const alpha = Math.max(0, 1 - (now - note.startTime) / 2.0);
                ctx.strokeStyle = `rgba(102, 252, 241, ${alpha * 0.4})`;
                ctx.beginPath();
                ctx.moveTo(parent.x, parent.y);
                ctx.lineTo(note.x, note.y);
                ctx.stroke();
            }
        }
    });

    // 2. 글자 노드 그리기
    notesData.forEach(note => {
        const endTime = note.startTime + note.duration + 1.0;
        if (now >= note.startTime && now <= endTime) {
            let progress = Math.min(1, (now - note.startTime) / note.duration);
            let alpha = (now > note.startTime + note.duration) 
                ? Math.max(0, 1 - (now - (note.startTime + note.duration)) / 1.0) 
                : 1;

            ctx.fillStyle = `rgba(${note.color}, ${alpha})`;
            ctx.shadowColor = `rgb(${note.color})`;
            ctx.shadowBlur = note.isSpecial ? 15 : 5;
            ctx.font = `bold ${14 + progress * 8}px 'Fira Code'`;
            ctx.fillText(note.char, note.x + 8, note.y);
            
            ctx.beginPath();
            ctx.arc(note.x, note.y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });
}

// 실행 버튼 이벤트
convertBtn.addEventListener('click', () => {
    try {
        const code = codeInput.value;
        if (!code.trim()) { alert("코드를 입력해주세요!"); return; }

        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        isPlaying = true;
        const noteDuration = parseFloat(speedControl.value) || 0.15;
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

        let currentDepth = 0;
        let lastNodePerDepth = {}; // 깊이별 마지막 노드 인덱스 저장
        let validCharCount = 0;
        const startTimeBase = audioCtx.currentTime + 0.1;

        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            if (char === ' ' || char === '\n' || char === '\r' || char === '\t') continue;

            const startTime = startTimeBase + (validCharCount * noteDuration);
            let isSpecial = false;
            let charColor = getRandomNeonColor();

            // 깊이 계산
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
                playTone(pentatonicScale[code.charCodeAt(i) % 10], startTime, noteDuration, selectedOscType);
                charColor = '255, 215, 0';
                isSpecial = true;
            } else {
                playTone(pentatonicScale[code.charCodeAt(i) % 10], startTime, noteDuration, selectedOscType);
            }

            // 노드 연결 관계 (부모 찾기)
            // 현재 깊이의 이전 노드가 있으면 연결, 없으면 상위 깊이 노드 연결
            let parentIdx = lastNodePerDepth[currentDepth] !== undefined 
                           ? lastNodePerDepth[currentDepth] 
                           : (lastNodePerDepth[currentDepth - 1] !== undefined ? lastNodePerDepth[currentDepth - 1] : -1);

            notesData.push({
                char: char,
                startTime: startTime,
                duration: noteDuration,
                x: (currentDepth * 80) + 50 + (Math.random() * 20),
                y: (validCharCount % 20) * 35 + 80,
                color: charColor,
                isSpecial: isSpecial,
                parentIndex: parentIdx
            });

            lastNodePerDepth[currentDepth] = notesData.length - 1;
            validCharCount++;
        }

        if (statusText) {
            statusText.textContent = "연주 중...";
            statusText.className = "status-running";
        }
        if (depthText) {
            let maxD = 0, currD = 0;
            for(let c of code) { if(c==='{') currD++; if(c==='}') currD--; if(currD>maxD) maxD=currD; }
            depthText.textContent = maxD;
        }

        if (!isAnimating) {
            isAnimating = true;
            draw();
        }
    } catch (err) {
        console.error(err);
        alert("실행 중 에러 발생: " + err.message);
    }
});

stopBtn.addEventListener('click', () => {
    isPlaying = false;
    if (audioCtx) audioCtx.suspend();
    if (statusText) {
        statusText.textContent = "정지됨";
        statusText.className = "status-idle";
    }
});
