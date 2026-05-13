# v1 → v2 디자인 마이그레이션 검토서 (v2.2)

작성: 2026-05-12 (v2.1 개정: 2026-05-12 · v2.2 개정: 2026-05-13)
범위: `src/app/**` v1 페이지 108개 (v2 폴더 제외) + 신규 2개 = **110개**
v2 변환 현황: 28개 (인덱스 + 27 페이지 — `src/app/v2/**/page.tsx`, MOCK 데이터)
data/refact 디자인 시안: 41 HTML 파일

**작업량 기준**:
- 척도: **S = 0.5일, M = 2일, L = 5일, XL = 10일**
- **인력 가정: 1인 풀타임 기준** (다인 분담 시 병렬화 가능 작업 비율 ~60%)
- **버퍼: +25%** (Prisma 연동 + 회귀테스트 + 권한 검증 포함)

---

## 🚀 실제 진행 현황 (W2~W7, 2026-05-13 기준)

> ⚠️ **전략 변경 (v2.2)**: 검토서 초안은 별도 `/v2/*` 라우트로 분리하여 점진적 cutover하는 전략을 가정했으나, 실제 진행은 **기존 v1 라우트에 디자인 시스템 토큰을 직접 적용**하는 방식으로 채택되었습니다.
>
> **이유**:
> - 별도 `/v2/*` 라우트는 v1/v2 동시 유지 부담 (라우팅, 권한, 라이선스, View-As 모두 복제)
> - 디자인 시스템 CSS 패턴(`.wz-*`, `.mc-*`, `.kt-*`, `.dg-*` 등) **prefix 격리**로 회귀 위험 최소화
> - Phase 5.5 권한 메타 선결 **불필요** — 기존 `navigation.ts` + `useLicenseStore` 그대로 사용
> - View-As, Prisma async 패턴 **그대로 유지** — 마크업/CSS만 교체

### 도입된 디자인 시스템 패턴 (7개)

| 주차 | 패턴 | CSS 산출 | prefix | 적용 페이지 |
|------|------|----------|--------|------------|
| W2 | Pattern G 정적 페이지 | `docs.css` | `.docs-*` | `/help`, `/updates` 등 |
| W3 | Pattern F 어드민 테이블 | `admin-table.css` | `.tbl-*` | `/admin/tenants`, `/admin/schools` 등 |
| W4 | Pattern B 결과 리포트 | `results-report.css` | `.rr-*` | `/results`, `/diagnostics`, `/profile`, `/dashboard` HUD |
| W5 | Pattern A 위자드 빌더 | `wizard.css` + 컴포넌트 7종 | `.wz-*` | 8개 페이지 (W5-1~W5-9) |
| W6 | Pattern C 마스터-디테일 | `master-detail.css` | `.mc-*` | `/subjects` 학생 단원학습 |
| W6 | Pattern E 칸반/타임라인 | `kanban-timeline.css` | `.kt-*` | `/queue` 신규 (선생님 작업 보드) |
| W7 | Pattern D 데이터 그리드 | `data-grid.css` | `.dg-*` | `/admin/features` (테이블 뷰) |

**총 CSS 자산**: 7개 패턴 파일 + 데모 페이지 5종(`/preview-{master-detail,kanban,data-grid,v2,wizard}`)

### 적용 페이지 추적

| 페이지 | 분류(검토서) | 적용 방식 | 커밋 |
|-------|------------|----------|------|
| `/v2/onboarding` | A 신규 인증 | Pattern A V2 5단계 위자드 신규 작성 | W5-1 (11bcf1b7) |
| `/questions/pdf-import` | C SUPER_ADMIN | Pattern A V1 4단계 위자드 외피 | W5-2 (82e1a0a1) + W5-9 fix (d5c309b2) |
| `/worksheet/create` | A 선생님 | WizardShell V2 progress + footer 토큰 패치 | W5-3 (85f24c55) |
| `/students/enroll` | C 선생님 | Pattern A V2 3단계 위자드 | W5-4 (70c611b0) |
| `/courses/create` | C 선생님 | Pattern A V2 3단계 위자드 | W5-5 (59eed324) |
| `/tests/create` | C 선생님 | Pattern A V2 3단계 위자드 | W5-6 (2d9ea520) |
| `/level-test/create` | C 선생님 | Pattern A V2 3단계 위자드 | W5-7 (02d93060) |
| `/homework/{concept,question}-create` | C 선생님 | Pattern A V1 3단계 위자드 | W5-8 (891d1d31) |
| `/subjects` | A 학생 (`/v2/curriculum` 대체) | Pattern C V1 트리+디테일 + 실 Prisma 데이터 | W6-1 (a073a442) |
| `/queue` | (신규, 검토서 외) | Pattern E V1 칸반 + V3 액티비티, 사이드바 메뉴 추가 | W6-5 (61600121) |
| `/admin/features` | A 관리자 (`/v2/admin/features` 대체) | Pattern D V3 dg-bulk-table + 카드/테이블 뷰 토글 | W7-1 (3fe9f724) |

### 의도적 스킵 (이미 잘 작동 또는 비용 대비 가치 낮음)

| 페이지 | 스킵 사유 |
|-------|----------|
| `/concepts` (선생님) | 이미 정교한 마스터-디테일 (ConceptListPanel 293줄 + 7 보조 컴포넌트) |
| `/overview` (선생님) | 이미 풍부한 KPI/차트/위젯 대시보드, 액션큐 데이터 모델 부재 |
| `/students` (선생님) | 이미 StudentListPanel + StudentDetail + StudentCreateForm 마스터-디테일 완성 |
| `/exam-analysis` | 시험지 분석 페이지, 매트릭스 변환은 데이터 모델 재설계 필요 |
| `/ranking` (학생) | 이미 TopThreePodium + 모션 강조 RankingList 게임 톤 |
| `/quiz-join` (학생) | 의도된 다크 슬레이트 + 옐로우 게임 톤 유지 |
| `/login`, `/v2/login` | 이미 디자인 토큰 기반 또는 별도 auth.css |

