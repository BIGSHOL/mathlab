# 영어 기출 분석 웹 데이터 수집

구현 코드는 건드리지 마라. 웹에서 출처 있는 자료를 모아 구조화 문서만 남겨라.

## 목표

중1~고3 영어 내신(중간/기말) 시험지 AI 분석에 넣을 단원·유형·능력·실수·서술형 기준의 사실 근거.

## 이미 제품에 있는 골격 (참고만, 덮어쓰지 말 것)

- 유형 6개: `grammar` 어법, `vocabulary` 어휘, `reading` 독해, `listening` 듣기, `writing` 서술·영작, `communication` 의사소통
- 능력 4개: `accuracy` 정확성, `understanding` 이해력, `reasoning` 추론력, `expression` 표현력
- topic 포맷: `{학년} 영어 > {영역} > {항목}` — 영역은 문법 / 어휘 / 독해 / 듣기
- 기존 파일:
  - `src/lib/exam-analysis/prompt-config-english.ts` (`ENGLISH_TOPICS`)
  - `src/lib/exam-analysis/data/english/`

## 수집 범위 (웹 검색 + 공식 문서)

1. 2022 개정 영어과 교육과정 — 중1~3, 고1~3(공통영어/영어 I/II 등). 교육부·국가교육과정정보센터 원문 우선.
2. 학년별 문법 요소 표준 명칭. 교과서(능률/천재/동아/YBM 등) 목차와 교육과정 성취기준을 대조해 항목 문자열을 확정. 예: `be동사 (am, is, are)`처럼 괄호 표기를 쓸지 결정.
3. 내신 평가 이원화: 교과서 닫힌 코퍼스 vs 외부지문. 고등 내신에서 실제로 나오는 비율·유형(어법, 영작, 서술형, 듣기 유무).
4. 문항 유형별 정의와 판별 키워드(밑줄 어법, 동의어, 주제/요지, 빈칸, 순서, 삽입, 조건 영작, 대화문). 1차는 독해를 reading 하나로 둔다. 세분(대의/세부/추론)은 다음 라운드 후보로만 적는다.
5. 서술형·영작 채점 루브릭(문법 정확성/내용/조건 충족). 시도교육청·학교 공개 채점 기준 예시.
6. 학년별 흔한 실수(3인칭 -s, 시제, 관계사, 가정법, to부정사/동명사).
7. 내신 킬러 패턴(고등 빈칸·함축, 중등 복합 문법). 수능 전용은 별도 섹션.

## 산출물

이 브리프를 읽은 뒤 아래 파일을 만들어라.

- `docs/planning/english-exam-data/README.md` — 출처 목록(URL, 문서명, 날짜)
- `docs/planning/english-exam-data/topics-by-grade.md` — 학년×영역×항목. 제품 topic 포맷과 1:1
- `docs/planning/english-exam-data/question-types.md` — 6유형 정의·판별 키워드
- `docs/planning/english-exam-data/ability-domains.md` — 4능력과 유형 기본 매핑
- `docs/planning/english-exam-data/mistakes-and-writing.md` — 실수·서술형 루브릭
- `docs/planning/english-exam-data/gaps.md` — 기존 ENGLISH_TOPICS 대비 빠진 항목/잘못된 명칭

## 규칙

- 추측 금지. 각 표에 출처 URL.
- 수학 코드·프롬프트 수정 금지.
- `src/lib/exam-analysis/prompt-config-english.ts` 를 직접 패치하지 마라. 문서로만.
- 한국어로 작성.
- 끝나면 README에 수집 완료 / 미수집 체크리스트.
- 기존 ENGLISH_TOPICS를 먼저 읽고 gaps.md를 채워라.
