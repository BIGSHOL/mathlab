# 🚧 Lab — 세션 비전 교재 인제스트 (₩0 파이프라인)

> **목적**: G:\ 교재 PDF의 실제 문제를 **Claude Code 세션 비전**으로 판독해 `LabProblem`에 영속한다.
> **비용**: 세션이 직접 보고 JSON을 쓰므로 **런타임 API 호출 0 = ₩0**(시험지변환기 `corpus/REVIEW_PROTOCOL.md`가 입증한 패턴). 합성(Gemini Flash)과 달리 **실 교재 문제 = 고품질·고난도·도형 포함**.
> **출처 지식**: 작성 규칙은 `/d/시험지 한글화`의 `EXAM_OCR_PROMPT`(`core/ocr_engine.py:336`)를 LabProblem 타깃으로 **이식·적응**(블록분할→단일 body, HWP수식→KaTeX, 손글씨 규칙 제거=교재는 born-digital).

---

## 1. 원리 — 왜 ₩0인가

변환기에서 OCR은 두 가지 모드였다: ① 배포 .exe = Anthropic/Gemini **API**(과금), ② 실제 대량 작업 = **세션 자신이 비전 모델 역할**을 해서 결과 JSON을 직접 작성(₩0). 우리는 ②를 쓴다.

```
교재 PDF ──(Read tool, pages=N-M)──▶ 세션이 본다(비전)
   ──▶ 세션이 인제스트 JSON 작성(IngestDoc)  ◀── 본 문서의 작성 규칙
   ──▶ ingest-problems.ts(결정적 검증·영속) ──▶ LabProblem (API 0)
```

핵심: **AI 호출이 코드에 없다.** 세션이 본문/보기/정답을 JSON으로 적고, 스크립트는 그걸 검증해 DB에 꽂을 뿐(순수 결정적).

---

## 2. 데이터 계약 (`IngestDoc`)

`src/lib/lab/ingest.ts`의 타입. 한 파일 = 한 개념(`conceptId`)에 대한 문제 묶음.

```jsonc
{
  "source": "동아(강옥기) 중1 수학 p.42",   // 출처: 교재·출판사·페이지 (LabProblem.source)
  "conceptId": "lab-cur-mid-01-03",          // 대상 LabConcept id (§5 매핑)
  "problems": [
    {
      "type": "MULTIPLE_CHOICE",             // | SHORT_ANSWER | DESCRIPTIVE
      "difficulty": 2,                        // 1..5 (§4 난이도 2축)
      "body": "다음 중 $x+1=3$의 해는?",      // 단일 마크다운 + 인라인 $...$ KaTeX
      "choices": ["$1$","$2$","$3$","$4$","$5$"], // 객관식만(5개), 번호 마커 없이 내용만
      "answerIndex": 2,                       // 객관식 정답(1-based)
      "answer": "$6$",                        // 단답(SHORT_ANSWER)만
      "rubric": "통분 후 $\\frac{5}{6}$ (과정 3 + 답 2)", // 서술형(DESCRIPTIVE)만: 모범답안+기준
      "explanation": "$x=2$",                 // 해설(없으면 생략/'')
      "diagram": [{ "type": "regular_polygon", "params": { "sides": 5 } }] // 도형(선택, §4 도형) — DiagramParam[] 또는 DiagramSpec
    }
  ]
}
```

- 타입별 필수: `MULTIPLE_CHOICE`→`choices`(5)+`answerIndex`, `SHORT_ANSWER`→`answer`, `DESCRIPTIVE`→`rubric`. `diagram`은 선택(도형 문항만).
- 검증은 토대2 `normalizeGenerated` 재사용(보기 5개/answerIndex 1~5/`\dfrac→\frac`/보기마커 제거). 무효 문항은 **거르고 나머지는 살림**(전체 중단 X).
- 영속 시 `isGenerated=false`(실 교재 문제), `bodyRef='inline'`, `source`=교재.

---

## 3. SOP — 세션이 교재 한 권을 인제스트하는 절차

1. **개념 매핑 확인**(§5): 대상 단원이 어느 `LabConcept`인지 `lab_concepts`에서 id 확정.
2. **PDF 판독**: `Read`(file_path=교재 PDF, pages=해당 단원 범위). 페이지를 직접 보고 문제를 식별.
   - ⚠️ **Read는 PDF 100MB 초과를 거부**(교재 전권은 보통 100~200MB). 우회: **PyMuPDF(fitz)** 로 ① 텍스트 레이어를 훑어 단원 페이지를 빠르게 찾고(`doc[i].get_text()`, born-digital이라 수식은 깨지지만 위치 탐색엔 충분) ② **문제 페이지만 PNG로 렌더**(`get_pixmap(matrix=fitz.Matrix(2.2,2.2))` ≈158DPI, 페이지당 ~150KB) → 그 PNG를 `Read`(비전 OCR). 콘솔 cp949 한글 깨짐은 결과를 UTF-8 파일로 써서 우회. (fitz는 변환기가 쓰는 래스터라이저 — 이 머신에 설치됨.)
