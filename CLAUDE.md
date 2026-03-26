# MathLab — 한국 수학 학습 플랫폼

> **⚠️ 현재 개발 버전입니다. DB의 모든 데이터는 더미 데이터이며, 초기화/삭제가 자유롭습니다.**

## 프로젝트 개요

초등~고등 수학 학원용 학습 관리 플랫폼 (LMS).
학생 개념학습, 빈칸암기(5단계), 연산연습, 시험, 레벨테스트, 실시간 퀴즈, 학습지, PDF 문제 추출, 게이미피케이션을 지원.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5.8 |
| Database | PostgreSQL + Prisma 6 |
| Auth | NextAuth 4 (Credentials, JWT) |
| AI | Google Gemini 2.5 Flash (`@google/genai`), Anthropic Claude (`@anthropic-ai/sdk`) |
| PDF | pdfjs-dist (클라이언트 사이드 PDF 렌더링) |
| Styling | Tailwind CSS v4, Framer Motion |
| Math | KaTeX, MathLive, remark-math, remark-gfm |
| State | Zustand 5 |
| Validation | Zod |
| Testing | Vitest, Playwright |
| Icons | lucide-react |

## 핵심 규칙

### 1. API/DB 존재 여부 반드시 확인 — 모든 데이터는 DB에 저장

**원칙: 프론트엔드에 표시되는 모든 데이터는 반드시 DB를 거쳐야 한다.**
- 하드코딩/로컬 상태만으로 데이터를 관리하지 말 것 → 반드시 API + DB 저장
- 데이터 조회/생성/수정/삭제 모두 API 라우트를 통해 처리
- 프론트엔드에서 `fetch()` 호출 전, 해당 API 엔드포인트가 실제 존재하는지 확인

**새 기능 구현 전 항상 확인할 것:**
- `prisma/schema.prisma`에서 해당 모델/필드가 존재하는지 확인
- `src/app/api/` 에서 필요한 API 라우트가 이미 있는지 확인
- 없으면 먼저 스키마/API를 생성한 후 프론트엔드 구현
- 스키마 변경 후 반드시 `npx prisma generate` 실행
- 새 enum 값 추가 시 Prisma 클라이언트 재생성 필수

**구현 순서 (반드시 이 순서를 따를 것):**
1. Prisma 스키마에 모델/필드 추가 → `npx prisma generate`
2. API 라우트 생성 (CRUD 필요한 만큼)
3. 프론트엔드에서 API 호출하여 UI 구현

**비용 인식 — 작은 기능도 3단계를 거친다:**
- 필드 하나(boolean, string 등) 추가에도 스키마 → generate → API → 프론트 전 과정 필요
- API 라우트가 이미 133개+ → 무분별하게 늘리지 말 것
- 새 필드 추가 전 판단 기준:
  - **정규 필드**: 검색/필터/정렬에 쓰이거나, 여러 곳에서 참조되는 경우
  - **기존 Json 필드 활용**: 한 곳에서만 쓰이는 부가 정보는 `metadata Json?` 등 기존 유연한 필드에 포함 검토
- 위자드/임시 상태는 클라이언트 state로 관리하고, **최종 저장만 DB**로 보내는 것이 적절

### 2. 탭/페이지 간 유기적 연동

**모든 페이지는 독립적이 아니라 하나의 플로우로 연결되어야 함:**
- **학생 관리** → 학생 클릭 → 해당 학생의 학습현황/오답/진도 조회 가능
- **개념 관리** → 개념 생성 → 빈칸 자동생성 → 학생이 4단계 학습
- **문제 은행** → 시험 출제 → 학생 응시 → 결과 분석 → 학습 분석에 반영
- **연산 생성기** → 연산 숙제 → 학생 연습 → 대시보드에 성과 표시
- **레벨테스트** → 진단 결과 → 취약영역 파악 → 맞춤 학습 추천
- **PDF 문제 추출** → 문제은행에 일괄 저장 → 시험/숙제에 활용
- **학습지** → 3단계 위자드로 교육과정 기반 문제지 생성
- 새 기능 추가 시 관련 탭에서의 접근 경로도 함께 구현할 것
- 데이터 생성/수정 시 관련 페이지의 캐시/목록도 갱신되는지 확인

### 3. 뷰 일관성 — 같은 항목은 어디서나 같은 뷰

**원칙: 동일한 데이터는 어떤 페이지에서든 동일한 형태로 렌더링해야 한다.**
- 문제 내용, 객관식 보기, 블록인용(보기 박스), 정답/풀이 등 같은 항목은 모든 곳에서 동일 뷰
- 폭, 간격, 스타일이 페이지마다 달라지면 안 됨 → 편집/수정 시 이질감 발생
- 공통 렌더링 컴포넌트(`MathRenderer`, `EditableMathRenderer`) 사용을 통일
- 객관식 보기: 항상 `grid-cols-2` + 테두리 박스 스타일 (`px-3 py-2 bg-slate-50 rounded-sm border`)
- 새 뷰/페이지 추가 시 기존 렌더링 패턴을 반드시 확인 후 동일하게 적용

### 4. API 응답 형식 (일관성 유지)

```typescript
// 성공
{ data: T }
{ data: T, meta: { page, limit, total } }  // 페이지네이션

// 에러
{ error: { code: string, message: string } }
```

