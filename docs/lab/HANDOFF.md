# 🚧 수학 랩실 자동화(Lab) — 세션 핸드오프

> **목적**: 클라우드 세션 → 로컬 세션 인수인계. 끊김 없이 이어가기 위한 현재 상태 + 런북.
> **최종 갱신**: 2026-06-20 (클라우드 세션)

---

## 한 줄 요약

mathlab repo 안에, **라이브 기출분석 제품과 완전 격리된 채 은닉(dark launch) 개발 중**인
학원 운영 자동화 파이프라인(진단→처방→공급→채점→보고). **P0 토대 + 로직 완성**,
이제 **DB 가동(마이그레이션+시드+실행)만** 남았고 그건 로컬에서 한다(클라우드엔 DB 접속정보 없음).

---

## 0. 가장 먼저 읽을 것 (순서대로)

1. **`CLAUDE.md` 최상단 "🚧 최우선 하드 경계 — 수학 랩실 자동화(Lab) 서브시스템 격리"** ← 절대 규칙. 새 세션은 이걸 자동으로 읽음.
2. 이 문서 (현재 상태 + 런북).
3. 척추 설계: `src/lib/lab/stages.ts` (계약) + `prisma/schema.prisma`의 `Lab*` 모델.

---

## 1. 현재 상태 (branch / PR / 커밋)

| 항목 | 값 |
|------|----|
| 작업 브랜치 | `claude/amazing-maxwell-blpgou` |
| PR | **#20** (draft) — `https://github.com/BIGSHOL/mathlab/pull/20` |
| Vercel 프리뷰 | ✅ 그린 (빌드 통과) |
| main 관계 | PR로 올라가 있음, **미머지** |
| 커밋 | `0a9726f` 척추 토대 (스키마+계약+게이트+코크핏) · `7cd2c61` P0 로직 (5단계 구현체+API+시드) |

> 로컬에서: `git fetch origin && git checkout claude/amazing-maxwell-blpgou && git pull origin claude/amazing-maxwell-blpgou`

---

## 2. 절대 규칙 (격리) — 위반 시 전부 무효

- **ADDITIVE-ONLY**: 기출분석(exam-analysis) 파일 **0줄 수정**. Lab 작업은 전부 신규 파일.
  유일 공유 파일 `prisma/schema.prisma`도 `Lab*` **추가만**(현재까지 259줄 추가, 0줄 삭제).
- **네임스페이스**: 모델 `Lab*` + `@@map("lab_*")`, 라우트 `src/app/lab/**`·`src/app/api/lab/**`, 로직 `src/lib/lab/**`.
- **은닉**: `/lab`은 `SUPER_ADMIN` + 환경변수 `LAB_ENABLED`(기본 off)일 때만. 미인가 `notFound()`(404). 사이드바·랜딩·billing에 **링크/언급 금지**(`navigation.ts` 무수정).
- **DB**: `lab_*` 테이블에 **additive 마이그레이션만**. `prisma migrate reset` **절대 금지**. 변경 전 `npm run db:backup`.

---

## 3. 설계 (척추 = StudentLearningState)

5단계는 척추에 대한 **순수 함수**. 산출물마다 `genMode(MANUAL|ASSISTED|AUTO)`가 박혀
단계별 사람↔자동 독립 플립. **데이터는 역방향**으로 흐른다(채점→진단→처방→공급, `runCycle`이 박제).

| 단계 | 인터페이스 | P0 구현체 | auto 전환 |
|------|-----------|-----------|----------|
| 진단 | `Diagnoser` | `manualDiagnoser` (누적 정답률) | P2 (BKT) |
| 처방 | `Prescriber` | `dumbPrescriber` (진도표만, 약점맵 무시) | P3 (핵심 해자) |
| 공급 | `Supplier` | `manualSupplier` (문제은행→워크시트, HWP 보류) | 반자동 |
| 채점 | `Grader` | `manualGrader` (사람 입력 판독) | P1(객/단) / P5(서술형) |
| 보고 | `Reporter` | `manualReporter` (숙련도 스냅샷) | P4 |

**빌드 순서**: **P0**(척추+dumb처방+공급+채점) → P1(채점 auto) → P2(진단 auto) → P3(처방 smart) → P4(보고 auto) → P5(서술형 채점). ⚠️ 쉬운 자동화 ≠ 가치 우선순위(해자는 처방·서술형 채점에 있음).

---

## 4. 빌드된 것 (파일 지도)

```
prisma/schema.prisma          # Lab* 모델 14개 + enum 6개 (@@map lab_*) — additive
src/lib/lab/
  stages.ts                   # 5단계 계약 + DTO + runCycle + applyDelta
  gate.ts                     # 은닉 게이트 (assertLabAccess / guardLabApi / isLabEnabled)
  service.ts                  # runStudentCycle · loadMasteryMap · simulateManualGrading
  pipeline/
    index.ts                  # p0Pipeline 조립
    manual-diagnoser.ts
    dumb-prescriber.ts
    manual-supplier.ts
    manual-grader.ts
    manual-reporter.ts
src/app/lab/
  layout.tsx                  # 게이트 진입(assertLabAccess) + 다크 셸
  page.tsx                    # P0 상태 코크핏 (정적, DB 미접근 → 마이그 전 안전)
src/app/api/lab/
  run-cycle/route.ts          # POST {studentId} → 한 사이클 (게이트)
  simulate-grading/route.ts   # POST {worksheetId,correctRate?} → 채점 시뮬 (게이트, dev)
scripts/lab/
  seed-synthetic.ts           # 개념5 + 선수그래프5 + 문항30 + 데모학생/진도 (new PrismaClient)
docs/lab/HANDOFF.md           # 이 문서
```

