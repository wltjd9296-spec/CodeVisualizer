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
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let audioCtx;
let notesData = [];
let isAnimating = false;
let codeDepth = 0;
let isPlaying = false;

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
    const colors = ['102, 252, 241', '69, 162, 158', '255, 0, 255', '0, 255, 204'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 기본 멜로디 연주
function playTone(freq, startTime, duration, type) {
    if (!isPlaying) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = freq;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

// 묵직한 킥 드럼 소리 (괄호 { } 용)
function playKick(startTime) {
    if (!isPlaying) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    // 주파수가 순식간에 떨어지면서 '쿵' 소리를 만듦
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.1);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
    
    osc.start(startTime);
    osc.stop(startTime + 0.1);
}

// 날카로운 하이햇 소리 (키워드 용)
function playHiHat(startTime) {
    if (!isPlaying) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'square';
    osc.frequency.value = 8000; // 고주파
    
    filter.type = 'highpass'; // 고주파만 통과시켜 치찰음(치직) 생성
    filter.frequency.value = 5000;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
    
    osc.start(startTime);
    osc.stop(startTime + 0.05);
}

function draw() {
    if (!isAnimating) return;
    requestAnimationFrame(draw);

    ctx.fillStyle = "rgba(11, 12, 16, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying) return;

    const now = audioCtx.currentTime;

    for (let i = 0; i < notesData.length; i++) {
        const note = notesData[i];
        const endTime = note.startTime + note.duration + 0.8; 
        
        if (now >= note.startTime && now <= endTime) {
            let progress = (now - note.startTime) / note.duration;
            if (progress > 1) progress = 1;

            let alpha = 1;
            if (now > note.startTime + note.duration) {
                alpha = 1 - ((now - (note.startTime + note.duration)) / 0.8);
            }
            if (alpha < 0) alpha = 0;

            const yOffset = Math.sin(progress * Math.PI) * 50; 
            const fontSize = 15 + (progress * 40); 

            ctx.fillStyle = `rgba(${note.color}, ${alpha})`;
            ctx.shadowColor = `rgb(${note.color})`;
            ctx.shadowBlur = note.isSpecial ? 20 : 10; // 특수 문자는 더 밝게 빛남
            ctx.font = `bold ${fontSize}px 'Courier New'`;
            ctx.fillText(note.char, note.x, note.y - yOffset);
            
            ctx.shadowBlur = 0;
        }
    }
}

stopBtn.addEventListener('click', () => {
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.suspend();
    isPlaying = false;
    notesData = [];
    statusText.textContent = "정지됨";
    statusText.className = "status-idle";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

convertBtn.addEventListener('click', () => {
    const code = codeInput.value;
    if (code.trim() === '') { alert("코드를 입력해주세요!"); return; }

    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioCtx.resume();
    isPlaying = true;

    const selectedOscType = oscTypeSelect.value;
    const noteDuration = parseFloat(speedControl.value);

    codeDepth = ParserEngine.analyze(code);
    depthText.textContent = codeDepth;
    statusText.textContent = "분석 및 연주 중...";
    statusText.className = "status-running";

    notesData = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. 코드 내의 주요 키워드 위치(인덱스) 찾기
    const keywords = ['if', 'for', 'while', 'return', 'int', 'void', 'function', 'class', 'printf'];
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    let keywordIndices = new Set();
    let match;
    while ((match = keywordRegex.exec(code)) !== null) {
        for (let j = 0; j < match[0].length; j++) {
            keywordIndices.add(match.index + j);
        }
    }

    const now = audioCtx.currentTime;
    let validCharCount = 0;
    const baseFreq = Math.max(100, 250 - (codeDepth * 20));

    // 2. 글자 순회하며 소리와 이펙트 예약하기
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (char === ' ' || char === '\n' || char === '\r') continue;

        const charCode = code.charCodeAt(i);
        const frequency = baseFreq + (charCode % 50) * 12; 
        const startTime = now + (validCharCount * noteDuration);
        
        let charColor = getRandomNeonColor();
        let isSpecial = false;

        // 특수 문법 판별
        if (char === '{' || char === '}') {
            playKick(startTime); // 킥 드럼 연주
            charColor = '255, 50, 50'; // 붉은색
            isSpecial = true;
        } else if (keywordIndices.has(i)) {
            playTone(frequency, startTime, noteDuration, selectedOscType); 
            playHiHat(startTime); // 멜로디 위에 하이햇 얹기
            charColor = '255, 215, 0'; // 황금색
            isSpecial = true;
        } else {
            playTone(frequency, startTime, noteDuration, selectedOscType);
        }

        notesData.push({
            char: char,
            startTime: startTime,
            duration: noteDuration,
            x: Math.random() * (canvas.width - 150) + 50,
            y: Math.random() * (canvas.height - 150) + 100,
            color: charColor,
            isSpecial: isSpecial
        });

        validCharCount++;
    }

    setTimeout(() => {
        if (isPlaying) {
            statusText.textContent = "대기 중";
            statusText.className = "status-idle";
        }
    }, validCharCount * noteDuration * 1000 + 1000);

    if (!isAnimating) {
        isAnimating = true;
        draw();
    }
});
