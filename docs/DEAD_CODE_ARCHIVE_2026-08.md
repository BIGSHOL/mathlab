# 사문화 코드 분리 기록 (2026-08-30)

기출분석 전용 제품으로 좁히는 과정에서 **어디서도 import 되지 않게 된** 코드
**77파일 10,415줄**을 레포에서 들어냈다.

---

## 어디에 있나

```
F:/mathlab-archive/
```

레포(`F:/mathlab`) **밖**의 별도 폴더다. 원래 상대경로를 그대로 유지하므로
`F:/mathlab-archive/src/lib/utils/svg-diagrams/index.ts` 는
원래 `F:/mathlab/src/lib/utils/svg-diagrams/index.ts` 였던 파일이다.
그 폴더 안에도 같은 내용의 `README.md` 를 뒀다.

### 이 폴더가 사라져도 된다

파일들은 **살아 있던 시절부터 git 이 추적하던 것**이라 레포 히스토리에 영구 보존돼 있다.
물리 사본은 편의용일 뿐이다.

```bash
# 파일 하나
git show 9231e5ab^:src/lib/utils/svg-diagrams/index.ts > 복구위치.ts

# 묶음 통째로 (이관 직전 커밋의 트리에서 꺼낸다)
git checkout 9231e5ab^ -- src/lib/utils/svg-diagrams/
```

`^` 를 빠뜨리면 안 된다 — 이관 커밋 자체의 트리에는 파일이 `_archive/` 아래에 있다.

---

## 왜 레포 밖인가

처음엔 레포 안 `_archive/` 에 뒀다가 옮겼다. 레포 안에 둘 때의 실측:

| 항목 | 영향 |
|---|---|
| 프로덕션 번들 | **0건** — 아무것도 import 하지 않으므로 webpack 이 추적조차 안 함 |
| 타입체크 / 린트 | 없음 — `tsconfig.json` · `eslint.config.mjs` 에서 제외 |
| 배포 업로드 | 없음 — `.vercelignore` 에 등재 |
| **git push** | **77파일 573KB 가 그대로 원격으로** |
| **일상 grep / IDE 검색** | **매번 섞여 나옴** |

```
$ grep -rl "Badge" --include='*.tsx' .
./src/components/exam-analysis/StatusBadge.tsx
./_archive/src/components/ui/Badge.tsx      ← 이게 계속 딸려 나왔다
```

빌드에는 무해했지만 **읽는 사람에게 유해**했다. 그래서 레포 밖으로 뺐다.

### 4중 방어

`_archive/` 라는 이름은 이제 네 곳에서 차단된다. 나중에 누가 로컬에 다시 꺼내 놓아도
커밋·타입체크·린트·배포 어디에도 새어 들어가지 않는다.

| 파일 | 효과 |
|---|---|
| `.gitignore` | 커밋 안 됨 (원격 유출 차단) |
| `tsconfig.json` `exclude` | 타입체크 대상 아님 |
| `eslint.config.mjs` `ignores` | 린트 대상 아님 |
| `.vercelignore` | 배포 업로드 대상 아님 |

---

## 무엇이 들어 있나

전부 **100% 동일 rename**(`R100`)으로 옮겼다 — 내용 변경 0.

### ① 다이어그램(SVG) 시스템 — 34파일 6,502줄 · `9231e5ab`

문제 생성·PDF 추출 경로가 사라지면서 렌더링할 대상 자체가 없어졌다.

```
lib/utils/svg-diagrams/          index.ts, types.ts
  ├ elementary/                  angle-figure, band-chart, bar-chart, clock-face,
  │                              dot-array, flow-chart, fraction-circle, fraction-rect,
  │                              line-graph, number-line, picture-graph, pie-chart, place-value
  ├ middle/                      coordinate-plane, function-graph, histogram, net-diagram,
  │                              polygon, scatter-plot, shapes, solid-figure, stem-leaf,
  │                              tree-diagram, venn-diagram
  └ shared/                      expression-parser, geometry-math, side-label-curve, svg-utils
lib/utils/                       diagram-param-collect.ts, diagram-resolver.ts, spec-to-params.ts
test_svg.ts                      (루트 스크래치 파일)
```

