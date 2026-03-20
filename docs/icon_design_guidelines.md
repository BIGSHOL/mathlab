# 🏆 업적 아이콘 (3D Badge) 디자인 생성 가이드라인

본 문서는 남은 26개의 업적 아이콘(및 향후 추가될 모든 시스템 뱃지)을 **이미 생성된 11개의 뱃지와 완벽하게 동일한 퀄리티와 스타일로 무한정 찍어내기 위한** 생성형 AI 프롬프트 엔지니어링 규격서입니다.

---

## 1. 기본 아트 스타일 (Art Direction)
- **장르/컨셉**: 모바일 게임 프리미엄 UI 업적 아이콘
- **질감/색감**: 화려하고 쨍한 색감(Vibrant colors), 윤기가 흐르는 3D 렌더링(Glossy), 애니메이션/캐주얼풍(Cartoonish)
- **구도/배치**: 아이콘이 캔버스 중앙에 집중되도록 배치(Isolated on simple background).
  - *이유: 클라이언트(UI) 단에서 `overflow-hidden`을 활용해 원형(`rounded-full`) 및 둥근 사각형(`rounded-2xl`)으로 잘라서 렌더링할 것이므로 피사체가 모서리에 가까우면 잘려 나갑니다.*

## 2. 텍스트 삽입 & 글자 왜곡 방지 규정 (Typography Protocol)
- **[필수] 영문 완전 배제**: `Exclude all English letters.` 
  - (AI가 이미지 내부 표지판, 간판, 배경 등에 의미 없는 영문 알파벳을 뱉어내는 것을 원천 차단합니다.)
- **[필수] 한글 타이포그래피**: `The icon must feature the bold Korean text '[업적명]' built into the 3D design beautifully.`
  - 한글을 3D 입체 디자인의 일부(간판, 비석, 메달 등)로 자연스럽게 파내도록 강제합니다. (AI의 세종대왕 패치 기법)
  - 단, 길고 복잡한 문장보다는 2~5글자의 짧은 업적명만 입력해야 폰트 붕괴 현상이 적습니다.

## 3. 공통 마스터 프롬프트 템플릿 (Master Prompt Template)
아래의 템플릿 복사본을 유지하여 **`[주제의 묘사]`**와 **`[한글 업적명]`**만 변경하면 완벽한 일치감을 주는 이미지를 양산할 수 있습니다.

```text
A high quality 3D mobile game achievement badge icon representing [주제의 묘사].
Exclude all English letters. 
The icon must feature the bold Korean text '[한글 업적명]' built into the 3D design beautifully.
Vibrant colors, premium, glossy, isolated on simple background, cartoonish, high quality render.
```

### 💡 프롬프트 사용 예시
- **타임어택(스피드 러너)뱃지**: 
  `A high quality 3D mobile game achievement badge icon with a dynamic glowing stopwatch and a rocket taking off for a speedrun. Exclude all English letters. The icon must feature the bold Korean text '스피드 러너' built into the 3D design beautifully. Vibrant colors, premium, glossy, isolated on simple background, cartoonish, high quality render.`
- **버그 발견(버그 헌터)뱃지**: 
  `A high quality 3D mobile game achievement badge icon of a friendly ghost with a magnifying glass hunting a bug. Exclude all English letters. The icon must feature the bold Korean text '버그 헌터' built into the 3D design beautifully. Vibrant neon colors, premium, glossy...`

## 4. UI 렌더링 및 CSS 적용 지침 (Implementation in UI)
*수많은 시행착오 끝에 찾은 가장 완벽한 화면 렌더링 방법입니다.*

1. **블렌드 모드(Blend Mode) 금지**: 
   - 생성된 이미지의 배경색이 다양할 수 있고(때론 흰색, 때론 까만색), `mix-blend-screen`이나 `multiply` 등을 강용하면 내부 피사체의 쨍한 색감까지 투명해지거나(Washed out) 하얗게 탈색되어 버립니다.
2. **물리적 둥근 크롭(Physical Crop) 적용**: 
   - 뱃지를 감싸는 부모 `<div>` 태그에 CSS `overflow-hidden`과 `rounded-full` (그리드 화면), `rounded-2xl` (툴팁 확대 화면) 속성 부여.
   - 자식 `<img>` 태그에는 `w-full h-full object-cover` 속성을 주고 비율을 `scale-[1.15]` 정도로 살짝 당겨주어 배경의 불필요한 색종이(구석) 부분을 완전히 밖으로 밀어내 동전 모양(`Coin/Badge`)처럼 깎아냅니다.
