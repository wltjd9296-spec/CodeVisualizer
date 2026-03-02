# 🎵 Code Harmony: Visualizing Logic as Music

> **"코드가 선율이 되고, 로직이 비트가 되는 순간"**
>
> **Code Harmony**는 작성된 소스 코드를 실시간 오디오 시각화 데이터로 변환하는 실험적인 웹 프로젝트입니다. 코드의 문법적 구조를 분석하여 펜타토닉 스케일의 음악으로 치환하며, 시각적인 네온 이펙트를 통해 '코딩의 예술화'를 지향합니다.

---

## ✨ 주요 기능 (Key Features)

### 🎹 펜타토닉 양자화 (Pentatonic Quantization)
모든 일반 문자는 **C Major Pentatonic Scale** 내의 주파수로 매핑됩니다. 이 음계는 어떤 음을 나열해도 불협화음이 발생하지 않아, 무작위적인 코드 입력에서도 항상 조화로운 선율을 보장합니다.

### 🥁 구조적 리듬 생성 (Structural Rhythm)
코드의 문법적 요소를 실시간으로 분석하여 드럼 비트를 생성합니다.
* **Keywords (`if`, `for`, `while` 등):** 경쾌한 **하이햇(Hi-hat)** 소리를 트리거하여 리듬감을 부여합니다.
* **Braces (`{`, `}`):** 강력한 **킥 드럼(Kick)** 소리를 생성하여 코드 블록의 시작과 끝을 강조합니다.

### 🎸 베이스 드롭 알고리즘 (Deep Bass Drop)
코드의 중첩 깊이(Nesting Depth)가 깊어질수록 사운드에 무게감이 더해집니다.
* **Depth > 2:** 주파수가 절반($1/2$)으로 낮아지며 웅장한 베이스 사운드로 전환됩니다.
* 이는 복잡한 로직 구간을 청각적으로 더 무겁고 깊게 표현합니다.

### 🌈 네온 시각화 (Neon Visualization)
`HTML5 Canvas`를 통해 연주되는 각 문자를 실시간으로 렌더링합니다.
* 음의 높낮이에 따른 Y축 위치 변화
* 키워드 및 특수문자에 적용되는 동적 글로우(Glow) 효과

---

## 🛠 기술 스택 (Tech Stack)

| 구분 | 기술 | 역할 |
| :--- | :--- | :--- |
| **Frontend** | JavaScript (ES6+) | 오디오 컨텍스트 제어 및 메인 로직 |
| **Audio** | Web Audio API | 실시간 주파수 합성 및 오실레이터 제어 |
| **Visual** | Canvas API | 60fps 기반의 동적 비주얼라이저 렌더링 |
| **Analysis** | C++ (Emscripten) | 코드 구조 및 중첩 깊이 분석 엔진 |

---

## 🔬 핵심 로직 (Core Logic)

### 주파수 매핑 수식
입력된 문자의 ASCII 값을 기반으로 펜타토닉 배열에서 음계를 추출합니다.
$$f = \text{Scale}[\text{charCode} \pmod{\text{Scale.length}}]$$

### 옥타브 제어
코드의 깊이($D$)에 따른 최종 주파수($F$) 결정:
$$F = \begin{cases} f, & \text{if } D \le 2 \\ f \times 0.5, & \text{if } D > 2 \end{cases}$$

---

## 📂 파일 구조 (File Structure)

* `index.html`: 프로젝트 UI 및 캔버스 레이아웃
* `Script.js`: Web Audio API 로직 및 시각화 엔진
* `parser.cpp`: 코드 깊이 분석을 위한 C++ 소스 (WASM 변환용)
* `style.css`: 사이버펑크 스타일의 네온 UI 디자인

---

## 🤖 AI Collaboration
이 프로젝트는 **Google Gemini 3 Flash**와의 협업을 통해 제작되었습니다.
* **Audio DSP:** 부드러운 엔벨로프(Envelope) 적용 및 기계음 억제 로직 설계
* **Algorithm:** 코드 구조를 음악적 파라미터로 변환하는 매핑 전략 수립
* **Documentation:** 프로젝트의 기술적 가치를 명확히 전달하기 위한 상세 문서화

---

## 🚀 시작하기 (Quick Start)

1. 저장소를 클론하거나 모든 소스 파일을 다운로드합니다.
2. `index.html` 파일을 웹 브라우저에서 실행합니다.
3. 입력창에 샘플 C++ 또는 C# 코드를 붙여넣습니다.
4. **[Convert & Play]** 버튼을 눌러 연주를 시작합니다.

---

© 2026 Code Harmony Project. Powered by Gemini.
