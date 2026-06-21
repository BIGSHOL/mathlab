# 🚧 수학 랩실 자동화(Lab) — 세션 핸드오프

> **목적**: 세션 간 인수인계. 끊김 없이 이어가기 위한 현재 상태 + 런북.
> **최종 갱신**: 2026-06-21 (로컬 세션 — **P1 autoGrader 구현·검증 완료**) · 이전: 2026-06-21 P0 DB 검증 · 2026-06-20 P0 구축

---

## 한 줄 요약

mathlab repo 안에, **라이브 기출분석 제품과 완전 격리된 채 은닉(dark launch) 개발 중**인
학원 운영 자동화 파이프라인(진단→처방→공급→채점→보고).
**P0 토대·로직 + P1 채점 auto(객관식·단답) 완성.** 모두 실DB end-to-end 검증 PASS.
다음 갈래는 **코크핏 DB연동(§7 ②)** 또는 **P2 진단 auto(BKT, §7 ④)** 또는 **학생답 입력 UI/제출 API(§7 ⑤)**.

---

## 0. 가장 먼저 읽을 것 (순서대로)

1. **`CLAUDE.md` 최상단 "🚧 최우선 하드 경계 — 수학 랩실 자동화(Lab) 서브시스템 격리"** ← 절대 규칙. 새 세션은 이걸 자동으로 읽음.
2. 이 문서 (현재 상태 + 런북).
3. 척추 설계: `src/lib/lab/stages.ts` (계약) + `prisma/schema.prisma`의 `Lab*` 모델.
4. P1 채점: `src/lib/lab/answer-compare.ts` (비교/정규화) + `src/lib/lab/pipeline/auto-grader.ts` (Grader).

---

## 1. 현재 상태 (branch / PR / 커밋)

| 항목 | 값 |
|------|----|
| 작업 브랜치 | `lab/p1-auto-grader` (worktree `F:\mathlab-lab-p1`, `claude/amazing-maxwell-blpgou`에서 분기) |
| PR | P0=#20. **P1=이 브랜치(`lab/p1-auto-grader`)로 신규 PR 예정/생성** |
| **로컬 P0 검증** | ✅ 2026-06-21 — 루프 end-to-end PASS (`scripts/lab/verify-p0.ts`) |
| **로컬 P1 검증** | ✅ **2026-06-21 — autoGrader 채점·정규화·진단반영 PASS** (`scripts/lab/verify-p1.ts`, 단위+e2e) |
| DB | ✅ `lab_submission_items` 추가(additive db push, 기존 5,947행 무손상 — 전/후 행수 동일 검증) |

> worktree 메모: `node_modules`는 메인 체크아웃(`F:\mathlab`)과 정션 공유 → 워크트리에서 `prisma generate` 시 메인 클라이언트도 갱신됨(additive라 메인 무해). `.env`/`.env.local`은 gitignore라 워크트리에 별도 복사 필요.

---

## 2. 절대 규칙 (격리) — 위반 시 전부 무효

- **ADDITIVE-ONLY**: 기출분석(exam-analysis) 파일 **0줄 수정**. Lab 작업은 전부 신규 파일.
  유일 공유 파일 `prisma/schema.prisma`도 `Lab*` **추가만**(기존 *비-Lab* 모델/필드/인덱스 무수정). Lab 모델끼리는 자유롭게 진화(예: `LabSubmission`에 `submittedAnswers` 관계 추가는 Lab 내부라 OK).
- **네임스페이스**: 모델 `Lab*` + `@@map("lab_*")`, 라우트 `src/app/lab/**`·`src/app/api/lab/**`, 로직 `src/lib/lab/**`. 비교/채점 로직도 Lab 안에 자기완결(기출분석 무import).
- **은닉**: `/lab`은 `SUPER_ADMIN` + 환경변수 `LAB_ENABLED`(기본 off)일 때만. 미인가 `notFound()`(404). 사이드바·랜딩·billing에 **링크/언급 금지**(`navigation.ts` 무수정).
- **DB**: `lab_*` 테이블에 **additive 변경만**. `prisma migrate reset` **절대 금지**(운영 데이터 보호). 변경 전 백업 권장.
- **✅ db push 안전 (2026-06-21 정정)**: 과거 이 Supabase DB는 타 프로젝트(`para-x`)와 공유라 `db push`가 상대 테이블을 드롭할 위험이 있었으나, **2026-06-21 para-x를 전용 프로젝트로 분리** → mathlab DB 단독 소유. 이제 `prisma db push`로 additive 변경 적용 안전(`migrate diff` 0). **단 변경 전 ① `migrate diff`로 파괴 구문(DROP/ALTER) 0건 확인 ② `--accept-data-loss` 없이 push(파괴 작업이면 스스로 중단)** 를 습관화. (메모리 `shared-supabase-db-no-db-push` 참조.)

