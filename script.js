const codeInput = document.getElementById('codeInput');
const convertBtn = document.getElementById('convertBtn');
const stopBtn = document.getElementById('stopBtn');
const canvas = document.getElementById('visualCanvas');
const ctx = canvas.getContext('2d');

// UI 컨트롤 요소들
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

// C++ WebAssembly 대체 브릿지
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

    oscillator.type = type; // UI에서 선택한 음색 적용
    oscillator.frequency.value = freq;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

function draw() {
    if (!isAnimating) return;
    requestAnimationFrame(draw);

    // 사이버펑크 스타일의 잔상 효과
    ctx.fillStyle = "rgba(11, 12, 16, 0.2)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isPlaying) return; // 정지 상태면 그리기 중단

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
            // 텍스트에 네온 발광 효과(그림자) 추가
            ctx.shadowColor = `rgb(${note.color})`;
            ctx.shadowBlur = 10;
            ctx.font = `bold ${fontSize}px 'Courier New'`;
            ctx.fillText(note.char, note.x, note.y - yOffset);
            
            // 그림자 초기화 (성능을 위해)
            ctx.shadowBlur = 0;
        }
    }
}

// 정지 버튼 이벤트
stopBtn.addEventListener('click', () => {
    if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.suspend(); // 오디오 강제 일시정지
    }
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
    audioCtx.resume(); // 정지되었던 오디오 재개
    isPlaying = true;

    // UI에서 설정값 읽어오기
    const selectedOscType = oscTypeSelect.value;
    const noteDuration = parseFloat(speedControl.value);

    // 파싱 및 상태 업데이트
    codeDepth = ParserEngine.analyze(code);
    depthText.textContent = codeDepth;
    statusText.textContent = "분석 및 연주 중...";
    statusText.className = "status-running";

    notesData = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const now = audioCtx.currentTime;
    let validCharCount = 0;
    const baseFreq = Math.max(100, 250 - (codeDepth * 20));

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (char === ' ' || char === '\n' || char === '\r') continue;

        const charCode = code.charCodeAt(i);
        const frequency = baseFreq + (charCode % 50) * 12; 
        const startTime = now + (validCharCount * noteDuration);
        
        playTone(frequency, startTime, noteDuration, selectedOscType);

        notesData.push({
            char: char,
            startTime: startTime,
            duration: noteDuration,
            x: Math.random() * (canvas.width - 150) + 50,
            y: Math.random() * (canvas.height - 150) + 100,
            color: getRandomNeonColor()
        });

        validCharCount++;
    }

    // 연주가 끝날 쯤 상태를 대기로 변경하는 타이머
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