> ⚠️ DB 컬럼 `Question.diagramSpec` / `diagramSVG` 는 **그대로 남아 있다**. 데이터는 안 지웠다.

### ② 학생앱·게이미피케이션 UI — 27파일 2,478줄 · `045dbc59`

학생 페이지 전체가 사라지면서 아바타·뱃지·랭킹·타이머 UI 가 갈 곳을 잃었다.

```
components/ui/    Avatar, AvatarAccessory, AvatarEffect, UserAvatar, Badge, Tier,
                  Card, CardV2, ButtonV2, Chip, CurrencyChip, ChoiceList, Confetti,
                  HintPanel, LeaderboardRow, LoadingEmptyState, MotionStagger, OXButtons,
                  ProgressBar, ProgressBarV2, QuestionCard, ResultCard, StatCard, StatTile,
                  TimerRing, index.ts(배럴)
components/landing/  AutomationStory.tsx
```

> `src/components/ui/` 에 **살아남은 12개**: Button, Input, Toast, Skeleton, Pagination,
> Tabs, PageContainer, PageHeader, ConfirmDialog, MathSpinner, LogoIcon, NarrowScreenGuard

### ③ Zod 스키마·타입 정의 — 7파일 634줄 · `93e4e6fa`

검증할 API 가 없어진 스키마들.

```
lib/schemas/   auth.ts, concept.ts, gamification.ts, learning.ts, workbook.ts
types/         report.ts, shop.ts
```

> `lib/schemas/question.ts` 는 살아 있다.

### ④ 남은 사문화 lib 모듈 — 9파일 878줄 · `75103c80`

```
lib/api/homework-grid.ts             숙제 그리드 헬퍼
lib/constants/labels.ts              학생앱 라벨
lib/constants/license-hub.ts         이용권 허브
lib/demo.ts                          ⚠️ 아래 주의 참조
lib/pdf-extract-engine/index.ts      배럴 (개별 모듈 직접 import 로 대체됨)
lib/pdf-extract-engine/presets/index.ts   배럴
lib/services/naver-section-cleanup.ts
lib/sounds.ts                        효과음
lib/view-as.ts                       선생님→학생 뷰 전환
```

> ⚠️ **`lib/demo.ts` 와 `lib/demo/` 는 다른 것이다.** 파일 `demo.ts` 만 들어냈고,
> **디렉터리 `src/lib/demo/`(accounts·demo-exams.json·naver-blocks·util)는 살아 있다.**
> 40여 곳이 `@/lib/demo/accounts` 형태로 쓰고 있다. 베어 `@/lib/demo` import 는 0건이라 안전했다.

---

## 어떻게 검증했나

import 스캔만으로는 부족하다. `readFileSync` 로 읽히는 파일은 import 그래프에 안 잡힌다
(실제로 `src/lib/constants/schools.ts` 가 `scripts/seed-schools.mjs` 에서 그렇게 읽혀
사문화 후보로 잘못 올라왔었다).

1. **전이 폐포(transitive closure)** — 직접 고아 33개 → 전이 포함 92개
2. **문자열 참조 그물망** — 아카이브 대상 모듈명을 `*.ts|tsx|mjs|js|json|md` 전체에서 grep → **0건**
3. `tsc --noEmit` → **0 에러**
4. 회귀 검사 **22/22 통과**
5. `npx next build` → exit 0
6. 실제 브라우저로 로그인 → 수학·영어 분석본 → 학습 대책 탭까지 구동, **콘솔 에러 0건**

### 부수 발견 — 빌드가 이미 깨져 있었다

`npx next build` 를 돌리다 알았다. 이 정리와 **무관하게** `cc85ee10` 부터 깨져 있었다.

```
commentary-agent.ts:29:42  Error: 'formatDistribution' is defined but never used
```

`@typescript-eslint/no-unused-vars` 가 error 레벨이라 빌드가 멈추는데,
**`tsc` 는 통과하기 때문에 타입체크만으로는 안 보인다.** `d8d42a86` 에서 고쳤다.

> 교훈: `tsc --noEmit` 통과 ≠ `next build` 통과. 린트 error 레벨 규칙이 빌드를 막는다.

---

## 남은 것