### 5. 인증/인가 패턴

**역할 계층 (5단계):** `STUDENT (0) < TEACHER (1) < MANAGER (2) < OWNER (3) < SUPER_ADMIN (4)`

```typescript
// 권한 확인 함수 (src/lib/api/auth.ts)
const user = await requireAuth();         // 로그인 필수 (401)
const user = await requireTeacher();      // TEACHER 이상 (403)
const user = await requireManager();      // MANAGER 이상 (403)
const user = await requireOwner();        // OWNER 이상 (403)
const user = await requireSuperAdmin();   // SUPER_ADMIN 전용 (403)
const user = await requireAuthViewAs();   // 로그인 + ?_as=studentId View-As 지원
if (isResponse(user)) return user;        // 에러 응답이면 즉시 반환

// 역할 비교
hasRole(user, 'TEACHER');  // ROLE_LEVEL[user.role] >= ROLE_LEVEL['TEACHER']
```

**역할별 권한:**
- **STUDENT**: 자기 학습 데이터만 조회/수정
- **TEACHER**: 자기 반(Classroom) 학생 관리, 컨텐츠 CRUD
- **MANAGER**: 테넌트 내 전체 교사/학생 관리, 진단결과 조회 (팀장)
- **OWNER**: 지점(Tenant) 전체 관리, 이용권 배정, 리포트
- **SUPER_ADMIN**: 플랫폼 전체 (모든 테넌트, 사용자, 지점 관리)

### 6. AI 사용 규칙

**Gemini (문제 생성, PDF 추출, 빈칸 생성):**
- 호출 전 **내용 사전 검증**: 최소 20자, 한글 5자 이상, 의미 있는 단어 3개 이상
- 모델: `gemini-2.5-flash` (이미지/도형 분석 및 성능에 최적)
- 구조화 출력: `responseMimeType: 'application/json'` + `responseSchema`
- 환경변수: `GEMINI_API_KEY`

**Claude (레벨테스트 보고서 생성):**
- 모델: Claude Sonnet 4.6 (`@anthropic-ai/sdk`)
- 레벨테스트 결과 → 학습 보고서 AI 생성
- 환경변수: `ANTHROPIC_API_KEY`

**3D 업적 뱃지 디자인 생성 (이미지 AI 공통 규칙):**
- **마스터 프롬프트**: `A high quality 3D mobile game achievement badge icon representing [주제]. Exclude all English letters. The icon must feature the bold Korean text '[한글 업적명]' built into the 3D design beautifully. Vibrant colors, premium, glossy, isolated on simple background, cartoonish, high quality render.`
- **필수 지침**: 영문 텍스트 오염을 막기 위해 `Exclude all English letters.` 옵션을 무조건 포함해야 함.
- **UI 연동 지침**: 하얗게 빛이 날아가는 것을 방지하기 위해 CSS `mix-blend` 모드를 절대 사용하지 말 것! 대신 부모 레이어에서 `overflow-hidden` 및 `rounded-full`(또는 `rounded-2xl`)로 감싸 물리적으로 둥글게 원형 크롭(Crop)하여 렌더링할 것 (`object-cover` + `scale-[1.15]` 활용).

### 7. 토스트 알림 — alert() 사용 금지

**모든 사용자 알림은 글로벌 토스트 시스템을 사용:**
```typescript
import { toast } from '@/components/ui/Toast';

toast.success('저장되었습니다');
toast.error('저장에 실패했습니다');
toast.warning('제목을 입력하세요');
toast.info('AI가 분석 중입니다');
```
- `alert()`, `window.alert()` 사용 금지 — 모든 곳에서 `toast.*()` 사용
- Zustand 기반 글로벌 상태, ToastContainer가 양쪽 레이아웃에 포함됨

### 8. 인쇄(Print) — A4 미리보기와 실제 인쇄 완전 일치

**원칙: 화면의 인쇄 미리보기(Print Preview)와 실제 A4 인쇄 결과가 정확히 일치해야 한다.**
- 인쇄 관련 컴포넌트는 반드시 A4 비율(210mm × 297mm) 기준으로 레이아웃 설계
- 화면 미리보기에서 보이는 페이지 나눔, 여백, 폰트 크기, 요소 배치가 실제 `@media print` 출력과 동일해야 함
- `@media print` CSS와 미리보기 CSS를 별도로 관리하지 말 것 → 공통 스타일을 공유하여 불일치 방지
- 미리보기에서 A4 크기를 `px` 단위로 시뮬레이션할 때는 고정 비율(예: `794px × 1123px` @96dpi) 사용
- 페이지 넘김(`page-break-before`, `break-before` 등)이 미리보기와 인쇄에서 동일하게 동작하는지 확인
- 새 인쇄 기능 구현 시 반드시 브라우저 인쇄 미리보기(`Ctrl+P`)로 검증 후 커밋

### 9. 페이지 레이아웃 — 3가지 패턴 + 래퍼 규칙

**모든 페이지는 3가지 레이아웃 패턴 중 하나를 따라야 한다:**