---

## 3. 설계 (척추 = StudentLearningState)

5단계는 척추에 대한 **순수 함수**. 산출물마다 `genMode(MANUAL|ASSISTED|AUTO)`가 박혀
단계별 사람↔자동 독립 플립. **데이터는 역방향**으로 흐른다(채점→진단→처방→공급, `runCycle`이 박제).

| 단계 | 인터페이스 | 현재 구현체 | auto 전환 |
|------|-----------|-----------|----------|
| 진단 | `Diagnoser` | `manualDiagnoser` (누적 정답률) | **P2 (BKT)** ← 다음 |
| 처방 | `Prescriber` | `dumbPrescriber` (진도표만, 약점맵 무시) | P3 (핵심 해자) |
| 공급 | `Supplier` | `manualSupplier` (문제은행→워크시트, HWP 보류) | 반자동 |
| 채점 | `Grader` | ✅ **`autoGrader` (P1, 객관식·단답 자동채점)** | 서술형은 P5 |
| 보고 | `Reporter` | `manualReporter` (숙련도 스냅샷) | P4 |

**빌드 순서**: P0(척추+dumb처방+공급+채점) → ✅ **P1(채점 auto 객/단)** → P2(진단 auto) → P3(처방 smart) → P4(보고 auto) → P5(서술형 채점). ⚠️ 쉬운 자동화 ≠ 가치 우선순위(해자는 처방·서술형 채점에 있음).

**P1 채점 데이터 흐름** (제출↔채점 분리):
```
runStudentCycle(cold) → 워크시트 공급(PRESCRIBED)
  → submitAnswers(worksheetId, [{problemId, answer}]) → LabSubmissionItem 저장, 상태 SUBMITTED (채점 안 함)
  → runStudentCycle → autoGrader: LabSubmissionItem ⨯ LabProblem.answer 비교 → LabGradedItem 생성, GRADED
                       → diagnoser(needsReview 제외) → mastery 갱신 → 다음 공급
```

**검증된 동작(2026-06-21, verify-p1.ts)**: 5문항 중 알려진 답으로 정답 3/오답 2 제출 → autoGrader 채점이 제출답과 **결정적 1:1 일치(불일치 0)** → 단답 정규화($·공백·대문자) 정답 인식 → `자연수의 덧셈` `score=0.600`(관측 5) → 다음 워크시트 공급. **역방향 데이터 흐름 실DB 검증.**

---

## 4. 빌드된 것 (파일 지도)

```
prisma/schema.prisma          # Lab* 모델 14개 + enum 6개 (@@map lab_*) — additive
                              #   ★ LabSubmissionItem (P1 신규): 학생 문항별 raw 답 (정답과 동형 Json)
src/lib/lab/
  stages.ts                   # 5단계 계약 + DTO + runCycle + applyDelta
  gate.ts                     # 은닉 게이트 (assertLabAccess / guardLabApi / isLabEnabled)
  service.ts                  # runStudentCycle · loadMasteryMap · simulateManualGrading(P0 dev) · ★submitAnswers(P1)
  answer-compare.ts           # ★P1: 순수 비교/정규화 (gradeObjective/normalizeChoice/normalizeShortAnswer) — 자기완결
  pipeline/
    index.ts                  # p0Pipeline 조립 (grader = autoGrader)
    manual-diagnoser.ts  dumb-prescriber.ts  manual-supplier.ts
    manual-grader.ts          # P0 사람 채점 판독(보존, back-compat)
    auto-grader.ts            # ★P1: Grader auto — 비교 채점 + LabGradedItem 영속 + 멱등
    manual-reporter.ts
src/app/lab/                  # layout(게이트) + page(정적 코크핏, DB 미접근)
src/app/api/lab/              # run-cycle · simulate-grading (게이트, dev)
scripts/lab/
  seed-synthetic.ts           # 개념5 + 선수그래프5 + 문항30(MC/단답) + 데모학생/진도
  verify-p0.ts                # P0 end-to-end 스모크 (무작위 채점으로 루프만 확인)
  verify-p1.ts                # ★P1 end-to-end + 단위(비교/정규화/서술형 라우팅) — 결정적 단언
docs/lab/HANDOFF.md           # 이 문서
```

