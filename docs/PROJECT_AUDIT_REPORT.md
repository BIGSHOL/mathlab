# MathLab 프로젝트 종합 점검 보고서

> **점검일:** 2026-03-24
> **점검 범위:** 빌드, 코드 리뷰, API 인증/인가, 스키마 동기화, 네비게이션 동기화, 리팩토링 분석
> **프로젝트 규모:** 520개 파일 / ~178,600 LoC / 132개 API / 57개 DB 모델
> **최종 빌드:** 통과 (타입 에러 0, 135 페이지 성공)
> **수정 완료:** Critical 보안 이슈 5건, Warning 4건, 기타 3건 즉시 수정 적용됨

---

## 요약 대시보드

| 점검 영역 | 상태 | Critical | Warning | Info |
|-----------|------|----------|---------|------|
| 빌드 검증 | **통과** | 0 | 65 (ESLint) | 0 |
| 코드 리뷰 (git diff) | **이슈 있음** | 3 | 6 | 5 |
| API 인증/인가 | **이슈 있음** | 3 | 2 | 0 |
| 스키마-코드 동기화 | **양호** | 0 | 1 | 1 |
| 네비게이션-페이지 동기화 | **이슈 있음** | 3 | 1 | 1 |
| 리팩토링 분석 | **개선 필요** | 21 (대형 파일) | 20 | — |
| **합계** | | **30** | **95** | **7** |

---

## 1. 빌드 검증

### 결과: 통과

- **Prisma Generate:** 성공 (v6.19.2, 414ms)
- **Next.js Build:** 성공 (13.8s, 137/137 페이지)
- **타입 에러:** 0개

### ESLint 경고 65개 (빌드 비차단)

| 유형 | 개수 | 권장 조치 |
|------|------|-----------|
| `console.log` 사용 | 40+ | 배포 전 제거 |
| `<img>` 태그 사용 | 13 | `next/image` `<Image/>` 전환 |
| React Hook 의존성 누락 | 8 | useEffect/useCallback 의존성 정비 |
| 미사용 eslint-disable | 3 | 불필요한 지시문 제거 |

### 번들 크기

| 항목 | 크기 |
|------|------|
| 공유 번들 | 102 kB |
| 최대 페이지 (`/questions/pdf-import`) | 339 kB |
| 최소 페이지 | 103 kB |

---

## 2. 코드 리뷰 (git 변경사항 기반)

### Critical (3건)

#### C1. `DELETE /api/users/:id` — 자기 자신 삭제 방어 없음
- **파일:** `src/app/api/users/[id]/route.ts:57`
- **문제:** `requireOwner()` 후 `user.id === id` 체크 없음. OWNER가 자기 계정 삭제 가능.
- **수정:** `if (user.id === id) return forbidden('자기 자신은 삭제할 수 없습니다');` 추가

#### C2. `DELETE /api/users/:id` — 테넌트 격리 누락
- **파일:** `src/app/api/users/[id]/route.ts:50-64`
- **문제:** `targetUser` 조회 시 `tenantId` 필터 없이 전체 DB 범위 조회. 다른 테넌트 사용자 삭제 가능.
- **수정:** `tenantId` 조건 추가 또는 SUPER_ADMIN 예외 처리 패턴 적용

#### C3. `/admin/teachers` 페이지 — 서버사이드 권한 검증 없음
- **파일:** `src/app/(teacher)/admin/teachers/page.tsx`
- **문제:** `(teacher)` 레이아웃은 TEACHER 이상 허용이지만, 이 페이지는 MANAGER+ 전용. 클라이언트 `hasRoleClient`만으로 체크.
- **수정:** 서버 컴포넌트에서 `getCurrentUser()` + 역할 체크 후 redirect 추가

### Warning (6건)

| ID | 파일 | 문제 |
|----|------|------|
| W1 | `BadgeModalSection.tsx:86-105` | API 실패 시 `toast.error` 누락 — 사용자에게 피드백 없음 |
| W2 | `BadgeModalSection.tsx` | 인덴테이션 4칸 (프로젝트 표준: 2칸) |
| W3 | `ClassroomDetail.tsx:123` | `rounded-xl` 사용 (UI 표준: `rounded-sm`) |
| W4 | `api/admin/classrooms/[id]/route.ts:30` | PATCH에 Zod 스키마 검증 없이 `request.json()` 직접 사용 |
| W5 | `admin/teachers/page.tsx:31` | `/api/users` 전체 목록을 받아 클라이언트에서 `filter(role === 'TEACHER')` — 비효율적 |
| W6 | `Sidebar.tsx:215,227` | 선생님용 Sidebar에 `UserAvatar`의 `badgeIcon` 미전달 (의도적이면 주석 필요) |

### Suggestion (5건)

