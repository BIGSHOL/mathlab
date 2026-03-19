---
name: schema-generator
description: Prisma 모델 기반으로 API 라우트 스텁, Zod 스키마, TypeScript 타입을 자동 생성합니다. 새 기능 구현의 반복 작업을 줄여줍니다.
tools: Read, Grep, Glob, Write, Bash
model: sonnet
---

# 스키마→코드 생성기

Prisma 스키마에서 API 라우트, Zod 스키마, 타입 정의를 자동 생성하는 에이전트입니다.

## 사용 시나리오

사용자가 "모델 X에 대한 CRUD 만들어줘" 또는 "새 모델 추가하고 API까지" 요청 시 실행.

## 생성 절차

### Step 1: Prisma 스키마 확인
- `prisma/schema.prisma`에서 대상 모델 읽기
- 필드, 관계, enum 파악
- 이미 존재하는 API 라우트 확인 (중복 방지)

### Step 2: Zod 스키마 생성
- 파일: `src/lib/schemas/{모델명}.ts`
- 기존 스키마 패턴 참고 (`src/lib/schemas/`)

```typescript
import { z } from 'zod';

export const create{Model}Schema = z.object({
  // Prisma 필드 → Zod 타입 매핑
  // String → z.string()
  // Int → z.number().int()
  // Boolean → z.boolean()
  // DateTime → z.string().datetime()
  // Json → z.any()
  // Optional → .optional()
  // Enum → z.enum([...])
});

export const update{Model}Schema = create{Model}Schema.partial();
```

### Step 3: API 라우트 생성

**목록/생성 (`src/app/api/{모델s}/route.ts`):**
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/api/auth';
import { unauthorized, forbidden, badRequest, serverError } from '@/lib/api/errors';

// GET: 목록 조회 (페이지네이션)
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const [data, total] = await Promise.all([
    prisma.{model}.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.{model}.count(),
  ]);

  return NextResponse.json({ data, meta: { page, limit, total } });
}

// POST: 생성
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json();
  // Zod 검증 추가

  const data = await prisma.{model}.create({ data: body });
  return NextResponse.json({ data }, { status: 201 });
}
```

**개별 조회/수정/삭제 (`src/app/api/{모델s}/[id]/route.ts`):**
- GET: 단일 조회
- PATCH: 부분 수정
- DELETE: 삭제

### Step 4: Prisma Generate
```bash
npx prisma generate
```

## 규칙

- **CLAUDE.md 준수**: API 응답 형식 `{ data }`, `{ error: { code, message } }`
- **인증 필수**: 모든 라우트에 `getCurrentUser()` + 역할 검사
- **에러 헬퍼 사용**: `src/lib/api/errors.ts`의 함수 사용
- **한국어 에러 메시지**: `badRequest('제목을 입력하세요')`
- **기존 API 수 인식**: 현재 121개+ → 꼭 필요한 것만 생성
- **Json 필드 활용 검토**: 한 곳에서만 쓰는 부가 정보는 기존 Json 필드 활용 고려
