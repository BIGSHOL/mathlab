# 🚧 수학 랩실 자동화(Lab) — 세션 핸드오프

> **목적**: 세션 간 인수인계. 끊김 없이 이어가기 위한 현재 상태 + 런북.
> **최종 갱신**: 2026-06-21 (로컬 세션 — **P2 autoDiagnoser(BKT) 구현·검증 완료**) · 이전: P1 autoGrader · P0 DB 검증 · P0 구축

---

## 한 줄 요약

mathlab repo 안에, **라이브 기출분석 제품과 완전 격리된 채 은닉(dark launch) 개발 중**인
학원 운영 자동화 파이프라인(진단→처방→공급→채점→보고).
**P0 토대 + P1 채점 auto(객관식·단답) + P2 진단 auto(BKT) 완성.** 모두 실DB end-to-end 검증 PASS.
다음 갈래는 **코크핏 DB연동(§7 ②)** · **학생답 입력 UI/제출 API(§7 ⑤)** · **P3 처방 smart(핵심 해자)**.

---

## 0. 가장 먼저 읽을 것 (순서대로)

1. **`CLAUDE.md` 최상단 "🚧 최우선 하드 경계 — 수학 랩실 자동화(Lab) 서브시스템 격리"** ← 절대 규칙. 새 세션은 이걸 자동으로 읽음.
2. 이 문서 (현재 상태 + 런북).
3. 척추 설계: `src/lib/lab/stages.ts` (계약) + `prisma/schema.prisma`의 `Lab*` 모델.
4. P1 채점: `src/lib/lab/answer-compare.ts` + `pipeline/auto-grader.ts`. P2 진단: `src/lib/lab/bkt.ts` + `pipeline/auto-diagnoser.ts`.

---

## 1. 현재 상태 (branch / PR / 커밋)

| 항목 | 값 |
|------|----|
| 작업 브랜치 | `lab/p2-auto-diagnoser` (worktree `F:\mathlab-lab-p1`, `lab/p1-auto-grader`에서 분기) |
| PR 체인 | P0=#20 ← P1=#21(`lab/p1-auto-grader`) ← **P2=#22 예정(`lab/p2-auto-diagnoser`)**. 모두 `BIGSHOL/mathlab` |
| **로컬 P0 검증** | ✅ `scripts/lab/verify-p0.ts` PASS |
| **로컬 P1 검증** | ✅ `scripts/lab/verify-p1.ts` PASS (autoGrader, 진단기-무관 단언으로 갱신) |
| **로컬 P2 검증** | ✅ **`scripts/lab/verify-p2.ts` PASS** — BKT 단위 + e2e 결정적(DB==순수계산) + 수렴 + 멱등 |
| DB | ✅ `lab_submission_items`(P1) + `lab_submissions.diagnosedAt`(P2) 추가. additive db push, 기존 행수 무손상 검증 |

