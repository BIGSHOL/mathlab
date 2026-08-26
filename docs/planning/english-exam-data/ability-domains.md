# 능력 영역 4개와 유형 기본 매핑

브리프 골격(제품이 영어에 쓰기로 한 키):

| 키 | 한글 |
|----|------|
| `accuracy` | 정확성 |
| `understanding` | 이해력 |
| `reasoning` | 추론력 |
| `expression` | 표현력 |

출처 ID는 [README.md](./README.md).

---

## 코드 현황 (수정하지 않음, 사실만)

`src/lib/exam-analysis/constants.ts`의 `ABILITY_DOMAINS` / `ABILITY_DOMAIN_LABELS` / `TYPE_TO_DOMAIN`은 **수학 4대**다.

- calculation 계산력
- understanding 이해력
- problem_solving 문제해결력
- reasoning 추론력

영어 6유형(`grammar` 등)에 대한 fallback 매핑은 **없다**. `TYPE_TO_DOMAIN`에 grammar가 없으면 엔진이 `calculation`으로 떨어질 수 있다(G4, `ai-engine.ts`의 `|| 'calculation'`).

브리프의 `accuracy` / `expression`은 **상수 파일에 아직 없다**. 이 문서는 영어 분석에 쓸 매핑을 근거와 함께 적어 둔다. 패치는 하지 않는다.

---

## 능력의 근거 (교육과정·평가원·내신)

교육과정은 ‘능력 4키’를 고시하지 않는다. 가까운 공식 언어:

| 공식 개념 | 대응 | 근거 |
|-----------|------|------|
| 영어 의사소통 역량 = **이해 능력 + 표현 능력** | understanding+reasoning ≈ 이해, expression ≈ 표현 | A5, B6 성격 |
| 이해: 세부 정보, 주제·요지, 논리 관계, 함축, 전략 | understanding / reasoning | B6 [10공영1-01-01~07] |
| 표현: 설명, 전달, 요약, 어휘·표현 점검 | expression (+ accuracy가 점검) | B6 [10공영1-02-01~07] |
| 최소 성취 지도: 표현은 **정확성보다 이해 가능한 발화**를 강조 | accuracy를 표현의 하위로 | B6 최소 성취 고려사항 |
| 평가원: 세부 / 중심 내용 / 맥락 / 함축 / 간접 말하기 / 간접 쓰기 | understanding vs reasoning 분리의 공식 축 | E1 |
| 내신: ‘감’이 아니라 **정확성**(어휘·어법·조건 충족) | accuracy | D3 |

`accuracy`는 교육과정 총론 용어가 아니라, 내신 어법·영작 채점과 공통영어 ‘어휘나 표현을 점검하여 명확히 전달’(B6 [10공영1-02-06])에서 온다.

---

## 유형 → 능력 기본 매핑 (fallback)

AI가 문항별로 능력을 주면 그 값을 우선한다. 아래는 비었을 때만.

| question_type | 기본 ability_domain | 이유 | 근거 |
|---------------|---------------------|------|------|
| grammar | accuracy | 형태 정오가 채점의 핵심 | D3, D4, D8 |
| vocabulary | accuracy | 뜻·형태 선택. 문맥 추론이 뚜렷하면 reasoning으로 올려도 됨 | B1, D3 |
| reading | understanding | 1차 기본값. 빈칸·함축·순서·삽입은 reasoning이 맞음 | B6, E1 |
| listening | understanding | 정보 듣기 기본. 의도·목적 문항은 reasoning | E1, E2 |
| writing | expression | 생산. 조건·문법 감점이 커도 유형의 축은 표현 | B6, D8, D9 |
| communication | expression | 응답·상황 말 생산. 인쇄 대화의 빈칸은 understanding일 수 있음 | E1 간접 말하기 |

`reading`을 항상 understanding으로 두면 고등 내신 킬러(빈칸·삽입)가 이해력으로만 쌓인다. 가능하면 문항 발문으로 올린다.

| 발문 단서 | 권장 능력 | 유형은 그대로 |
|-----------|-----------|----------------|
| 주제·요지·제목·내용 일치·도표 | understanding | reading |
| 빈칸(구·절)·함축·심경·순서·삽입 | reasoning | reading |
| 밑줄 어법·수일치·준동사 | accuracy | grammar |
| 조건 영작·배열·요약 서술 | expression | writing |
| 영작 답에서 문법만 채점 | accuracy를 병기할 여지 | writing 유지 |

---

## 수학 능력 키를 영어에 쓰지 말 것

| 쓰지 말 것 | 영어에서 |
|------------|----------|
| calculation 계산력 | 해당 없음. 듣기 숫자 계산 문항도 ‘정보 파악’이지 수학 계산력이 아님(E2 듣기 6번류) |
| problem_solving 문제해결력 | 교육과정 영어 핵심역량 명칭이 아님. 과제 해결은 표현 과업(B6) |

한글 라벨을 사용자 UI에 붙일 때 영문 enum(`ACCURACY`)을 노출하지 않는다는 제품 규칙(CLAUDE.md)은 그대로다. 키는 저장용, 화면은 정확성/이해력/추론력/표현력.

---

## 난이도와 능력을 섞지 말 것

G1 영어 난이도 5단계는 정답률·사고 깊이 축이다. `reasoning`을 난이도 4의 옛 키(DIFFICULTY_LEGACY_MAP)와 혼용하면 레이더가 깨진다. 능력 `reasoning`과 난이도 `"4"`는 별 필드다.
