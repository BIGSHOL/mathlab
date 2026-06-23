# 🚧 수학 랩실 자동화(Lab) — 세션 핸드오프

> **목적**: 세션 간 + **다른 컴퓨터** 간 인수인계. 끊김 없이 이어가기 위한 현재 상태 + 런북.
> **최종 갱신**: 2026-06-23 (로컬 세션 — **천재(김동재) 중1 소단원평가 126문항 추가 인제스트 → 총 519문항(3교재: 동아+미래엔+천재)**. 셧다운 2회로 워크플로 중단됐으나 저널 하베스트+병합으로 무손실 복구) · 이전: 2026-06-22 P0~P5 + 코크핏/제출 UI + 콘텐츠 토대 1·2·3·4단계 + 중1 인제스트 255문항(2교재)
> 🖥️ **다른 컴퓨터에서 이어받기**: 아래 **§6 "새 컴퓨터 셋업"** 먼저 보라. ⚠️ `.env.local`·메모리(`~/.claude/...`)는 **git에 없음** → 이 문서가 단일 진실(SoT).

---

## 한 줄 요약

mathlab repo 안에, **라이브 기출분석 제품과 완전 격리된 채 은닉(dark launch) 개발 중**인
학원 운영 자동화 파이프라인(진단→처방→공급→채점→보고).
**🎉 P0~P5 완성 — 5단계 전체 자동화** (채점 auto 객/단+서술형AI · 진단 BKT · 처방 smart 해자 · 보고 auto; `verify-p0~p5` PASS) **+ ②⑤ 코크핏/제출 UI 완료**(`/lab` 실DB 대시보드 + 풀이→제출→채점 루프).
**+ 콘텐츠 토대 1·2·3·4단계 완료**: ① 실 개념그래프 239개 ② AI 문제생성기 ③ **실 본문/보기/해설/도형 영속 + 실 데이터 루프 배선**(데모 학생 → 중1 실 개념 repoint, 풀이 UI 실본문·도형 렌더) ④ **도형 역량**(`LabProblem.diagram` 컬럼 + 공유 `svg-diagrams` 재사용 + Lab 삼각형 렌더러: 각을 호/직각기호로).
**+ 중1 인제스트 — `lab_problems` 255문항** (합성 30 + 실교재 225), 전부 **₩0 세션비전 워크플로**. **2교재 커버**: 동아(강옥기) 단원마무리/해결해요 + **미래엔(황선욱) 대단원평가 88**(8개 대단원 전체: 1소인수분해·2정수와유리수·3문자와식·4좌표평면과그래프 = 중1-1 / 6평면도형·7입체도형·8통계 = 중1-2; 5기본도형은 도형의존 多로 보류). 중1 실개념 **25/26 커버(96%)** — 남은 1개 14-03 평행선(도형타입 부재로 정상 보류). 문제 검수 브라우저 `/lab/problems`로 품질 확인.
**다음 = 백필 확대**(다른 교재[비상·천재 등]/다른 학년[중2 등]으로 deepen) 또는 ⑥ 검수큐 · P*b 고도화. 도형 의존 문제(14-03 평행선·복합도형·그래프 읽기·히스토그램)는 Lab 도형 타입 확장 시 인제스트 가능(현재 보수적 제외).

---

## 2026-06-23 세션 — 천재 인제스트 + 셧다운 2회 무손실 복구

**완료**: 천재교육(김동재) 중1 소단원평가 **126문항** DB 적재 → **총 519문항**(지학사 138·동아 134·천재 126·미래엔 88·합성 33). source=`천재교육(김동재) 중1 소단원평가 [세션비전]`, provenance(publisher 천재·sourceType 소단원평가·author 김동재·grade 중1). 커버: **식·수 전 범위 13-01~13-13** + 기하/통계 일부(14-01·04·06·10). 빠진 14-xx(02 위치관계·05 합동·07 원과부채꼴·08 다면체·09 회전체·11 줄기와잎·13 상대도수)는 대부분 도형의존 → 보수적 미채택.

**🔴 핵심 교훈 — 워크플로 셧다운 복구 = 저널 하베스트+병합 (₩0, 무손실)**:
- ₩0 세션비전 전사 워크플로(`lab-ingest-cheonjae-sodan`, scriptPath는 구 세션 `554fcc6d/workflows/scripts/`에 보존)가 **API 전역 과부하(레이트리밋)** + **컴퓨터 셧다운 2회**로 두 번 중단됨.
- **`resumeFromRunId`는 "same-session only"** → 셧다운 후 새 세션에서 재개하면 캐시 안 이어짐 → **새 run은 처음부터 = 커버리지 후퇴**(원래 run `wf_49197812-21c` 17개념 > 새 run `wf_99d099e9-a8d` 7개념). **교훈: 셧다운/크로스세션 복구는 resume에 의존하지 말고 저널을 직접 하베스트하라.**
- **복구법**: 각 워크플로 run의 `journal.jsonl`(`<session>/subagents/workflows/<runId>/journal.jsonl`)에 완료 에이전트의 `{type:'result', result:{problems:[...]}}`가 **디스크에 영속**. 여러 run의 저널을 **병합·중복제거**(키=conceptId+problemNumber+body[:60], 같은 키는 verify가 author 뒤에 오므로 **last 우선**=교정본) → `{byConcept}` JSON → `ingest-workflow-output.ts`로 적재. 228+54 → 중복제거 135 → 검증통과 126(실패 9=rubric 누락 서술형, 정상 제외).
- **answerIndex 0-based/off-by-one 자동 교정**: 적재 도구가 `answer` 텍스트와 보기 매칭으로 1-based 강제 보정(에이전트가 answerIndex=0 등 오류 줘도 복구).

