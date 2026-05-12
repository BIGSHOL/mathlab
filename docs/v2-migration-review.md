# v1 → v2 디자인 마이그레이션 검토서

작성: 2026-05-12
범위: `src/app/**` v1 페이지 108개 (v2 폴더 제외)
v2 변환 현황: 28개 (인덱스 + 27 페이지 — `src/app/v2/**/page.tsx`, MOCK 데이터)
data/refact 디자인 시안: 41 HTML 파일

척도: **S = 0.5일, M = 2일, L = 5일, XL = 10일**

## 요약

| 분류 | 페이지 수 | 작업량 |
|------|----------|--------|
| A. 이미 v2 매핑됨 (Prisma 연동 필요) | 27 | 약 8주 (L×16 + M×11) |
| B. 단순 변환 (data/refact 시안 있음) | 8 | 약 2.5주 (M×8) |
| C. 디자인 새로 그려야 함 | 51 | 약 18주 (L×35 + M×16) |
| D. 변환 불필요 (mockups/print/dev/public) | 22 | - |
| **합계 (v1 페이지)** | **108** | **약 28.5주** |

---

## A. 이미 v2 매핑됨 — Prisma 연동 작업 필요 (27개)

v2 페이지가 이미 만들어졌지만 모두 정적 MOCK 사용. v1 페이지의 Prisma 호출/권한 가드/View-As 패턴을 옮겨야 함.

### 학생 도메인 (13개)

| v1 경로 | v2 경로 | 핵심 의존 모델/API | 주의사항 | 작업량 |
|---------|---------|------------------|---------|--------|
| `/dashboard` | `/v2/dashboard` | StudentProfile, getTodayHomework/Concept/Question, hasLicense, DashboardGamification, ReviewReminderCard | View-As (`?_as`) 전파, 4개 자식 컴포넌트(NextBestAction, DailyRoulette 등) v2 포팅 필요 | L |
| `/subjects` | `/v2/curriculum` | LearningCourseEnrollment, LearningCourseConcept | 학년·학기 라우팅, 진도 집계 쿼리 | M |
| `/concepts/[id]` | `/v2/concept-detail` | Concept, BlankExercise, ConceptMemo | 동적 [id] 파라미터 라우팅 추가, 5단계 BlankStage 전환 | L |
| `/practice/arithmetic` | `/v2/practice` | ArithmeticHomeworkPlan, 79 카테고리 생성기 | TimeAttackRecord 표시, 라이선스(`ARITHMETIC`) 가드 | L |
| `/practice/ox` | `/v2/ox-quiz` | OXStatement, OXAttempt | 라이선스(`OX_QUIZ`) 가드, 정답률 집계 | M |
| `/practice/question-homework` | `/v2/homework` (학생 숙제) | QuestionHomeworkPlan, HomeworkQuestion(중간테이블), getHomeworkDayQuestionIds | dayIndex별 진행도 | L |
| `/my-tests` | `/v2/exam` | Test, TestAttempt, TestAssignment | 시험 응시·결과 분기 | L |
| `/my-tests/[id]/result` | `/v2/results` | TestAttempt, AnswerLog, ExamAnalysisResult | 오답 패턴 카드 + AI 코멘트 연동 | L |
| `/profile` | `/v2/profile` | StudentProfile, UserBadge, PointTransaction | XP 곡선, 뱃지 그리드 | M |
| `/ranking` | `/v2/ranking` | StudentProfile.totalXp, Classroom 집계 | 주간/시즌/반대항 3탭, RankChangeIndicator | M |
| `/shop` | `/v2/shop` | (스키마 누락) Wallet, Avatar, ShopItem | **스키마 부족** — 신규 모델 설계 필요 | XL |
| 신규 (인증) | `/v2/login` | NextAuth Credentials | 기존 `/login` 디자인 교체 가능 | M |
| 신규 (인증) | `/v2/onboarding` | Tenant 셋업 마법사 | **API 없음** — 신규 라우트 필요 | L |

### 선생님 도메인 (8개)