### 실제 진행 통계

- **W2~W7 완료 작업**: 7개 CSS 패턴 + 13개 페이지 적용 + 5개 데모 페이지
- **누적 소요 시간**: 약 1주 (실제 작업 기준, 1인)
- **검토서 추정 대비**: A 그룹 27개 중 6개 실제 적용 + C 그룹 8개 실제 적용 = 14개 페이지 작업, 검토서 추정 대비 ~70% 단축 (전략 변경 효과)

---

## 요약

| 분류 | 페이지 수 | 코딩 작업량 | 버퍼 포함 | W2~W7 진행 |
|------|----------|------------|-----------|-----------|
| A. 이미 v2 매핑됨 (Prisma 연동) | 27 | 8주 | **10~12주** | 6개 적용 (전략 변경: 기존 라우트 직접 적용) |
| B1. 시안 완전 매칭 | 2 | 0.4주 | 0.5주 | 미진행 |
| B2. 시안 부분 참조 | 6 | 2.4주 (L 상향) | **3주** | 미진행 |
| C. 디자인 새로 그려야 함 | 51 | 18주 | **22~24주** | 8개 적용 (W5/W7 위자드/그리드) |
| D. 변환 불필요 (mockups/print/dev) | 22 | - (검증 0.5일×5 인쇄) | 0.5주 | 미진행 |
| Phase 5.5. 권한/라이선스 메타 선결 | - | 2일 | 0.5주 | **불필요** (전략 변경으로) |
| **합계 (v1+신규)** | **110** | **약 28.5주** | **약 36~40주** | **~14개 적용** |

> **남은 작업 추정 (전략 변경 반영)**: 약 22~26주 (1인 풀타임)

---

## Phase 5.5 — 선결과제 (M, 2일) ~~★ 필수~~ ⚠️ 전략 변경으로 불필요

A 그룹 시작 **이전**에 처리해야 할 권한/라이선스 메타 포팅.

**작업 내용**:
1. v1 `src/lib/constants/navigation.ts`의 `licenseFeature`/`minRole` 메타데이터를 v2 사이드바(`STUDENT_NAV`, `TEACHER_NAV`)에 이식
2. Additive 권한 구조(MANAGER→OWNER→SUPER_ADMIN) 반영
3. `useLicenseStore` 클라이언트 필터 + `requireLicense()` 서버 가드 v2 적용
4. SUPER_ADMIN 전용 메뉴 분기 (`/admin/*` 노출 조건)

**왜 선결인가**: 이 작업 없이 A 그룹 27개를 옮기면, 페이지는 살아도 사이드바에서 권한 없는 메뉴가 노출되어 **권한 누수**가 발생.

> ✅ **v2.2 갱신**: 실제 채택된 전략(기존 라우트 직접 토큰 적용)에서는 기존 `navigation.ts`를 그대로 사용하므로 **이 단계가 불필요**합니다. `/queue` 신규 페이지 추가 시 navigation.ts에 한 줄 추가하는 정도로 해결되었습니다.

---

## A. 이미 v2 매핑됨 — Prisma 연동 작업 필요 (27개)

v2 페이지가 이미 만들어졌지만 모두 정적 MOCK 사용. v1 페이지의 Prisma 호출/권한 가드/View-As 패턴을 옮겨야 함.

> ⚠️ **작업량 재산정**: 페이지당 코딩(L=2일)만이 아니라 **Prisma 연동(0.5일) + View-As 적용(0.5일) + 회귀테스트(0.5일)**을 페이지별로 추가. 결과적으로 평균 L→XL 근접.
>
> ✅ **v2.2 갱신**: 실제 채택 전략에서는 v1 페이지를 그대로 두고 디자인 토큰만 교체하므로 Prisma 연동 비용이 거의 0에 가까움. 단, `/v2/*` MOCK 페이지를 정식 라우트로 promote할지는 별도 판단 필요.

### 학생 도메인 (13개)

| v1 경로 | v2 경로 | 핵심 의존 모델/API | 주의사항 | DAU★ | 작업량 | W진행 |
|---------|---------|------------------|---------|------|--------|------|
| `/dashboard` | `/v2/dashboard` | StudentProfile, getTodayHomework/Concept/Question, hasLicense, DashboardGamification, ReviewReminderCard | View-As (`?_as`) 전파, 4개 자식 컴포넌트(NextBestAction, DailyRoulette 등) v2 포팅 필요 | ★★★ | L | ✅ W4-3.5 V3 게임 HUD 시즌 배너 |
| `/subjects` | `/v2/curriculum` | LearningCourseEnrollment, LearningCourseConcept | 학년·학기 라우팅, 진도 집계 쿼리 | ★★★ | M | ✅ **W6-1 Pattern C V1 트리 적용** |
| `/concepts/[id]` | `/v2/concept-detail` | Concept, BlankExercise, ConceptMemo | 동적 [id] 파라미터 라우팅 추가, 5단계 BlankStage 전환 | ★★★ | L | ⬜ |
| `/practice/arithmetic` | `/v2/practice` | ArithmeticHomeworkPlan, 79 카테고리 생성기 | TimeAttackRecord 표시, 라이선스(`ARITHMETIC`) 가드 | ★★★ | L | ⬜ |
| `/practice/ox` | `/v2/ox-quiz` | OXStatement, OXAttempt | 라이선스(`OX_QUIZ`) 가드, 정답률 집계 | ★★ | M | ⬜ |
| `/practice/question-homework` | `/v2/homework` (학생 숙제) | QuestionHomeworkPlan, HomeworkQuestion(중간테이블), getHomeworkDayQuestionIds | dayIndex별 진행도 | ★★★ | L | ⬜ |
| `/my-tests` | `/v2/exam` | Test, TestAttempt, TestAssignment | 시험 응시·결과 분기 | ★★ | L | ⬜ |
| `/my-tests/[id]/result` | `/v2/results` | TestAttempt, AnswerLog, ExamAnalysisResult | 오답 패턴 카드 + AI 코멘트 연동 | ★★ | L | ✅ W4-3.1 Pattern B V1 점수 영웅 |
| `/profile` | `/v2/profile` | StudentProfile, UserBadge, PointTransaction | XP 곡선, 뱃지 그리드 | ★★ | M | ✅ W4-3.4 V1 프로필 헤더 + KPI 그리드 |
| `/ranking` | `/v2/ranking` | StudentProfile.totalXp, Classroom 집계 | 주간/시즌/반대항 3탭, RankChangeIndicator | ★★ | M | ⬜ 보류 (이미 게임 톤) |
| `/shop` | `/v2/shop` | (스키마 누락) Wallet, Avatar, ShopItem | **스키마 부족** — 신규 모델 설계 필요 | ★ | XL | ⬜ |
| 신규 (인증) | `/v2/login` | NextAuth Credentials | 기존 `/login` 디자인 교체 가능 | ★★★ | M | ⬜ |
| 신규 (인증) | `/v2/onboarding` | Tenant 셋업 마법사 | **API 없음** — 신규 라우트 필요 | ★ | L | ✅ **W5-1 Pattern A V2 5단계 위자드** |

