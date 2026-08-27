# MathLab

초등~고등 수학 학원용 학습 관리 플랫폼 (LMS).

학생 개념학습, 빈칸암기(4단계), 연산연습, 시험, 레벨테스트, 실시간 퀴즈, 학습지, PDF 문제 추출, 게이미피케이션을 지원합니다.

> 현재 개발 버전입니다. DB의 모든 데이터는 더미 데이터이며, 초기화/삭제가 자유롭습니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5.8 |
| Database | PostgreSQL + Prisma 6 |
| Auth | NextAuth 4 (Credentials, JWT) |
| AI | Google Gemini 2.5 Flash, Anthropic Claude Sonnet 4.6 |
| PDF | pdfjs-dist (클라이언트 사이드 렌더링) |
| Styling | Tailwind CSS v4, Framer Motion |
| Math | KaTeX, MathLive, remark-math |
| State | Zustand 5 |
| Validation | Zod |
| Testing | Vitest, Playwright |

## 시작하기

### 사전 요구사항

- Node.js 18+
- PostgreSQL
- Gemini API Key
- Anthropic API Key (선택)

### 설치

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에 DB 연결 정보 및 API 키 입력

# DB 마이그레이션 및 Prisma 클라이언트 생성
npx prisma migrate dev
npx prisma generate

# 시드 데이터 (선택)
npm run db:seed

# 개발 서버 실행
npm run dev
```

### 환경변수

```
DATABASE_URL=postgresql://user:password@localhost:5432/mathlab
DIRECT_URL=postgresql://user:password@localhost:5432/mathlab
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## 주요 기능

### 선생님

| 기능 | 설명 |
|------|------|
| 학생 관리 | 학생 등록, 학습현황/오답/진도 조회 |
| 개념 관리 | 개념 생성 → 빈칸 자동생성 → 4단계 학습 |
| 문제 은행 | AI 문제 생성, PDF 추출, 수동 입력 |
| 시험 관리 | 시험 출제 → 배정 → 자동/수기 채점 → 결과 분석 |
| 연산 생성기 | 78+ 카테고리 무한 문제 생성 |
| 숙제 관리 | 개념/문제/연산 3종 숙제 계획 및 추적 |
| 학습지 | 3단계 위자드로 교육과정 기반 문제지 생성 |
| 실시간 퀴즈 | 학생 참여형 실시간 퀴즈 세션 |
| 레벨테스트 | 진단 → AI 보고서 자동 생성 |
| 학습 분석 | 대시보드, 성취도, 속도 분석 |
| PDF 문제 추출 | 문제집 PDF → Gemini Vision → 문제은행 일괄 저장 |

### 학생

| 기능 | 설명 |
|------|------|
| 개념 학습 | 4단계 빈칸 학습 (읽기 → 쉬움 → 어려움 → 통문장) |
| 연산 연습 | 카테고리별 연산 + 타임어택 |
| 시험 응시 | 배정된 시험 응시 (1차 오답 힌트, 콤보), 결과 확인 |
| 숙제 | 배정된 숙제 수행 |
| 게이미피케이션 | XP, 레벨, 뱃지, 일일미션, 랭킹, 복수전 |

## 프로젝트 구조

```
src/
├── app/
│   ├── (student)/     # 학생 페이지 (16개)
│   ├── (teacher)/     # 선생님 페이지 (44개)
│   ├── api/           # API 라우트 (127 endpoints)
│   └── globals.css    # Tailwind 테마 + 디자인 토큰
├── components/        # React 컴포넌트 (130개)
├── lib/
│   ├── services/      # 비즈니스 로직 (18개 서비스)
│   ├── utils/         # 유틸리티 + SVG 다이어그램 (26개 타입)
│   ├── schemas/       # Zod 검증 스키마
│   ├── constants/     # 교육과정 데이터
│   └── diagram/       # 프리셋 기반 다이어그램
├── hooks/             # 커스텀 훅 (9개)
├── stores/            # Zustand 스토어 (5개)
├── types/             # TypeScript 타입 정의
└── scripts/           # DB 초기화, 시드 스크립트
```

## 스크립트

```bash
npm run dev              # 개발 서버 (Turbopack)
npm run build            # 프로덕션 빌드
npm run lint             # ESLint
npm run test:e2e         # Playwright E2E 테스트
npm run db:seed          # 시드 데이터
npm run db:migrate       # DB 마이그레이션
npm run db:studio        # Prisma Studio (DB 브라우저)
npx tsx scripts/migrate-question-relations.ts  # 중간테이블 마이그레이션
```

## 교육과정 체계

```
학교급: elementary(초3-6) | middle(중1-3) | high(공통수학/대수/미적분/확통/기하)
학기: 1 | 2 (고등은 0)
영역: calc | algebra | func | geo | data
대단원(chapter) → 중단원(section) → 소단원(sectionSub)
```

## AI 활용

| AI | 용도 | 모델 |
|----|------|------|
| Gemini | 문제 생성, PDF 추출, 빈칸 생성 | gemini-2.5-flash |
| Claude | 레벨테스트 보고서 생성 | claude-sonnet-4-6 |

## 프로젝트 규모

| 항목 | 수치 |
|------|------|
| 소스 파일 | 485개 |
| 총 코드량 | ~83,000 LoC |
| API 라우트 | 127개 |
| DB 모델 | 52개 |
| 컴포넌트 | 130개 |
| 서비스 | 18개 |

## Para-X 결제 연동 (이용권·구독)

[para-x](https://para-x.co.kr)(중앙 결제 허브)에서 결제하면 mathlab 의 이용권/구독에 반영됩니다.

- **이용권(크레딧)**: 원장이 `/entitlements` 에서 구매 → para-x 결제 → 지점 풀 적립 → 학생 배정 → 기출분석 시 차감.
- **구독(plan)**: 결제페이지 '구독하기' → para-x 토스 빌링 → `TenantSubscription` 갱신.
- **식별**: `/api/parax/checkout` 가 서명 핸드오프 토큰을 발급 → para-x 가 검증 (로그인 원장만).

| 파일 | 역할 |
|------|------|
| `src/lib/entitlements/service.ts` | 적립/배정/소비 (grantCredits, allocateToStudent, assert·consumeExamAnalysisCredit) |
| `src/lib/parax/handoff.ts` | 핸드오프 토큰 발급 (para-x 와 동일 HMAC 알고리즘) |
| `src/app/api/webhooks/parax/route.ts` | para-x 지급 통지 수신 (서명검증·멱등) |
| `src/app/api/parax/checkout/route.ts` | 결제 핸드오프 진입 (302 리다이렉트) |
| `prisma/parax-entitlements.sql` | 이용권 테이블 (수동 적용) |

추가 환경변수: `PARAX_SHARED_SECRET`, `HANDOFF_SHARED_SECRET` (para-x 와 동일 값), `NEXT_PUBLIC_PARAX_CHECKOUT_URL`.

> ⚠️ 이용권 테이블은 `prisma migrate` 가 아니라 `prisma/parax-entitlements.sql` 을 Supabase SQL Editor 에서 실행해 추가합니다(기존 마이그레이션 드리프트 회피). 모델 추가 후 `prisma generate` 만 실행.