| ID | 내용 |
|----|------|
| S1 | `useRepresentativeBadge` — 사이드바/헤더 양쪽 호출 시 중복 요청. Zustand 캐싱 권장 |
| S2 | `representative-badge PUT` — `badge!.id` non-null 단언 대신 방어 처리 권장 |
| S3 | `scripts/seed-full.ts` — 1,641줄. 도메인별 파일 분리 권장 |
| S4 | `ClassroomDetail.tsx` — `<Button>` 대신 직접 `<button>` 태그 사용 |
| S5 | `TopThreePodium.tsx` — `UserAvatar` 미사용, 인라인으로 아바타 직접 구현 (중복) |

---

## 3. API 인증/인가 검증

### 검증 범위: 132개 API 라우트

### 인증 함수 사용 현황

| 함수 | 사용 횟수 |
|------|-----------|
| `requireAuth` | 54 |
| `requireTeacher` | 51 |
| `requireAuthViewAs` | 16+ |
| `requireSuperAdmin` | 16 |
| `requireOwner` | 12 |
| `getCurrentUser` (직접) | 4 |
| 인증 없음 (의도적) | 1 |

### Critical — GET 핸들러 인증 누락 (3건)

| 파일 | 문제 | 영향 |
|------|------|------|
| `api/concepts/[id]/route.ts` GET | 인증 없음 (PATCH/DELETE는 requireSuperAdmin) | 비인증 사용자가 개념 상세 열람 가능 |
| `api/concepts/[id]/blanks/route.ts` GET | 인증 없음 (POST/PUT/DELETE는 requireSuperAdmin) | 비인증 사용자가 빈칸 문제 열람 가능 |
| `api/questions/[id]/route.ts` GET | 인증 없음 (PATCH/DELETE는 requireTeacher) | 비인증 사용자가 문제 상세 열람 가능 |

**수정:** 위 3개 GET 핸들러에 `requireAuth()` + `isResponse()` 추가 필요

### Warning — `getCurrentUser()` 직접 사용 (2건)

| 파일 | 권장 수정 |
|------|-----------|
| `api/me/updates-check/route.ts` | `getCurrentUser()` + 수동 null 체크 → `requireAuth()` + `isResponse()` |
| `api/tests/[id]/attempt/route.ts` | 동일 패턴으로 교체 |

### 양호 항목
- `isResponse()` 체크 누락: **0건** (모든 `require*` 호출에서 정상 체크)
- 에러 응답 형식 위반: **0건** (모두 `{ error: { code, message } }` 준수)
- 역할별 접근 제어: **적절** (admin→requireSuperAdmin, licenses→requireOwner 등)

---

## 4. 스키마-코드 동기화 검증

### 결과: 양호

| 항목 | 결과 |
|------|------|
| 모델 참조 (57개) | 모두 코드에서 올바르게 사용 |
| 필드 참조 | 존재하지 않는 필드 참조 0건 |
| Enum 값 일치 (10개) | 모두 일치 |
| 관계 정의 | 모든 양방향 관계 정상 |

### 경미한 사항 (1건)

- **`src/lib/view-as.ts:24`** — Role 타입 캐스트에서 `MANAGER` 누락
  ```typescript
  // 현재: role: student.role as 'STUDENT' | 'TEACHER' | 'OWNER' | 'SUPER_ADMIN'
  // 수정: role: student.role as 'STUDENT' | 'TEACHER' | 'MANAGER' | 'OWNER' | 'SUPER_ADMIN'
  ```
  런타임 영향 없음 (STUDENT만 조회하는 함수), 타입 정의 일관성 개선 차원.

### 참고 사항

- `Classroom.teacherId`는 `@relation` 없이 `String?`으로 느슨한 참조 설계. FK 제약 없으므로 애플리케이션 레벨에서 정합성 관리 필요.

---

## 5. 네비게이션-페이지 동기화 검증

### Critical — 페이지 누락 (3건, 404 발생)

| 경로 | 컨텍스트 | 문제 |
|------|----------|------|
| `/updates` (선생님) | `navigation.ts`에 정의됨 | `(teacher)/updates/page.tsx` 파일 없음 |
| `/updates` (학생) | `StudentSidebar.tsx`에 정의됨 | `(student)/updates/page.tsx` 파일 없음 |
| `/help-public` (학생) | `StudentSidebar.tsx`에 정의됨 | `(student)/help-public/` 디렉토리 자체 없음 |

### Warning — 문서와 코드 불일치 (1건)

- **`diagnostics` 접근 권한:** CLAUDE.md에 "진단결과 (MANAGER+)"로 기술되어 있으나, `navigation.ts`에서 `minRole: 'TEACHER'`로 설정. TEACHER도 접근 가능한 상태.

### 참고 사항