검증 상태: Lab 파일 `tsc --noEmit` 0에러 · `eslint` 0 · 기출분석 변경 0건 · Vercel 빌드 통과.

---

## 5. 막힌 지점 (왜 로컬로 옮기나)

클라우드 컨테이너엔 **`.env`/`DATABASE_URL`이 없다**(신규 컨테이너, `.env.example`만 존재).
→ `prisma db push`(테이블 생성), 시드, 루프 실행이 전부 불가. **로컬(또는 DB 접속 가능 환경)에서 진행.**

---

## 6. 로컬에서 이어가기 — 런북 (정확한 명령)

```bash
# 0) 코드 가져오기
git fetch origin
git checkout claude/amazing-maxwell-blpgou
git pull origin claude/amazing-maxwell-blpgou

# 1) 의존성 + 클라이언트
npm install
npx prisma generate            # Lab* 타입 포함 재생성

# 2) env 준비 (.env.local에 DATABASE_URL / DIRECT_URL 필요)
#    ⚠️ vercel env pull은 값 끝 개행을 literal \n으로 직렬화하는 함정 있음(CLAUDE.md F절).
#       GEMINI 등 키 길이 확인할 것. Lab 가동엔 DATABASE_URL/DIRECT_URL만 있으면 됨.

# 3) 안전망 백업 (필수)
npm run db:backup

# 4) lab_* 테이블 생성 (additive, reset 금지!)
npx prisma db push
#    ⚠️ dev 서버 떠 있으면 끄고 실행(DLL 잠금 + 새 모델 핫리로드 안 됨 — CLAUDE.md 워크플로 #1).

# 5) 합성 데이터 시드
npx tsx scripts/lab/seed-synthetic.ts
#    또는: node --env-file=.env.local node_modules/.bin/tsx scripts/lab/seed-synthetic.ts

# 6) 은닉 활성화 + dev 서버
#    .env.local 에 LAB_ENABLED=true 추가
npm run dev
#    ⚠️ 포트 충돌(IPv6 ::1 vs IPv4) 주의 — 필요시 PORT=3100 npm run dev (CLAUDE.md 세션#8)

# 7) /lab 접속 (SUPER_ADMIN 계정으로 로그인) → 코크핏 확인 (일반 사용자는 404)
```

### 루프 구동 (P0 end-to-end)
```bash
# (브라우저 콘솔/REST 클라이언트, SUPER_ADMIN 세션 쿠키 필요)
# 첫 사이클 — 진도표 현재 위치(자연수의 덧셈) 시험지 생성
POST /api/lab/run-cycle        { "studentId": "lab-student-demo" }
#   → { data: { worksheetId, problemIds[] } }

# 채점 입력(시뮬)
POST /api/lab/simulate-grading { "worksheetId": "<위 worksheetId>", "correctRate": 0.6 }

# 두 번째 사이클 — 채점결과 먹고 진단 갱신 → 다음 시험지
POST /api/lab/run-cycle        { "studentId": "lab-student-demo" }
```

### 기대 결과 (검증 포인트)
- 1차 run-cycle 후: `lab_worksheets` 1행(status PRESCRIBED), `lab_worksheet_problems` ~5행.
- simulate-grading 후: `lab_submissions` 1행 + `lab_graded_items` ~5행, worksheet status GRADED.
- 2차 run-cycle 후: `lab_mastery_records`에 자연수의 덧셈 점수 기록(정답률 반영), 새 worksheet 생성.
- 확인: `npx prisma studio` → `lab_mastery_records` / `lab_worksheets`.

---

## 7. 미결 결정 — 다음 갈래 (로컬에서 정하고 진행)

- **① DB 검증 (추천)**: 위 런북으로 P0 루프 end-to-end 가동 → 안 도는 부분 수정. *토대가 실제로 도는지 먼저 확인.*
- **② 코크핏 UI DB연동**: `/lab`에 학생/숙련도/워크시트 목록 + 루프 구동 버튼 추가.
- **③ P1 설계**: 자동채점(객관식·단답) `autoGrader` — `p0Pipeline.grader`만 교체.

---

## 8. 알려진 함정 / 의도된 P0 단순화

- **prescription↔worksheet FK 링크**: P0에선 `LabWorksheet.prescriptionId = null`(보류). 추적 필요해지면 service에서 부여.
- **ManualGrader = 사람 입력 판독기**: 실제 채점 UI/스캔 또는 P1 autoGrader로 교체 예정.
- **`needsReview` 큐 소비처 미정**: 스키마엔 플래그만. 채점 단계 본격화 때 라우팅 결정(서술형 저신뢰 → 사람).
- **84개월 진도표 JSON · HWP 출제 엔진 부재**: 현재 repo에 없음 → 합성 데이터(`seed-synthetic.ts`)로 루프 검증 중. 확보 시 시드 교체.
- **import 관례**: 앱코드 `@/lib/db`, 스크립트 `new PrismaClient()` (tsx가 `@/` alias 미해결).
- **enum 값**: 코드에서 문자열 리터럴(`'MANUAL'`, `'CURRENT'` 등)로 사용 — Prisma가 enum으로 수용.

---

## 9. 한 줄 재개 프롬프트 (로컬 새 세션에 붙여넣기용)

> "수학 랩실 Lab 서브시스템 이어서 개발. `docs/lab/HANDOFF.md`와 CLAUDE.md '최우선 하드 경계' 읽고,
> 6절 런북으로 P0 루프를 로컬 DB에서 가동·검증해줘. 기출분석은 절대 건드리지 말 것."
