// --- 탭 메뉴 전환 로직 ---
const navItems = document.querySelectorAll('.nav-item');
const pageSections = document.querySelectorAll('.page-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        pageSections.forEach(page => page.classList.remove('active-page'));
        
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active-page');
        
        if(targetId === 'page-visualizer') {
            resizeCanvas();
        }
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
let codeDepth = 0;
let isPlaying = false;

// 🎵 마법의 펜타토닉 스케일 (C Major Pentatonic) - 뭘 쳐도 예쁘게 들림
const pentatonicScale = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.00, // G4
    440.00, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00  // A5
];

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

function playTone(freq, startTime, duration, type) {
    if (!isPlaying) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type || 'sine';
    oscillator.frequency.value = freq;

    const safeTime = Math.max(startTime, audioCtx.currentTime + 0.05);

    // 튜닝: 소리가 부드럽게 커지고 부드럽게 사라지도록(여운) 수정
    gainNode.gain.setValueAtTime(0, safeTime);
    gainNode.gain.linearRampToValueAtTime(0.3, safeTime + 0.05); // 어택(Attack)을 부드럽게
    gainNode.gain.exponentialRampToValueAtTime(0.01, safeTime + duration + 0.1); // 서서히 사라짐

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
    osc.frequency.setValueAtTime(120, safeTime); // 주파수 약간 낮춤
    osc.frequency.exponentialRampToValueAtTime(10, safeTime + 0.1); 
    
    gain.gain.setValueAtTime(0, safeTime);
    gain.gain.linearRampToValueAtTime(0.4, safeTime + 0.01); // 킥 볼륨 절반으로 감소 (0.8 -> 0.4)
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
    osc.frequency.value = 4000; // 고주파 감소 (귀 찌르는 소리 방지)
    
    filter.type = 'highpass';
    filter.frequency.value = 3000; 
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    // 치직거리는 소리 대폭 감소
    gain.gain.setValueAtTime(0, safeTime);
    gain.gain.linearRampToValueAtTime(0.05, safeTime + 0.01); // 볼륨 극강으로 낮춤 (0.5 -> 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, safeTime + 0.05);
    
    osc.start(safeTime);
    osc.stop(safeTime + 0.05);
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
            ctx.shadowBlur = note.isSpecial ? 20 : 10;
            ctx.font = `bold ${fontSize}px 'Courier New'`;
            ctx.fillText(note.char, note.x, note.y - yOffset);
            
            ctx.shadowBlur = 0;
        }
    }
}

if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        if (audioCtx && audioCtx.state !== 'closed') audioCtx.suspend();
        isPlaying = false;
        notesData = [];
        if(statusText) {
            statusText.textContent = "정지됨";
            statusText.className = "status-idle";
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
}

if (convertBtn) {
    convertBtn.addEventListener('click', () => {
        try {
            const code = codeInput.value;
            if (code.trim() === '') { alert("코드를 입력해주세요!"); return; }

            if (!audioCtx || audioCtx.state === 'closed') {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            audioCtx.resume();
            isPlaying = true;

            const selectedOscType = oscTypeSelect ? oscTypeSelect.value : 'sine';
            const noteDuration = speedControl ? parseFloat(speedControl.value) : 0.15;

            codeDepth = ParserEngine.analyze(code);
            if(depthText) depthText.textContent = codeDepth;
            if(statusText) {
                statusText.textContent = "분석 및 연주 중...";
                statusText.className = "status-running";
            }

            notesData = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const keywords = ['if', 'for', 'while', 'return', 'int', 'void', 'function', 'class', 'printf'];
            const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
            let keywordIndices = new Set();
            let match;
            while ((match = keywordRegex.exec(code)) !== null) {
                for (let j = 0; j < match[0].length; j++) {
                    keywordIndices.add(match.index + j);
                }
            }

            const startOffsetTime = audioCtx.currentTime + 0.1; 
            let validCharCount = 0;

            for (let i = 0; i < code.length; i++) {
                const char = code[i];
                if (char === ' ' || char === '\n' || char === '\r') continue;

                const charCode = code.charCodeAt(i);
                
                // 🎵 양자화 핵심: 아무 숫자나 나오더라도 반드시 pentatonicScale 안의 예쁜 음으로 맵핑함
                let scaleIndex = charCode % pentatonicScale.length;
                let frequency = pentatonicScale[scaleIndex];

                // 코드가 깊어질수록 한 옥타브(절반 주파수) 낮춰서 묵직하게 만듦
                if (codeDepth > 2) frequency = frequency / 2;

                const startTime = startOffsetTime + (validCharCount * noteDuration);
                
                let charColor = getRandomNeonColor();
                let isSpecial = false;

                if (char === '{' || char === '}') {
                    playKick(startTime); 
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
                if (isPlaying && statusText) {
                    statusText.textContent = "대기 중";
                    statusText.className = "status-idle";
                }
            }, validCharCount * noteDuration * 1000 + 1000);

            if (!isAnimating) {
                isAnimating = true;
                draw();
            }
        } catch (error) {
            console.error(error);
            alert("에러 발생!: " + error.message);
        }
    });
}
