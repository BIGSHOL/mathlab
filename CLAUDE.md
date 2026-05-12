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
| Storage | Supabase Storage (시험지 PDF 업로드) |
| Editor | TipTap (기출 분석 블로그 글 리치 에디터) |
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
- API 라우트가 이미 162개+ → 무분별하게 늘리지 말 것
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

**`<보기>` 블록 그리드 — 인라인 마커 방식:**
- blockquote(`>`) 안에 `<보기>` 또는 `<보기:cols=N>` 마커 작성 (N = 1|2|3|auto)
- 마커 없으면 기본 2열, `cols=auto`는 항목 개수 기반 자동(≥6 → 3열, ≥3 → 2열)
- 파싱/치환 유틸: `src/lib/utils/box-grid.ts` (`readBoxColsFromContent`, `writeBoxColsToContent`)
- 문제 편집 UI에서 "보기 열" 버튼 그룹(자동/1/2/3열)으로 마커 자동 편집
- 렌더러가 마커를 자동 숨기고 `<보기>` 라벨로 치환 → DB에 저장된 마커가 모든 뷰(편집/미리보기/학생/인쇄)에 동일 적용

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

**⚠️ AI 출력 텍스트 — 한글 라벨 강제 + KaTeX 렌더링 (하네스 규칙)**

기출분석/AI 총평/블로그 글 등 **AI가 생성한 모든 사용자 노출 텍스트**는 다음 두 규칙을 반드시 따라야 한다.

1. **영문 enum 노출 절대 금지** — 다음 토큰은 한글 라벨로만 표시:
   - `CALCULATION` → 계산력, `UNDERSTANDING` → 이해력
   - `PROBLEM_SOLVING` → 문제해결력, `REASONING` → 추론력
   - `NUMBER` → 수와 연산, `ALGEBRA` → 문자와 식
   - `FUNCTION` → 함수, `GEOMETRY` → 기하, `STATISTICS` → 확률과 통계
   - **3중 방어**:
     ① AI 입력 데이터에서 영문 enum을 한글로 사전 변환 (예: `commentary-agent.ts::toKoreanAbility/toKoreanType`)
     ② 프롬프트에 영문 enum 금지 룰 명시 (`commentary-agent.ts` H6, V6 검증 + `article-generator.ts` "영문 enum 사용 금지" 섹션)
     ③ AI 응답 파싱 시 `stripEnglishEnums()` 적용 (commentary-agent parseResponse, article-generator title/content/tags/metaDescription)
   - 새 AI 에이전트 추가 시: 위 3중 방어를 반드시 동일 패턴으로 적용

2. **`$...$` 패턴은 반드시 KaTeX로 렌더링** — raw `$` 가 사용자 화면에 노출되면 안 됨:
   - 사용자에게 표시되는 모든 AI 생성 텍스트는 `renderInlineMath()` 를 거쳐야 한다 (`src/lib/exam-analysis/rendering.tsx`)
   - 단순 `{q.ai_comment}` 같은 직접 출력 금지 → `{renderInlineMath(q.ai_comment, keyPrefix)}` 사용
   - `renderInlineMath` 는 내부적으로 `normalizeKoreanLabels` 도 자동 적용 → 한글 라벨 강제까지 동시 처리됨
   - 적용 지점 (점검 시 반드시 확인): `AnalysisCommentTab` (ai_comment, difficulty_reason), `CommentarySection` (overall_comment, nearby_comparison, score_strategies, strength/improvement areas, notable_questions, teaching_recommendations), `[id]/print/page.tsx` (q.ai_comment)
   - 새 AI 응답 텍스트 렌더링 추가 시: `renderInlineMath` 거치는지 반드시 확인하고, 그렇지 않으면 raw `$` 노출 발생

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

**인쇄 템플릿 시스템 (`/tests/[id]/print`):**
- 9개 템플릿: `default`, `exam`, `minimal`, `csat`, `classic`, `notebook`, `formal`, `bubble`, `large`
- 8개 테마 색상: 파랑(`#135bec`), 노랑(`#F59E0B`), 주황(`#F97316`), 핑크(`#EC4899`), 남색(`#3B52C2`), 녹색(`#10B981`), 청록(`#14B8A6`), 회색(`#6B7280`)
- 옵션: 1/2단 레이아웃, 간격 조절, 날짜/단원/난이도/구분선/정답 표시 토글
- localStorage 프리셋 저장 (`mathlab_print_preset`)
- 헤더 변형: `PrintableHeader`의 `variant` prop으로 8종 헤더 디스패치
- 인쇄 전용 KaTeX 크기: `.printable-math-content .katex { font-size: 1.05em }`, `.printable-math-large .katex { font-size: 1.25em }`

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

### 11. Prisma `Json?` 필드 — 타입 캐스팅 절대 금지, 진입부 정규화 필수