검증 상태: Lab 파일 `tsc --noEmit` 0에러 · 기출분석 변경 0건 · **P0/P1 루프 런타임 PASS(2026-06-21)**.

---

## 5. P1 구현 가이드 (autoGrader 의사결정)

- **학생답 저장처 = 신규 `LabSubmissionItem`** (`LabGradedItem`에 컬럼 추가 대신 모델 분리): 제출(SUBMITTED, 답만)과 채점(GRADED, 정오)의 라이프사이클을 깨끗이 분리 + 미사용이던 `SUBMITTED` 상태 활용. `answer Json`은 `LabProblem.answer`와 **동형**(객관식 `{choice:N}`, 단답 `{value:'s'}`).
- **비교(`answer-compare.ts`)는 Lab 자체 보유** — 트림 커밋으로 기존 `grading.ts` 등 삭제됨. 기출분석 무import.
  - `normalizeChoice`: 원형문자(①)·문자열 "N"·정수 N → 보기번호로 통일. 파싱 불가 → `needsReview`.
  - `normalizeShortAnswer`: 공백 제거 · 소문자 · KaTeX `$`/따옴표 제거 · `\dfrac→\frac`. **수학 동치(1/2=0.5)는 미처리 — 의도된 P1 한계**(향후 P3+ CAS).
  - `confidence`: 객관식 1.0 / 단답 정답 1.0·오답 0.85(표기 동치 잔여 불확실성). `< 0.5`면 `needsReview`.
  - 서술형(DESCRIPTIVE): 채점 안 함 → `needsReview=true, confidence=0` (P5에서 auto).
- **autoGrader 멱등성**: `submission.items` 존재(이미 채점) → 재채점 없이 read. 없으면 `submittedAnswers` 비교 → `LabGradedItem.createMany` + `SUBMITTED→GRADED` 전이(트랜잭션). `runStudentCycle`이 매 사이클 grader를 부르므로 중복 생성 방지 필수.
- **needsReview는 진단에서 제외**: autoGrader가 반환하는 `GradedItemDTO[]`에서 `needsReview` 항목을 빼 mastery 편향을 막는다(영속 LabGradedItem엔 남아 사람 검수 큐가 소비). `GradedItemDTO`엔 needsReview 필드가 없으므로 grader 단계에서 거르는 게 계약상 올바른 지점.
- **`simulateManualGrading`(P0)은 보존** — 무작위 채점으로 P0 루프만 닫는 dev 보조. P1 실제 경로는 `submitAnswers` + `autoGrader`.

---

## 6. 로컬에서 이어가기 — 런북

```bash
# 0) 코드 (worktree 또는 브랜치 체크아웃)
git fetch origin && git checkout lab/p1-auto-grader   # 또는 worktree F:\mathlab-lab-p1 사용

# 1) 의존성 + 클라이언트
npm install
npx prisma generate            # Lab* 타입(LabSubmissionItem 포함) 재생성
#    ⚠️ dev 서버 실행 중이면 generate EPERM(DLL 잠금) + 핫리로드 안 됨 → 스키마 변경 시 dev 끄고 generate 후 재시작 (CLAUDE.md 세션#1)

# 2) env: .env / .env.local 에 DATABASE_URL · DIRECT_URL (둘이 같은 DB여야 함)

# 3) 안전망 백업
npm run db:backup
#    (lab_* 테이블 생성 후 실행해야 성공 — backup이 신규 모델까지 export, 닭-달걀)

# 4) 스키마 변경 적용 — ✅ db push 안전(DB 분리 완료). 단 파괴 구문 0건 먼저 확인:
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma --script        # DROP/ALTER 0건 확인
npx prisma db push                                            # --accept-data-loss 쓰지 말 것(파괴면 중단)

# 5) 시드
node --env-file=.env.local --import tsx scripts/lab/seed-synthetic.ts

# 6) 검증 (HTTP/서버 불필요 — 게이트 아래 service 직접 호출)
node --env-file=.env.local --import tsx scripts/lab/verify-p0.ts   # P0 루프
node --env-file=.env.local --import tsx scripts/lab/verify-p1.ts   # P1 자동채점 + 정규화 + 진단
#    ⚠️ node_modules/.bin/tsx 는 bash 셸 shim이라 Windows node로 직접 실행 시 깨짐 → `node --import tsx` 사용

# 7) (선택) 은닉 활성 + dev: .env.local 에 LAB_ENABLED=true, npm run dev
#    ⚠️ :3000을 타 프로젝트(예: F:\Mathgen vite)가 IPv6(::1)로 점유 시 PORT=3100 npm run dev (CLAUDE.md 세션#8)
```