**⏳ 다음 = 동아 소단원학습지 (준비 완료, 미발사)**:
- **자산**: `d:/tmp/lab-donga-sod/` PNG **321개**(0 누락 검증), 매니페스트 `d:/tmp/donga_manifest.json` = **42개 소단원** `[{uid, probPages[], solPages[]}]`. 천재(2-up 단일페이지)와 달리 **소단원당 여러 문제페이지(최대 10p, 5_5) + 별도 정답·해설 페이지** 구조 → 워크플로는 **소단원당 1에이전트**(probPages+solPages 함께 Read, 천재 CATALOG 재사용)로 설계 권장(234페이지 per-page는 author+verify+재시도로 1000 에이전트 상한 근접 위험).
- **발사 보류 이유**: API 전역 과부하 + 셧다운 반복. 안정화 후 발사하되, 크래시해도 위 저널 하베스트로 무손실 복구 가능.

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
| **스택 팁(현재)** | `lab/content-foundation` (PR **#27**, 콘텐츠 토대 1·2·**3·4단계 + 실데이터 루프 + 중1 전범위 인제스트**). 새 머신(2026-06-22~)은 `D:\mathlab` **직접 체크아웃**(worktree 아님). 구 머신은 worktree `F:\mathlab-lab-p1`이었음 |
| **PR 스택 체인** | `main` ←#20(`claude/amazing-maxwell-blpgou`, P0 척추) ←#21(`lab/p1-auto-grader`) ←#22(`lab/p2-auto-diagnoser`) ←#23(`lab/p3-smart-prescriber`) ←#24(`lab/p4-auto-reporter`) ←#25(`lab/p5-descriptive-grading`) ←#26(`lab/cockpit`, ②⑤ UI) ←#27(`lab/content-foundation`, **TIP**). 전부 `BIGSHOL/mathlab` — **#27만 OPEN, #20~#26 DRAFT**(스택 머지 대기) |
| **로컬 검증** | ✅ `verify-p0~p5` + `verify-gen` + `verify-persist`(영속 글루) + `verify-ingest`(세션비전 인제스트 경로) = **9/9 PASS**(새 머신 2026-06-22) + `gen-sample.ts` 실Gemini 6/6(품질) |
| DB(공유 Supabase) | `lab_submission_items`(P1)+`lab_submissions.diagnosedAt`(P2). 개념그래프: `lab_concepts` 244행·`lab_concept_edges` 177행. ✅ **토대 3·4단계 스키마**: `lab_problems`에 `body`/`choices`/`explanation`(토대3) + **`diagram`**(토대4) **nullable 컬럼**(db push 비파괴, 행수 불변). 생성/인제스트→영속 글루(`persist.ts`) 완료. **인제스트: `lab_problems` 255행** = 합성시드 30 + **실문제 225**(중1 거의 전범위). 중1 실개념 **26개 중 25개 커버(96%)** — 남은 1개는 14-03 평행선(도형타입 부재로 정상 보류). 소스: 동아(강옥기) 단원마무리(1~8)+해결해요/수준별학습지+단원마무리 5(기본도형) + **미래엔(황선욱) 대단원평가 88**(8개 대단원 전체 — 중1-1 단원1·2·3·4=60 + 중1-2 단원6·7·8=28; 단원5 기본도형은 도형의존 多로 보류. 비도형 자족 문항만; 그래프·도형 읽기 문항은 보수적 제외). 전부 `isGenerated=false`, **₩0 세션비전 워크플로**(배치-2~3 OCR→적대적 검증, 풀이 페이지에서 실 정답·해설 추출). 도형(삼각형·정다각형·사각뿔·구) 렌더 검증. 난이도 L2~4(L5=0 — 심화 소스 없음). **워크플로 결과 영속은 `scripts/lab/ingest-workflow-output.ts`**(엔티티 디코딩+diagram 파싱+**객관식 answerIndex↔answer 텍스트 보정**+**`ESSAY`→`DESCRIPTIVE` 타입 정규화**+멱등 source). |

> 🖥️ **다른 컴퓨터에서 시작**: `git clone https://github.com/BIGSHOL/mathlab.git` → `git checkout lab/content-foundation`(스택 팁) → **§6 새 컴퓨터 셋업** 따라 `.env.local` 구성. worktree는 *이 머신 사정*이라 새 머신은 그냥 브랜치 체크아웃이면 됨(worktree 불필요).
> ⚠️ **repo 토폴로지**: 원격 `mathlab2`는 *낡은 스냅샷* — push/PR은 **`BIGSHOL/mathlab`**(origin, 정식). additive 여부는 `origin/main` 대비로 확인.
> ⚠️ **이 머신 한정**: worktree `node_modules`는 메인(`F:\mathlab`)과 정션 공유. `.env.local`은 머신별 별도(§6).

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
| 처방 | `Prescriber` | ✅ **`smartPrescriber` (P3, BKT 약점·선수개념 적응)** | per-concept 보정 P3b |
| 공급 | `Supplier` | `manualSupplier` (문제은행→워크시트, HWP 보류) | 반자동 |
| 채점 | `Grader` | ✅ **`autoGrader` (P1 객·단 + P5 서술형 AI)** | feedback 영속 P5b |
| 보고 | `Reporter` | ✅ **`autoReporter` (P4, 학부모/원장 결정적 리포트)** | AI 내러티브 P4b |

**빌드 순서**: P0 → ✅P1(채점) → ✅P2(진단) → ✅**P3(처방 smart=해자)** → ✅P4(보고) → ✅**P5(서술형 채점=해자)** = **5단계 전체 자동화 완료**. ⚠️ 쉬운 자동화 ≠ 가치 우선순위(해자는 처방·서술형 채점 — 둘 다 완료).

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
  service.ts                  # runStudentCycle(diagnosedAt 멱등 가드) · loadMasteryMap · submitAnswers(P1) · generateLabReport(★P4) · simulateManualGrading(P0 dev)
  answer-compare.ts           # P1: 객관식/단답 비교·정규화 (자기완결)
  bkt.ts                      # P2: BKT 순수함수 (bktPosterior/bktFold + BKT_PARAMS) — 자기완결
  prescribe-policy.ts         # P3: 처방 정책 순수함수 (adaptiveDifficulty/Count + 임계) — 자기완결
  report-policy.ts            # P4: 보고 정책 순수함수 (masteryLabel/overallLabel/masteryBucket + 임계) — 자기완결
  ai-client.ts                # ★P5+토대2: Lab 자체 Gemini 클라이언트(복제, 격리). 모델명 서버로그만
                              #   gradeWithGemini(서술형채점) · generateWithGemini(문제생성, thinkingBudget=0)
                              #   repairJsonString(LLM JSON 복구: LaTeX 백슬래시·줄바꿈·잘림 salvage)
  problem-gen.ts              # ★토대2: 문제생성 정규화·검증·DI(주입형, 테스트 $0)
                              #   generateProblem/normalizeGenerated/generateProblemsForConcept + set/resetProblemGenerator
  persist.ts                  # ★토대3·4: 생성/인제스트 → LabProblem 영속 글루 (body/choices/explanation/diagram, bodyRef='inline', opts.isGenerated)
  ingest.ts                   # ★토대3-B·4: 세션 비전 인제스트 문서(IngestDoc) 검증·매핑 (normalizeGenerated 재사용 + source 오버라이드 + diagram 검증)
  diagram/lab-triangle.ts     # ★토대4: Lab 삼각형 렌더러 (각→호/직각기호, 각 값에서 꼭짓점 계산). 공유 svg-utils 재사용
  pipeline/
    index.ts                  # p0Pipeline 조립 (diagnoser=autoDiagnoser, prescriber=smartPrescriber, grader=autoGrader, reporter=autoReporter)
    manual-diagnoser.ts  auto-diagnoser.ts(P2 BKT)
    dumb-prescriber.ts(보존)  smart-prescriber.ts(P3 약점·선수개념 적응)
    manual-supplier.ts  manual-grader.ts(보존)  auto-grader.ts(P1 객·단 + P5 서술형 분기)
    descriptive-grader.ts(★P5 주입형 AI 채점 + descriptiveVerdict 순수)
    manual-reporter.ts(보존)  auto-reporter.ts(P4 학부모/원장 결정적 리포트)
src/app/lab/                  # ②⑤ UI (#26): page.tsx(코크핏 실DB) · LabCockpitActions.tsx · worksheet/[id]/(풀이, 실본문·도형) · layout.tsx(게이트, 코크핏|검수 내비)
  problems/page.tsx           # ★토대4: 문제 품질 검수 브라우저(읽기전용, 실교재/합성 필터, KaTeX+도형)
  LabDiagram.tsx              # ★토대4: 도형 렌더러(공유 svg-diagrams 재사용 → SVG, 삼각형은 lab-triangle 디스패치)
src/app/api/lab/              # run-cycle · demo-step · submit-answers · generate-report (전부 guardLabApi 게이트)
scripts/lab/
  seed-curriculum.ts          # ★토대1: curriculum.ts → LabConcept/Edge 239+172 (--apply로 DB 적용, 없으면 dry-run)
  seed-synthetic.ts           # P0 데모 시드 (합성 5개념 + 데모학생 lab-student-demo)
  repoint-demo.ts             # ★토대3: 데모 학생 → 중1 실개념 repoint (합성 잔여정리 + pacing 13,1 + cold 사이클)
  verify-p0~p4.ts  verify-p5.ts(★서술형 스텁)
  verify-gen.ts               # ★토대2: 문제생성 정규화 검증 7/7 PASS (스텁, $0)
  verify-persist.ts           # ★토대3: 생성→LabProblem 영속 글루 검증 (스텁 $0, 테스트행 생성 후 자동 정리)
  verify-ingest.ts            # ★토대3-B: 세션 비전 인제스트 경로 검증 (픽스처 유효3+무효1, $0, 자동 정리)
  ingest-problems.ts          # ★토대3-B: 인제스트 CLI — 세션 작성 JSON → 검증 → conceptId/중복 가드 → 영속(isGenerated=false)
docs/lab/INGEST.md            # ★토대3-B: 세션 비전 인제스트 데이터계약 + 작성규칙(변환기 EXAM_OCR_PROMPT 이식) + SOP
  gen-sample.ts               # ★토대2: 실 Gemini 품질 샘플 (DB 미저장, opt-in 소액비용)
  smoke-p5-real-ai.ts         # ★실 Gemini 채점 1콜 (opt-in, LAB_P5_REAL_AI=1)
docs/lab/HANDOFF.md
```

검증 상태: `tsc --noEmit` 0에러 · 기출분석 변경 0건 · `verify-p0~p5` + `verify-gen` PASS · `gen-sample` 실Gemini 6/6.

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

### P3 — smartPrescriber (처방 smart, 핵심 해자)
- **무엇**: 선수개념 토대 주입 + 진도표 현위치 + 과거 약점 복습(top `MAX_WEAKNESS_OVERLAY`=2). 정책/임계는 `prescribe-policy.ts`(Lab 자체).
- **난이도/문항(적응)**: BKT `p(mastered)` → `adaptiveDifficulty`(0.4/0.6/0.8/0.95 경계, 1~5; 교정 모드 상한 3) + `adaptiveCount`(약점 3 / 표준 5 / 숙련 6~7).
- **선수개념 소프트 게이팅**: *약한* 현위치 개념의 *증거 있는 미흡(<`PREREQ_READY_THRESHOLD`=0.7)* 직접 선수개념(`LabConceptEdge`)을 **막지 않고 함께** 처방, **앞 순서**로(토대 보강). 강한/미시도 선수는 제외.
- **cold 무회귀**: 증거 없는(관측 0) 개념은 dumb 베이스라인(난이도2·5문항) → 첫 사이클은 dumb와 동일.
- **⚠️ 처방 ephemeral**: `PrescriptionDTO`는 공급으로만 흐르고 **`LabPrescription` 미영속**(P0 설계, `worksheet.prescriptionId=null`). 따라서 `reason`/`genMode='AUTO'`는 *현재 DB에 안 남음*. 분석 추적성(어떤 약점을 자꾸 처방하나)이 필요하면 **처방 영속 + worksheet FK 연결**이 후속 과제(P3b).
- **⚠️ 난이도 4~5 vs 문제은행**: 합성 시드는 개념당 난이도 [1,2,2,3,2,1](최대 3). 강한 학생에 난이도 4~5 처방 시 supplier가 fallback(다른 난이도 보충)으로 채워 *의도 난이도 손실* — 실문제은행(난이도 4~5 포함) 확보 시 해소. prescriber 버그 아님.

### P4 — autoReporter (보고 auto)
- **결정적 템플릿**(AI 호출 없음): mastery 스냅샷 → 학부모(PARENT)/원장(DIRECTOR) 리포트. 정책/라벨은 `report-policy.ts`(Lab 자체). **모델명 누출 0**(결정적이라 AI 무관). AI 내러티브는 **P4b** 선택 확장.
- **학부모(PARENT)**: 정성 라벨 위주(`masteryLabel`/`overallLabel`), `grew`/`strengths`/`focus` 개념명 + 격려 메시지. **raw 점수 미노출**(CLAUDE.md #12-5 — 비전문 독자엔 검증불가 수치 자제).
- **원장(DIRECTOR)**: 정확 통계 — 숙련/학습중/약점 분포(`masteryBucket`), 평균, 영역별 집계, 약점 개념(점수·관측수).
- **성장(delta)**: 직전 *같은 type* 리포트의 `summary.snapshot`과 비교로 계산 → **시계열 테이블 불필요**. 매 리포트가 현재 스냅샷을 `summary`에 저장 → 다음 리포트가 diff. 첫 리포트는 baseline(prev 없음→delta null). `summary` Json은 진입부 안전 정규화(CLAUDE.md #11).
- **트리거**: `service.generateLabReport(studentId, type, periodStart?, periodEnd?)` — 보고는 runCycle과 별개(주기/수동). period 기본 최근 1주. (autoReporter가 LabReport 영속까지 수행 — manualReporter와 동일.)
- **masteryDelta 미사용**: Reporter 계약은 masteryDelta를 받지만 autoReporter는 DB(현재 mastery)+직전 리포트로 계산 → delta 입력 무시(manualReporter도 거의 무시했음). 의도된 단순화.

### P5 — 서술형 AI 채점 (descriptive-grader)
- **데이터**: 루브릭 = `LabProblem.answer` Json `{rubric: string}`(모범답안·채점기준). 학생 서술답 = `LabSubmissionItem.answer` `{value: string}`. 둘 다 `asText()`로 안전 추출(Json #11).
- **AI 클라이언트(격리 복제)**: `ai-client.ts` = Lab 자체 Gemini(`gemini-2.5-flash`). 기출분석/공유 `gemini.ts` **무import**(복제). CLAUDE.md #0: 모델명 **서버 로그만**, 사용자 UI 비노출(채점은 내부).
- **주입형(DI)**: `gradeDescriptive`는 모듈 상태(`activeGrader`) — 기본 = AI, 테스트는 `setDescriptiveGrader(stub)`로 결정적 주입(실 API 비용 0). 끝나면 `resetDescriptiveGrader()`.
- **채점 매핑**: `descriptiveVerdict(partialScore, confidence, errorType)`(순수) → `correct = partialScore≥0.5`, `needsReview = confidence < 0.6`(서술형은 단답보다 모호 → 임계 높임).
- **autoGrader 통합**: `submittedAnswers`를 `Promise.all`로 — 객/단은 `gradeObjective`(sync), 서술형은 `await gradeDescriptive`. 멱등성(`items.length>0` → 재채점·AI 재호출 안 함) 유지.
- **🔴 재진단(#1) 자연 해소**: AI가 채점 시점에 서술형을 채점 → **고신뢰는 needsReview=false → 그 사이클 진단에 즉시 포함**(mastery 쌓임). 저신뢰만 needsReview→제외(사람 검수 대기). 즉 스택리뷰 #1(서술형 mastery 영원히 cold)은 P5로 **공통 케이스 해소**. 남은 건 저신뢰 항목의 사람검수 후 재진단(P5b 큐 소비처).
- **폴백**: 빈 답/루브릭(AI 미호출 short-circuit) · AI 실패(키 부재·타임아웃·파싱, try/catch) → `confidence 0 → needsReview`. 파이프라인 차단 안 함.
- **partialScore**: BKT는 `correct`만 사용(partialScore는 메타데이터). partialScore 가중 BKT는 P5b.
- **실 AI 검증**: `verify-p5`는 스텁(비용 0). 실 Gemini 1콜 확인은 `LAB_P5_REAL_AI=1 node --env-file=.env.local --import tsx scripts/lab/smoke-p5-real-ai.ts`(opt-in, 소액 비용).

---

## 6. 이어가기 — 런북

### 🖥️ 새 컴퓨터 셋업 (clone → 재개)

`.env.local`과 메모리(`~/.claude/...`)는 **git에 없으니**(`.gitignore`: `.env*.local`, `.claude/`) 새 머신에서 아래를 직접 구성한다.

```bash
# 1) 클론 + 스택 팁 체크아웃
git clone https://github.com/BIGSHOL/mathlab.git && cd mathlab
git checkout lab/content-foundation       # 스택 팁(PR #27). worktree 불필요 — 그냥 체크아웃.

# 2) 의존성 + Prisma 클라이언트
npm install
npx prisma generate                       # Lab* 타입 생성 (dev 서버는 꺼두고 — DLL 잠금/핫리로드)
```

**3) `.env.local` 작성** (프로젝트 루트, git 제외). 필요한 키:

| 키 | 용도 | 비고 |
|----|------|------|
| `DATABASE_URL` / `DIRECT_URL` | 공유 Supabase DB | **같은 DB면 개념그래프 239개·데모학생 이미 들어있음**(재시드 불필요). 기존 머신 `.env.local` 복사 또는 Vercel(mathlab) env에서 확보 |
| `GEMINI_API_KEY` | Lab 문제생성·서술형채점 | ⚠️ **39자**. `vercel env pull`로 받으면 끝에 literal `\n`(2글자) 붙어 41자 → Google 400. 끝 `\n` 제거(앞 39자) |
| `ANTHROPIC_API_KEY` | (기출분석 총평; Lab은 Gemini 사용) | 선택 |
| `LAB_ENABLED` | `/lab` 은닉 게이트 해제 | `true` 아니면 SUPER_ADMIN도 404 |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | 로그인 | `/lab` 접근은 SUPER_ADMIN 계정 필요 |

**SUPER_ADMIN 계정** (`/lab` 게이트 = `requireSuperAdmin` + `LAB_ENABLED`):
- **같은 공유 DB면 이미 존재** → 본인 SUPER_ADMIN 계정으로 로그인(앱 로그인 페이지) 후 `/lab`.
- **새/빈 DB면** `node scripts/seed-accounts.mjs` 실행 → Tenant + SUPER_ADMIN(+OWNER/TEACHER) 시드(계정 정보는 스크립트 내부 참조). 그 뒤 로그인.

```bash
# 4) 개발 서버 + 코크핏
npm run dev                               # PORT=3100 npm run dev (다른 프로젝트와 :3000 충돌 시)
#   → http://localhost:3000/lab  (SUPER_ADMIN 로그인 + LAB_ENABLED=true)
```

### 🔁 검증 런북 (코드만 — DB 무변경/소액)

```bash
node --env-file=.env.local --import tsx scripts/lab/verify-p0.ts   # P0 루프
node --env-file=.env.local --import tsx scripts/lab/verify-p1.ts   # P1 채점
node --env-file=.env.local --import tsx scripts/lab/verify-p2.ts   # P2 진단(BKT)
node --env-file=.env.local --import tsx scripts/lab/verify-p3.ts   # P3 처방
node --env-file=.env.local --import tsx scripts/lab/verify-p4.ts   # P4 보고
node --env-file=.env.local --import tsx scripts/lab/verify-p5.ts   # P5 서술형(스텁, $0)
node --env-file=.env.local --import tsx scripts/lab/verify-gen.ts  # 토대2 문제생성 정규화(스텁, $0)
node --env-file=.env.local --import tsx scripts/lab/gen-sample.ts  # 토대2 실Gemini 품질샘플(opt-in 소액, GEMINI_API_KEY 필요)
#   ⚠️ node_modules/.bin/tsx 셸 shim은 Windows node로 깨짐 → `node --import tsx` 사용
```

### 🌱 시드 (새 DB일 때만 — 공유 DB엔 이미 적용됨)

```bash
node --env-file=.env.local --import tsx scripts/lab/seed-synthetic.ts            # 데모 5개념+데모학생
node --env-file=.env.local --import tsx scripts/lab/seed-curriculum.ts           # dry-run(확인)
node --env-file=.env.local --import tsx scripts/lab/seed-curriculum.ts --apply   # 실 개념 239개 적용
```

### 🗄️ 스키마 변경 시 (예: 토대 3단계 LabProblem 컬럼)

```bash
npm run db:backup                          # 먼저 백업 (lab_* 생성 후에만 동작)
# ✅ db push 안전(para-x DB 분리됨). 파괴 구문 0건 먼저 확인:
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
# 변경 전: dev 서버 끄기(DLL 잠금) → db push → prisma generate → dev 재시작
npx prisma db push                         # --accept-data-loss 절대 쓰지 말 것. migrate reset 금지.
```

### ✅ PR 전 체크리스트 (Lab)
- [ ] `verify-p0`~`verify-p5` + `verify-gen` 모두 PASS
- [ ] `npx tsc --noEmit` 0에러 (dev 서버 켜둔 채 가능 — `.next` 무관)
- [ ] 기출분석/공유 무수정: `git diff --name-only | grep -E "exam-analysis|navigation|billing|entitlements|src/app/(?!lab)"` → 0건
- [ ] 스키마 변경 시 `migrate diff` 파괴 구문 0 + db push 전/후 행수 동일
- [ ] `npm run db:backup`

---

## 7. 미결 결정 — 다음 갈래

- **✅ 완료**: ① DB · ③ P1 채점(#21) · ④ P2 진단(#22) · **P3 처방(#23)** · **P4 보고(#24)** · **P5 서술형 채점(#25)** · **② 코크핏 DB연동(#26)** · **⑤ 학생답 제출 UI/API(#26)** · **콘텐츠 토대 1·2단계(#27, 실 개념 239개 + AI 생성기)** · **토대 3단계 전체(스키마+영속+repoint+UI)** · **토대 4단계(도형 역량)** · **중1 전범위 인제스트(121문항)** (전부 2026-06-22 새 머신, 로컬 커밋).
- **✅ 토대 3단계 — 완료(2026-06-22)**: 스키마(`body`/`choices`/`explanation` 컬럼) + 영속 글루(`persist.ts`) + **데모 repoint**(`scripts/lab/repoint-demo.ts` — 합성 lab-c* → 중1 실개념 `lab-cur-mid-13-01` 소인수분해, pacing (CURRENT,13,1), cold 사이클로 첫 실 워크시트) + **풀이 UI 실본문**(`worksheet/[id]` + `SolveForm.tsx`가 실 body·choices·도형 렌더, answerHint는 합성 폴백만) + **문제 검수 브라우저** `/lab/problems`(읽기전용, 실교재/합성 필터).
- **✅ 토대 4단계 — 도형 역량 완료(2026-06-22)**: `LabProblem.diagram Json?` 컬럼(additive, db push 비파괴) + **공유 `svg-diagrams` 읽기전용 재사용**(`LabDiagram.tsx`: `resolveDiagramSpec`+`renderDiagram` → SVG, dangerouslySetInnerHTML). 두 포맷 허용(DiagramParam[] 배열 / DiagramSpec 객체). **Lab 삼각형 렌더러**(`src/lib/lab/diagram/lab-triangle.ts`): 공유 렌더러가 각을 텍스트로만 찍어 보강 — **각을 호(arc), 90°는 직각기호(⌐)**, **각 값에서 꼭짓점 직접 계산**(라벨 충실 도형). 검증 포맷: Spec triangle(preset)·solid / Param regular_polygon·angle_figure·coordinate_plane. ⚠️ polygon Spec은 미렌더(트림된 변환경로). 브라우저 실측(Chrome MCP) 완료.
- **✅ 인제스트 — 중1 전범위(2026-06-22)**: 세션비전 워크플로(페이지별 OCR→적대적 검증), **전부 ₩0**. 중1-1 49(단원 1~5) + 중1-2 42(단원 6~8: 다각형·원부채꼴·다면체·회전체·겉넓이부피·통계). 학습은 §8·INGEST.md §7 참조(fitz 렌더·엔티티 디코딩·레이트리밋 누적형·resume 캐시).
- **🎯 다음 = 백필 확대 / 고도화**:
  1. **인제스트 더** — 단원 6 평면도형 각 문제(삼각형 각은 저작 가능, 일부만 채택됨) · 다른 교재(비상·미래엔 등)로 deepen · 다른 학년(중2 등). 같은 ₩0 워크플로.
  2. **합성 백필(A)** — Lab Gemini Flash `generateProblemsForConcept` → persist(저비용 반복과금). 아직 백필 스크립트 미작성. ⚠️ 난이도 매핑표 1곳 고정.
  3. **도형타입 확장** — 평행선·복합도형 각 문제 인제스트하려면 Lab에 해당 도형 렌더 추가(현재 보수적 제외 중).
  - 📋 소스 재사용 결정(2026-06-22 5갈래 조사): 단원=`/d/mathg-gen/src/constants/curriculum.ts`(use-as-is) · 비전인제스트=`/d/시험지 한글화` 프롬프트·SOP 차용 · 도형=mathlab 자체 `svg-diagrams`(use-as-is, 포팅 불필요).
- **⑥ needsReview 사람 검수 큐** ← 저신뢰 서술형/파싱실패 항목 교사 채점 큐 + **검수 후 재진단**(스택리뷰 #1 잔여분).
- **P5b/P3b/P4b 고도화**: AI feedback 영속·partialScore 가중 BKT / 처방 영속(reason 추적)·per-concept 보정 / AI 내러티브 리포트·HWP url. · **선수관계 정밀화**(휴리스틱 엣지 → 교육학적).

---

## 8. 알려진 함정 / 의도된 단순화

- **db push 안전**(§2) — 단 항상 파괴구문 0 확인 + `--accept-data-loss` 미사용. `migrate reset` 금지.
- **backup-db.mjs 닭-달걀**: 신규 Lab 모델 export → 테이블 생성 전엔 `db:backup` 실패. 생성 후 백업.
- **BKT score 의미 전환**: '누적정답률'→'p(mastered)'. 현재 소비처는 안전하나 향후 UI/리포트는 'p(mastered)'로 해석해야(예 0.65 = '숙련 확률 65%', '정답률 65%' 아님). P3 smart 처방도 사후확률로 다룰 것.
- **observationCount 재해석**: BKT에선 '관측 수열 길이'(신뢰도 대용). 빈도주의 '표본수=분산'으로 쓰지 말 것(P3 휴리스틱 주의).
- **pG 단일값**: 객관식·단답 미구분(MC 추측↑). 유형별 분리는 P2b(GradedItemDTO에 type 추가 필요).
- **diagnosedAt 멱등 게이트**: 제출당 진단 1회. P0/P1 잠복하던 이중관측 버그도 동시 해소(verify-p1도 영향 없이 통과).
- **needsReview ⊄ GradedItemDTO**: autoGrader가 제외 → 서술형이 워크시트에 섞여도 mastery 편향 없음(영속만).
- **P4 리포트는 현재상태 스냅샷**: period는 메타데이터(기간 필터링 아님), 성장은 직전 리포트 대비. 데이터 0건은 '데이터 없음' 리포트로 구분('약점 없이 고르게'와 혼동 방지). ⚠️ 같은 (student,type) 리포트 *동시* 생성은 성장 체인이 어긋날 수 있음(수동/주기라 실무 무위험, 통계는 항상 정확). 고빈도면 직렬화/SERIALIZABLE.
- **`simulateManualGrading`(P0) 보존**: 무작위 dev 보조. 실제 채점은 submitAnswers+autoGrader.
- **84개월 진도표 JSON·HWP 엔진 부재**: 합성 시드로 루프 검증 중. 실 개념그래프(239)는 토대1단계로 확보, 문제 본문은 토대2(AI생성)로.
- **스크립트 실행**: `node --env-file=… --import tsx`(`.bin/tsx` shim은 Windows에서 깨짐). `@/` alias는 tsx 정상 해결.
- **🆕 Gemini thinkingBudget=0 (토대2)**: `gemini-2.5-flash`는 thinking 모델 — `thinkingConfig.thinkingBudget` 미설정 시 thinking 토큰이 `maxOutputTokens`를 먹어 JSON이 잘림(`Unexpected end of JSON input`). 생성은 항상 `thinkingBudget: 0`(+`maxOutputTokens: 4096`).
- **🆕 LLM JSON 복구 (토대2)**: AI가 LaTeX 백슬래시(`\times`,`\frac`)·문자열 내 실제 줄바꿈을 내뱉어 순진한 `JSON.parse` 깨짐(CLAUDE.md #12-1). `repairJsonString`(문자열 상태머신) — 고립 백슬래시 이스케이프 + 제어문자 보정 + **잘린 응답 salvage**(따옴표/중괄호 균형). `parseJson`은 정상 파싱 먼저, 실패 시 복구 재시도. 그레이더도 이 래퍼를 공유해 더 견고해짐.
- **🆕 problem-gen DI 주입형 (토대2)**: 테스트는 `setProblemGenerator(stub)` → 결정적·실 API $0(`verify-gen`이 이걸로 7/7). 끝나면 `resetProblemGenerator()`. 품질(실 Gemini)은 `gen-sample.ts`로 별도.
- **🆕 보기 마커 제거 (토대2)**: AI가 보기 앞에 `①②③④⑤`/`1.`/`(1)`을 끼워넣을 수 있음 → `stripChoiceMarker`로 제거(렌더 시 번호 중복 방지). 정답은 `answerIndex`(1-based) → `LabProblem.answer.choice`로 매핑.
- **🆕 생성 한계 — 도형 (토대2)**: 기하 문제는 "그림과 같이"로 없는 도형을 참조 → 순수 텍스트 생성의 한계. 고난도·도형은 비전/OCR 경로(§7) 대상. 비-도형 생성 품질은 양호(6/6).
- **🆕 LabProblem 본문 미영속 (토대2→3)**: 생성기는 `{body, choices, explanation, answer}`를 만들지만 `LabProblem`엔 `bodyRef`(스토리지 키)+`answer`만 있어 **본문/보기/해설을 저장할 컬럼이 없음**. 토대 3단계에서 컬럼 추가(additive) 후 영속.
- **🆕 도형 렌더 — 공유 svg-diagrams 재사용 (토대4)**: `resolveDiagramSpec`(배열 DiagramParam[] ↔ 객체 DiagramSpec 통일) + `renderDiagram`(SVG 문자열) + `dangerouslySetInnerHTML`(innerHTML 파싱은 SVG 네임스페이스 정상 — ReactMarkdown 변환 함정 회피). ⚠️ 공유 `svg-diagrams`는 **수정 금지**(격리) → 보강은 Lab-local 복제(삼각형 `lab-triangle.ts`). ⚠️ `polygon` DiagramSpec은 변환경로 트림으로 미렌더 → 정다각형은 DiagramParam `regular_polygon`. ⚠️ 삼각형은 **각 값에서 꼭짓점 계산**(프리셋 형상이 라벨 각과 불일치) + 직각기호는 라벨 `"90°"` 기준(기하 감지는 오작동).
- **🆕 인제스트 워크플로 레이트리밋 — 누적형 (2026-06-22)**: 19페이지 OCR 동시 버스트는 "Server is temporarily limiting requests (not your usage limit)"로 **즉사**(내 사용량 아님, 서버 과부하). **3개씩 순차 배치**로 버스트 완화 + **`resumeFromRunId`로 재개**(완료 에이전트는 캐시 즉시 반환, 미완료만 재실행) → 강제종료/부분실패해도 여러 번 재개로 수렴. 누적 window라 즉시 재개는 또 막힘 → 시간 두고.
- **🆕 워크플로 결과 처리 (2026-06-22)**: StructuredOutput이 `<`/`>`를 `&lt;`/`&gt;`로 직렬화 → **디코딩 필수**(`&amp;`는 마지막). 도형은 **JSON 문자열**로 옴 → `JSON.parse`. 39문항 손 전사 금지 → **스크립트로 일괄**(출력 파일 파싱→디코딩→파싱→개념별 `persistGeneratedProblems`, 기존 source 삭제로 멱등). 적대적 검증이 진짜 오류 잡음(보기 오기·정답 2개 ill-posed·body 불일치).

---

## 9b. 콘텐츠 확보 전략 (2026-06-22 결정) — 실데이터로 루프 채우기

엔진(P0~P5)·UI(②⑤)는 닫혔다. 남은 핵심은 **합성 데이터 → 실제 개념그래프 + 문제 본문**. 3렌즈 병렬 조사 결론:

| 경로 | 결론 | 막힌 곳 |
|------|------|---------|
| **개념그래프** (curriculum.ts→LabConcept) | ✅ 가능 | 선수관계·84개월 진도표 정보 없음 → 순서 휴리스틱 |
| **AI 문제생성** (Gemini Flash, Lab 격리 복제) | ✅ 채택(베이스라인) | 메인 `mathgen.ts`는 타입만·미구현 → Lab이 처음부터 |
| **기출/교재 임포트** (Question→LabProblem) | ✅ 매핑 깔끔 | 🔴 Question 0개 → PDF추출 선행 필요 |

**결정(사용자):** 문제 본문 = **AI 생성이 베이스라인**. 단 **상위(고난도/킬러) 문제는 순수 AI 생성 품질에 제약** → 향후 **Claude Code 내부 비전 AI + OCR로 실제 교재/기출 인제스트 → 문제 생성 파이프라인**(G:\ 교재 PDF 54종, 비용절감). 메인 Question 뱅크가 비어 직접 임포트는 막혀 비전/OCR이 우회로.

### ✅ 토대 1단계 완료 — 실 개념그래프 (이 PR)
- `scripts/lab/seed-curriculum.ts` — curriculum.ts → LabConcept/Edge 변환(읽기 전용 재사용, 격리 준수).
  - **그레인=중단원**(대단원의 subUnits 첫 레이어). 학기 25개(초12·중6·고7) → `monthIdx`=학기서수(1..25), `sessionIdx`=학기 내 누적.
  - **domain** 키워드 룰 + 대단원 override(소인수분해→수와연산, 집합과명제→문자와식, 분류하기→확률과통계). `기타` 0건.
  - **edge** = 같은 (학기·domain) 연속 개념만 보수적 체인(교차도메인 거짓엣지 회피).
  - id = `lab-cur-{band}-{학기2}-{회차2}` 안정적 → idempotent. `--apply` 없으면 dry-run.
- **적용 결과**: 239개념 + 172엣지(총 244=239실+5합성 / 177=172+5). **무손실 확정**: School 5724→5724, 합성개념 5→5, 데모마스터리 5→5 불변 → 코크핏 데모 루프 무회귀.
- 도메인 분포: 기하 69·수와연산 66·문자와식 30·확률과통계 28·함수 27·측정 11·규칙성 8.

### ✅ 토대 2단계 완료 — AI 문제생성기 (2026-06-22, #27)
- `src/lib/lab/ai-client.ts::generateWithGemini` + `src/lib/lab/problem-gen.ts`(Gemini Flash, Lab 격리 복제).
  - **흐름**: 개념·난이도·유형 → `generateWithGemini`(구조화 JSON) → `normalizeGenerated`(검증·`LabProblem.answer` 매핑) → `GeneratedLabProblem`.
  - **견고화**: `thinkingBudget=0`(잘림 방지) + `repairJsonString`(LaTeX 백슬래시·줄바꿈·잘린응답 salvage) + 보기 마커 제거 + `\dfrac→\frac`.
  - **DI**: `setProblemGenerator(stub)`로 결정적 테스트($0). `verify-gen.ts` **7/7 PASS**, `gen-sample.ts` 실 Gemini **6/6**(중1 정비례 보기형·정육면체 단답·고1 다항식 서술형 부분점수 루브릭 등 양호).
  - **한계**: 기하 도형 참조("그림과 같이") → 비전/OCR 경로 대상.

### 다음 — 토대 3단계 (영속화) + 정밀화
- **3단계 (LabProblem 영속화)**: `LabProblem`에 `body`/`choices`/`explanation` 컬럼 추가(additive) → 생성문제 DB 저장 + 데모 실학기 repoint + 풀이 UI 실 본문 렌더 → **실 개념+문제로 루프 구동**. (§7 참조.)
- **상위문제 (비전/OCR)**: 교재/기출 이미지 → 비전 AI/OCR → 문제 구조화 인제스트(별도 설계). 고난도·도형 보강.
- **선수관계 정밀화(Phase 2)**: 현재 엣지는 학기·도메인 순서 휴리스틱 → 교육학적 선수관계로 정밀화.

---

## 9. 한 줄 재개 프롬프트 (새 세션용)

> "수학 랩실 Lab 이어서 개발. **P0~P5 완료 = 5단계 전체 자동화**(`verify-p0~p5.ts` PASS) + **②⑤ 코크핏/제출 UI(#26)** + **콘텐츠 토대 1·2단계 완료(#27)**: 실 개념그래프 239개(`seed-curriculum.ts --apply`, DB 적용됨) + AI 문제생성기(`problem-gen.ts`/`ai-client.ts`, `verify-gen` 7/7·`gen-sample` 실Gemini 6/6).
> 스택 팁 = `lab/content-foundation`(PR #27). `docs/lab/HANDOFF.md`(특히 §6 새 컴퓨터 셋업·§7 다음·§9b 콘텐츠 전략)와 CLAUDE.md '최우선 하드 경계' 먼저 읽어라.
> **다음 = 콘텐츠 토대 3단계** = `LabProblem`에 본문/보기/해설 컬럼 추가(additive) + 생성문제 영속 + 데모 실학기 repoint + 풀이 UI 실 본문 렌더 → 실 개념+문제로 루프 구동. 상위문제는 비전/OCR(별도).
> ✅ db push 안전(단 migrate diff 0건 확인 + dev 끄고 generate), `migrate reset` 금지. push/PR은 `BIGSHOL/mathlab`(원격 mathlab2는 낡음). 기출분석은 형제 라인 — 절대 무수정(동결)."