**원칙: Prisma `Json?` 필드는 런타임에 어떤 JSON 값(객체/배열/문자열/null)이든 들어올 수 있다. 저장 포맷이 시간에 따라 진화하면 동일 필드에 여러 형태가 혼재하므로, 구체 타입으로 캐스팅하면 컴파일러를 속여 런타임 `TypeError`를 만든다.**

**❌ 금지 — 컴파일러를 속이는 거짓 캐스팅:**
```ts
// 타입 선언에 거짓말
interface Input { examScope: string[] | null }   // ❌ DB에는 객체도 들어 있다

// 호출부에서 강제 캐스팅
examScope: examPaper.examScope as string[] | null   // ❌ 거짓을 통과시킴

// 배열 메서드 직접 호출
examPaper.examScope?.join(', ')                     // ❌ 객체면 즉시 TypeError
metadata.items.map(...)                             // ❌ items가 정말 배열인가?
```

**✅ 권장 — 함수 진입부에서 한 번 정규화 후, 정규화된 값만 사용:**
```ts
// 타입 선언은 정직하게 unknown
interface Input { examScope: unknown }

// 함수 시작 지점에서 정규화
const examScopeTopics: string[] = (() => {
  const raw = examPaper.examScope;
  if (Array.isArray(raw)) return raw as string[];                          // 레거시 string[]
  if (raw && typeof raw === 'object' && Array.isArray((raw as { topics?: unknown }).topics)) {
    return (raw as { topics: string[] }).topics;                           // 신형 { topics: [...] }
  }
  return [];
})();
const scopeLabel = examScopeTopics.length ? examScopeTopics.join(', ') : '미지정';
```

**검증 순서 — `.join`/`.map`/`.length`/`.includes` 등 배열 메서드 호출 전 반드시:**
1. `Array.isArray(raw)` — 진짜 배열인지 확인
2. `raw && typeof raw === 'object'` — 객체 여부 + null 체크 동시에
3. Optional chaining(`raw?.field`)만으로는 부족하다 — 타입까지 확인할 것

**해당 필드 목록 (현재 프로젝트의 주요 `Json?` 필드):**
- `ExamPaper.examScope` — 신형 `{ topics, examYear, examSemester, examCategory }` 객체 vs 레거시 `string[]`
- `Question.diagramSpec` — `DiagramSpec` 객체 vs `DiagramParam[]` 배열 (런타임 다형성, `resolveDiagramSpec()` 사용)
- `Question.choices` — `string[]` 또는 null
- `Test.questionIds`, `QuizSession.questionIds`, `*HomeworkPlan.questionIds` — `string[]` (중간테이블 전환기, 헬퍼 `getTestQuestionIds()` 등 사용)
- 기타 모든 스키마의 `Json?` 필드

**위반 시 실제 사례 (2026-05-12 핫픽스):**
- [article-generator.ts](src/lib/exam-analysis/article-generator.ts)이 `examScope: string[] | null`로 거짓 타입 선언
- [generate-article/route.ts](src/app/api/exam-analysis/[id]/generate-article/route.ts)이 `as string[] | null`로 거짓 캐스팅
- `examScope?.join(', ')` 호출 → 신형 객체 시험지에서 `TypeError: examScope?.join is not a function` → API 500 → "기출 분석 글 작성" modal이 "준비 중..."에서 무한 잔류
- 동일 프로젝트의 [analyze/route.ts:84-100](src/app/api/exam-analysis/[id]/analyze/route.ts:84), [nearby-count/route.ts:45,82](src/app/api/exam-analysis/nearby-count/route.ts:45), [ExamPaperList.tsx:82-87](src/components/exam-analysis/ExamPaperList.tsx:82)은 이미 안전 정규화 패턴 적용됨 — **새 코드는 이 패턴을 반드시 따를 것**

**스키마 진화 시 체크리스트:**
- `Json?` 필드의 저장 포맷을 바꿀 때 (예: `string[]` → `{ topics, ...meta }`)
  - **모든 소비 지점**(읽는 곳)을 grep으로 찾아 정규화 패턴 적용 여부 확인
  - 기존 데이터 마이그레이션 없이 dual-format 운용하면 반드시 정규화 헬퍼 통과
  - 검색 명령: `grep -rn "필드명" src/ --include="*.ts" --include="*.tsx"`

## 프로젝트 구조