> ⚠️ **repo 토폴로지**: 로컬 clone 원격 `mathlab2`는 *트림 이전 낡은 스냅샷* — push/PR은 **`BIGSHOL/mathlab`**(정식, #20/#21 있는 곳). worktree에 `git remote add mathlab-orig https://github.com/BIGSHOL/mathlab.git` 후 사용. additive 여부는 `mathlab-orig/main` 대비로 확인(Lab 작업은 거기서 순수 additive).
> worktree `node_modules`는 메인(`F:\mathlab`)과 정션 공유 → `prisma generate` 시 메인 클라이언트도 갱신(additive라 무해). `.env`/`.env.local`은 별도 복사.

---

## 2. 절대 규칙 (격리) — 위반 시 전부 무효

- **ADDITIVE-ONLY**: 기출분석(exam-analysis) 파일 **0줄 수정**. Lab 작업은 전부 신규 파일.
  유일 공유 파일 `prisma/schema.prisma`도 `Lab*` **추가만**(기존 *비-Lab* 모델/필드/인덱스 무수정). Lab 모델끼리는 자유롭게 진화(예: `LabSubmission`에 `submittedAnswers`·`diagnosedAt` 추가는 Lab 내부라 OK).
- **네임스페이스**: 모델 `Lab*` + `@@map("lab_*")`, 라우트 `src/app/lab/**`·`src/app/api/lab/**`, 로직 `src/lib/lab/**`. 비교/채점/진단(BKT) 로직 전부 Lab 안 자기완결(기출분석 무import).
- **은닉**: `/lab`은 `SUPER_ADMIN` + `LAB_ENABLED`(기본 off)일 때만. 미인가 `notFound()`(404). 사이드바·랜딩·billing에 **링크/언급 금지**.
- **DB**: `lab_*`에 **additive 변경만**. `prisma migrate reset` **절대 금지**. 변경 전 백업 권장.
- **✅ db push 안전 (2026-06-21)**: para-x DB 분리 완료 → mathlab DB 단독 소유. `prisma db push`로 additive 변경 안전. **습관: ① `migrate diff`로 파괴 구문(DROP/ALTER COLUMN) 0건 확인 ② `--accept-data-loss` 없이 push(파괴면 자동 중단) ③ 전/후 행수 동일 확인.** (메모리 `shared-supabase-db-no-db-push`.)

---

## 3. 설계 (척추 = StudentLearningState)

5단계는 척추에 대한 **순수 함수**. 산출물마다 `genMode(MANUAL|ASSISTED|AUTO)`가 박혀
단계별 사람↔자동 독립 플립. **데이터는 역방향**으로 흐른다(채점→진단→처방→공급, `runCycle`이 박제).

| 단계 | 인터페이스 | 현재 구현체 | 다음 전환 |
|------|-----------|-----------|----------|
| 진단 | `Diagnoser` | ✅ **`autoDiagnoser` (P2, BKT p(mastered))** | — |
| 처방 | `Prescriber` | `dumbPrescriber` (진도표만, 약점맵 무시) | **P3 (핵심 해자)** ← 다음 |
| 공급 | `Supplier` | `manualSupplier` (문제은행→워크시트, HWP 보류) | 반자동 |
| 채점 | `Grader` | ✅ **`autoGrader` (P1, 객관식·단답)** | 서술형은 P5 |
| 보고 | `Reporter` | `manualReporter` (숙련도 스냅샷) | P4 |

**빌드 순서**: P0 → ✅P1(채점 auto) → ✅P2(진단 auto) → P3(처방 smart) → P4(보고 auto) → P5(서술형 채점). ⚠️ 쉬운 자동화 ≠ 가치 우선순위(해자는 처방·서술형 채점).

**데이터 흐름** (제출↔채점↔진단 분리):
```
runStudentCycle(cold) → 공급(PRESCRIBED)
  → submitAnswers → LabSubmissionItem, SUBMITTED (채점/진단 안 함)
  → runStudentCycle → autoGrader(LabSubmissionItem ⨯ LabProblem.answer 비교 → LabGradedItem, GRADED)
                       → autoDiagnoser(BKT: graded → p(mastered) 갱신, needsReview 제외)
                       → diagnosedAt 마킹(정확히 1회) → 처방 → 다음 공급
```

**검증된 동작(2026-06-21)**: P1 — 정/오 결정적 1:1 일치(불일치 0). P2 — BKT가 DB와 순수계산 정확 일치(전정답 5문항 → score 0.9995), 연속정답 수렴(증분 0.75→0.0005), **재실행 멱등**(diagnosedAt 게이트로 이중관측 0).

---

## 4. 빌드된 것 (파일 지도)

```
prisma/schema.prisma          # Lab* 모델 14개 + enum 6개 (@@map lab_*) — additive
                              #   LabSubmissionItem(P1): 학생 raw 답 / LabSubmission.diagnosedAt(P2): 진단 1회 마커
src/lib/lab/
  stages.ts                   # 5단계 계약 + DTO + runCycle + applyDelta
  gate.ts                     # 은닉 게이트
  service.ts                  # runStudentCycle(diagnosedAt 멱등 가드) · loadMasteryMap · submitAnswers(P1) · simulateManualGrading(P0 dev)
  answer-compare.ts           # P1: 객관식/단답 비교·정규화 (자기완결)
  bkt.ts                      # ★P2: BKT 순수함수 (bktPosterior/bktFold + BKT_PARAMS) — 자기완결
  pipeline/
    index.ts                  # p0Pipeline 조립 (diagnoser=autoDiagnoser, grader=autoGrader)
    manual-diagnoser.ts       # P0 누적정답률(보존)
    auto-diagnoser.ts         # ★P2: BKT Diagnoser — graded → p(mastered) upsert
    dumb-prescriber.ts  manual-supplier.ts  manual-grader.ts  auto-grader.ts(P1)  manual-reporter.ts
scripts/lab/
  seed-synthetic.ts  verify-p0.ts  verify-p1.ts  verify-p2.ts(★BKT)
docs/lab/HANDOFF.md
```

검증 상태: `tsc --noEmit` 0에러 · 기출분석 변경 0건 · P0/P1/P2 루프 런타임 PASS.

---

## 5. 구현 가이드 (P1 채점 / P2 진단)

### P1 — autoGrader (객관식·단답)
- 학생답 저장처 = **`LabSubmissionItem`**(제출 SUBMITTED ↔ 채점 GRADED 분리). `answer Json`은 `LabProblem.answer`와 동형.
- 비교(`answer-compare.ts`)는 Lab 자체: `normalizeChoice`(보기번호), `normalizeShortAnswer`(공백/`$`/`\dfrac`). **수학 동치(1/2=0.5) 미처리 — P3+ 한계**.
- autoGrader 멱등(이미 채점→read). 서술형/저신뢰는 `needsReview`로 사람 큐 + **진단 DTO에서 제외**(mastery 편향 방지).

### P2 — autoDiagnoser (BKT)
- **누적정답률 → p(mastered)**(베이지안). `bkt.ts`: `bktPosterior(prior, isCorrect)` = ① 증거 조건화(정답 `L(1-pS)/[L(1-pS)+(1-L)pG]`, 오답 `L·pS/[L·pS+(1-L)(1-pG)]`) → ② 학습 전이 `post+(1-post)pT`. `bktFold`로 시퀀스 접기(**순서 민감** → graded 순서 보존).
- **파라미터 = 전역 상수** `BKT_PARAMS = {pL0:0.25, pT:0.2, pS:0.1, pG:0.2}`. ⚠️ `pG=0.2`는 5지선다 추측 수준(단답은 더 낮지만 P2는 단일값). per-concept 보정은 **P2b**(LabConcept에 nullable 필드 추가, additive).
- **prior 이어받기**: 기존 mastery 있으면 그 score를, 없으면 `pL0`. → P0/P1 누적점수도 신념으로 자연 승계('공짜로 켬').
- **score 의미 전환**: `LabMasteryRecord.score`가 '누적정답률'→'p(mastered)'. 같은 0..1이나 해석 다름. **소비처 안전**(dumbPrescriber는 mastery 무시, manualReporter는 평균·0.6 임계 — 둘 다 타당). P3 smart 처방이 비로소 p(mastered)를 소비.
- **observationCount는 메타데이터**(관측 수)로만 갱신. **BKT 가중치 아님**.
- **🔴 멱등성**: `runStudentCycle`이 매 사이클 진단을 부르므로 같은 제출 이중관측 위험(BKT는 순서민감이라 치명적). → `LabSubmission.diagnosedAt`로 **제출당 정확히 1회** 게이트(service가 채점+진단을 `!diagnosedAt`일 때만, 사이클 끝에 마킹). manual/auto 공통 안전. runCycle throw 시 미마킹 → 재시도 안전.

---

## 6. 로컬에서 이어가기 — 런북

```bash
git fetch mathlab-orig && git checkout lab/p2-auto-diagnoser   # 또는 worktree F:\mathlab-lab-p1
npm install
npx prisma generate            # Lab* 타입 재생성 (dev 서버 끄고 — DLL 잠금/핫리로드, CLAUDE.md 세션#1)
# env: .env / .env.local 에 DATABASE_URL · DIRECT_URL (같은 DB)
npm run db:backup              # 안전망(lab_* 생성 후 실행)

# 스키마 변경 적용 — ✅ db push 안전. 파괴 구문 0건 먼저:
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
npx prisma db push             # --accept-data-loss 쓰지 말 것

node --env-file=.env.local --import tsx scripts/lab/seed-synthetic.ts
node --env-file=.env.local --import tsx scripts/lab/verify-p0.ts   # P0 루프
node --env-file=.env.local --import tsx scripts/lab/verify-p1.ts   # P1 채점
node --env-file=.env.local --import tsx scripts/lab/verify-p2.ts   # P2 진단(BKT)
#   ⚠️ node_modules/.bin/tsx 셸 shim은 Windows node로 깨짐 → `node --import tsx` 사용
```

### ✅ PR 전 체크리스트 (Lab)
- [ ] `verify-p0/p1/p2` 모두 PASS
- [ ] `npx tsc --noEmit` 0에러
- [ ] 기출분석/공유 무수정: `git diff --name-only | grep -E "exam-analysis|navigation|billing|entitlements"` → 0건
- [ ] 스키마 변경 시 `migrate diff` 파괴 구문 0 + db push 전/후 행수 동일
- [ ] `npm run db:backup`

---

## 7. 미결 결정 — 다음 갈래

- ① DB 검증 — ✅ 완료. ③ P1 채점 auto — ✅ 완료(#21). ④ P2 진단 auto(BKT) — ✅ **완료**.
- **② 코크핏 UI DB연동** ← 후보: `/lab` 정적 코크핏을 실DB로 — 학생/숙련도(p(mastered))/워크시트 + 루프 구동.
- **⑤ 학생답 입력 UI / 제출 API** ← 후보: `POST /api/lab/submit-answers`(게이트) + 입력 화면. (스캔 `answerRef`+OCR는 P5 서술형과.)
- **P3 처방 smart(핵심 해자)** ← BKT p(mastered)·선수개념(LabConceptEdge)로 약점 게이팅 처방. dumbPrescriber→smartPrescriber.
- ⑥ needsReview 검수 큐 소비처(서술형/저신뢰).
- **P2b BKT 보정**: per-concept 파라미터(LabConcept 필드) + 유형별 pG(MC/단답). 실데이터 확보 후.

---

## 8. 알려진 함정 / 의도된 단순화

- **db push 안전**(§2) — 단 항상 파괴구문 0 확인 + `--accept-data-loss` 미사용. `migrate reset` 금지.
- **backup-db.mjs 닭-달걀**: 신규 Lab 모델 export → 테이블 생성 전엔 `db:backup` 실패. 생성 후 백업.
- **BKT score 의미 전환**: '누적정답률'→'p(mastered)'. 현재 소비처는 안전하나 향후 UI/리포트는 'p(mastered)'로 해석해야(예 0.65 = '숙련 확률 65%', '정답률 65%' 아님). P3 smart 처방도 사후확률로 다룰 것.
- **observationCount 재해석**: BKT에선 '관측 수열 길이'(신뢰도 대용). 빈도주의 '표본수=분산'으로 쓰지 말 것(P3 휴리스틱 주의).
- **pG 단일값**: 객관식·단답 미구분(MC 추측↑). 유형별 분리는 P2b(GradedItemDTO에 type 추가 필요).
- **diagnosedAt 멱등 게이트**: 제출당 진단 1회. P0/P1 잠복하던 이중관측 버그도 동시 해소(verify-p1도 영향 없이 통과).
- **needsReview ⊄ GradedItemDTO**: autoGrader가 제외 → 서술형이 워크시트에 섞여도 mastery 편향 없음(영속만).
- **`simulateManualGrading`(P0) 보존**: 무작위 dev 보조. 실제 채점은 submitAnswers+autoGrader.
- **84개월 진도표 JSON·HWP 엔진 부재**: 합성 시드로 루프 검증 중.
- **스크립트 실행**: `node --env-file=… --import tsx`(`.bin/tsx` shim은 Windows에서 깨짐). `@/` alias는 tsx 정상 해결.

---

## 9. 한 줄 재개 프롬프트 (새 세션용)

> "수학 랩실 Lab 이어서 개발. **P0·P1(채점 auto)·P2(진단 BKT)는 2026-06-21 완료** (`verify-p0/p1/p2.ts` PASS).
> `docs/lab/HANDOFF.md`와 CLAUDE.md '최우선 하드 경계' 읽고, §7 **②(코크핏 DB연동)** / **⑤(제출 API·UI)** / **P3(처방 smart=핵심 해자)** 중 선택.
> ✅ db push 안전(단 migrate diff 0건 확인), `migrate reset` 금지. push/PR은 `BIGSHOL/mathlab`(원격 mathlab2는 낡음). 기출분석 절대 무수정."