3. **JSON 작성**: 본 문서 §4 규칙대로 `IngestDoc` 작성 → `d:\tmp\lab-ingest\<교재>-<단원>.json` 등에 저장.
4. **dry-run 검증**: `node --env-file=.env --import tsx scripts/lab/ingest-problems.ts <file> --dry-run` → 검증 통과/실패 확인.
5. **영속**: 같은 명령 `--dry-run` 제거 → DB 기록(같은 source 재실행은 중복 가드로 차단, 재인제스트는 `--force`).
6. **교차검증(권장)**: 변환기 SOP처럼 **다른 패스로 재판독**해 오독(특히 지수·분수·부호) 점검. 고난도·도형 문항은 특히.

---

## 4. 작성 규칙 (변환기 `EXAM_OCR_PROMPT` 이식·적응)

### 충실도 (값이 정답을 좌우 — 최우선)
- **한 글자/한 숫자씩 정확히**. 추측·의역·요약 금지. 본문을 그대로 옮긴다.
- **숫자·계수·지수·분수를 바꾸지 말 것**: `16/5`→`16/9`(X), `2^{48}`→`2^{6}`(X). 작은 지수는 확대 확인.
- **변수 혼동 금지**(x↔z), **부호 정확**(`÷`↔`+`, `≠ \neq`, `≤ \leq`, `≥ \geq`).
- 한글 음절 정확("거듭제곱"≠"기하적금").

### LabProblem 형식 (변환기와 **반대** — 중요)
- **`body`는 단일 문자열**: 변환기는 HWP 조판용으로 text/equation 블록을 쪼갰지만, **우리는 하나의 마크다운 문자열에 수식을 인라인 `$...$`로 합친다**. 블록 배열 금지.
  - 예: `"$a>0$이고 $b$는 정수일 때 $a+b$의 값은?"` (O) / `[{text},{equation},...]`(X)
- **숫자·수식·변수는 `$...$`로 감싼다**(KaTeX). 보기 번호 ①②③④⑤·ㄱㄴㄷ은 제외(CLAUDE.md 컨벤션).
- **`\dfrac` 금지 → `\frac`**(자동 치환되지만 처음부터 `\frac`).
- **도형 이름은 로만체**: 점 A→`\mathrm{A}`, 삼각형 ABC→`\triangle \mathrm{ABC}`, 선분 AB→`\overline{\mathrm{AB}}`. (함수·미지수 소문자는 이탤릭 그대로.)
- **순환소수**: `0.\dot{3}7\dot{5}`(375 순환).
- **괄호 종류 구분**: 소 `()`·중 `\{\}`·대 `[]` 정확히(중첩에서 의도적).

### 보기·박스
- **객관식 보기**: `choices`에 **내용만**(①②③ 마커 없이), 각 항목 `$...$` KaTeX. 5개.
- **`<보기>`/`<조건>` 박스**(테두리 안 지문·보기): body 안에 blockquote `>` + `<보기>` 마커로(CLAUDE.md box-grid). 박스 본문 **절대 누락 금지**(발문과 질문 "사이" 박스 자주 빠뜨림).

### 도형 (토대4 — `diagram` 필드로 구조화 저작 가능)
- **도형은 `diagram` 필드에 구조화 스펙으로 저작**한다(공유 `svg-diagrams` 렌더러 읽기전용 재사용 → `LabDiagram`). 두 포맷 허용 — `resolveDiagramSpec`이 `DiagramParam[]`로 통일:
  - **DiagramSpec 객체**(프리셋, **좌표 불필요** — AI 친화): `triangle`(preset+`angles`+`showAngles`+`angleValues`) · `circle` · `quadrilateral` · `coordinatePlane` · `solid`(`shape`: cube/cylinder/cone/sphere/prism/pyramid) · `composite`. ⚠️ **`polygon` 스펙은 미렌더**(트림된 변환 경로) → 정다각형은 아래 DiagramParam `regular_polygon` 사용.
  - **DiagramParam[] 배열**(26타입 네이티브, PDF추출과 동형): `regular_polygon`(`{sides:N}`) · `angle_figure`(`{angle,label}`) · `coordinate_plane` · `histogram`·`stem_leaf`(통계) 등.
- **실측 검증된 작동 포맷**: Spec `triangle`(preset)·`solid` / Param `regular_polygon`·`angle_figure`·`coordinate_plane` (probe로 SVG 생성 확인). 새 타입은 작성 전 `resolveDiagramSpec`+`renderDiagram`으로 SVG 생성되는지 확인 후 사용.
- 재현 불가(잘림·과복잡)한 도형은 그 문항을 **건너뛴다**. 단순 서술 가능하면 `[그림: …]` 플레이스홀더도 가능하나, **가능하면 구조화 스펙 우선**.
- ⚠️ 도형 충실도 검증은 숫자 답보다 어렵다(파라미터 오류가 그림을 바꿈) — **교차 재판독 필수**(§3-6).