| v1 경로 | v2 경로 | 핵심 의존 모델/API | 주의사항 | 작업량 |
|---------|---------|------------------|---------|--------|
| `/overview` | `/v2/teacher/dashboard` | Classroom, StudentProfile, AnswerLog 집계 (risk-score) | OWNER 모드 KPI 분기, 라이선스 사이드바 필터 | L |
| `/students` | `/v2/teacher/students` | User(STUDENT), Classroom, getStudentScope | TEACHER vs OWNER scope, 마스터-디테일 우측 패널 라우팅 | L |
| `/concepts` | `/v2/teacher/concepts` | Concept, BlankExercise (CRUD) | 패널형 레이아웃 보존, 빈칸 생성기 (`blank-generator.ts`) | XL |
| `/homework` | `/v2/teacher/homework` | ArithmeticHomeworkPlan, ConceptHomeworkPlan, QuestionHomeworkPlan | 3 유형 통합 위자드 4단계 | L |
| `/tests` | `/v2/teacher/exam` | Test, TestQuestion, TestAssignment, manual-grading 서비스 | 수기 채점 인터페이스 |  L |
| `/worksheet/create` | `/v2/teacher/worksheet` | worksheet-wizard 3단계, ai/mathgen | 라이선스(`WORKSHEET`) 가드 | L |
| `/analytics` | `/v2/teacher/analytics` | AnswerLog, charts/* 컴포넌트 | 차트 컴포넌트 v2 토큰 적용 | L |
| `/exam-analysis` | `/v2/teacher/exam-analysis` | ExamPaper, ExamAnalysisResult, AnalysisCommentTab | 8개 에이전트 탭 통합, AI 총평 | XL |

### 관리자 (SUPER_ADMIN) 도메인 (4개)

| v1 경로 | v2 경로 | 핵심 의존 모델/API | 주의사항 | 작업량 |
|---------|---------|------------------|---------|--------|
| `/admin/tenants` (+ `[id]`) | `/v2/admin/tenants` | Tenant, TenantLicense (10 feature 좌석/OnOff) | 드로어 패턴, MRR 집계 | L |
| `/admin/schools` | `/v2/admin/schools` | School(6,004), SchoolGroupOverride | 커버리지/기출 보유 표시 | M |
| `/admin/features` | `/v2/admin/features` | FeatureFlag (8 토글) | 단계별 롤아웃 UI | M |
| `/admin/exam-uploads` | `/v2/admin/exam-uploads` | ExamPaper, ExamExtractSchedule | 4단계 칸반(업로드→분석→승인→추출) | L |

### 인증 도메인 (2개)

| v1 경로 | v2 경로 | 의존 | 작업량 |
|---------|---------|------|--------|
| `/login` | `/v2/login`, `/v2/landing` | NextAuth Credentials | M |

**A 그룹 합계: 27개 · 약 8주** (대부분 L = 5일, 일부 M)

### 공통 주의사항 (A 그룹 전체)
1. **Prisma async 패턴** — v1은 모두 `async function Page()` (서버 컴포넌트). v2는 클라이언트 정적 페이지 → 서버 컴포넌트로 전환 필요. 동적 인터랙션은 자식 `'use client'` 컴포넌트로 분리.
2. **권한 가드** — `getCurrentUser()` + `redirect('/login')` + role 분기. SUPER_ADMIN 전용 페이지는 `/overview` 리다이렉트.
3. **View-As 전파** — 학생 페이지는 `?_as=studentId` 쿼리 처리(`getViewAsUser(params)`). v2 학생 페이지 전수 적용 필요.
4. **이용권 가드** — 사이드바는 `useLicenseStore` + `requireLicense()` 서버 가드 2중 방어. v2 사이드바는 `licenseFeature` 필터 미구현 → 추가.
5. **수학 렌더링** — MathRenderer/DiagramRenderer 컴포넌트는 v2 토큰과 무관, 그대로 재사용.

---

## B. 단순 변환 — data/refact 시안 있는 페이지 (8개)

디자인 시안이 있는데 아직 v2 변환이 안 된 페이지들. 매칭 시안과 함께 정리.

| v1 경로 | 매칭 시안 | 핵심 의존 | 작업량 |
|---------|---------|---------|--------|
| `/diagnostics/[id]/result` | (참고: `student-tests.html`) | DiagnosticResult, ChapterMasteryGrid | M |
| `/quiz-join` | (참고: `student-dashboard-hifi.html` 카드) | QuizSession 코드 입력 | M |
| `/quiz/[id]/play` | (참고: 시안 일부) | QuizSession, QuizParticipant, QuizAnswerLog (실시간) | M |
| `/practice/arithmetic/time-attack` | `student-practice-hifi.html` 일부 | TimeAttackRecord, 타이머 UI | M |
| `/practice/arithmetic/homework` | `student-homework-hifi.html` | ArithmeticHomeworkAttempt | M |
| `/practice/ox/homework` | `student-ox-quiz-hifi.html` 변형 | OX 숙제 모드 | M |
| `/practice/revenge` | (참고: `student-practice-hifi.html`) | revenge-suggestions API | M |
| `/practice/review-test` + `/practice/review-failed` | (참고: V2 카드 패턴) | SpacedReviewItem (5단계 간격) | M |

**B 그룹 합계: 8개 · 약 2.5주**

> 참고: data/refact/pages에는 41개 HTML이 있으나 `*-hifi.html` 14개가 V2 변환 완료. 나머지 LoFi/대안 HTML은 참조용.

---

## C. 디자인 새로 그려야 함 — v2 토큰으로 재설계 (51개)

시안이 없거나 시안만으로 표현 불가능한 고도화 페이지들. v1의 핵심 기능을 보존하면서 `mathlab-v2.css` 토큰 + `ui-v2`/`layout-v2` 컴포넌트로 재설계.

### 선생님 핵심 (사용 빈도 높음, 우선순위 ★★★) — 19개

| v1 경로 | 목적 | 참조 패턴 | 작업량 |
|---------|------|---------|--------|
| `/tests/create` | 시험 출제 위자드 | `/v2/teacher/homework` 4단계 빌더 | L |
| `/tests/[id]/results` | 시험 결과 분석 | StatTile + 차트 (`v2-pages/teacher-analytics.css`) | L |
| `/students/[id]/wrong-answers` | 학생별 오답 | Card + Chip + 오답 패턴 그리드 | L |
| `/students/enroll` | 학생 일괄 등록 | 테이블 + 일괄 임포트 | M |
| `/courses` (+ `/create`, `/[id]`, `/[id]/progress/[username]`) | 학습 과정 CRUD + 진도 | `/v2/teacher/students` 마스터-디테일 | XL (4페이지) |
| `/homework/create` (+ `concept-create`, `question-create`) | 숙제 생성 3유형 | `/v2/teacher/homework` 통합 | L |
| `/homework/[planId]/grid` (+ `concept`, `question`) | 숙제 그리드 보기 | 테이블 + 셀 채점 | L |
| `/questions` (+ `/generate`, `/arithmetic`, `/ox`) | 문제은행 CRUD | `/v2/teacher/concepts` 트리+리스트 | XL (4페이지) |
| `/questions/pdf-import` | PDF 추출 (SUPER_ADMIN) | 4단계 위자드 | L |
| `/level-test` (+ `/create`, `/[id]/edit`, `/[id]/results`, `/[id]/report`) | 레벨테스트 CRUD + 보고서 | StatTile + 차트 | XL (5페이지) |
| `/quiz` (+ `/[id]/host`) | 실시간 퀴즈 호스트 | 실시간 참여자 그리드 | L |
| `/manual-grading` | 수기 채점 | 답안 입력 그리드 | L |
| `/diagnostics` | 진단 결과 목록 (MANAGER+) | 테이블 + 필터 | M |
| `/reports` | 학습 보고서 (OWNER) | `/v2/teacher/analytics` 응용 | L |
| `/licenses` | 이용권 학생 배정 (OWNER) | 테이블 + 배정 모달 | L |
| `/exam-campaigns` (+ `/[id]/monitor`) | 시험 캠페인 (대량 배정) | 칸반/타임라인 | L |
| `/student-preview` | 학생 시점 미리보기 | View-As 시작 페이지 | M |
| `/settings` | 학원 설정 | 폼 위주, PageContainer xl | M |
| `/support` (+ `/help`) | 도움말/문의 | FAQ + 폼 | M |

### 관리자 (SUPER_ADMIN) — 9개

| v1 경로 | 목적 | 작업량 |
|---------|------|--------|
| `/admin/users` | 전체 사용자 관리 | L |
| `/admin/classrooms` | 전체 반 관리 | M |
| `/admin/teachers` | 전체 교사 관리 | M |
| `/admin/tenants/[id]` | 지점 상세 (좌석/OnOff 2단) | L |
| `/admin/extract-queue` | 시험지 배치 추출 큐 | L |
| `/admin/exam-uploads` (현재 v2 매핑됨) | 시험지 업로드 | (A) |
| `/admin/ox-statements` | OX 문장 관리 | M |
| `/admin/sounds` | 사운드 에셋 | S |
| `/exam-analysis/admin` (+ `/trends`) | 기출분석 어드민 (트렌드) | L |

### 학생 보조 — 4개

| v1 경로 | 목적 | 작업량 |
|---------|------|--------|
| `/exam-prep` (+ `/[enrollmentId]/solve`) | 시험 대비 모드 | L |
| `/my-tests/[id]/play` | 시험 응시 화면 | L |
| (응시 중 인터랙션) | — | (포함) |

### 공통/정보 — 5개

| v1 경로 | 목적 | 분류 | 작업량 |
|---------|------|------|--------|
| `/` (랜딩 루트) | 홈/리다이렉트 | 라우터 | S |
| `/updates` | 업데이트 로그 | 정적 | M |
| `/help-public` | 공개 도움말 | 정적 | M |
| `/privacy` | 개인정보처리방침 | 정적 | S |
| `/terms` | 이용약관 | 정적 | S |

**C 그룹 합계: 51개 · 약 18주** (L 35 + M 16, 일부 XL 그룹은 4~5 페이지 묶음)

---

## D. 변환 불필요 (22개)

### 인쇄 페이지 (5개) — A4 본질, v2 토큰 부적합
- `/tests/[id]/print`
- `/homework/[planId]/print`
- `/workbooks/[id]/print`
- `/exam-analysis/[id]/print`
- (인쇄 템플릿 9종, 8 컬러는 별도 시스템 유지)

### Mockups (개발자 도구) (12개)
- `/mockups/*` 전체 (avatar-preview, accessory-preview, effect-preview, diagram-editor, audit-explanations, explanation-compare, preset-browser, renderer-compare, textbook-shapes, topic-preview, workbook-preview, page)

### Dev/임시 (2개)
- `/dev/gems`
- `/(dev)/preview-v2`
- `/overview/v2` (이미 v2 mockup)

### Workbook(신규 도메인, 별도 처리 권장) (3개)
- `/workbooks`, `/workbooks/[id]`, `/workbooks/new` — 도메인 신설중. v2 변환은 도메인 안정화 후 일괄.

### 기타 (1개)
- `/demo` (선생님 데모 페이지)

**D 그룹: 22개 · 변환 제외**

---

## 추천 진행 순서

### Phase 6 — A 그룹 핵심 학생 (3주)
1. `/dashboard` → `/v2/dashboard` (View-As 포함)
2. `/profile`, `/ranking` (게이미피케이션 토대)
3. `/practice/arithmetic`, `/practice/ox`, `/practice/question-homework`

### Phase 7 — A 그룹 선생님 핵심 (3주)
4. `/overview` → `/v2/teacher/dashboard` (risk-score 집계)
5. `/students` → `/v2/teacher/students` (마스터-디테일)
6. `/exam-analysis` → `/v2/teacher/exam-analysis` (AI 코멘트)

### Phase 8 — A 그룹 잔여 + B 그룹 빠른 변환 (3주)
7. 관리자 4페이지 + 인증 2페이지
8. B 그룹 8페이지 (quiz, time-attack, review 등)

### Phase 9~ — C 그룹 (선생님 핵심 → 관리자 → 공통) (15~18주)
9. `/tests/create`, `/level-test`, `/manual-grading`
10. `/courses`, `/homework`, `/questions` (XL 그룹)
11. 관리자 SUPER_ADMIN 페이지
12. 정보 페이지(`/updates`, `/help-public` 등)

---

## 위험 요소

1. **권한 시스템 (5단계 역할)** — v2 사이드바(`STUDENT_NAV`, `TEACHER_NAV`)는 정적 배열. Additive 구조(MANAGER→OWNER→SUPER_ADMIN)와 라이선스 필터링(`useLicenseStore`) 미반영. v1 `src/lib/constants/navigation.ts`의 `licenseFeature`/`minRole` 메타데이터 포팅 필요.

2. **Prisma 모델 누락 영역** — `/v2/shop`은 Wallet, Avatar, ShopItem 등 미존재 모델 가정. 도메인 추가 시 스키마 → API → 프론트 3단계 필수.

3. **이용권 가드 v2** — A 그룹 9개 페이지(`practice/*`, `worksheet`, `exam-analysis`, OX, homework, test 등)는 `LicenseFeature` 가드 적용 대상. v2 사이드바 미적용 시 권한 없는 메뉴 노출 위험.

4. **View-As 패턴** — `?_as=studentId` 학생 시점 전환. v2 학생 페이지 전수에 `getViewAsUser(params)` 적용. SUPER_ADMIN/같은 테넌트 검증 누락 시 데이터 유출.

5. **MathRenderer/DiagramRenderer 토큰 충돌** — v2 토큰 `--font-display` 적용 시 KaTeX `.katex` 폰트 오버라이드 가능성. globals.css 우선순위 확인.

6. **숙제 questionIds Dual-Write** — v1은 `getHomeworkDayQuestionIds()` 헬퍼로 중간테이블 우선 조회. v2 MOCK 직접 풀이는 회귀 위험.

7. **인쇄 페이지 회귀** — v2 토큰이 글로벌하게 영향. `@media print` 격리 확인.

---

## 부록: 전체 페이지 매핑표 (108 v1)

| # | v1 경로 | v2 매핑 | 분류 | 작업량 |
|---|---------|---------|------|--------|
| 1 | `/` | (라우터) | C | S |
| 2 | `/login` | `/v2/login` | A | M |
| 3 | `/help-public` | — | C | M |
| 4 | `/privacy` | — | C | S |
| 5 | `/terms` | — | C | S |
| 6 | `/updates` | — | C | M |
| 7 | `/dashboard` | `/v2/dashboard` | A | L |
| 8 | `/subjects` | `/v2/curriculum` | A | M |
| 9 | `/concepts/[id]` | `/v2/concept-detail` | A | L |
| 10 | `/profile` | `/v2/profile` | A | M |
| 11 | `/ranking` | `/v2/ranking` | A | M |
| 12 | `/shop` | `/v2/shop` | A | XL |
| 13 | `/quiz-join` | — | B | M |
| 14 | `/quiz/[id]/play` | — | B | M |
| 15 | `/practice/arithmetic` | `/v2/practice` | A | L |
| 16 | `/practice/arithmetic/homework` | — | B | M |
| 17 | `/practice/arithmetic/time-attack` | — | B | M |
| 18 | `/practice/ox` | `/v2/ox-quiz` | A | M |
| 19 | `/practice/ox/homework` | — | B | M |
| 20 | `/practice/question-homework` | `/v2/homework` | A | L |
| 21 | `/practice/revenge` | — | B | M |
| 22 | `/practice/review-test` | — | B | M |
| 23 | `/practice/review-failed` | — | B | M |
| 24 | `/my-tests` | `/v2/exam` | A | L |
| 25 | `/my-tests/[id]/play` | — | C | L |
| 26 | `/my-tests/[id]/result` | `/v2/results` | A | L |
| 27 | `/diagnostics/[id]/result` | — | B | M |
| 28 | `/exam-prep` | — | C | L |
| 29 | `/exam-prep/[enrollmentId]/solve` | — | C | L |
| 30 | `/overview` | `/v2/teacher/dashboard` | A | L |
| 31 | `/overview/v2` | — | D | - |
| 32 | `/students` | `/v2/teacher/students` | A | L |
| 33 | `/students/enroll` | — | C | M |
| 34 | `/students/[id]/wrong-answers` | — | C | L |
| 35 | `/concepts` | `/v2/teacher/concepts` | A | XL |
| 36 | `/questions` | — | C | L |
| 37 | `/questions/arithmetic` | — | C | L |
| 38 | `/questions/generate` | — | C | L |
| 39 | `/questions/ox` | — | C | L |
| 40 | `/questions/pdf-import` | — | C | L |
| 41 | `/homework` | `/v2/teacher/homework` | A | L |
| 42 | `/homework/create` | — | C | L |
| 43 | `/homework/concept-create` | — | C | L |
| 44 | `/homework/question-create` | — | C | L |
| 45 | `/homework/[planId]/grid` | — | C | L |
| 46 | `/homework/[planId]/print` | — | D | - |
| 47 | `/homework/concept/[seq]/grid` | — | C | L |
| 48 | `/homework/question/[seq]/grid` | — | C | L |
| 49 | `/tests` | `/v2/teacher/exam` | A | L |
| 50 | `/tests/create` | — | C | L |
| 51 | `/tests/[id]/results` | — | C | L |
| 52 | `/tests/[id]/print` | — | D | - |
| 53 | `/level-test` | — | C | L |
| 54 | `/level-test/create` | — | C | L |
| 55 | `/level-test/[id]/edit` | — | C | L |
| 56 | `/level-test/[id]/results` | — | C | L |
| 57 | `/level-test/[id]/report` | — | C | L |
| 58 | `/worksheet/create` | `/v2/teacher/worksheet` | A | L |
| 59 | `/quiz` | — | C | L |
| 60 | `/quiz/[id]/host` | — | C | L |
| 61 | `/manual-grading` | — | C | L |
| 62 | `/diagnostics` | — | C | M |
| 63 | `/analytics` | `/v2/teacher/analytics` | A | L |
| 64 | `/reports` | — | C | L |
| 65 | `/exam-analysis` | `/v2/teacher/exam-analysis` | A | XL |
| 66 | `/exam-analysis/[id]/print` | — | D | - |
| 67 | `/exam-analysis/admin` | — | C | L |
| 68 | `/exam-analysis/admin/trends` | — | C | L |
| 69 | `/exam-campaigns` | — | C | L |
| 70 | `/exam-campaigns/[id]/monitor` | — | C | L |
| 71 | `/courses` | — | C | L |
| 72 | `/courses/create` | — | C | M |
| 73 | `/courses/[id]` | — | C | L |
| 74 | `/courses/[id]/progress/[username]` | — | C | L |
| 75 | `/licenses` | — | C | L |
| 76 | `/student-preview` | — | C | M |
| 77 | `/settings` | — | C | M |
| 78 | `/help` | — | C | M |
| 79 | `/support` | — | C | M |
| 80 | `/demo` | — | D | - |
| 81 | `/admin/tenants` | `/v2/admin/tenants` | A | L |
| 82 | `/admin/tenants/[id]` | — | C | L |
| 83 | `/admin/schools` | `/v2/admin/schools` | A | M |
| 84 | `/admin/features` | `/v2/admin/features` | A | M |
| 85 | `/admin/exam-uploads` | `/v2/admin/exam-uploads` | A | L |
| 86 | `/admin/users` | — | C | L |
| 87 | `/admin/classrooms` | — | C | M |
| 88 | `/admin/teachers` | — | C | M |
| 89 | `/admin/extract-queue` | — | C | L |
| 90 | `/admin/ox-statements` | — | C | M |
| 91 | `/admin/sounds` | — | C | S |
| 92 | `/workbooks` | — | D | - |
| 93 | `/workbooks/[id]` | — | D | - |
| 94 | `/workbooks/[id]/print` | — | D | - |
| 95 | `/workbooks/new` | — | D | - |
| 96-107 | `/mockups/*` (12 페이지) | — | D | - |
| 108 | `/dev/gems`, `/(dev)/preview-v2` | — | D | - |

> 인증 신규: `/v2/landing`, `/v2/onboarding` — v1 매핑 없음 (신규 페이지)