| 패턴 | 용도 | 래퍼 | 예시 |
|------|------|------|------|
| **패널형** | 목록+상세 관리 | `flex-1 flex min-h-0` + 좌측 `w-72` 사이드바 | 학생, 개념, 문제, 시험, 숙제, 설정 |
| **중앙정렬형** | 대시보드, 단순 목록, 양식 | `<PageContainer maxWidth="xl">` | 과정, 진단, 이용권, 퀴즈, 프로필 |
| **대시보드형** | 메인 대시보드 | `max-w-[1400px] mx-auto px-4 sm:px-6 py-6 md:py-8` | overview, OwnerDashboard, SuperAdmin |

**중앙정렬형 페이지 래퍼 규칙:**
- 반드시 `<PageContainer>` 컴포넌트 사용 — 직접 `px-6 py-8 max-w-[1200px] mx-auto` 등 작성 금지
- `maxWidth` 옵션: `sm`(640), `md`(800), `lg`(1024, 기본), `xl`(1200), `full`
- 제목은 `<PageHeader>` 컴포넌트 사용 (패널형은 좌측 사이드바 헤더)

**UI 표준:**
- 모서리 둥글기: `rounded-sm` 표준 — `rounded-lg` 사용 금지 (Card, Badge 등 컴포넌트 내부 제외)
- 버튼: 반드시 `<Button>` 컴포넌트 사용 — 커스텀 button 스타일 직접 작성 금지
- 빈 상태: `<LoadingEmptyState>` 컴포넌트 사용 권장
- 로딩: `<Skeleton>` 컴포넌트 사용 — `animate-pulse` 직접 사용 지양
- 스크롤바: 글로벌 thin 스크롤바 적용 (5px, 반투명) — 숨기려면 `.no-scrollbar` 클래스 사용
- 페이지네이션: `<Pagination>` 컴포넌트 사용, 사이드바 등 좁은 영역은 `compact` prop 사용

### 10. 공유 유틸 — 중복 코드 방지

**학습 활동 관련 공통 함수 (`@/lib/utils/activity`):**
```typescript
import { WEEKDAYS, ACTIVITY_COLORS, activityLevel } from '@/lib/utils/activity';
import { accuracyTextColor, accuracyBadgeColor, accuracyBarColor } from '@/lib/utils/activity';
import { formatGrade, formatGradeShort, getInitial } from '@/lib/utils/activity';
```
- 새 페이지에서 요일, 활동레벨, 정답률 색상, 학년 포맷 등이 필요할 때 이 유틸을 사용할 것
- 페이지 로컬에 동일 로직을 별도 정의하지 말 것

## 프로젝트 구조

```
src/
├── app/
│   ├── (student)/     # 학생 페이지 (dashboard, subjects, concepts, practice, my-tests, ranking, quiz, quiz-join, profile, diagnostics, solve, help-public, updates)
│   ├── (teacher)/     # 선생님 페이지 (overview, students, concepts, questions, tests, homework, analytics, quiz, worksheet, manual-grading, reports, level-test, courses, licenses, settings, updates, help, support, student-preview, admin)
│   ├── api/           # API 라우트 (133+ endpoints)
│   └── globals.css    # Tailwind 테마 + 디자인 토큰
├── components/
│   ├── layout/        # Sidebar, DashboardShell, CommandPalette
│   ├── ui/            # Button, Pagination, Toast, Skeleton, MotionStagger, XpToast, PageContainer, Tabs, MathSpinner 등 공통 UI
│   ├── providers/     # SessionProvider, TenantProvider (NextAuth + 멀티테넌트)
│   ├── math/          # MathRenderer, EditableMathRenderer, DiagramRenderer, DiagramEditorPopup, ProblemDisplay
│   ├── learning/      # 개념학습, 빈칸연습
│   ├── test/          # 시험 응시, 제출, AssignPanel
│   ├── homework/      # 숙제 계획, 응시 (ConceptHomeworkTab, QuestionHomeworkTab)
│   ├── teacher/       # 선생님 전용 (학생관리, 개념관리, 시험관리)
│   ├── bulk-import/   # 일괄 가져오기
│   ├── curriculum/    # 교육과정 트리
│   ├── gamification/  # 랭킹, XP 표시
│   ├── ranking/       # 랭킹 UI 컴포넌트 (TopThreePodium, RankingList, RankingInsights, RankChangeIndicator)
│   ├── student/       # 학생 전용 (DailyMissionCard, DailyQuestionCard, DashboardGamification, RevengeBanner)
│   ├── report/        # 레벨테스트 보고서 렌더링
│   ├── worksheet-wizard/  # 학습지 3단계 위자드 (Step1~3)
│   ├── level-test-editor/ # 레벨테스트 편집기
│   ├── level-test/    # 레벨테스트 결과 표시 (ChapterMasteryGrid, DifficultyBreakdown 등)
│   ├── manual-grading/    # 수기 채점 인터페이스
│   ├── charts/        # 학습분석 차트
│   ├── updates/       # 업데이트 공지
│   └── print-preview/ # 인쇄 모드
├── lib/
│   ├── auth.ts        # NextAuth 설정
│   ├── db.ts          # Prisma 싱글톤 클라이언트
│   ├── tenant.ts      # 멀티테넌트 유틸
│   ├── view-as.ts     # 선생님→학생 뷰 전환
│   ├── api/           # API 헬퍼 레이어 (auth, errors, helpers, tenant-scope, license-guard, validation, homework-grid)
│   ├── schemas/       # Zod 검증 스키마 (auth, concept, gamification, learning, question)
│   ├── services/      # 핵심 비즈니스 로직 (21개 서비스)
│   ├── utils/         # 유틸 (blank-generator, pdf-processor, features, curriculumMapping, xp, format, question-order, diagram-resolver, answer-status, date-engine, level-test-feedback, activity)
│   │   └── svg-diagrams/  # SVG 다이어그램 렌더링 시스템 (26개 타입)
│   ├── pdf-extract-engine/  # PDF 추출 엔진 (core, ai, hooks, presets — 14파일)
│   ├── diagram/       # 프리셋 기반 구조화 다이어그램 시스템 (DiagramSpec)
│   ├── constants/     # 교육과정 데이터, 연산 카테고리, 라벨, 시험전략, 학교, 교재
│   └── data/          # 정적 데이터 (업데이트 로그, 도움말)
├── hooks/             # useAuth, useLearning, useGamification, useFeatureFlags, useBadgeCheck, useSpeed, useFetch, useTests, usePreviewScale, useLicenses, useQuestions 등
├── stores/            # Zustand 글로벌 스토어 (gamification, wizard, manualGrading, xpNotification, updateNotification, license, conceptEditor)
├── types/             # 공통 타입 정의 (diagram.ts, mathgen.ts, pdf-extract.ts, report.ts 등)
└── scripts/           # DB 초기화, 시드 스크립트 (43+ 파일: TS/JS/Python)
```