| 항목 | 상태 |
|---|---|
| `src/types/diagram.ts` · `pdf-extract.ts` | **의도적으로 남김.** `mathgen.ts` 가 `./diagram` 으로 재수출한다. 실제 소비되는 건 `CurriculumUnit` 뿐이라 잘라내면 2개 더 나가지만, 순수 이동이 아니라 파일 내용 편집이라 보류 |
| `src/lib/pdf-extract-engine.7z` | 15KB 압축 파일이 `src/` 안에 있다. import 되지 않으므로 무해하나 위치가 어색 |
| ~~Prisma 모델 5개~~ | **2026-08-31 제거 완료** — 아래 "후속: Prisma 모델 정리" 참조 |

---

## 후속: Prisma 모델 정리 (2026-08-31)

참조 0건·행 0건이던 **5개 모델**을 스키마와 DB 양쪽에서 제거했다.

| 모델 | 무엇이었나 |
|---|---|
| `ExamExtractSchedule` | 야간 배치 추출 스케줄 (서비스·API·Cron 은 이미 제거돼 있었다) |
| `ExamProblemCategory` | 오답 패턴 **대분류** ┐ Category ← Type 계층 |
| `ExamProblemType` | 오답 패턴 **유형** ┘ |
| `ExamPatternExample` | 패턴 예시 (`patternId` 에 FK 조차 없던 고아 테이블) |
| `ExamPatternMatchHistory` | 패턴 매칭 이력 |

### 이웃 두 개는 남겼다 — 행이 0이어도 코드가 읽는다

같은 "패턴 시스템" 블록 안에 있지만 **살아 있는 코드가 조회**한다. 행이 0이라 항상 빈 결과를
받지만 양쪽 다 `if (length > 0)` 폴백이 있어 정상 동작한다.

| 모델 | 읽는 곳 |
|---|---|
| `ExamErrorPattern` | `math/prompt-builder.ts`, `english/prompt-builder.ts` — `findMany` |
| `ExamPromptTemplate` | `/api/exam-analysis/templates` 전체 CRUD (4파일) |

> "행 0 = 죽었다"로 판단하면 안 된다. **읽는 코드가 있으면 살아 있는 것**이다.

### 부수 변경 — 살아 있는 테이블 하나를 건드렸다

`ExamErrorPattern."problemTypeId"` 칼럼을 함께 지웠다. `ExamProblemType` 이 사라지면
이 FK 가 가리킬 곳이 없기 때문이다. 안전한 근거:

- 실 사용부는 `name`·`errorType`·`frequency`·`feedbackMessage`·`description` **스칼라만** select
- 사전 확인: 총 0행 중 `problemTypeId` 채워진 행 **0건**

### ⚠️ `prisma db push` 를 쓰면 안 되는 이유 (실측)

`prisma migrate diff` 로 DB↔스키마 차이를 뽑아 보면 이렇게 나온다:

```
DROP TABLE "lab_concept_edges";
DROP TABLE "lab_problems";
...                                    ← lab_* 14개 + parax_* 2개
ALTER TABLE "TenantSubscription" DROP COLUMN "lsCustomerId", ...
```

이 DB 의 public 스키마에는 **`schema.prisma` 밖 테이블 16개**가 함께 산다. `db push` 는
"스키마에 없으면 지운다"이므로 이것들을 전부 날린다. 그래서 항상
`prisma/manual-migrations/*.sql` 로 **개별 DDL** 을 쓴다.

제거 후 다시 diff 를 떠서 **드롭한 5개와 `problemTypeId` 가 더는 나오지 않음**을 확인했다
(= DB 와 스키마가 그 부분에서 동기화됨). 남은 diff 는 `lab_*` 16개와 이전부터 보류 중인
`TenantSubscription` 칼럼 3개뿐이다.

### 실행 기록

- SQL: `prisma/manual-migrations/drop-dead-pattern-taxonomy.sql` (멱등, 트랜잭션, `CASCADE` 미사용)
- 드롭 직전 5개 테이블 행 수 재확인 → 전부 0 → 하나라도 0이 아니면 중단하도록 가드
- 실행 후 `lab_*`/`parax_*` **16개 → 16개 변동 없음** 확인
- `tsc` 0 에러 · 회귀 검사 22/22 · `next build` exit 0
