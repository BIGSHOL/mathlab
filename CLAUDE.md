# MathLab — 한국 수학 학습 플랫폼

## 프로젝트 개요

초등~고등 수학 학원용 학습 관리 플랫폼 (LMS).
학생 개념학습, 빈칸암기(4단계), 연산연습, 시험, 레벨테스트, 실시간 퀴즈, 게이미피케이션을 지원.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5.8 |
| Database | PostgreSQL + Prisma 6 |
| Auth | NextAuth 4 (Credentials, JWT) |
| AI | Google Gemini 2.5 Flash Lite (`@google/genai`) |
| Styling | Tailwind CSS v4, Framer Motion |
| Math | KaTeX, MathLive, remark-math |
| State | Zustand 5 |
| Validation | Zod |
| Testing | Vitest, Playwright |
| Icons | lucide-react |

## 핵심 규칙

### 1. API/DB 존재 여부 반드시 확인

**새 기능 구현 전 항상 확인할 것:**
- `prisma/schema.prisma`에서 해당 모델/필드가 존재하는지 확인
- `src/app/api/` 에서 필요한 API 라우트가 이미 있는지 확인
- 없으면 먼저 스키마/API를 생성한 후 프론트엔드 구현
- 스키마 변경 후 반드시 `npx prisma generate` 실행
- 새 enum 값 추가 시 Prisma 클라이언트 재생성 필수

### 2. 탭/페이지 간 유기적 연동

**모든 페이지는 독립적이 아니라 하나의 플로우로 연결되어야 함:**
- **학생 관리** → 학생 클릭 → 해당 학생의 학습현황/오답/진도 조회 가능
- **개념 관리** → 개념 생성 → 빈칸 자동생성 → 학생이 4단계 학습
- **문제 은행** → 시험 출제 → 학생 응시 → 결과 분석 → 학습 분석에 반영
- **연산 생성기** → 연산 숙제 → 학생 연습 → 대시보드에 성과 표시
- **레벨테스트** → 진단 결과 → 취약영역 파악 → 맞춤 학습 추천
- 새 기능 추가 시 관련 탭에서의 접근 경로도 함께 구현할 것
- 데이터 생성/수정 시 관련 페이지의 캐시/목록도 갱신되는지 확인

### 3. API 응답 형식 (일관성 유지)

```typescript
// 성공
{ data: T }
{ data: T, meta: { page, limit, total } }  // 페이지네이션

// 에러
{ error: { code: string, message: string } }
```

### 4. 인증/인가 패턴

```typescript
const currentUser = await getCurrentUser();
if (!currentUser) → 401
if (currentUser.role === 'STUDENT') → 403  // 선생님/관리자 전용
if (currentUser.role !== 'ADMIN') → 403     // 관리자 전용
```

### 5. AI (Gemini) 사용 규칙

- 호출 전 **내용 사전 검증**: 최소 20자, 한글 5자 이상, 의미 있는 단어 3개 이상
- 모델: `gemini-2.5-flash-lite` (가장 저렴, 충분한 성능)
- 구조화 출력: `responseMimeType: 'application/json'` + `responseSchema`
- 환경변수: `GEMINI_API_KEY`

## 프로젝트 구조

```
src/
├── app/
│   ├── (student)/     # 학생 페이지 (dashboard, subjects, concepts, practice, my-tests, ranking)
│   ├── (teacher)/     # 선생님 페이지 (overview, students, concepts, questions, tests, homework, analytics)
│   ├── api/           # API 라우트 (70+ endpoints)
│   └── globals.css    # Tailwind 테마 + 디자인 토큰
├── components/
│   ├── layout/        # Sidebar, DashboardShell
│   ├── ui/            # Button, Pagination 등 공통 UI
│   ├── math/          # KaTeX, MathLive 렌더링
│   ├── learning/      # 개념학습, 빈칸연습
│   ├── bulk-import/   # 일괄 가져오기
│   └── curriculum/    # 교육과정 트리
├── lib/
│   ├── auth.ts        # NextAuth 설정
│   ├── db.ts          # Prisma 싱글톤 클라이언트
│   ├── schemas/       # Zod 검증 스키마
│   ├── services/      # 핵심 비즈니스 로직 (arithmetic-generator, grading, diagnostic 등)
│   ├── utils/         # 유틸 (blank-generator, curriculumMapping, xp, format)
│   ├── constants/     # 교육과정 데이터, 연산 카테고리
│   └── data/          # 정적 데이터 (업데이트 로그 등)
├── hooks/             # useAuth, useLearning, useGamification 등
└── types/             # 공통 타입 정의
```

## 주요 도메인

### 4단계 빈칸 학습

| 단계 | Stage Enum | 설명 | XP |
|------|------------|------|----|
| 개념학습 | `READING` | 내용 읽기 + 메모 | 5 |
| 빈칸 1단계 | `BLANK_EASY` | 핵심 용어 (easy) | 10 |
| 빈칸 2단계 | `BLANK_HARD` | easy + hard | 15 |
| 통문장 암기 | `BLANK_FULL` | 전체 빈칸 (full) | 20 |

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

### 연산 생성기

62개+ 카테고리, 무한 문제 생성. `src/lib/services/arithmetic-generator.ts`
카테고리 예: `add_1digit`, `mul_2x1digit`, `frac_add_same`, `dec_div` 등

### 사이드바 네비게이션

3개 그룹으로 구성 (`src/components/layout/Sidebar.tsx`):
- **메인 메뉴**: 대시보드, 학생관리, 개념관리, 문제은행, 연산생성기, 연산숙제, 시험관리, 레벨테스트, 학습분석
- **시스템**: 업데이트 내역, 설정, 고객지원
- **어드민** (관리자만): 선생님 관리, 사용자 관리, AI 문제 생성, 화면 미리보기

## 디자인 토큰

```css
--color-primary: #135bec        /* 메인 파란색 */
--color-primary-hover: #0e4bcc
--color-secondary: #F97316      /* 주황 */
--color-stage-reading: #3B82F6  /* 개념학습 */
--color-stage-blank-easy: #10B981  /* 빈칸 쉬움 */
--color-stage-blank-hard: #F97316  /* 빈칸 어려움 */
--color-stage-blank-page: #7C3AED  /* 통문장 */
```

## 스크립트

```bash
npm run dev          # 개발 서버 (Turbopack)
npm run build        # 프로덕션 빌드
npx prisma generate  # Prisma 클라이언트 재생성
npx prisma studio    # DB 브라우저
npm run db:seed      # 시드 데이터
```

## 코딩 컨벤션

- 한국어 UI 텍스트, 한국어 주석 권장
- API 에러 메시지: 한국어
- 파일명: kebab-case, 컴포넌트: PascalCase
- 경로 alias: `@/` = `src/`
- 수학 수식: `$...$` (인라인), `$$...$$` (블록)
- 빌드 확인: 기능 구현 후 `npm run build`로 타입 에러 없는지 확인

## Skills

커스텀 검증 스킬은 `.claude/skills/`에 정의되어 있습니다.

| Skill | Purpose |
|-------|---------|
| `verify-implementation` | 모든 verify 스킬을 순차 실행하여 통합 검증 |
| `manage-skills` | 세션 변경사항 분석 및 CLAUDE.md 관리 |
| `verify-api-auth` | API 라우트 인증/인가 패턴 검증 |
| `verify-schema-sync` | Prisma 스키마와 코드 간 동기화 검증 |
| `verify-page-patterns` | Teacher/Student 페이지 UI 패턴 일관성 검증 |