## 주요 도메인

### 5단계 빈칸 학습

| 단계 | Stage Enum | 설명 | XP |
|------|------------|------|----|
| 개념학습 | `READING` | 내용 읽기 + 메모 | 5 |
| 빈칸 1단계 | `BLANK_EASY` | 핵심 용어 (easy) | 10 |
| 빈칸 2단계 | `BLANK_HARD` | easy + hard | 15 |
| 통문장 암기 | `BLANK_FULL` | 전체 빈칸 (full) | 20 |
| 백지 복원 | `BLANK_PAGE` | 전체 내용 백지에서 복원 | 30 |

- 빈칸 난이도: `BlankDifficulty = 'easy' | 'hard' | 'full'`
- 단일 exercise에 per-blank difficulty 태깅
- 학생 API level 파라미터: 1=easy만, 2=easy+hard, 3=전부

### 교육과정 체계

```
학교급: elementary(초3-6) | middle(중1-3) | high(공통수학1,2/대수/미적분/확통/기하)
학기: 1 | 2 (고등은 0)
영역(part): calc | algebra | func | geo | data
대단원(chapter) → 중단원(section) → 소단원(sectionSub)
```

Grade 코드: `elementary_3`, `middle_1`, `high_algebra` 등

**교육과정 계층 구조 (curriculum.ts 기준):**
- **초등**: 2단계 — chapter = 단원명 (예: "덧셈과 뺄셈"), section = 세부 주제, sectionSub = NULL
- **중등**: 3단계 — chapter = 영역명 (예: "수와 연산", "기하"), section = 중단원 (예: "소인수분해"), sectionSub = 소단원
- **고등**: 3단계 — chapter = 대단원 (예: "다항식", "방정식과 부등식"), section/sectionSub = 중/소단원
- 고등 grade 매핑: `high_1`→공통수학1, `high_2`→공통수학2, `high_algebra`→대수, `high_calculus1`→미적분I, `high_prob`→확률과 통계, `high_calculus2`→미적분II, `high_geo`→기하
- 개념 편집기 드롭다운은 `curriculum.ts`의 **정확한 문자열**과 매칭 → DB chapter/section 값은 반드시 curriculum.ts와 일치해야 함

### 연산 생성기

79개 카테고리, 무한 문제 생성. `src/lib/services/arithmetic-generator/`
카테고리 예: `add_1digit`, `mul_2x1digit`, `frac_add_same`, `dec_div` 등

### 사이드바 네비게이션

역할 기반 필터링으로 구성 (`src/lib/constants/navigation.ts` → `Sidebar.tsx` / `CommandPalette.tsx` 공유):

**공통 (TEACHER+):**
- **홈** (1개): 대시보드
- **수업** (4개): 학생관리, 개념 조회/관리*, 문제 조회/관리*, 학습 과정
- **출제·평가** (6개): 연산생성기, 학습지, 숙제관리, 시험관리, 수기채점, PDF 추출
- **분석**: 학습분석 (TEACHER+), 진단결과 (MANAGER+), 리포트 (OWNER+)
- **시스템** (4개): 업데이트 내역, 도움말, 설정, 고객지원

**관리자 전용 (보라색 구분선):**
- **팀 관리** (MANAGER+): 선생님 관리
- **지점 운영** (OWNER+): 이용권 관리, 반 관리, 사용자 관리
- **플랫폼** (SUPER_ADMIN): 지점 관리, 기능 관리

*MANAGER+ 는 "관리", TEACHER는 "조회" 라벨 표시

**커맨드 팔레트**: `Ctrl+K`로 전체 메뉴 빠른 검색/이동 (`CommandPalette.tsx`, 네비와 동일 데이터 사용)