```
src/
├── app/
│   ├── (student)/     # 학생 페이지 (dashboard, subjects, concepts, practice, my-tests, ranking, quiz, quiz-join, profile, diagnostics, solve, help-public, updates)
│   ├── (teacher)/     # 선생님 페이지 (overview, students, concepts, questions, tests, homework, analytics, quiz, worksheet, manual-grading, reports, level-test, courses, licenses, exam-analysis, settings, updates, help, support, student-preview, admin)
│   ├── api/           # API 라우트 (162+ endpoints)
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
│   ├── exam-analysis/ # 기출 분석 (AnalysisResultView, TypeRadarChart, StudyStrategyTab, ArticleEditorModal, ExtractToBankModal)
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
│   ├── services/      # 핵심 비즈니스 로직 (22개 서비스)
│   ├── utils/         # 유틸 (blank-generator, pdf-processor, features, curriculumMapping, xp, format, question-order, diagram-resolver, answer-status, date-engine, level-test-feedback, activity)
│   │   └── svg-diagrams/  # SVG 다이어그램 렌더링 시스템 (26개 타입)
│   ├── pdf-extract-engine/  # PDF 추출 엔진 (core, ai, hooks, presets — 14파일)
│   ├── exam-analysis/       # 기출 분석 (types, constants, agents, article-generator, chart-image, nearby-school — 5대 영역/4대 능력/5단계 난이도)
│   ├── diagram/       # 프리셋 기반 구조화 다이어그램 시스템 (DiagramSpec 6유형)
│   ├── diagram-presets/   # 교육과정별 다이어그램 프리셋 (초72+중81+고56=209개)
│   ├── constants/     # 교육과정 데이터, 연산 카테고리, 라벨, 시험전략, 학교(6,004개 GPS), 교재
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

**⚠️ 문제(Question) 단원 매핑 — 절대 규칙:**
- **chapter/section 값은 반드시 `curriculum.ts`의 정확한 문자열이어야 한다.** 출판사별 변형 단원명 사용 금지.
- PDF 추출, AI 생성, 수동 등록 등 어떤 경로든 문제 저장 전에 curriculum.ts 표준 단원명으로 매핑할 것.
- PDF 추출 프롬프트에 해당 학년의 curriculum.ts 단원 목록을 반드시 주입하여 AI가 표준 단원명만 반환하도록 강제.
- 정규화 스크립트: `npx tsx scripts/normalize-chapters.ts --apply`

**⚠️ questionNum — 절대 규칙 (소스 유형별 분리):**
- **교과서 추출**: 같은 `bookCode + chapter` 내에서 #1부터 유일 순번. section → createdAt 순 정렬.
- **기출 (시험지)**: 같은 `bookCode` 내에서 #1부터 유일 순번. **원본 시험지의 문항 순서를 반드시 유지** (대단원별 재정렬 금지).
- **AI 생성**: 생성 순서대로 순번 부여.
- 새 문제 추가 시: 해당 범위의 `MAX(questionNum) + 1`로 부여.
- 일괄 추출 후: `scripts/normalize-chapters.ts`로 교과서 문제만 재정렬 가능 (기출 제외).

### 연산 생성기

79개 카테고리, 무한 문제 생성. `src/lib/services/arithmetic-generator/`
카테고리 예: `add_1digit`, `mul_2x1digit`, `frac_add_same`, `dec_div` 등

### 사이드바 네비게이션

Additive 구조 — 상위 역할이 하위 역할 메뉴를 포함 (`src/lib/constants/navigation.ts` → `Sidebar.tsx` / `CommandPalette.tsx` 공유):

**TEACHER 기본:**
- **홈**: 대시보드
- **우리 반**: 학생 목록, 반 목록
- **출제·준비**: 개념 조회, 문제 조회, 연산 프린트, 문제 프린트
- **배정·평가**: 시험 출제, 숙제 출제, 퀴즈 배틀
- **성적·분석**: 학습 현황, 기출 분석, 진단 결과
- **기타**: 공지사항, 도움말, 설정, 문의하기

**+ MANAGER 추가 (보라색 구분선):**
- **팀 관리**: 선생님 관리

**+ OWNER 추가:**
- **지점 운영**: 이용권 관리
- 라벨 변경: 학생 목록→학생 관리, 반 목록→반 관리, 개념 조회→개념 등록, 문제 조회→문제 출제
- 성적·분석 + 리포트

**SUPER_ADMIN**: 별도 전용 네비 (플랫폼 관리, 컨텐츠, 시스템)

이용권 없는 메뉴는 자동 숨김 (`licenseFeature` 필터링)

**커맨드 팔레트**: `Ctrl+K`로 전체 메뉴 빠른 검색/이동 (`CommandPalette.tsx`, 네비와 동일 데이터 사용)

### PDF 문제 추출 시스템

수학 문제집 PDF → Gemini Vision으로 구조화 추출 → 문제은행 일괄 저장.
- 클라이언트 사이드 PDF 처리 (`pdfjs-dist`)
- 4단계 위자드: 업로드 → 페이지 선택 → AI 추출 미리보기 → 저장
- 해설 PDF 별도 업로드로 정답/풀이 매칭 지원
- 관련 파일: `src/types/pdf-extract.ts`, `src/lib/utils/pdf-processor.ts`, `src/app/api/questions/pdf-extract/`

**⚠️ SUPER_ADMIN 전용 (Gemini quota 보호) — 3중 방어:**
- API: `/api/questions/pdf-extract`, `/api/questions/pdf-extract-solutions`, `/api/exam-analysis/[id]/extract-to-bank` 모두 `requireSuperAdmin`
- UI: `/questions/pdf-import` 페이지 자체 가드 (role !== SUPER_ADMIN 시 `/overview` 리다이렉트)
- 네비: `navigation.ts`에서 `minRole: 'SUPER_ADMIN'` 필터링

**후처리 정규화 (Gemini 추출 오류 자동 보정) — `src/lib/pdf-extract-engine/ai/post-processor.ts`:**
- `normalizeMathText(text)` — content/choices/explanation/scoringCriteria에 적용
  1. `fixLatexEscaping` — JSON 이스케이프 복원, 리터럴 `\n` → 실제 줄바꿈, `\dfrac` → `\frac`
  2. 수식 밖 `\textrm{X}` / `\text{X}` / `\mathrm{X}` → `X`, `\textbf{X}` → `**X**`, `\textit{X}` → `*X*`
  3. 인접 인라인 수식 글루 분리: `$A$$B$` → `$A$ $B$` (최대 5회 반복)
  4. 블록 수식 `$$...$$` 내 2줄 이상 + `=` 2개 이상 → `\begin{aligned}...\end{aligned}` 자동 래핑
  5. 연속 공백/3+ 줄바꿈 정리 (수식 내부는 보호)
- `normalizeAnswerField(answer)` — 정답 필드 전용
  - LaTeX 커맨드 감지(`\frac`, `\sqrt`, `\times`, `^{`, `_{` 등) + `$` 미포함 시 자동 `$...$` 래핑
  - 콤마 구분된 여러 정답도 각각 래핑
- **추출 프롬프트 규칙 (Gemini에 사전 지시):**
  - 다단계 계산식은 반드시 `\begin{aligned}...\end{aligned}` 사용 (평문 `\n`으로 = 나열 금지)
  - 인라인 수식 연속 시 공백 필수 (`$A$ $B$`, 금지 `$A$$B$`)
  - `answer` 필드에 LaTeX 수식 있으면 반드시 `$...$` 감싸기
  - 해설이 페이지 경계를 넘으면 끝까지 합쳐서 추출
- **해설 추출 페이지 경계 처리:** `pdf-extract-solutions/route.ts`는 3-페이지 슬라이딩 윈도우로 호출. dedupe 우선순위: (1) answer 존재 > (2) explanation 길이 > (3) scoringCriteria 길이

**기존 데이터 정리 스크립트:**
- `scripts/fix-aligned-explanations.ts` — literal `\n` + aligned 변환 + 글루 분리
- `scripts/fix-case-markers.ts` — `(\textrm{i})` / `따라서` / `이상에서` 앞 줄바꿈
- `scripts/fix-textrm-leftover.ts` — 수식 밖 `\textrm`/`\text`/`\mathrm` 제거
- `scripts/fix-answer-latex-wrap.ts` — 정답 필드 `$...$` 래핑
- `scripts/find-noBreak-explanations.ts` — 줄바꿈 없는 긴 해설 탐지 (읽기 전용)

**편집 모드 AI 해설 재생성 버튼 (SUPER_ADMIN 전용):**
- `QuestionViewEditModal.tsx::ExplanationRegenerateButton` — 편집 폼의 해설 라벨 영역
- 기존 해설 있으면 confirm 다이얼로그, editForm만 업데이트 (사용자가 저장 버튼으로 확정)

### 기출 시험지 배치 추출 시스템

분석 완료된 ExamPaper를 SUPER_ADMIN이 승인하면 Vercel Cron이 야간에 일괄 추출 → 지점 전용 문제은행 저장.

**플로우:**
```
PDF 업로드 → 수동 분석 → status=COMPLETED
   → SUPER_ADMIN 대시보드에서 체크 + 승인
   → 지금 실행 / 예약 실행 (Vercel Cron 5분 간격 틱)
   → Gemini 추출 → ExamPaper.tenantId 주입 → Question 저장
```

**스키마:**
- `ExamPaper`: `extractApproved`, `extractApprovedBy/At`, `extractAttempts`, `lastExtractError`
- `Question.examPaperId` FK (시험지별 문제 추적, idempotent 재추출)
- `ExamExtractSchedule` — 예약 스케줄 + 실행 결과 로그 (PENDING|RUNNING|DONE|FAILED|CANCELLED)

**핵심 서비스:** `src/lib/services/exam-extract-batch.ts`
- `extractAndSaveExamPaper()` — 단일 시험지 Gemini 추출 + idempotent 저장 (기존 Question 삭제 후 재생성)
- `processPendingSchedules()` — 도래한 스케줄 순차 실행, 틱당 최대 5건 (남으면 다음 틱)

**API:**
- `GET /api/admin/extract-queue` — 시험지 목록 (filter: pending/approved/extracted/all)
- `POST /api/admin/extract-queue/approve` — 일괄 승인/취소
- `POST /api/admin/extract-schedule` — 즉시 실행 or scheduledAt 예약
- `DELETE /api/admin/extract-schedule/[id]` — PENDING 스케줄 취소
- `GET /api/cron/extract-batch-tick` — Cron 틱 (CRON_SECRET 인증)

**배포 환경변수:** `CRON_SECRET` 필수 (Vercel env, Cron 헤더 Bearer 인증용)
**Vercel Cron 설정:** `vercel.json` → `*/5 * * * *`
**UI:** `/admin/extract-queue` (SUPER_ADMIN 전용)

**교과서 PDF 보유 현황 (G:\, 22개정):**

| 학년 | 보유 출판사 | 추출 상태 |
|------|-----------|----------|
| **중1** | 동아(강옥기), 지학사(장경윤), NE능률(권오남), YBM(류희찬), 교학사(김창동), 미래엔(황선욱), 비상(이진호), 천재(김동재), 천재(김화경) — 9종 | ✅ 동아·지학사 완료 (~917문제), 7종 미추출 |
| **중2** | 동아(강옥기), 지학사(장경윤), NE능률(권오남), YBM(류희찬), 교학사(김창동·미완성), 미래엔(황선욱), 비상(이진호), 천재(김동재), 천재(김화경) — 9종 | ❌ 미추출 |
| **중3** | (폴더 비어있음) | — |
| **공통수학1** | 동아(고호경), 미래엔(황선욱), 비상(김원경), YBM(류희찬), 지학사(장윤경), 천재(전인태), 천재(홍진곤) — 7종 | ❌ 미추출 |
| **공통수학2** | 동아(고호경), 미래엔(황선욱), 비상(김원경), YBM(류희찬), 지학사(장윤경), 천재(전인태), 천재(홍진곤) — 7종 | ❌ 미추출 |
| **대수** | 동아(고호경), 미래엔(황선욱), 비상(김원경), YBM(류희찬), 지학사(장경윤), 천재(전인태) — 6종 | ❌ 미추출 |
| **미적분I** | 동아(고호경), 미래엔(황선욱), 비상(김원경), YBM(류희찬), 지학사(장경윤), 천재(홍진곤) — 6종 | ❌ 미추출 |
| **미적분II** | (폴더 비어있음) | — |
| **확률과통계** | 미래엔(황선욱), 비상(김원경), YBM(류희찬), 지학사(장경윤), 천재(전인태) — 5종 | ❌ 미추출 |
| **기하** | 동아(고호경), 미래엔(황선욱), YBM(류희찬), 지학사(장경윤), 천재(전인태) — 5종 | ❌ 미추출 |

- **총 보유: 8개 과목 × 5~9종 = 약 54종** (중3·미적분II 제외)
- 추출 완료: 중1 2종 (917문제, 해설 없음, 정답은 AI 추출값으로 검증 필요)
- 해설 일괄 생성: Gemini 2.5 Flash auto 모드 (BASIC/MEDIUM → Non-Thinking, HIGH/HIGHEST → Thinking) 예상 비용 ~1,200원/1000문제
- 미리보기: `/mockups/explanation-compare`

### 학습지 위자드

3단계 위자드로 교육과정 기반 문제지 생성 (`src/components/worksheet-wizard/`):
1. **교육과정 선택**: 학년/학기/단원 체크트리 + 문제 설정 (유형/난이도/수량)
2. **문제 편집**: AI 생성 문제 검토/수정/삭제/추가
3. **최종 설정**: 제목, 시간, 배점 설정 후 저장

### SVG 다이어그램 시스템

두 가지 병렬 시스템이 존재하며, DB에는 `diagramSpec Json?` (구조화) + `diagramSVG String?` (레거시 1개) 필드로 저장:

**1. DiagramParam[] (SVG-Diagrams, 26개 타입)** — `src/lib/utils/svg-diagrams/`
- 용도: PDF 추출 시 Gemini가 반환하는 파라미터 배열 → SVG 렌더링
- 진입점: `renderDiagram(data)` in `index.ts`
- 공유 유틸: `svg-utils.ts` (svgWrap, line, text, katexLabel, circle, rect, arrowHead, COLORS)
- 각 타입별 normalize 함수가 Gemini의 불규칙한 파라미터명 처리
- **초등 (13):** number_line, fraction_circle, fraction_rect, place_value, dot_array, flow_chart, bar_chart, line_graph, picture_graph, pie_chart, band_chart, angle_figure, clock_face
- **중등 (13):** coordinate_plane, circle, triangle, quadrilateral, function_graph, venn_diagram, regular_polygon, histogram, stem_leaf, solid_figure, net_diagram, tree_diagram, scatter_plot
  - `shapes.ts`에 circle/triangle/quadrilateral/regular_polygon 4개 서브렌더러 통합

**2. DiagramSpec (프리셋 기반, 6개 유형 + 17개 프리셋)** — `src/lib/diagram/`
- 용도: AI 문제 생성 시 좌표 없이 프리셋+속성만으로 정확한 도형 생성
- 렌더러: `src/lib/diagram/shapes/` — triangle, circle, quadrilateral, coordinate, solid (5개 파일)
- 정규화: `src/lib/diagram/normalize.ts` — 프리셋 → 좌표 자동 계산
- 타입 정의: `src/types/diagram.ts`

| 유형 | 프리셋/기능 |
|------|------------|
| `triangle` | right, equilateral, isosceles, scalene, right-isosceles + 특수점(내심/외심/무게중심/수심), 보조선(중선/수선/각이등분선/수직이등분선), 내접원/외접원, 외각연장선/외각호 |
| `circle` | 현, 접선, 호, 중심각, 원주각, 내접다각형, 반지름선 |
| `quadrilateral` | square, rectangle, parallelogram, rhombus, trapezoid, general + 대각선, 합동표시(빗금), 평행표시(화살표), 직각표시 |
| `coordinatePlane` | 함수그래프(수식→자동계산), 점, 직선/선분, 영역색칠 |
| `solid` | cube, cylinder, cone, sphere, prism, pyramid |
| `composite` | 위 도형들 조합 (소문항 2개 이상 도형 배치) |

**통합 렌더러:** `DiagramRenderer.tsx` — `resolveDiagramSpec()` (`src/lib/utils/diagram-resolver.ts`)로 런타임 판별
- `DiagramSpec` (단일 객체, AI 생성) → `renderDiagram` from `@/lib/diagram/renderer`
- `DiagramParam[]` (배열, PDF 추출) → `renderDiagram` from `@/lib/utils/svg-diagrams`
- DB `diagramSpec Json?` 필드에 두 포맷이 혼재 → 런타임 다형성으로 처리
- `diagramSVG String?` — 레거시 raw SVG (현재 1개만 존재, 폴백 렌더링)

**3. 교육과정 프리셋 (209개)** — `src/lib/diagram-presets/`
- 학교급/학년/학기/단원별로 교육적으로 의미 있는 다이어그램 기본값을 미리 정의
- 초등 72개 (1~6학년, 12학기) + 중등 81개 (1~3학년, 6학기) + 고등 56개 (7과목)
- 총 25개 학년/학기 키 커버
- 트리 구조: 학교급 → 학년/학기 → 단원 → 프리셋 목록
- 검색: `searchPresets(query)`, 학년별 그룹: `groupPresetsByGrade(level)`

**4. 렌더 디스패처 + normalize** — `src/lib/utils/svg-diagrams/index.ts`
- `renderDiagram({ type, params })` 단일 진입점. 26개 타입 switch로 분기.
- Gemini가 반환하는 불규칙 파라미터명(`totalParts`/`parts`/`denominator` 등)을 타입별 `normalize*()` 함수로 정규화한 뒤 렌더.
- 함수 그래프 표현식은 `shared/expression-parser.ts`의 안전 파서(재귀 하강)로 평가 — `new Function` 사용 금지.

**편집기:** `DiagramEditorPopup.tsx` — 26개 DiagramParam 타입 모두 GUI 편집 가능
- 타입별 기본 파라미터: `src/components/math/diagram-editor/types.ts`

**DB 현황:** diagramSpec 927개 / diagramSVG 1개 (레거시)

### 수학 렌더링 컴포넌트 (`src/components/math/`)

| 컴포넌트 | 용도 |
|----------|------|
| `MathRenderer` | 마크다운+LaTeX+SVG+GFM 테이블 렌더링. `onMathClick` prop 시 수식 클릭 편집 모드 활성 (원본 content 좌표 보존). EditableMathRenderer 흡수 통합 (2026-04-15) |
| `DiagramRenderer` | DiagramSpec / DiagramParam[] 통합 → SVG 렌더링 (런타임 판별) |
| `DiagramEditorPopup` | 26개 DiagramParam 타입 GUI 편집기 |
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
| `license.ts` | 이용권/라이선스 관리 (10개 기능, 좌석/OnOff 2유형) |
| `course-advance.ts` | 학습 과정 진도 관리 |
| `spaced-review.ts` | 간격 반복 복습 (에빙하우스 망각곡선) |

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

**10개 기능 (LicenseFeature enum):**
- **좌석 기반 (학생 기능):** CONCEPT, ARITHMETIC, TIME_ATTACK, TEST, REVENGE, DIAGNOSTIC, QUIZ, HOMEWORK
- **On/Off 기반 (선생님 도구):** EXAM_ANALYSIS, WORKSHEET

**API 가드 패턴:**
```typescript
const licenseCheck = await requireLicense(user, 'arithmetic');
if (licenseCheck) return licenseCheck;  // 이용권 없으면 403
```

**관리:** OWNER → `/licenses` (학생 배정), SUPER_ADMIN → `/admin/tenants/[id]` (지점 좌석/On-Off 관리, 2단 분리 UI)
**사이드바 연동:** OWNER 사이드바는 `/api/licenses/tenant-features`로 활성 이용권을 조회하여 네비게이션 항목 자동 필터링
**클라이언트:** `useLicenseStore` (Zustand, Fail-Open — 네트워크 실패 시 허용, 서버 가드가 최종 차단)

### 학습 과정 시스템

**모델:** `LearningCourse` → `LearningCourseConcept` (sortOrder) → `LearningCourseEnrollment` (LOCKED|ACTIVE|COMPLETED)

**자동 진급 플로우** (`course-advance.ts`):
1. 학생이 개념의 BLANK_FULL 완료
2. `checkAndAdvanceCourse()` 호출 → ACTIVE 과정의 모든 개념 완료 확인
3. 과정 COMPLETED 처리 → 다음 LOCKED 과정 자동 ACTIVE 전환

**선생님 관리:** `/courses` (과정 생성, 개념 추가, 학생 배정)
- 반 중심 뷰: `LearningCourse.tenantId`만 있고 `classroomId` 없음 → **지점(Tenant) 단위 공용**
- "이 반의 학습 코스" = 반 학생 중 enrollment된 코스 (간접 연결)
- 재사용 경로: 반 상세에 **"기존 코스 배정"** 모달 — 지점 공용 코스 중 해당 반에 미배정 학생이 있는 것 표시 → 클릭 시 `POST /api/learning-courses/[seq]/enroll`로 반 전원 일괄 enroll (중복은 스킵)

### 기출 분석 시스템

PDF 시험지 업로드 → Gemini AI 분석 → 문항별 난이도/유형/능력/단원 구조화

**프롬프트 버전:** `PROMPT_VERSION` (`src/lib/exam-analysis/constants.ts`)
- 현재: **v1.0.0** (5대 교육과정 영역, 5단계 난이도, 서술형 통합 규칙)
- 분석 결과 DB `modelVersion` 필드에 기록 (예: "gemini-2.5-flash / prompt v1.0.0")
- **프롬프트 변경 시 반드시 `PROMPT_VERSION` 버전 업!** UI에 표시되어 사용자가 버전별 차이 인지 가능
- 버전 변경 기준: 영역/난이도 체계, 분류 규칙, ai_comment 규칙, 서술형 처리 규칙 변경

**핵심 구조 (`src/components/exam-analysis/`, `src/lib/exam-analysis/`):**
- `AnalysisResultView` — 난이도 도넛차트/배점 토글, 유형 레이더, 단원 출제현황, 문항 테이블
- `AnalysisCommentTab` — 문항별 AI 코멘트 (난이도/유형/능력/배점 라벨) + 피드백 신고
- `StudyStrategyTab` — 학습 전략 10개 섹션 (토픽, 킬러패턴, 타임라인, 서술형 대비, 등급별 전략, 자주 틀리는 유형 등)
- `TypeRadarChart` — 유형(5대)/능력(4대) 레이더 차트 (탭 전환)
- AI 총평 (`CommentarySection`) — Claude Sonnet 기반 종합 분석, DB 영구 저장, 텍스트 하이라이트
- `ArticleEditorModal` — 블로그 글 자동 생성 (AI 기사 + 차트 이미지 + 네이버 서식 복사)
- `ExtractToBankModal` — 분석된 기출 문항 → 문제은행 일괄 저장

**8개 확장 분석 에이전트** (`src/lib/exam-analysis/agents/`):
- orchestrator, commentary, weakness, learning, exam-prep, prediction, topic-strategy, score-level-plan

**주변 학교 시스템:**
- 전국 학교 6,004개 GPS 좌표 100% 보유 (`src/lib/constants/schools.ts`)
- 같은 구 우선 + 3km 인접 복합 로직으로 주변 학교 자동 그룹화
- 지점별 커스텀 오버라이드 (학교 제외/추가)
- 시험지 ↔ School DB 자동 매칭

**Supabase Storage:** 시험지 PDF 업로드는 Supabase Storage 사용 (20MB 제한, 삭제 시 파일 자동 정리)

**5대 교육과정 영역 (question_type):** 수와 연산(number), 문자와 식(algebra), 함수(function), 기하(geometry), 확률과 통계(statistics)
- Gemini raw 타입 → 5대 영역 정규화 (`TYPE_TO_STANDARD` in `constants.ts`)
- 레이더 차트: 5각형, 데이터 있는 항목만 다각형, 범례 전체 표시

**4대 능력 영역 (ability_domain):** 계산력, 이해력, 문제해결력, 추론력
- AI가 직접 반환, `TYPE_TO_DOMAIN`은 fallback용
- 공유 상수: `ABILITY_DOMAIN_LABELS`, `ABILITY_DOMAIN_COLORS` (`constants.ts`)

**5단계 난이도:** "1"(기본), "2"(표준), "3"(응용), "4"(심화), "5"(최고난도)

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

### 간격 반복 복습 시스템

에빙하우스 망각곡선 기반 자동 복습 스케줄 (`src/lib/services/spaced-review.ts`):
- **간격 5단계**: `REVIEW_INTERVALS = [1, 3, 7, 14, 30]` — 1일(다음 수업일) → 3일 → 7일 → 14일 → 30일 → 완전 습득(`status='completed'`)
- **오답 발생 시(최초)**: 1일 후 복습 스케줄 생성, `status='active'`
- **복습 중 오답**: `status='failed'` 마킹, 이후 스케줄 생성 안 함 → **별도 관리 대상** (재학습/집중 지도)
- **복습 외 상황에서 재오답**: 기존 `active` 스케줄을 1일로 리셋 (failed는 건드리지 않음)
- 모든 조회는 `status='active'` 필터 적용 (failed/completed는 일반 복습에 노출 안 됨)

**ReviewSchedule 주요 필드:** `status`, `failureCount`, `streak`, `interval`, `reviewAt`, `completedAt`

**핵심 함수:**
- `createReviewSchedule()` — 오답 발생 시 호출
- `completeReview(id, isCorrect)` — 복습 완료 처리 (정답: 다음 간격 or completed / 오답: failed)
- `getDailyTestItems(studentId, count=4)` — **매 수업 3~4문항 복습 테스트용**, 최근 오답 우선(`createdAt DESC`)
- `getFailedReviews(studentId, limit)` — 별도 관리 목록
- `getTodayReviews(studentId, limit)` — 오늘 예정 active 항목
- `getReviewStats(studentId)` — pending / completedToday / totalCompleted / failedCount

**API:**
- `GET /api/learning/review-daily-test?count=4` — 매 수업 복습 테스트 (3~4문항)
- `GET /api/learning/review-failed?limit=50` — 탈락 항목 (View-As 지원)

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
**이용권:** TenantLicense, StudentLicense, LicenseUsageLog (10개 LicenseFeature enum)
**학습과정:** LearningCourse, LearningCourseConcept, LearningCourseEnrollment
**기출분석:** ExamPaper, ExamAnalysisResult, ExamAnalysisComment, ExamAnalysisTemplate, ExamArticle, School, SchoolGroupOverride, ExamExtractSchedule (배치 추출)
**지원:** Inquiry (문의/회신)
**기타:** StudentProfile(XP/레벨), PointTransaction, DiagnosticResult, ConceptMemo, SpacedReviewItem

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
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
KAKAO_REST_API_KEY=your-kakao-api-key
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
  - 3중 방어: ① `MathRenderer.tsx`에서 인라인 `$...$` 내 `\dfrac` → `\frac` 자동 변환 ② `post-processor.ts`의 `fixLatexEscaping()`에서 전역 치환 ③ AI 프롬프트(mathgen.ts, math-textbook.ts)에서 `\dfrac` 금지 명시
  - DB 일괄 치환 스크립트: `npx tsx scripts/fix-dfrac.ts --apply`
- **alert() 사용 금지** → `toast.*()` 사용 (위 7번 규칙 참고)
- 빌드 확인: 기능 구현 후 `npm run build`로 타입 에러 없는지 확인
- **문제 순서 조회 시 반드시 헬퍼 함수 사용**: `getTestQuestionIds()`, `getQuizQuestionIds()`, `getHomeworkDayQuestionIds()` (`@/lib/utils/question-order`)
  - `test.questionIds as string[]` 직접 캐스팅 금지 → 중간테이블 우선 조회 헬퍼 사용
  - 새 시험/퀴즈/숙제 생성 시 Json + 중간테이블 Dual-Write 유지
- **`/api/questions/bulk` 호출 시 tenantId 자동 결정:** examPaperId 있으면 해당 시험지 tenantId 우선 → 지점 전용 문제 보장. SUPER_ADMIN이 override 없이 호출하면 `tenantId=null`(공용)
- **`<보기>` 블록 편집 시 `box-grid.ts` 유틸 사용** — 직접 문자열 치환 금지 (마커 포맷 변경 시 한 곳만 수정)

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
| 소스 파일 | 825개 (TS/TSX) |
| 총 코드량 | ~190,000 LoC |
| 학생 페이지 | 23개 |
| 선생님 페이지 | 66개 (+ mockups 12개) |
| API 라우트 | 216개 (116개 도메인 디렉토리) |
| 컴포넌트 | 212개 |
| 서비스 모듈 | 40개 (workbook, ox-quiz 등 신규 도메인 포함) |
| DB 모델 | 89개, Enum 17개 (LicenseFeature에 OX_QUIZ, WORKBOOK 추가) |
| 다이어그램 | DiagramParam 26개 타입 + DiagramSpec 6개 유형 17개 프리셋 + 교육과정 프리셋 209개 |
| 커스텀 훅 | 14개 |
| Zustand 스토어 | 8개 (workbookStore 추가) |
| Zod 스키마 | 5개 |
| E2E 테스트 | 3개 (Playwright) |
| 스크립트 | 177개 (.ts/.js/.py, scripts/) |
