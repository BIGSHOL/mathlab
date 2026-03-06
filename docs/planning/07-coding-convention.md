# Coding Convention & AI Collaboration Guide — MathLab

> 고품질/유지보수/보안을 위한 인간-AI 협업 운영 지침서입니다.

---

## MVP 캡슐

| # | 항목 | 내용 |
|---|------|------|
| 1 | 목표 | 초중등 학생들이 강의 없이 수학 개념을 자기주도적으로 이해할 수 있는 학원용 학습 프로그램 |
| 2 | 페르소나 | 초중등학생 (학원 소속, 수업 전후 자기주도 학습) |
| 3 | 핵심 기능 | FEAT-1: 단계적 개념 학습 (읽기→빈칸→백지) |
| 4 | 성공 지표 (노스스타) | 백지 쓰기 단계까지 도달한 학생 비율 |
| 5 | 입력 지표 | 주간 로그인 횟수, 단계별 완료율 |
| 6 | 비기능 요구 | 모든 기기 반응형 웹 (PC/태블릿/스마트폰) |
| 7 | Out-of-scope | 외부 API 연동, 학부모 카카오톡 알림, 학원 내 상점 |
| 8 | Top 리스크 | 학생들이 초기 흥미를 잃고 사용을 중단할 수 있음 |
| 9 | 완화/실험 | 포인트/랭킹/레벨업 게이미피케이션으로 지속 동기 부여 |
| 10 | 다음 단계 | FEAT-1 단계적 개념 학습 프로토타입 개발 |

---

## 1. 핵심 원칙

### 1.1 신뢰하되, 검증하라 (Don't Trust, Verify)

AI가 생성한 코드는 반드시 검증해야 합니다:

- [ ] 코드 리뷰: 생성된 코드 직접 확인
- [ ] 테스트 실행: 자동화 테스트 통과 확인
- [ ] 보안 검토: 민감 정보 노출 여부 확인
- [ ] 동작 확인: 실제로 실행하여 기대 동작 확인

### 1.2 최종 책임은 인간에게

- AI는 도구이고, 최종 결정과 책임은 개발자에게 있습니다
- 이해하지 못하는 코드는 사용하지 않습니다
- 의심스러운 부분은 반드시 질문합니다

---

## 2. 프로젝트 구조

### 2.1 디렉토리 구조