### PDF 문제 추출 시스템

수학 문제집 PDF → Gemini Vision으로 구조화 추출 → 문제은행 일괄 저장.
- 클라이언트 사이드 PDF 처리 (`pdfjs-dist`)
- 4단계 위자드: 업로드 → 페이지 선택 → AI 추출 미리보기 → 저장
- 해설 PDF 별도 업로드로 정답/풀이 매칭 지원
- 관련 파일: `src/types/pdf-extract.ts`, `src/lib/utils/pdf-processor.ts`, `src/app/api/questions/pdf-extract/`

### 학습지 위자드

3단계 위자드로 교육과정 기반 문제지 생성 (`src/components/worksheet-wizard/`):
1. **교육과정 선택**: 학년/학기/단원 체크트리 + 문제 설정 (유형/난이도/수량)
2. **문제 편집**: AI 생성 문제 검토/수정/삭제/추가
3. **최종 설정**: 제목, 시간, 배점 설정 후 저장

### SVG 다이어그램 시스템

두 가지 병렬 시스템이 존재:

**1. SVG-Diagrams (26개 타입)** — `src/lib/utils/svg-diagrams/`
- 진입점: `renderDiagram(data)` in `index.ts`
- 공유 유틸: `svg-utils.ts` (svgWrap, line, text, katexLabel, circle, rect, arrowHead, COLORS)
- 각 타입별 normalize 함수가 Gemini의 불규칙한 파라미터명 처리
- **초등 (13):** number_line, fraction_circle, fraction_rect, place_value, dot_array, flow_chart, bar_chart, line_graph, picture_graph, pie_chart, band_chart, angle_figure, clock_face
- **중등 (13):** coordinate_plane, circle, triangle, quadrilateral, function_graph, venn_diagram, regular_polygon, histogram, stem_leaf, solid_figure, net_diagram, tree_diagram, scatter_plot

**2. DiagramSpec (프리셋 기반)** — `src/lib/diagram/`
- 프리셋 기반 좌표 계산 (`preset: 'right' | 'equilateral' | 'isosceles'` 등)
- AI가 좌표 대신 프리셋을 선택 → 정확한 도형 생성
- 타입: triangle, circle, quadrilateral, coordinatePlane, solid, composite

**통합 렌더러:** `DiagramRenderer.tsx` — `resolveDiagramSpec()` (`src/lib/utils/diagram-resolver.ts`)로 런타임 판별 후 적절한 렌더러 호출
- `DiagramSpec` (단일 객체, AI 생성) → `renderDiagram` from `@/lib/diagram/renderer`
- `DiagramParam[]` (배열, PDF 추출) → `renderDiagram` from `@/lib/utils/svg-diagrams`
- DB `diagramSpec Json?` 필드에 두 포맷이 혼재 → 런타임 다형성으로 처리

**편집기:** `DiagramEditorPopup.tsx` — 26개 타입 모두 GUI 편집 가능

### 수학 렌더링 컴포넌트 (`src/components/math/`)

| 컴포넌트 | 용도 |
|----------|------|
| `MathRenderer` | 읽기전용 마크다운+LaTeX+SVG+GFM 테이블 렌더링 (remark-gfm + remark-math + rehype-katex) |
| `EditableMathRenderer` | 수식 클릭 편집 모드 (onMathClick 콜백) |
| `DiagramRenderer` | DiagramSpec / DiagramParam[] 통합 → SVG 렌더링 (런타임 판별) |
| `DiagramEditorPopup` | 26개 다이어그램 타입 GUI 편집기 |
| `ProblemDisplay` | 문제 전체 표시 (보기, 풀이, 인쇄) |
| `MathLivePopup` | MathLive 수식 입력 팝업 |
| `InlineMathText` | 인라인 수학 표시 |

### 문제(Question) 시스템

**DB 모델:** Question — content(마크다운), choices(JSON), answer, explanation, diagramSpec(구조화 JSON), diagramSVG(레거시)

**AI 생성 흐름:**
1. 선생님이 학교급/단원/난이도 선택 → `POST /api/mathgen/generate`
2. Gemini 2.5 Flash가 구조화 출력 (responseMimeType: 'application/json')
3. 문제/보기/정답/풀이/다이어그램 JSON 반환
4. 선생님이 검토/수정 후 DB 저장

**PDF 추출 흐름:**
1. 선생님이 PDF 업로드 → 페이지 선택
2. 선택 페이지를 canvas → PNG base64 → `POST /api/questions/pdf-extract`
3. Gemini Vision이 문제 구조화 추출
4. 미리보기/편집 후 `/api/questions/bulk`로 일괄 저장

**문제 난이도:** BASIC | MEDIUM | HIGH | HIGHEST
**문제 유형:** MULTIPLE_CHOICE | SHORT_ANSWER | ESSAY
**영역 분류:** CALCULATION | UNDERSTANDING | PROBLEM_SOLVING | REASONING