### ✅ PR 전 체크리스트 (Lab)
- [ ] `verify-p0.ts` PASS · `verify-p1.ts` PASS
- [ ] `npx tsc --noEmit` 0에러
- [ ] 기출분석/공유 표면 무수정: `git diff --name-only | grep -E "exam-analysis|navigation|billing|entitlements"` → 0건
- [ ] 스키마 변경 시 `migrate diff` 파괴 구문 0건 + db push 전/후 행수 동일 확인
- [ ] `npm run db:backup` 떠둠

---

## 7. 미결 결정 — 다음 갈래

- **① DB 검증** — ✅ 완료(2026-06-21).
- **② 코크핏 UI DB연동** ← 후보: `/lab` 정적 코크핏(`page.tsx`)을 실DB로 — 학생/숙련도/워크시트 목록 + 루프 구동 버튼.
- **③ P1 채점 auto(객/단)** — ✅ **완료(2026-06-21)**: `answer-compare.ts`+`auto-grader.ts`+`LabSubmissionItem`+`submitAnswers`+`verify-p1.ts`.
- **④ P2 진단 auto(BKT)** ← 후보: `manualDiagnoser`(누적 정답률) → `autoDiagnoser`(BKT). 누적 채점이 공짜로 켬.
- **⑤ 학생답 입력 UI / 제출 API** ← 후보: 현재 `submitAnswers`는 service 함수만 — `POST /api/lab/submit-answers`(게이트) + 코크핏/학생 입력 화면으로 실제 제출 경로 완성. (OCR/스캔 답안 `answerRef` 경로는 P5 서술형과 함께.)
- **⑥ needsReview 검수 큐 소비처** ← 후보: 서술형/저신뢰 항목을 사람이 채점하는 큐 UI(현재 플래그만 적재).

---

## 8. 알려진 함정 / 의도된 단순화

- **db push는 이제 안전**(§2) — 단 항상 `migrate diff` 파괴구문 0건 확인 + `--accept-data-loss` 미사용. `migrate reset`은 여전히 절대 금지.
- **backup-db.mjs 닭-달걀**: 신규 Lab 모델을 export 목록에 포함 → 테이블 생성 전엔 `npm run db:backup` 실패. 테이블 생성 후 백업.
- **needsReview ⊄ GradedItemDTO**: 진단 편향 방지로 autoGrader가 needsReview 항목을 DTO에서 제외. 서술형이 워크시트에 섞이면 mastery에 안 들어감(영속만). 의도된 동작.
- **단답 수학 동치 미처리**: `2/4` vs `1/2`, `1/2` vs `0.5` 불일치 처리(P3+ CAS). 현재는 표기 정규화 후 문자열 비교 — 오답 시 confidence 0.85.
- **`runStudentCycle` 반환 = `WorksheetDTO`**: `{ worksheetId, hwpUrl, problemIds }` (Prisma 레코드 아님). status는 DB 재조회.
- **`simulateManualGrading`(P0) 보존**: 무작위 채점 dev 보조. 실제 채점은 `submitAnswers`+`autoGrader`.
- **84개월 진도표 JSON · HWP 출제 엔진 부재**: 합성 데이터(`seed-synthetic.ts`)로 루프 검증 중. 확보 시 시드 교체.
- **import 관례**: 앱코드/스크립트 `@/` alias는 tsx v4.21+ 정상 해결. 스크립트 실행은 `node --env-file=… --import tsx`(`.bin/tsx` shim은 Windows에서 깨짐).

---

## 9. 한 줄 재개 프롬프트 (새 세션용)

> "수학 랩실 Lab 이어서 개발. **P0·P1(채점 auto 객/단)은 2026-06-21 완료** (`verify-p0.ts`/`verify-p1.ts` PASS).
> `docs/lab/HANDOFF.md`와 CLAUDE.md '최우선 하드 경계' 읽고, §7 **②(코크핏 DB연동)** / **④(P2 진단 BKT)** / **⑤(제출 API·UI)** 중 선택.
> ✅ DB 분리 완료라 `prisma db push` 안전(단 migrate diff 0건 확인). `migrate reset` 금지. 기출분석은 절대 건드리지 말 것."