```
mathlab/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # 인증 라우트 그룹
│   │   │   └── login/
│   │   ├── (student)/              # 학생 라우트 그룹
│   │   │   ├── dashboard/          # 학생 대시보드
│   │   │   ├── subjects/           # 단원 목록
│   │   │   ├── concepts/[id]/      # 개념 학습 (4단계)
│   │   │   ├── ranking/            # 랭킹 보드
│   │   │   └── profile/            # 내 프로필
│   │   ├── (teacher)/              # 선생님 라우트 그룹
│   │   │   ├── dashboard/          # 관리 대시보드
│   │   │   └── students/           # 학생 관리
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/
│   │   │   ├── concepts/
│   │   │   ├── learning/
│   │   │   └── gamification/
│   │   ├── layout.tsx
│   │   └── page.tsx                # 루트 (로그인 리다이렉트)
│   │
│   ├── components/                 # 재사용 컴포넌트
│   │   ├── ui/                     # 기본 UI (Button, Card, Input...)
│   │   ├── learning/               # FEAT-1: 학습 관련
│   │   │   ├── ConceptReader.tsx   # 읽기 단계
│   │   │   ├── BlankExercise.tsx   # 빈칸 채우기
│   │   │   ├── BlankPage.tsx       # 백지 쓰기
│   │   │   └── StageProgress.tsx   # 단계 진행 표시
│   │   ├── gamification/           # 게이미피케이션
│   │   │   ├── XpBadge.tsx
│   │   │   ├── LevelUpModal.tsx
│   │   │   └── RankingCard.tsx
│   │   └── layout/                 # 레이아웃
│   │       ├── Sidebar.tsx
│   │       └── BottomNav.tsx
│   │
│   ├── hooks/                      # 커스텀 훅
│   │   ├── useAuth.ts
│   │   ├── useLearning.ts
│   │   └── useGamification.ts
│   │
│   ├── lib/                        # 유틸리티, DB, 설정
│   │   ├── db.ts                   # Prisma 클라이언트
│   │   ├── auth.ts                 # NextAuth 설정
│   │   ├── schemas/                # Zod 검증 스키마
│   │   └── utils/                  # 유틸리티 함수
│   │       ├── xp.ts              # XP/레벨 계산
│   │       └── format.ts          # 포맷팅
│   │
│   ├── stores/                     # Zustand 스토어
│   │   ├── authStore.ts
│   │   └── learningStore.ts
│   │
│   ├── types/                      # TypeScript 타입
│   │   └── index.ts
│   │
│   └── mocks/                      # MSW 모킹
│       ├── handlers/
│       │   ├── auth.ts
│       │   ├── concept.ts
│       │   └── gamification.ts
│       └── data/
│
├── contracts/                      # API 계약 (BE/FE 공유)
│   ├── types.ts
│   ├── auth.contract.ts
│   ├── concept.contract.ts
│   ├── learning.contract.ts
│   └── gamification.contract.ts
│
├── prisma/
│   ├── schema.prisma               # DB 스키마
│   └── seed.ts                     # 초기 데이터
│
├── e2e/                            # E2E 테스트
│   ├── login.spec.ts
│   ├── learning-flow.spec.ts
│   └── ranking.spec.ts
│
├── docs/
│   └── planning/                   # 기획 문서
│       ├── 01-prd.md
│       ├── 02-trd.md
│       ├── 03-user-flow.md
│       ├── 04-database-design.md
│       ├── 05-design-system.md
│       └── 07-coding-convention.md
│
├── public/                         # 정적 파일
├── docker-compose.yml              # PostgreSQL 로컬 개발
├── .env.example
├── .env.local                      # .gitignore에 포함
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 2.2 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 (컴포넌트) | PascalCase | `BlankExercise.tsx` |
| 파일 (훅) | camelCase + use | `useLearning.ts` |
| 파일 (유틸) | camelCase | `formatXp.ts` |
| 파일 (API Route) | kebab-case (디렉토리) | `api/learning/progress/route.ts` |
| 컴포넌트 | PascalCase | `BlankExercise` |
| 함수/변수 | camelCase | `calculateLevel` |
| 상수 | UPPER_SNAKE | `MAX_LEVEL`, `XP_PER_READING` |
| CSS 클래스 | TailwindCSS 유틸리티 | `bg-primary text-white` |
| DB 모델 | PascalCase | `LearningProgress` |
| DB 컬럼 | camelCase | `totalXp`, `createdAt` |
| API 경로 | kebab-case | `/api/learning/blank-submit` |

---

## 3. 아키텍처 원칙

### 3.1 뼈대 먼저 (Skeleton First)

1. 전체 디렉토리 구조를 먼저 잡기
2. 빈 페이지/컴포넌트로 스켈레톤 생성
3. 하나씩 구현 채워나가기

### 3.2 작은 모듈로 분해

- 한 파일에 200줄 이하 권장
- 한 함수에 50줄 이하 권장
- 한 컴포넌트에 100줄 이하 권장

### 3.3 관심사 분리

| 레이어 | 역할 | 위치 |
|--------|------|------|
| UI (Pages) | 라우팅 + 레이아웃 | `src/app/` |
| UI (Components) | 재사용 UI 블록 | `src/components/` |
| 상태 | 클라이언트 상태 관리 | `src/stores/` |
| API 통신 | 서버 요청/응답 | `src/hooks/` + fetch |
| 비즈니스 로직 | XP 계산, 레벨업 등 | `src/lib/utils/` |
| 데이터 접근 | DB 쿼리 | `src/app/api/` + Prisma |
| 검증 | 입력 검증 | `src/lib/schemas/` (Zod) |

### 3.4 Server vs Client Components

```
서버 컴포넌트 (기본):
- 페이지 레이아웃
- 데이터 페칭
- 정적 콘텐츠 (개념 읽기)

클라이언트 컴포넌트 ('use client'):
- 빈칸 채우기 인터랙션
- 백지 쓰기 입력
- XP 애니메이션
- 랭킹 실시간 업데이트
- 폼 (React Hook Form)
```

---

## 4. AI 소통 원칙

### 4.1 하나의 채팅 = 하나의 작업

- 한 번에 하나의 명확한 작업만 요청
- 작업 완료 후 다음 작업 진행
- 컨텍스트가 길어지면 새 대화 시작

### 4.2 컨텍스트 명시

**좋은 예:**
> "TASKS 문서의 T2.1을 구현해주세요.
> Database Design의 BlankExercise 엔티티를 참조하고,
> TRD의 API 설계를 따라주세요.
> Design System의 빈칸 입력 필드 스타일을 적용해주세요."

**나쁜 예:**
> "빈칸 채우기 만들어줘"

### 4.3 프롬프트 템플릿

```
## 작업
{{무엇을 해야 하는지}}

## 참조 문서
- {{문서명}} 섹션 {{번호}}