**문제-시험 관계 (중간테이블):**
- `TestQuestion` — Test ↔ Question (sortOrder로 순서 유지)
- `QuizSessionQuestion` — QuizSession ↔ Question
- `HomeworkQuestion` — QuestionHomeworkPlan ↔ Question (dayIndex + sortOrder)
- 기존 `questionIds Json` 필드와 Dual-Write 상태 (전환기)
- 읽기: `src/lib/utils/question-order.ts` 헬퍼 사용 (중간테이블 우선, Json 폴백)
- 마이그레이션: `npx tsx scripts/migrate-question-relations.ts`

**autoTag 시스템:** `src/lib/services/question-tagger.ts`
- bookCode 접두사로 학교급 판별: `E*`=초등, `H*`=고등, 그 외=중등
- 초등 60+ / 중등 46 / 고등 23개 단원→영역 매핑
- 자동 분류 대상: difficulty, domain, grade, tags

### 빈칸 생성 시스템 (`src/lib/utils/blank-generator.ts`)

- `fullContent` (마크다운) + 정답 목록 → `MergedBlankExercise` 생성
- 난이도별 태깅: `easy` (핵심 용어), `hard` (확장), `full` (통문장)
- LaTeX 범위 보호, 불용어 스킵, 한글 조사 보존
- 초성 힌트: `getInitials()` → ㅎㄱ, ㅅㅊ 등

### 서비스 레이어 (`src/lib/services/`)

| 서비스 | 용도 |
|--------|------|
| `arithmetic-generator/` | 79개 카테고리 연산 문제 생성 (초등/중등/고등 분리) |
| `mathgen.ts` | Gemini AI 문제 생성 |
| `gemini.ts` | Gemini API 통합 유틸 (싱글톤 클라이언트, 코드펜스 제거, JSON 파싱) |
| `grading.ts` | 자동 채점, XP 계산, 1차 오답 저장 (2단계 흐름: create→update) |
| `diagnostic.ts` | 레벨테스트 결과 분석 |
| `assignment.ts` | 시험 배정/마감 관리 |
| `homework.ts` | 숙제 계획 로직 (strategies 패턴) |
| `concept-homework.ts` | 개념 기반 숙제 |
| `question-homework.ts` | 문제 기반 숙제 |
| `cheat-detection.ts` | 부정행위 탐지 |
| `badge-checker.ts` | 뱃지 조건 확인 및 자동 수여 (DB 동적 관리) |
| `daily-mission.ts` | 일일 미션 생성 및 진행 추적 |
| `report-ai.ts` | Claude Sonnet 4.6 레벨테스트 보고서 생성 |
| `variant-generator.ts` | 시험 변형 문제 생성 |
| `manual-grading.ts` | 수기 채점 로직 |
| `question-tagger.ts` | 문제 자동 분류/태깅 |
| `hint-generator.ts` | 문제 힌트 생성 |
| `level-test.ts` | 레벨테스트 관리 |
| `license.ts` | 이용권/라이선스 관리 |
| `course-advance.ts` | 학습 과정 진도 관리 |

### 멀티테넌트 스코핑 (`src/lib/api/tenant-scope.ts`)

학원 지점(Tenant)별 데이터 격리 패턴:

| 함수 | 역할 |
|------|------|
| `getTenantFilter(user)` | SUPER_ADMIN: `{}` (제한 없음), 나머지: `{ tenantId: user.tenantId }` |
| `getTenantStudentScope(user)` | OWNER: 테넌트 전체 학생, TEACHER: 자기 반 학생만, SUPER_ADMIN: 전체 |
| `canAccessStudent(user, studentId)` | 특정 학생 접근 권한 검증 |
| `getStudentScope(user)` | Prisma where 조건 생성 (학생 목록 조회용) |

**View-As 패턴** (`requireAuthViewAs`):
- 선생님이 `?_as=studentId`로 학생 시점 조회 가능
- 같은 테넌트 학생만 허용, SUPER_ADMIN은 모든 학생 가능

### 이용권(라이선스) 시스템

**2계층 구조:**
- `TenantLicense`: 지점당 기능별 좌석 풀 (maxSeats, usedSeats, expiresAt, isActive)
- `StudentLicense`: 학생 개별 배정 (revokedAt=null이면 활성)
- 만료일: 학생/지점 이용권 중 빠른 것 적용

**7개 기능 (LicenseFeature enum):** CONCEPT, ARITHMETIC, TIME_ATTACK, TEST, REVENGE, DIAGNOSTIC, QUIZ

**API 가드 패턴:**
```typescript
const licenseCheck = await requireLicense(user, 'arithmetic');
if (licenseCheck) return licenseCheck;  // 이용권 없으면 403
```

**관리:** OWNER → `/licenses` (학생 배정), SUPER_ADMIN → `/admin/tenants/[id]` (지점 좌석 관리)
**클라이언트:** `useLicenseStore` (Zustand, Fail-Open — 네트워크 실패 시 허용, 서버 가드가 최종 차단)

### 학습 과정 시스템

**모델:** `LearningCourse` → `LearningCourseConcept` (sortOrder) → `LearningCourseEnrollment` (LOCKED|ACTIVE|COMPLETED)

**자동 진급 플로우** (`course-advance.ts`):
1. 학생이 개념의 BLANK_FULL 완료
2. `checkAndAdvanceCourse()` 호출 → ACTIVE 과정의 모든 개념 완료 확인
3. 과정 COMPLETED 처리 → 다음 LOCKED 과정 자동 ACTIVE 전환

