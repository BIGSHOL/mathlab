# TRD (기술 요구사항 정의서) — MathLab

> 개발자/AI 코딩 파트너가 참조하는 기술 문서입니다.
> 기술 표현을 사용하되, "왜 이 선택인지"를 함께 설명합니다.

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

## 1. 시스템 아키텍처

### 1.1 고수준 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js (Full-Stack)                   │
│                                                           │
│  ┌──────────────────┐     ┌──────────────────┐           │
│  │   React Pages    │     │   API Routes     │           │
│  │   (App Router)   │────▶│   (/api/*)       │           │
│  │                  │     │                  │           │
│  │  - 학생 학습 UI  │     │  - 인증 API      │           │
│  │  - 관리자 UI     │     │  - 개념 학습 API  │           │
│  │  - 랭킹 보드     │     │  - 포인트/랭킹    │           │
│  └──────────────────┘     └────────┬─────────┘           │
│                                     │                     │
└─────────────────────────────────────┼─────────────────────┘
                                      │
                              ┌───────▼───────┐
                              │  PostgreSQL   │
                              │               │
                              │  - 사용자     │
                              │  - 개념 콘텐츠 │
                              │  - 학습 기록   │
                              │  - 포인트/랭킹 │
                              └───────────────┘
```

### 1.2 컴포넌트 설명

| 컴포넌트 | 역할 | 왜 이 선택? |
|----------|------|-------------|
| Next.js (App Router) | 프론트엔드 + 백엔드 통합 | 풀스택으로 개발 속도 극대화, SSR로 초기 로딩 빠름 |
| React | 학생 학습 UI, 관리자 UI 렌더링 | 인터랙티브 UI(빈칸, 애니메이션)에 강력, 풍부한 생태계 |
| PostgreSQL | 모든 데이터 저장 및 관리 | 관계형 데이터(학생-학습-포인트) 처리에 최적, 랭킹 집계 연산에 강력 |

---

## 2. 권장 기술 스택

### 2.1 프론트엔드

| 항목 | 선택 | 이유 | 벤더 락인 리스크 |
|------|------|------|-----------------|
| 프레임워크 | Next.js 15 (App Router) | SSR/SSG 지원, 풀스택 통합, 이미지 최적화 | 중간 (Vercel 종속 가능) |
| 언어 | TypeScript 5+ | 타입 안전성, 개발 생산성, 에디터 자동완성 | - |
| 스타일링 | TailwindCSS 4 | 유틸리티 퍼스트, 빠른 UI 개발, 반응형 용이 | 낮음 |
| 상태관리 | Zustand | 가볍고 직관적, 보일러플레이트 최소 | 낮음 |
| 폼 관리 | React Hook Form + Zod | 빈칸 채우기 등 폼 처리에 최적, 스키마 기반 검증 | 낮음 |
| 애니메이션 | Framer Motion | 레벨업/포인트 획득 등 게임적 애니메이션 구현 | 낮음 |

### 2.2 백엔드 (Next.js API Routes)

| 항목 | 선택 | 이유 | 벤더 락인 리스크 |
|------|------|------|-----------------|
| 런타임 | Node.js 20+ | Next.js 기본 런타임, 안정적 | - |
| ORM | Prisma | 타입 안전 쿼리, 마이그레이션 관리, Next.js 통합 우수 | 낮음 |
| 인증 | NextAuth.js (Auth.js) | Credentials Provider로 학원 계정 관리, 세션 관리 내장 | 낮음 |
| 검증 | Zod | TypeScript 네이티브 스키마 검증, 프론트엔드와 공유 가능 | 낮음 |

### 2.3 데이터베이스

| 항목 | 선택 | 이유 |
|------|------|------|
| 메인 DB | PostgreSQL 16 | 관계형 데이터 처리, 랭킹 집계(Window Functions), JSON 지원 |
| 캐시 | 불필요 (MVP) | MVP 규모에서는 DB 직접 조회로 충분, v2에서 Redis 고려 |

### 2.4 인프라

| 항목 | 선택 | 이유 |
|------|------|------|
| 컨테이너 | Docker + Docker Compose | 로컬 개발 일관성, PostgreSQL 컨테이너화 |
| 호스팅 | Vercel (프론트) + Supabase (DB) | Next.js 최적 배포, 무료 티어로 시작 가능 |
| 대안 호스팅 | Railway | 풀스택 + DB 통합 호스팅, 간단한 설정 |

---

## 3. 비기능 요구사항

### 3.1 성능

| 항목 | 요구사항 | 측정 방법 |
|------|----------|----------|
| API 응답 시간 | < 500ms (P95) | API 로깅 |
| 초기 로딩 | < 3s (FCP) | Lighthouse |
| 빈칸 채우기 응답 | < 100ms (즉각적 피드백) | 클라이언트 측정 |

### 3.2 보안

| 항목 | 요구사항 |
|------|----------|
| 인증 | NextAuth.js Credentials + 세션 쿠키 (httpOnly, secure) |
| 비밀번호 | bcrypt 해싱 (학원 관리자가 초기 비밀번호 설정) |
| HTTPS | 필수 (Vercel 자동 적용) |
| 입력 검증 | Zod로 서버 측 필수 검증 |
| CSRF | NextAuth.js 내장 CSRF 보호 |

### 3.3 확장성

| 항목 | 현재 | 목표 |
|------|------|------|
| 동시 사용자 | MVP: 50명 (학원 1곳) | v2: 500명 (학원 다수) |
| 콘텐츠 | MVP: 초등 주요 단원 10개 | v2: 초중등 전 단원 |
| 데이터 용량 | MVP: 500MB | v2: 5GB |

---

## 4. 외부 API 연동

### 4.1 인증

| 서비스 | 용도 | 필수/선택 | 연동 방식 |
|--------|------|----------|----------|
| 없음 (Credentials) | 학원 자체 계정 관리 | 필수 | NextAuth.js Credentials Provider |

### 4.2 기타 서비스

| 서비스 | 용도 | 필수/선택 | 비고 |
|--------|------|----------|------|
| 없음 (MVP) | - | - | MVP에서는 외부 서비스 연동 없음 |

---

## 5. 접근제어·권한 모델

### 5.1 역할 정의

| 역할 | 설명 | 권한 |
|------|------|------|
| Student | 학생 사용자 | 자기 학습 데이터 CRUD, 랭킹 조회 |
| Teacher | 선생님/관리자 | 학생 계정 관리, 콘텐츠 관리, 전체 학생 진도 조회 |
| Admin | 시스템 관리자 | 전체 접근 (선생님 계정 생성 포함) |

### 5.2 권한 매트릭스

| 리소스 | Student | Teacher | Admin |
|--------|---------|---------|-------|
| 학습 콘텐츠 조회 | O | O | O |
| 학습 진행 (빈칸/백지) | O (본인) | - | - |
| 학습 기록 조회 | O (본인) | O (담당 학생) | O |
| 랭킹 조회 | O | O | O |
| 학생 계정 생성/관리 | - | O | O |
| 콘텐츠 생성/수정 | - | O | O |
| 선생님 계정 관리 | - | - | O |

---

## 6. 데이터 생명주기

### 6.1 원칙

- **최소 수집**: 학습에 필요한 데이터만 수집 (이름, 학년, 학습 기록)
- **학원 관리**: 학원이 학생 데이터의 관리 주체
- **보존 기한**: 학생 탈퇴(수강 종료) 시 30일 후 삭제

### 6.2 데이터 흐름

```
계정 생성(선생님) → 학습 활동(학생) → 포인트/랭킹 집계 → 진도 리포트 → 수강 종료 시 삭제
```

| 데이터 유형 | 보존 기간 | 삭제/익명화 |
|------------|----------|------------|
| 학생 계정 정보 | 수강 종료 후 30일 | 완전 삭제 |
| 학습 활동 로그 | 1년 | 익명화 |
| 포인트/랭킹 데이터 | 계정과 동일 | Cascade 삭제 |
| 콘텐츠 데이터 | 영구 | 관리자 수동 삭제 |

---

## 7. 테스트 전략 (Contract-First TDD)

### 7.1 개발 방식: Contract-First Development

본 프로젝트는 **계약 우선 개발(Contract-First Development)** 방식을 채택합니다.
Next.js 풀스택이므로 API Routes의 입출력 계약을 먼저 정의하고, 프론트엔드는 MSW Mock으로 독립 개발합니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    Contract-First 흐름                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 계약 정의 (Phase 0)                                     │
│     ├─ API 계약: contracts/*.contract.ts                   │
│     ├─ Zod 스키마: src/lib/schemas/*.ts                    │
│     └─ Prisma 모델: prisma/schema.prisma                  │
│                                                             │
│  2. 테스트 선행 작성 (🔴 RED)                               │
│     ├─ API 테스트: src/app/api/**/*.test.ts                │
│     ├─ 컴포넌트 테스트: src/__tests__/**/*.test.tsx         │
│     └─ 모든 테스트가 실패하는 상태 (정상!)                  │
│                                                             │
│  3. Mock 생성 (프론트 독립 개발용)                           │
│     └─ MSW 핸들러: src/mocks/handlers/*.ts                 │
│                                                             │
│  4. 병렬 구현 (🔴→🟢)                                       │
│     ├─ API Routes: 테스트 통과 목표로 구현                  │
│     └─ Pages/Components: Mock API로 개발                   │
│                                                             │
│  5. 통합 검증                                               │
│     └─ Mock 제거 → E2E 테스트                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 테스트 피라미드

| 레벨 | 도구 | 커버리지 목표 | 위치 |
|------|------|-------------|------|
| Unit | Vitest | ≥ 80% | src/__tests__/unit/ |
| Integration | Vitest + MSW | Critical paths | src/__tests__/integration/ |
| E2E | Playwright | Key user flows | e2e/ |

### 7.3 테스트 도구

| 도구 | 용도 |
|------|------|
| Vitest | 유닛/통합 테스트 실행 (Vite 호환, Next.js 지원) |
| React Testing Library | 컴포넌트 렌더링 테스트 |
| MSW (Mock Service Worker) | API 모킹 (프론트엔드 독립 개발) |
| Playwright | E2E 브라우저 테스트 |
| @testing-library/user-event | 사용자 인터랙션 시뮬레이션 |

### 7.4 계약 파일 구조

```
mathlab/
├── contracts/                       # API 계약 (공유)
│   ├── types.ts                    # 공통 타입 정의
│   ├── auth.contract.ts            # FEAT-0: 인증 API 계약
│   ├── concept.contract.ts         # FEAT-1: 개념 학습 API 계약
│   ├── learning.contract.ts        # FEAT-1: 학습 진행 API 계약
│   └── gamification.contract.ts    # FEAT-1: 포인트/랭킹 API 계약
│
├── prisma/
│   └── schema.prisma               # DB 스키마 (Prisma)
│
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes
│   │   │   ├── auth/
│   │   │   ├── concepts/
│   │   │   ├── learning/
│   │   │   └── gamification/
│   │   ├── (student)/              # 학생 페이지 그룹
│   │   ├── (teacher)/              # 선생님 페이지 그룹
│   │   └── layout.tsx
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   └── schemas/                # Zod 검증 스키마
│   ├── stores/
│   ├── mocks/
│   │   ├── handlers/               # MSW Mock 핸들러
│   │   └── data/                   # Mock 데이터
│   └── __tests__/
│       ├── unit/
│       └── integration/
│
└── e2e/                            # E2E 테스트
```

### 7.5 TDD 사이클

```
🔴 RED    → 실패하는 테스트 먼저 작성 (Phase 0에서 완료)
🟢 GREEN  → 테스트를 통과하는 최소한의 코드 구현
🔵 REFACTOR → 테스트 통과 유지하며 코드 개선
```

### 7.6 품질 게이트

**병합 전 필수 통과:**
- [ ] 모든 단위 테스트 통과
- [ ] 커버리지 ≥ 80%
- [ ] ESLint 통과
- [ ] TypeScript 타입 체크 통과
- [ ] E2E 테스트 통과 (해당 기능)

**검증 명령어:**
```bash
# 유닛 + 통합 테스트
npm run test -- --coverage

# 린트
npm run lint

# 타입 체크
npx tsc --noEmit

# E2E
npx playwright test
```

---

## 8. API 설계 원칙

### 8.1 RESTful 규칙

| 메서드 | 용도 | 예시 |
|--------|------|------|
| GET | 조회 | GET /api/concepts/{id} |
| POST | 생성 | POST /api/learning/submit |
| PUT | 전체 수정 | PUT /api/users/{id} |
| PATCH | 부분 수정 | PATCH /api/users/{id}/points |
| DELETE | 삭제 | DELETE /api/users/{id} |

### 8.2 주요 API 엔드포인트 (MVP)

**FEAT-0: 인증/계정**
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/auth/login | 학생/선생님 로그인 |
| POST | /api/auth/logout | 로그아웃 |
| GET | /api/auth/session | 현재 세션 확인 |
| POST | /api/users | 학생 계정 생성 (선생님 전용) |
| GET | /api/users | 학생 목록 조회 (선생님 전용) |
| PATCH | /api/users/{id} | 학생 정보 수정 |

**FEAT-1: 개념 학습**
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/concepts | 개념 목록 (단원별) |
| GET | /api/concepts/{id} | 개념 상세 (읽기 콘텐츠) |
| GET | /api/concepts/{id}/blanks?level=1 | 빈칸 문제 조회 (레벨별) |

**FEAT-1: 학습 진행**
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/learning/progress | 학습 단계 완료 기록 |
| GET | /api/learning/progress | 학생 학습 진도 조회 |
| POST | /api/learning/blank-submit | 빈칸 답안 제출 |
| POST | /api/learning/blank-page-submit | 백지 쓰기 답안 제출 |

**FEAT-1: 게이미피케이션**
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/gamification/points | 내 포인트/레벨 조회 |
| GET | /api/gamification/ranking | 랭킹 보드 조회 |
| POST | /api/gamification/award | 포인트 지급 (시스템 내부) |

### 8.3 응답 형식

**성공 응답:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  }
}
```

**에러 응답:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "답안을 입력해주세요.",
    "details": [
      { "field": "answer", "message": "빈칸을 모두 채워주세요" }
    ]
  }
}
```

---

## 9. 병렬 개발 지원 (Git Worktree)

### 9.1 Worktree 구조

```
~/projects/
├── mathlab/                    # 메인 (main 브랜치)
├── mathlab-auth/               # Worktree: feature/feat-0-auth
├── mathlab-concept-api/        # Worktree: feature/feat-1-concept-api
├── mathlab-concept-ui/         # Worktree: feature/feat-1-concept-ui
├── mathlab-gamification-api/   # Worktree: feature/feat-1-gamification-api
└── mathlab-gamification-ui/    # Worktree: feature/feat-1-gamification-ui
```

### 9.2 명령어

```bash
# Worktree 생성
git worktree add ../mathlab-auth -b feature/feat-0-auth
git worktree add ../mathlab-concept-api -b feature/feat-1-concept-api

# 각 Worktree에서 독립 작업
cd ../mathlab-concept-api && npm run test -- src/__tests__/api/concepts/
cd ../mathlab-concept-ui && npm run test -- src/__tests__/components/concept/

# 테스트 통과 후 병합
git checkout main
git merge --no-ff feature/feat-0-auth
git merge --no-ff feature/feat-1-concept-api

# Worktree 정리
git worktree remove ../mathlab-auth
```

### 9.3 병합 규칙

| 조건 | 병합 가능 |
|------|----------|
| 단위 테스트 통과 (🟢) | 필수 |
| 커버리지 ≥ 80% | 필수 |
| ESLint/TypeScript 통과 | 필수 |
| E2E 테스트 통과 | 권장 |

---

## Decision Log 참조

| ID | 항목 | 선택 | 근거 |
|----|------|------|------|
| D-11 | 기술 스택 | Next.js + React + PostgreSQL | 풀스택 통합, 웹 최적화 |
| D-06 | 계정 관리 | Credentials (NextAuth.js) | 소셜 로그인 불필요 |
| D-08 | 데이터 저장 | 클라우드 (Vercel + Supabase) | 어디서든 접속 |