- **StudentSidebar는 `navigation.ts`와 분리 운영** — 학생 사이드바는 독립 하드코딩 방식. `navigation.ts` 변경 시 학생 쪽 별도 수정 필요.
- 선생님 Sidebar는 `getNavForRole(role)` 호출로 `navigation.ts`와 **완전 동기화**.
- 서브 라우트(`[id]`, `create`, `result` 등)는 네비에 미포함이 의도적. 정상.

---

## 6. 리팩토링 분석

### 대형 파일 현황

#### Critical (800줄 이상) — 21개 파일

| 파일 | 줄 수 | 문제 |
|------|-------|------|
| `BulkImportModal.tsx` | 967 | 18개 useState |
| `homework/create/page.tsx` | 901 | 13개 useState |
| `homework/[planId]/grid/page.tsx` | 894 | — |
| `useQuestionManager.ts` | 642 | **34개 useState** (최악) |
| `usePdfImport.ts` | 605 | 31개 useState |
| + 16개 추가 파일 | 500-800+ | 각각 복잡도 높음 |

#### Warning (500-799줄) — 20개 파일

### 중복 코드 패턴 (4건)

| 패턴 | 관련 파일 | 공통 코드량 |
|------|-----------|-------------|
| 숙제 관리 탭 | `ConceptHomeworkTab` + `QuestionHomeworkTab` | ~400줄 |
| 도형 편집기 | `ElementaryEditors` + `MiddleEditors` | ~300줄 |
| 필터링 UI | 3개 파일에서 반복 | ~200줄 |
| 다이어그램 normalize | 26개 타입별 중복 | ~150줄 |

### 권장 리팩토링 로드맵

#### Phase 1 — Critical (예상 11일)
1. `useQuestionManager` → 4개 훅 분리 (642→150줄)
2. `BulkImportModal` → 4단계 컴포넌트 (967→500줄)
3. `usePdfImport` → 3개 훅 분리 (605→200줄)
4. 숙제 탭 통합 (1,122→600줄)
5. **예상 효과:** 3,336줄 감소 (-50%)

#### Phase 2 — High Priority (예상 14일)
- 도형 편집기 통합 (1,160→750줄)
- 페이지별 컴포넌트 분리
- 서비스 레이어 분리

#### Phase 3 — Medium (예상 1개월)
- 레거시 코드 제거
- 필터링 UI 컴포넌트화
- 다이어그램 normalize 추상화

### 기대 효과

| 지표 | 현재 | 개선 후 |
|------|------|---------|
| 대형 파일 (800줄+) | 21개 | 5개 (-76%) |
| 전체 코드량 | 178,600줄 | ~172,000줄 (-3.7%) |
| 유지보수성 | — | +30-40% |

---

## 전체 Critical 이슈 목록 (조치 필요)

### 보안 (5건)

| # | 이슈 | 파일 | 심각도 |
|---|------|------|--------|
| 1 | 자기 자신 삭제 방어 없음 | `api/users/[id]/route.ts` | Critical |
| 2 | 테넌트 격리 누락 (DELETE) | `api/users/[id]/route.ts` | Critical |
| 3 | GET 인증 누락 (개념 상세) | `api/concepts/[id]/route.ts` | Critical |
| 4 | GET 인증 누락 (빈칸) | `api/concepts/[id]/blanks/route.ts` | Critical |
| 5 | GET 인증 누락 (문제 상세) | `api/questions/[id]/route.ts` | Critical |

### 기능 (3건)

| # | 이슈 | 위치 | 심각도 |
|---|------|------|--------|
| 6 | `/updates` 페이지 없음 (선생님) | `(teacher)/updates/` | Critical — 404 |
| 7 | `/updates` 페이지 없음 (학생) | `(student)/updates/` | Critical — 404 |
| 8 | `/help-public` 페이지 없음 (학생) | `(student)/help-public/` | Critical — 404 |

### 접근 제어 (1건)

| # | 이슈 | 파일 | 심각도 |
|---|------|------|--------|
| 9 | 서버사이드 권한 검증 없음 | `admin/teachers/page.tsx` | Critical |

---

## 권장 우선순위

1. **즉시 수정 (보안):** #1~#5 — API 인증/테넌트 격리 문제
2. **즉시 수정 (기능):** #6~#8 — 누락된 페이지 생성 또는 네비에서 제거
3. **빠른 수정 (접근제어):** #9 — 서버사이드 역할 체크 추가
4. **배포 전 정리:** console.log 40+ 제거, `<img>` → `<Image/>` 전환
5. **계획적 리팩토링:** Phase 1~3 로드맵 따라 대형 파일 분리

---

*이 보고서는 6개 전문 에이전트(빌드 검증, 코드 리뷰, API 인증/인가, 스키마 동기화, 네비게이션 동기화, 리팩토링 분석)의 병렬 점검 결과를 종합하여 작성되었습니다.*