**선생님 관리:** `/courses` (과정 생성, 개념 추가, 학생 배정)

### 수기채점 시스템

**프로세스 (`src/lib/services/manual-grading.ts`):**
1. `createManualAttempt()` — TestAttempt 생성 (entryMethod='manual')
2. `submitManualAnswer()` — 단건 답안 입력 (자동채점 또는 isCorrectOverride로 선생님 판정)
3. `completeManualAttempt()` — 시간 균등 분배 → 점수집계 → XP 지급

**시간 처리:** 선생님이 총 소요시간 입력 → `perQuestionSeconds = totalTimeMinutes * 60 / questionCount`
**레벨테스트 연동:** 완료 시 레벨테스트면 `analyzeLevelTest()` 자동 호출
**상태 관리:** `manualGradingStore` (Zustand — 선택된 시험/학생, 진행 중 답안, 완료 결과)

### 복수전 시스템

**오답 분석 → 재도전:**
- `GET /api/learning/revenge-suggestions` — 오답 3회 이상 유형별 복수전 추천
- `POST /api/learning/revenge-complete` — 정답 1개당 3XP, 60% 이상 정답 시 승리

### 고객 지원 시스템

- `GET /api/help` — 역할별(학생/선생님/관리자) 도움말·FAQ 필터링
- `POST /api/inquiries` — 문의 등록, 관리자 회신
- 페이지: `/help` (도움말), `/support` (문의 등록/조회)

### 게이미피케이션

**XP 보상:**
- 개념학습(READING): 5 XP, 빈칸 쉬움(BLANK_EASY): 10 XP
- 빈칸 어려움(BLANK_HARD): 15 XP, 통문장(BLANK_FULL): 20 XP
- 백지 복원(BLANK_PAGE): 30 XP, 보너스(BONUS): 5 XP

**레벨 임계값:** Lv1=0, Lv2=100, Lv3=250, Lv4=500, Lv5=800, Lv6+=이전+400

**8개 기능 토글** (Admin Feature Flag 시스템):
| 기능 | 설명 |
|------|------|
| `time_attack` | 연산 속도 챌린지 |
| `daily_mission` | 일일 미션 시스템 |
| `badge_system` | 뱃지 시스템 (10종) |
| `quiz_speed_scoring` | 퀴즈 속도 점수 |
| `revenge_challenge` | 복수전 챌린지 |
| `class_competition` | 반 대항전 |
| `daily_question` | 오늘의 문제 |
| `enhanced_levelup` | 강화된 레벨업 애니메이션 |

**뱃지**: DB 기반 동적 관리. 조건 타입: streak, arithmetic, blank, blank_perfect, timeattack, quiz_participate, xp_total, test_perfect, revenge, level, recovery, earlybird, weekend, hidden_* 등

### DB 모델 요약

**핵심:** User(STUDENT|TEACHER|OWNER|SUPER_ADMIN), Subject, Concept, BlankExercise, Question
**시험:** Test, TestAttempt, TestAssignment, AnswerLog(firstSelectedAnswer 포함), LevelTestConfig
**중간테이블:** TestQuestion, QuizSessionQuestion, HomeworkQuestion (문제 순서/FK 관리)
**숙제:** ArithmeticHomeworkPlan, ConceptHomeworkPlan, QuestionHomeworkPlan (각각 Enrollment/Attempt)
**퀴즈:** QuizSession, QuizParticipant, QuizAnswerLog
**게이미피케이션:** Badge, UserBadge, DailyMission, DailyQuestion, DailyQuestionAttempt, TimeAttackRecord
**보고서:** ReportHistory, TeacherComment
**관리:** FeatureFlag, Classroom, Tenant
**이용권:** TenantLicense, StudentLicense, LicenseUsageLog
**학습과정:** LearningCourse, LearningCourseConcept, LearningCourseEnrollment
**지원:** Inquiry (문의/회신)
**기타:** StudentProfile(XP/레벨), PointTransaction, DiagnosticResult, ConceptMemo

## 디자인 토큰

### 글씨체 (Font)

| 용도 | 폰트 | 로드 방식 | CSS 변수 |
|------|------|----------|----------|
| **전체 UI** | Pretendard | CDN (`jsdelivr`) | `--font-display` |
| **개념 본문** | Noto Serif KR | `next/font/google` | `--font-serif-kr` |
| **수식** | KaTeX 기본 폰트 | CDN | — |
| **SVG 다이어그램** | Pretendard | CSS 상속 | — |

- Pretendard: 한글+영문 통합 산세리프. 모든 UI 텍스트에 사용
- Noto Serif KR: 개념 학습 콘텐츠 전용 명조체 (`.font-serif-kr` 클래스)
- 새 페이지/컴포넌트 추가 시 별도 폰트를 도입하지 말 것 → Pretendard 통일
- `font-family` 직접 지정 금지 → `var(--font-display)` 또는 `.font-serif-kr` 사용

### KaTeX 수식 크기

| 대상 | CSS 선택자 | 크기 | 비고 |
|------|-----------|------|------|
| **수식 전체** | `.katex` | `1.15em` | 본문 대비 약간 크게 |
| **분수만** | `.katex .mfrac` | `1.4em` | 분자/분모 가독성 확보 |