### 난이도 (변환기엔 없는 우리 축 — 2축 모델)
- `difficulty` 1..5 = **(A)결합 폭**(몇 개념 엮나) + **(B)사고 깊이**(개념 자체 고난도/비자명 통찰) 중 **높은 쪽**. 개념 1개라도 깊으면 4~5(단일개념 킬러). 애매하면 폭에만 한 단계 낮게(깊이 명확 시 하향 금지). (CLAUDE.md 기출분석 난이도 2축과 동일.)

### 정답
- 객관식 `answerIndex`(1-based), 단답 `answer`(`$...$` 래핑), 서술형 `rubric`(모범답안+채점기준).
- 교재에 정답/해설이 없으면 `explanation` 생략 가능(빈 문자열). 단 채점 가능하려면 `answer`/`answerIndex`/`rubric`은 필수.

---

## 5. conceptId 매핑 (단원 → LabConcept)

- `LabConcept`(244개: 실 239 + 합성 5)의 id는 `lab-cur-{band}-{학기2}-{회차2}`(실) 또는 `lab-c1..c5`(합성).
- 교재 단원 → LabConcept: `lab_concepts`에서 `name`/`track`/`monthIdx`로 해당 개념 id를 찾아 `conceptId`에 지정.
- ⚠️ **단원매핑 절대규칙**(CLAUDE.md): 임의 단원명 금지 — 반드시 실재하는 `conceptId`. 스크립트가 FK 존재를 검증(없으면 중단).
- 조회 예: `SELECT id, name FROM lab_concepts WHERE name LIKE '%정수와 유리수%';`

---

## 6. 검증

- `scripts/lab/verify-ingest.ts` — 픽스처(유효 3 + 무효 1)로 검증·영속·정리 end-to-end (스텁 $0).
- 실 인제스트 후: `SELECT COUNT(*), source FROM lab_problems WHERE isGenerated=false GROUP BY source;` 로 적재 확인.

---

## 7. 워크플로 확대 시 학습된 함정 (2026-06-22, 동아 중1 49문항 실측)

대량 인제스트는 **워크플로로 병렬화**(페이지별 OCR 에이전트 + 적대적 검증 에이전트). 전부 에이전트 비전 = **외부 API ₩0**. 단 아래 3종을 반드시 처리:

1. **🔴 대용량 PDF (Read 100MB 제한)** — §3 참조. fitz로 텍스트 레이어 단원 탐색 + 문제 페이지만 PNG 렌더 후 Read.
2. **🔴 HTML 엔티티 직렬화** — 구조화 출력(StructuredOutput)이 `<`/`>`/`&`를 `&lt;`/`&gt;`/`&amp;`로 인코딩해 반환. **영속 전 디코딩 필수**(`&lt;`→`<` 등). 안 하면 KaTeX 부등호·blockquote `>` 마커가 `&gt;`로 깨짐. (수집 스크립트에 디코드 헬퍼 포함.)
3. **🔴 단일 검증자도 오답 가능 → 다중 검증 권장** — 적대적 재판독 에이전트 **1명도 틀릴 수 있다**. 실측: 음수 대소("가장 큰 것")에서 $-1 > -0.8$로 오판(부호 함정)해 객관식 정답을 틀리게 확정 → DB 오염. 재실행(독립 재판독)이 교정함. **정답-critical 필드(객관식 answerIndex, 다단계 계산)는 ≥2 독립 검증자 + 합의** 또는 **재실행 교차비교** 권장(변환기 SOP의 "N면×2렌즈" 다중검증과 동일 취지). 비결정성은 품질의 적 — 답이 갈리면 사람 확인.
4. **conceptId 후보 화이트리스트 주입** — 에이전트에 대단원의 중단원 conceptId 목록을 주고 그 중 배정하게(자유텍스트 금지) → 단원매핑 절대규칙 준수. 후보 밖 값은 수집 시 제외.
5. **per-problem conceptId → (source, conceptId) 그룹 영속** — 한 페이지에 여러 개념 혼재 → 문항별 conceptId로 그룹핑 후 `IngestDoc`(단일 conceptId)로 분할 영속. 중복 가드(source+conceptId)가 재실행 안전 보장.

> ⚠️ **재실행 비결정성 주의**: 워크플로 resume가 캐시 미스로 완료분까지 재실행하면 결과가 **달라질 수 있다**(다른 정답·문항수). 이미 영속한 분과 충돌 시, *더 정확한 쪽*을 택해 기존을 `source`로 삭제 후 재적재(워크시트 미배정 문항만 안전 삭제).

---

> **연계**: 합성 트랙(`problem-gen.ts` + Gemini Flash)과 인제스트 트랙은 **같은 `GeneratedLabProblem`로 수렴 → `persist.ts` 공용**. 둘 다 `conceptId×difficulty×type` 배치축을 채우고 supplier가 공급. 합성=빠른 물량(저비용), 인제스트=실문제 고품질(₩0). HANDOFF §7 참조.