## 제약 조건
- {{지켜야 할 것}}

## 예상 결과
- {{생성될 파일}}
- {{기대 동작}}
```

---

## 5. 보안 체크리스트

### 5.1 절대 금지

- [ ] 비밀정보 하드코딩 금지 (API 키, 비밀번호, DB URL)
- [ ] `.env.local` 파일 커밋 금지
- [ ] SQL 직접 문자열 조합 금지 (Prisma ORM 사용)
- [ ] 사용자 입력 그대로 출력 금지 (XSS 방지)
- [ ] 학생 개인정보 로깅 금지

### 5.2 필수 적용

- [ ] 모든 사용자 입력 Zod로 서버 측 검증
- [ ] 비밀번호 bcrypt 해싱
- [ ] HTTPS 사용 (Vercel 자동)
- [ ] NextAuth.js CSRF 보호 활용
- [ ] 역할 기반 API 접근 제어 (Student/Teacher/Admin)

### 5.3 환경 변수 관리

```bash
# .env.example (커밋 O)
DATABASE_URL=postgresql://user:password@localhost:5432/mathlab
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# .env.local (커밋 X, .gitignore에 포함)
DATABASE_URL=postgresql://real:real@localhost:5432/mathlab
NEXTAUTH_SECRET=abc123xyz789
NEXTAUTH_URL=http://localhost:3000
```

---

## 6. 테스트 워크플로우

### 6.1 즉시 실행 검증

코드 작성 후 바로 테스트:

```bash
# 유닛 + 통합 테스트
npm run test

# 커버리지 포함
npm run test -- --coverage

# 특정 파일만
npm run test -- src/__tests__/learning/

# E2E
npx playwright test

# 특정 E2E
npx playwright test e2e/learning-flow.spec.ts
```

### 6.2 오류 로그 공유 규칙

오류 발생 시 AI에게 전달할 정보:

1. 전체 에러 메시지
2. 관련 코드 스니펫
3. 재현 단계
4. 이미 시도한 해결책

**예시:**
```
## 에러
TypeError: Cannot read property 'blanks' of undefined

## 코드
const blanks = exercise.blanks; // BlankExercise.tsx:42

## 재현
1. 개념 읽기 완료 후
2. 빈칸 채우기(쉬움) 페이지 진입
3. exercise 데이터가 undefined

## 시도한 것
- API 응답 확인 → 200 OK이지만 data가 null
- Prisma 쿼리 확인 → conceptId 매칭 안 됨
```

---

## 7. Git 워크플로우

### 7.1 브랜치 전략

```
main              # 프로덕션
├── develop       # 개발 통합
│   ├── feature/feat-0-auth          # 계정/인증
│   ├── feature/feat-1-concept-api   # 개념 학습 API
│   ├── feature/feat-1-concept-ui    # 개념 학습 UI
│   ├── feature/feat-1-gamification  # 포인트/랭킹
│   └── fix/blank-input-mobile       # 모바일 빈칸 버그
```

### 7.2 커밋 메시지

```
<type>(<scope>): <subject>

<body>
```

**타입:**
- `feat`: 새 기능
- `fix`: 버그 수정
- `refactor`: 리팩토링
- `docs`: 문서
- `test`: 테스트
- `chore`: 기타

**스코프:** feat-0, feat-1, gamification, ui, db 등

**예시:**
```
feat(feat-1): 빈칸 채우기 쉬움 단계 구현

- BlankExercise 컴포넌트 구현
- 정답/오답 피드백 애니메이션 추가
- Zod 검증 스키마 추가
- Database Design 04 섹션 2.4 구현 완료
```

---

## 8. 코드 품질 도구

### 8.1 필수 설정

| 도구 | 용도 | 설정 파일 |
|------|------|----------|
| ESLint | 코드 린트 | `.eslintrc.json` |
| Prettier | 코드 포맷팅 | `.prettierrc` |
| TypeScript | 타입 체크 | `tsconfig.json` |

### 8.2 ESLint 규칙 (주요)

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

### 8.3 Prettier 설정

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## Decision Log 참조

| ID | 항목 | 선택 | 코딩 영향 |
|----|------|------|----------|
| D-11 | 기술 스택 | Next.js + React + PostgreSQL | App Router, Prisma ORM |
| D-04 | 학습 방법론 | 4단계 | stage Enum, 4개 학습 컴포넌트 |
| D-05 | 게이미피케이션 | 포인트/레벨/랭킹 | XP 유틸 함수, Zustand 스토어 |
| D-07 | 사용 환경 | 모든 기기 | TailwindCSS 반응형, 터치 최적화 |