- `\dfrac` 사용 금지 → 반드시 `\frac` 사용 (인라인 수식에서 거대 분수 방지)
- MathRenderer에서 `\dfrac` → `\frac` 자동 변환 (방어)
- PDF 추출 후처리(`fixLatexEscaping`)에서도 `\dfrac` → `\frac` 자동 치환

### 색상

```css
--color-primary: #135bec        /* 메인 파란색 */
--color-primary-hover: #0e4bcc
--color-secondary: #F97316      /* 주황 */
--color-stage-reading: #3B82F6  /* 개념학습 */
--color-stage-blank-easy: #10B981  /* 빈칸 쉬움 */
--color-stage-blank-hard: #F97316  /* 빈칸 어려움 */
--color-stage-blank-page: #7C3AED  /* 백지 복원 */
```

## 환경변수

```
DATABASE_URL=postgresql://user:password@localhost:5432/mathlab
DIRECT_URL=postgresql://user:password@localhost:5432/mathlab
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## 스크립트

```bash
npm run dev              # 개발 서버 (Turbopack, 자동 포트 탐색)
npm run build            # npx prisma generate && next build
npx prisma generate      # Prisma 클라이언트 재생성
npx prisma studio        # DB 브라우저
npx prisma migrate dev   # DB 마이그레이션
npm run db:seed          # 시드 데이터
npx tsx scripts/reset-questions.ts  # 문제은행 + 관련 데이터 전체 초기화
npx tsx scripts/migrate-question-relations.ts  # questionIds Json → 중간테이블 마이그레이션
```

## 코딩 컨벤션

- 한국어 UI 텍스트, 한국어 주석 권장
- API 에러 메시지: 한국어
- 파일명: kebab-case, 컴포넌트: PascalCase
- 경로 alias: `@/` = `src/`
- 수학 수식: `$...$` (인라인), `$$...$$` (블록)
- **수학 문제/개념의 모든 숫자와 영문 변수는 반드시 KaTeX로 감싸기**: `$25$`, `$a$`, `$a+b$` 등. 보기 번호(①②③④⑤)와 ㄱㄴㄷ은 제외
- **`\dfrac` 사용 금지** → 반드시 `\frac` 사용. `\dfrac`은 인라인 수식에서 거대 분수를 만듦
- **alert() 사용 금지** → `toast.*()` 사용 (위 7번 규칙 참고)
- 빌드 확인: 기능 구현 후 `npm run build`로 타입 에러 없는지 확인
- **문제 순서 조회 시 반드시 헬퍼 함수 사용**: `getTestQuestionIds()`, `getQuizQuestionIds()`, `getHomeworkDayQuestionIds()` (`@/lib/utils/question-order`)
  - `test.questionIds as string[]` 직접 캐스팅 금지 → 중간테이블 우선 조회 헬퍼 사용
  - 새 시험/퀴즈/숙제 생성 시 Json + 중간테이블 Dual-Write 유지

## Skills & Agents

### Skills (검증용, `.claude/skills/`)

| Skill | Purpose |
|-------|---------|
| `verify-implementation` | 모든 verify 스킬을 순차 실행하여 통합 검증 |
| `manage-skills` | 세션 변경사항 분석 및 CLAUDE.md 관리 |
| `verify-api-auth` | API 라우트 인증/인가 패턴 검증 |
| `verify-schema-sync` | Prisma 스키마와 코드 간 동기화 검증 |
| `verify-page-patterns` | Teacher/Student 페이지 UI 패턴 일관성 검증 |
| `verify-nav-sync` | 네비게이션 설정과 실제 페이지/사이드바 간 동기화 검증 |

### Agents (개발 보조, `.claude/agents/`)

| Agent | Model | Purpose |
|-------|-------|---------|
| `code-reviewer` | Sonnet | git diff 기반 코드 리뷰 (인증, 응답 형식, toast, KaTeX 규칙 검증) |
| `build-checker` | Haiku | Prisma generate + Next.js 빌드 검증/에러 수정 |
| `test-writer` | Sonnet | Vitest 단위 테스트 생성 (서비스, API, 유틸) |
| `refactor-advisor` | Haiku | 대형 파일 탐지, 중복 코드 분석, 분리 전략 제안 (읽기 전용) |
| `schema-generator` | Sonnet | Prisma 모델 → API 라우트 + Zod 스키마 + 타입 자동 생성 |
| `api-documenter` | Haiku | 133+ API 라우트 스캔 → 구조화된 API 문서 생성 |

## 프로젝트 규모

| 항목 | 수치 |
|------|------|
| 소스 파일 | 526개 (TS/TSX) |
| 총 코드량 | ~95,000 LoC |
| 학생 페이지 | 12개 |
| 선생님 페이지 | 20개 |
| API 라우트 | 133개 |
| 컴포넌트 | 143개 |
| 서비스 모듈 | 21개 |
| DB 모델 | 57개, Enum 10개 |
| SVG 다이어그램 | 26개 타입 (2개 시스템, 통합 렌더러) |
| 커스텀 훅 | 12개 |
| Zustand 스토어 | 7개 |
| Zod 스키마 | 5개 |
| E2E 테스트 | 3개 (Playwright) |