### 선생님 도메인 (8개)

| v1 경로 | v2 경로 | 핵심 의존 모델/API | 주의사항 | DAU★ | 작업량 | W진행 |
|---------|---------|------------------|---------|------|--------|------|
| `/overview` | `/v2/teacher/dashboard` | Classroom, StudentProfile, AnswerLog 집계 (risk-score) | OWNER 모드 KPI 분기, 라이선스 사이드바 필터 | ★★★ | L | ⬜ 보류 (이미 풍부한 대시보드) |
| `/students` | `/v2/teacher/students` | User(STUDENT), Classroom, getStudentScope | TEACHER vs OWNER scope, 마스터-디테일 우측 패널 라우팅 | ★★★ | L | ⬜ 보류 (이미 마스터-디테일) |
| `/concepts` | `/v2/teacher/concepts` | Concept, BlankExercise (CRUD) | 패널형 레이아웃 보존, 빈칸 생성기 (`blank-generator.ts`) | ★★ | XL | ⬜ 보류 (이미 정교한 마스터-디테일) |
| `/homework` | `/v2/teacher/homework` | ArithmeticHomeworkPlan, ConceptHomeworkPlan, QuestionHomeworkPlan | 3 유형 통합 위자드 4단계 | ★★★ | L | ⬜ |
| `/tests` | `/v2/teacher/exam` | Test, TestQuestion, TestAssignment, manual-grading 서비스 | 수기 채점 인터페이스 | ★★ | L | ⬜ (단, `/tests/create`는 W5-6 적용) |
| `/worksheet/create` | `/v2/teacher/worksheet` | worksheet-wizard 3단계, ai/mathgen | 라이선스(`WORKSHEET`) 가드 | ★★ | L | ✅ **W5-3 V2 progress + footer 토큰** |
| `/analytics` | `/v2/teacher/analytics` | AnswerLog, charts/* 컴포넌트 | 차트 컴포넌트 v2 토큰 적용 | ★★ | L | ⬜ |
| `/exam-analysis` | `/v2/teacher/exam-analysis` | ExamPaper, ExamAnalysisResult, AnalysisCommentTab | 8개 에이전트 탭 통합, AI 총평 | ★★ | XL | ⬜ 보류 (V2 매트릭스 변환은 데이터 모델 재설계 필요) |

### 관리자 (SUPER_ADMIN) 도메인 (4개)

| v1 경로 | v2 경로 | 핵심 의존 모델/API | 주의사항 | DAU★ | 작업량 | W진행 |
|---------|---------|------------------|---------|------|--------|------|
| `/admin/tenants` (+ `[id]`) | `/v2/admin/tenants` | Tenant, TenantLicense (10 feature 좌석/OnOff) | 드로어 패턴, MRR 집계 | ★ | L | ✅ W3 Pattern F `admin-table.css` |
| `/admin/schools` | `/v2/admin/schools` | School(6,004), SchoolGroupOverride | 커버리지/기출 보유 표시 | ★ | M | ✅ W3 Pattern F |
| `/admin/features` | `/v2/admin/features` | FeatureFlag (8 토글) | 단계별 롤아웃 UI | ★ | M | ✅ **W7-1 Pattern D V3 dg-bulk-table** |
| `/admin/exam-uploads` | `/v2/admin/exam-uploads` | ExamPaper, ExamExtractSchedule | 4단계 칸반(업로드→분석→승인→추출) | ★ | L | ⬜ |

### 인증 도메인 (2개)

| v1 경로 | v2 경로 | 의존 | DAU★ | 작업량 | W진행 |
|---------|---------|------|------|--------|------|
| `/login` | `/v2/login`, `/v2/landing` | NextAuth Credentials | ★★★ | M | ⬜ 보류 (이미 토큰 기반) |

**A 그룹 합계: 27개 · 코딩 8주 / 버퍼 포함 10~12주** · **W진행: 6개 적용 + 4개 보류**

### 공통 주의사항 (A 그룹 전체)
1. **Prisma async 패턴** — v1은 모두 `async function Page()` (서버 컴포넌트). v2는 클라이언트 정적 페이지 → 서버 컴포넌트로 전환 필요. 동적 인터랙션은 자식 `'use client'` 컴포넌트로 분리.
2. **권한 가드** — `getCurrentUser()` + `redirect('/login')` + role 분기. SUPER_ADMIN 전용 페이지는 `/overview` 리다이렉트.
3. **View-As 전파** — 학생 페이지는 `?_as=studentId` 쿼리 처리(`getViewAsUser(params)`). v2 학생 페이지 전수 적용 필요.
4. **이용권 가드** — 사이드바는 `useLicenseStore` + `requireLicense()` 서버 가드 2중 방어. Phase 5.5에서 선결.
5. **수학 렌더링** — MathRenderer/DiagramRenderer 컴포넌트는 v2 토큰과 무관, 그대로 재사용.
6. **회귀 테스트** — 각 페이지 변환 후 **스냅샷 테스트(Playwright trace)** 필수. E2E는 그룹별 1개(학생/선생님/관리자).

> **v2.2 갱신**: 실제 채택 전략에서는 기존 v1 페이지의 Prisma/권한/View-As 로직을 그대로 유지하고 마크업/CSS만 교체하므로 1~4번은 별도 작업 없음. 5~6번은 동일 적용.

---

## B1. 시안 완전 매칭 (2개)

`*-hifi.html` 시안과 1:1로 매칭되는 페이지. M (2일) 작업.

| v1 경로 | 매칭 시안 | 핵심 의존 | 작업량 | W진행 |
|---------|---------|---------|--------|------|
| `/practice/arithmetic/homework` | `student-homework-hifi.html` | ArithmeticHomeworkAttempt | M | ⬜ |
| `/practice/ox/homework` | `student-ox-quiz-hifi.html` 변형 | OX 숙제 모드 | M | ⬜ |

**B1 합계: 2개 · 0.4주 / 버퍼 포함 0.5주**

## B2. 시안 부분 참조 (6개) — M→L 상향

시안 일부만 활용 가능, 사실상 절반은 새 설계. **M → L 상향**.

| v1 경로 | 매칭 시안 | 핵심 의존 | 작업량 | W진행 |
|---------|---------|---------|--------|------|
| `/diagnostics/[id]/result` | (참고: `student-tests.html`) | DiagnosticResult, ChapterMasteryGrid | L | ✅ W4-3.2 V1 점수 영웅 이식 |
| `/quiz-join` | (참고: `student-dashboard-hifi.html` 카드) | QuizSession 코드 입력 | L | ⬜ 보류 (게임 다크 톤 유지) |
| `/quiz/[id]/play` | (참고: 시안 일부) | QuizSession, QuizParticipant, QuizAnswerLog (실시간) | L | ⬜ |
| `/practice/arithmetic/time-attack` | `student-practice-hifi.html` 일부 | TimeAttackRecord, 타이머 UI | L | ⬜ |
| `/practice/revenge` | (참고: `student-practice-hifi.html`) | revenge-suggestions API | L | ⬜ |
| `/practice/review-test` + `/practice/review-failed` | (참고: V2 카드 패턴) | SpacedReviewItem (5단계 간격) | L | ⬜ |

**B2 합계: 6개 · 2.4주 / 버퍼 포함 3주** · **W진행: 1개 적용**

---

## C. 디자인 새로 그려야 함 — v2 토큰으로 재설계 (51개)

XL 묶음을 **"기반 컴포넌트(L) + 페이지별 M×N"** 구조로 풀어 표기.

### 선생님 핵심 (사용 빈도 높음, 우선순위 ★★★)

#### C-1. 시험·평가 도메인 (12개)
| v1 경로 | 목적 | 참조 패턴 | 작업량 | W진행 |
|---------|------|---------|--------|------|
| `/tests/create` | 시험 출제 위자드 | `/v2/teacher/homework` 4단계 빌더 | L | ✅ **W5-6 Pattern A V2 3단계** |
| `/tests/[id]/results` | 시험 결과 분석 | StatTile + 차트 | L | ⬜ |
| `/manual-grading` | 수기 채점 | 답안 입력 그리드 | L | ⬜ |
| **level-test 기반 컴포넌트** | StatTile + 차트 + 보고서 PDF 베이스 | — | L | ⬜ |
| `/level-test` | 레벨테스트 목록 | 위 기반 사용 | M | ⬜ |
| `/level-test/create` | 레벨테스트 생성 | 위 기반 사용 | M | ✅ **W5-7 Pattern A V2 3단계** |
| `/level-test/[id]/edit` | 레벨테스트 편집 | 위 기반 사용 | M | ⬜ |
| `/level-test/[id]/results` | 결과 | 위 기반 사용 | M | ⬜ |
| `/level-test/[id]/report` | 보고서 | 위 기반 사용 | M | ⬜ |
| `/diagnostics` | 진단 결과 목록 (MANAGER+) | 테이블 + 필터 | M | ⬜ |
| `/exam-campaigns` | 시험 캠페인 (대량 배정) | 칸반/타임라인 | L | ⬜ |
| `/exam-campaigns/[id]/monitor` | 캠페인 모니터링 | 실시간 진행도 | L | ⬜ |

#### C-2. 학생/반 관리 (6개)
| v1 경로 | 목적 | 작업량 | W진행 |
|---------|------|--------|------|
| `/students/[id]/wrong-answers` | 학생별 오답 | L | ⬜ |
| `/students/enroll` | 학생 일괄 등록 | M | ✅ **W5-4 Pattern A V2 3단계** |
| **courses 기반 컴포넌트** | 마스터-디테일 트리 + 진도 차트 | L | ⬜ |
| `/courses` | 과정 목록 | M | ⬜ |
| `/courses/create` | 과정 생성 | M | ✅ **W5-5 Pattern A V2 3단계** |
| `/courses/[id]` | 과정 상세 | M | ⬜ |
| `/courses/[id]/progress/[username]` | 학생별 진도 | M | ⬜ |

#### C-3. 숙제 도메인 (5개)
| v1 경로 | 목적 | 작업량 | W진행 |
|---------|------|--------|------|
| `/homework/create` | 숙제 생성 (산수) | L | ⬜ |
| `/homework/concept-create` | 숙제 생성 (개념) | L | ✅ **W5-8 Pattern A V1 3단계** |
| `/homework/question-create` | 숙제 생성 (문제) | L | ✅ **W5-8 Pattern A V1 3단계** |
| **homework-grid 기반 컴포넌트** | 테이블 + 셀 채점 + 인쇄 분기 | L | ⬜ |
| `/homework/[planId]/grid` + `/concept/[seq]/grid` + `/question/[seq]/grid` | 숙제 그리드 (3개) | M×3 | ⬜ |

#### C-4. 문제은행 (5개)
| v1 경로 | 목적 | 작업량 | W진행 |
|---------|------|--------|------|
| **questions 기반 컴포넌트** | 트리+리스트 + 필터 + 미리보기 | L | ⬜ |
| `/questions` | 문제 목록 | M | ⬜ |
| `/questions/arithmetic` | 산수 문제 | M | ⬜ |
| `/questions/generate` | AI 생성 | L (AI 연동) | ⬜ |
| `/questions/ox` | OX 문제 | M | ⬜ |
| `/questions/pdf-import` | PDF 추출 (SUPER_ADMIN) | L | ✅ **W5-2 Pattern A V1 4단계 + W5-9 fix** |

#### C-5. 실시간 퀴즈 (2개)
| v1 경로 | 목적 | 작업량 | W진행 |
|---------|------|--------|------|
| `/quiz` | 퀴즈 목록/생성 | L | ⬜ |
| `/quiz/[id]/host` | 실시간 호스트 | L | ⬜ |

#### C-6. 운영/지원 (5개)
| v1 경로 | 목적 | 작업량 | W진행 |
|---------|------|--------|------|
| `/reports` | 학습 보고서 (OWNER) | L | ⬜ |
| `/licenses` | 이용권 학생 배정 (OWNER) | L | ⬜ |
| `/student-preview` | 학생 시점 미리보기 | M | ⬜ |
| `/settings` | 학원 설정 | M | ⬜ |
| `/support` + `/help` | 도움말/문의 | M×2 | ✅ W2 Pattern G `docs.css` |

### 관리자 (SUPER_ADMIN) — 8개
| v1 경로 | 목적 | 작업량 | W진행 |
|---------|------|--------|------|
| `/admin/users` | 전체 사용자 관리 | L | ⬜ |
| `/admin/classrooms` | 전체 반 관리 | M | ⬜ |
| `/admin/teachers` | 전체 교사 관리 | M | ⬜ |
| `/admin/tenants/[id]` | 지점 상세 (좌석/OnOff 2단) | L | ⬜ |
| `/admin/extract-queue` | 시험지 배치 추출 큐 | L | ⬜ |
| `/admin/ox-statements` | OX 문장 관리 | M | ⬜ |
| `/admin/sounds` | 사운드 에셋 | S | ⬜ |
| `/exam-analysis/admin` + `/admin/trends` | 기출분석 어드민/트렌드 | L×2 | ⬜ |

### 학생 보조 — 3개
| v1 경로 | 목적 | 작업량 | W진행 |
|---------|------|--------|------|
| `/exam-prep` | 시험 대비 목록 | L | ⬜ |
| `/exam-prep/[enrollmentId]/solve` | 시험 대비 풀이 | L | ⬜ |
| `/my-tests/[id]/play` | 시험 응시 화면 | L | ⬜ |

### 공통/정보 — 5개
| v1 경로 | 목적 | 분류 | 작업량 | W진행 |
|---------|------|------|--------|------|
| `/` (랜딩 루트) | 홈/리다이렉트 | 라우터 | S | ⬜ |
| `/updates` | 업데이트 로그 | 정적 | M | ✅ W2 Pattern G |
| `/help-public` | 공개 도움말 | 정적 | M | ⬜ |
| `/privacy` | 개인정보처리방침 | 정적 | S | ⬜ |
| `/terms` | 이용약관 | 정적 | S | ⬜ |

### (신규, 검토서 외) 운영 도구
| v1 경로 | 목적 | 작업량 | W진행 |
|---------|------|--------|------|
| `/queue` | 선생님 작업 큐 (칸반 + 액티비티) | L | ✅ **W6-5 Pattern E V1 칸반 + V3 액티비티 신규** |

**C 그룹 합계: 51개 · 코딩 18주 / 버퍼 포함 22~24주** · **W진행: 7개 적용 + 1개 신규**

---

## D. 변환 불필요 (22개) — 단, 검증 필요

### 인쇄 페이지 (5개) — ⚠️ v2 토큰 회귀 검증 0.5일×5 = 0.5주
- `/tests/[id]/print`
- `/homework/[planId]/print`
- `/workbooks/[id]/print`
- `/exam-analysis/[id]/print`
- (인쇄 템플릿 9종, 8 컬러는 별도 시스템 유지)
- **검증 항목**: `@media print` 격리, KaTeX 폰트, A4 레이아웃, 8 컬러 인쇄

### Mockups (개발자 도구) (12개) — 검증 불필요
- `/mockups/*` 전체

### Dev/임시 (3개) — 검증 불필요
- `/dev/gems`, `/(dev)/preview-v2`, `/overview/v2`

### Workbook(신규 도메인) (4개) — 도메인 안정화 후 일괄
- `/workbooks`, `/workbooks/[id]`, `/workbooks/new`, `/workbooks/[id]/print`

### 기타 (1개)
- `/demo` (선생님 데모 페이지)

**D 그룹: 22개 · 인쇄 검증 0.5주**

---

## 추천 진행 순서 (DAU + 비즈니스 임팩트 가중 재정렬)

> **v2.2 갱신**: 검토서 초안의 Phase 6~13는 별도 `/v2/*` 라우트 전략을 가정한 순서입니다. 실제 진행은 패턴별 CSS 도입 → 페이지 적용 순으로 진행되었습니다.

### 실제 진행 순서 (W2~W7, 완료)

- **W2** — Pattern G 정적 (`docs.css`)
- **W3** — Pattern F 어드민 테이블 (`admin-table.css`)
- **W4** — Pattern B 결과 리포트 (`results-report.css`) + 5개 페이지 적용
- **W5** — Pattern A 위자드 (`wizard.css` + 컴포넌트 7종) + 8개 페이지 적용
- **W6** — Pattern C 마스터-디테일 (`master-detail.css`) + `/subjects` / Pattern E 칸반-타임라인 (`kanban-timeline.css`) + `/queue` 신규
- **W7** — Pattern D 데이터 그리드 (`data-grid.css`) + `/admin/features` 적용

### 권장 다음 단계 (W8~)

#### W8 — QA/모바일/다크 모드 (검토서 원안 + v2.2)
1. **모바일 반응형 검증** — 모든 패턴 CSS의 ≤720px / 744px 브레이크포인트 점검
2. **다크 모드 토큰** — 현재 라이트 모드 전용. `--bg-dark`, `--ink-dark` 등 추가
3. **인쇄 회귀** — 5개 인쇄 페이지가 v2 토큰에 영향받지 않는지 검증
4. **Playwright 스냅샷** — 적용된 14개 페이지에 회귀 테스트 셋업
5. **사이드바 네비 회귀** — `/queue` 추가 후 모든 역할 사이드바 정상 표시 확인

#### W9~ — A 그룹 잔여 + C 그룹 우선순위 ★★★
- A 그룹 학생 페이지 미적용 7개 (`/concepts/[id]`, `/practice/*`, `/my-tests`, `/shop` 등)
- C 그룹 ★★★ 사용 빈도 페이지 (`/tests/[id]/results`, `/manual-grading`, `/homework/create`, `/exam-analysis` 매트릭스 추가)
- B2 그룹 시안 부분 참조 6개

#### 검토서 원안 (별도 v2 라우트 전략, 참고용)

##### Phase 5.5 — 선결과제 (0.5주) ~~필수~~ 불필요
- 권한/라이선스 메타 v2 사이드바 포팅

##### Phase 6 — 매일 진입 화면 최우선 (4주, A 그룹 ★★★ 7개)
1. `/dashboard` → `/v2/dashboard` (학생 진입)
2. `/overview` → `/v2/teacher/dashboard` (선생님 진입)
3. `/login` + `/v2/landing` (인증)
4. `/students` → `/v2/teacher/students` (선생님 일일 작업)
5. `/practice/arithmetic` → `/v2/practice` (학생 일일 학습)
6. `/practice/question-homework` → `/v2/homework`
7. `/homework` → `/v2/teacher/homework`

##### Phase 7 — 학생 학습 흐름 완성 (3주, A 그룹 6개)
8. `/subjects` → `/v2/curriculum` ✅ **W6-1 완료**
9. `/concepts/[id]` → `/v2/concept-detail`
10. `/practice/ox` → `/v2/ox-quiz`
11. `/my-tests` → `/v2/exam`
12. `/my-tests/[id]/result` → `/v2/results`
13. `/profile`, `/ranking`

##### Phase 8 — 선생님 분석/평가 (3주, A 그룹 5개)
14. `/exam-analysis` → `/v2/teacher/exam-analysis` (XL)
15. `/analytics` → `/v2/teacher/analytics`
16. `/tests` → `/v2/teacher/exam`
17. `/worksheet/create` → `/v2/teacher/worksheet` ✅ **W5-3 완료**
18. `/concepts` → `/v2/teacher/concepts` (XL)

##### Phase 9 — B 그룹 일괄 + 관리자 (3주)
19. B1 (2개) — 시안 매칭
20. B2 (6개) — L 상향 작업
21. 관리자 4개 (A 그룹)
22. `/shop` (XL, 스키마 신설)

##### Phase 10~12 — C 그룹 (15~17주)
23. **시험·평가 도메인** (C-1, 12개, 5주)
24. **숙제 + 문제은행** (C-3+C-4, 10개, 4주)
25. **학생/반 관리** (C-2, 6개, 2주)
26. **실시간 퀴즈 + 운영** (C-5+C-6, 7개, 2주)
27. **학생 보조** (3개, 1.5주)
28. **관리자** (8개, 2.5주)
29. **정보 페이지** (5개, 1주)

##### Phase 13 — D 그룹 검증 + 마무리 (0.5주)
30. 인쇄 5페이지 회귀 검증

**총합: 약 36~40주 (1인 풀타임)** · **W2~W7 진행 후 남은 작업 ~22~26주**

---

## 위험 요소 (v2.2 갱신)

1. ~~**권한 시스템 (5단계 역할)**~~ ✅ **v2.2 해소** — 전략 변경으로 기존 navigation.ts 그대로 사용. Phase 5.5 선결 불필요.

2. **Prisma 모델 누락 영역** — `/v2/shop`은 Wallet, Avatar, ShopItem 등 미존재 모델 가정. 도메인 추가 시 스키마 → API → 프론트 3단계 필수. 변경 없음.

3. ~~**이용권 가드 v2**~~ ✅ **v2.2 해소** — 기존 `useLicenseStore` + `requireLicense()` 그대로 사용. Phase 5.5 불필요.

4. **View-As 패턴** — `?_as=studentId` 학생 시점 전환. v1 그대로 유지. **W6-1 `/subjects`에서 `getViewAsUser` 정상 적용 확인됨**.

5. **MathRenderer/DiagramRenderer 토큰 충돌** — v2 토큰 `--font-display` 적용 시 KaTeX `.katex` 폰트 오버라이드 가능성. globals.css 우선순위 확인. W2~W7 진행 중 미발견.

6. **숙제 questionIds Dual-Write** — v1은 `getHomeworkDayQuestionIds()` 헬퍼로 중간테이블 우선 조회. 전략 변경으로 v1 헬퍼 그대로 사용 → 위험 해소.

7. **인쇄 페이지 회귀** — v2 토큰이 글로벌하게 영향. W8에서 5페이지 전수 검증 필요. **현재 미점검**.

8. **★ NEW: refact HTML 14개 V2 시안의 토큰 회귀** — `*-hifi.html`이 새 v2 토큰 적용 시 깨질 수 있음. **참고용 HTML이므로 회귀 영향 없음** — 검토서 자료로만 사용.

9. **★ NEW: 회귀 테스트 전략 부재** — 110개 페이지 변환 중 추적할 자동화 필요.
   - **권장 전략**: Playwright 스냅샷 테스트 (페이지당 1개) + E2E 시나리오 그룹별 1개 (학생 일과 / 선생님 일과 / 관리자 일과)
   - **현재 W2~W7 적용 14개 페이지에 스냅샷 미적용** — W8에서 셋업 필요.

10. **★ NEW (v2.2): 패턴 CSS prefix 충돌** — 7개 패턴(`.wz-*`, `.mc-*`, `.kt-*`, `.dg-*`, `.tbl-*`, `.rr-*`, `.docs-*`)을 모두 import 시 globals.css 크기 증가. **현재 양호** — 각 prefix가 격리되어 페이지별 import 가능.

---

## 부록 A: 인력 가정과 병렬화

**1인 풀타임 기준 36~40주** 산정.

**2인 병렬 시**: 약 60% 작업 병렬화 가능 (Phase 6~8 도메인 분리, Phase 10~12 카테고리 분리).
- 예상: **24~28주** (1.4~1.5배 단축)

**3인 이상**: 컴포넌트 충돌/머지 비용 증가로 60→50% 효율. 약 **20~22주**.

**권장**: 2인 페어 + 디자인 1인 = 3인이 최적.

> **v2.2 갱신**: 실제 진행은 1인 기준 W2~W7 약 1주 소요 (실 작업 시간). 검토서 추정 대비 ~70% 단축은 전략 변경(별도 v2 라우트 → 기존 라우트 직접 적용) 효과.

---

## 부록 B: 전체 페이지 매핑표 (110)

| # | v1 경로 | v2 매핑 | 분류 | DAU | 작업량 | W진행 |
|---|---------|---------|------|-----|--------|------|
| 1 | `/` | (라우터) | C | ★★★ | S | ⬜ |
| 2 | `/login` | `/v2/login` | A | ★★★ | M | ⬜ |
| 3 | `/help-public` | — | C | ★ | M | ⬜ |
| 4 | `/privacy` | — | C | ★ | S | ⬜ |
| 5 | `/terms` | — | C | ★ | S | ⬜ |
| 6 | `/updates` | — | C | ★ | M | ✅ W2 G |
| 7 | `/dashboard` | `/v2/dashboard` | A | ★★★ | L | ✅ W4-3.5 |
| 8 | `/subjects` | `/v2/curriculum` | A | ★★★ | M | ✅ W6-1 C-V1 |
| 9 | `/concepts/[id]` | `/v2/concept-detail` | A | ★★★ | L | ⬜ |
| 10 | `/profile` | `/v2/profile` | A | ★★ | M | ✅ W4-3.4 |
| 11 | `/ranking` | `/v2/ranking` | A | ★★ | M | ⬜ 보류 |
| 12 | `/shop` | `/v2/shop` | A | ★ | XL | ⬜ |
| 13 | `/quiz-join` | — | B2 | ★★ | L | ⬜ 게임 톤 |
| 14 | `/quiz/[id]/play` | — | B2 | ★★ | L | ⬜ |
| 15 | `/practice/arithmetic` | `/v2/practice` | A | ★★★ | L | ⬜ |
| 16 | `/practice/arithmetic/homework` | — | B1 | ★★★ | M | ⬜ |
| 17 | `/practice/arithmetic/time-attack` | — | B2 | ★★ | L | ⬜ |
| 18 | `/practice/ox` | `/v2/ox-quiz` | A | ★★ | M | ⬜ |
| 19 | `/practice/ox/homework` | — | B1 | ★★ | M | ⬜ |
| 20 | `/practice/question-homework` | `/v2/homework` | A | ★★★ | L | ⬜ |
| 21 | `/practice/revenge` | — | B2 | ★★ | L | ⬜ |
| 22 | `/practice/review-test` | — | B2 | ★★ | L | ⬜ |
| 23 | `/practice/review-failed` | — | B2 | ★★ | L | ⬜ |
| 24 | `/my-tests` | `/v2/exam` | A | ★★ | L | ⬜ |
| 25 | `/my-tests/[id]/play` | — | C | ★★ | L | ⬜ |
| 26 | `/my-tests/[id]/result` | `/v2/results` | A | ★★ | L | ✅ W4-3.1 |
| 27 | `/diagnostics/[id]/result` | — | B2 | ★★ | L | ✅ W4-3.2 |
| 28 | `/exam-prep` | — | C | ★★ | L | ⬜ |
| 29 | `/exam-prep/[enrollmentId]/solve` | — | C | ★★ | L | ⬜ |
| 30 | `/overview` | `/v2/teacher/dashboard` | A | ★★★ | L | ⬜ 보류 |
| 31 | `/overview/v2` | — | D | - | - | - |
| 32 | `/students` | `/v2/teacher/students` | A | ★★★ | L | ⬜ 보류 |
| 33 | `/students/enroll` | — | C | ★★ | M | ✅ W5-4 A-V2 |
| 34 | `/students/[id]/wrong-answers` | — | C | ★★ | L | ⬜ |
| 35 | `/concepts` | `/v2/teacher/concepts` | A | ★★ | XL | ⬜ 보류 |
| 36 | `/questions` | — | C | ★★ | M | ⬜ |
| 37 | `/questions/arithmetic` | — | C | ★★ | M | ⬜ |
| 38 | `/questions/generate` | — | C | ★★ | L | ⬜ |
| 39 | `/questions/ox` | — | C | ★★ | M | ⬜ |
| 40 | `/questions/pdf-import` | — | C | ★ | L | ✅ W5-2 A-V1 |
| 41 | `/homework` | `/v2/teacher/homework` | A | ★★★ | L | ⬜ |
| 42 | `/homework/create` | — | C | ★★★ | L | ⬜ |
| 43 | `/homework/concept-create` | — | C | ★★ | L | ✅ W5-8 A-V1 |
| 44 | `/homework/question-create` | — | C | ★★ | L | ✅ W5-8 A-V1 |
| 45 | `/homework/[planId]/grid` | — | C | ★★ | M | ⬜ |
| 46 | `/homework/[planId]/print` | — | D | - | - | - |
| 47 | `/homework/concept/[seq]/grid` | — | C | ★★ | M | ⬜ |
| 48 | `/homework/question/[seq]/grid` | — | C | ★★ | M | ⬜ |
| 49 | `/tests` | `/v2/teacher/exam` | A | ★★ | L | ⬜ |
| 50 | `/tests/create` | — | C | ★★★ | L | ✅ W5-6 A-V2 |
| 51 | `/tests/[id]/results` | — | C | ★★ | L | ⬜ |
| 52 | `/tests/[id]/print` | — | D | - | - | - |
| 53 | `/level-test` | — | C | ★★ | M | ⬜ |
| 54 | `/level-test/create` | — | C | ★★ | M | ✅ W5-7 A-V2 |
| 55 | `/level-test/[id]/edit` | — | C | ★★ | M | ⬜ |
| 56 | `/level-test/[id]/results` | — | C | ★★ | M | ⬜ |
| 57 | `/level-test/[id]/report` | — | C | ★★ | M | ⬜ |
| 58 | `/worksheet/create` | `/v2/teacher/worksheet` | A | ★★ | L | ✅ W5-3 A-V2 |
| 59 | `/quiz` | — | C | ★ | L | ⬜ |
| 60 | `/quiz/[id]/host` | — | C | ★ | L | ⬜ |
| 61 | `/manual-grading` | — | C | ★★★ | L | ⬜ |
| 62 | `/diagnostics` | — | C | ★★ | M | ⬜ |
| 63 | `/analytics` | `/v2/teacher/analytics` | A | ★★ | L | ⬜ |
| 64 | `/reports` | — | C | ★ | L | ⬜ |
| 65 | `/exam-analysis` | `/v2/teacher/exam-analysis` | A | ★★ | XL | ⬜ 보류 |
| 66 | `/exam-analysis/[id]/print` | — | D | - | - | - |
| 67 | `/exam-analysis/admin` | — | C | ★ | L | ⬜ |
| 68 | `/exam-analysis/admin/trends` | — | C | ★ | L | ⬜ |
| 69 | `/exam-campaigns` | — | C | ★ | L | ⬜ |
| 70 | `/exam-campaigns/[id]/monitor` | — | C | ★ | L | ⬜ |
| 71 | `/courses` | — | C | ★★ | M | ⬜ |
| 72 | `/courses/create` | — | C | ★★ | M | ✅ W5-5 A-V2 |
| 73 | `/courses/[id]` | — | C | ★★ | M | ⬜ |
| 74 | `/courses/[id]/progress/[username]` | — | C | ★★ | M | ⬜ |
| 75 | `/licenses` | — | C | ★ | L | ⬜ |
| 76 | `/student-preview` | — | C | ★ | M | ⬜ |
| 77 | `/settings` | — | C | ★ | M | ⬜ |
| 78 | `/help` | — | C | ★ | M | ✅ W2 G |
| 79 | `/support` | — | C | ★ | M | ✅ W2 G |
| 80 | `/demo` | — | D | - | - | - |
| 81 | `/admin/tenants` | `/v2/admin/tenants` | A | ★ | L | ✅ W3 F |
| 82 | `/admin/tenants/[id]` | — | C | ★ | L | ⬜ |
| 83 | `/admin/schools` | `/v2/admin/schools` | A | ★ | M | ✅ W3 F |
| 84 | `/admin/features` | `/v2/admin/features` | A | ★ | M | ✅ **W7-1 D-V3** |
| 85 | `/admin/exam-uploads` | `/v2/admin/exam-uploads` | A | ★ | L | ⬜ |
| 86 | `/admin/users` | — | C | ★ | L | ⬜ |
| 87 | `/admin/classrooms` | — | C | ★ | M | ⬜ |
| 88 | `/admin/teachers` | — | C | ★ | M | ⬜ |
| 89 | `/admin/extract-queue` | — | C | ★ | L | ⬜ |
| 90 | `/admin/ox-statements` | — | C | ★ | M | ⬜ |
| 91 | `/admin/sounds` | — | C | ★ | S | ⬜ |
| 92~95 | `/workbooks/*` (4 페이지) | — | D | - | - | - |
| 96~107 | `/mockups/*` (12 페이지) | — | D | - | - | - |
| 108 | `/dev/gems`, `/(dev)/preview-v2` | — | D | - | - | - |
| **109** | **(신규)** | **`/v2/landing`** | **A** | ★★★ | **포함(M)** | ⬜ |
| **110** | **(신규)** | **`/v2/onboarding`** | **A** | ★ | **L** | ✅ **W5-1 A-V2** |
| **+** | **(W6-5 신규, 검토서 외)** | **`/queue`** | **C** | ★★ | **L** | ✅ **W6-5 E-V1+V3** |

**W진행 통계** (2026-05-13 기준):
- ✅ 적용: 14개 (A 6개 + B2 1개 + C 6개 + 신규 1개)
- ⬜ 보류 (이미 잘 작동): 5개
- ⬜ 미진행: 91개

---

## 변경 이력

- **v2.2 (2026-05-13)**: W2~W7 실제 진행 결과 반영
  - 전략 변경 명시 (별도 `/v2/*` 라우트 → 기존 라우트 직접 토큰 적용)
  - Phase 5.5 선결과제 불필요로 변경
  - 도입된 7개 디자인 시스템 패턴 표 추가
  - 적용된 14개 페이지 매핑 표시 (W진행 컬럼 추가)
  - 의도적 스킵 5개 페이지 명시
  - 위험 요소 1, 3, 6 해소 / 위험 요소 10 추가 (패턴 prefix)
  - 부록 B 매핑표에 W진행 컬럼 추가
- **v2.1 (2026-05-12)**: 검토 피드백 반영
  - 인력 가정 명시 (1인 풀타임)
  - 버퍼 +25% 반영 → 총 36~40주
  - B 그룹 B1/B2 분할, B2 M→L 상향
  - XL 묶음을 "기반 컴포넌트 + 페이지×N"으로 재구조화
  - DAU 가중치 컬럼 추가, Phase 순서 재정렬
  - Phase 5.5 (권한 메타 선결) 명시
  - 위험 요소 #8(시안 회귀), #9(테스트 전략) 추가
  - `/v2/landing`, `/v2/onboarding` 부록 표 109/110번 추가
  - D 그룹 인쇄 검증 0.5주 명시
- **v2.0 (2026-05-12)**: 초안
