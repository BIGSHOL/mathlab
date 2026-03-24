# MathLab 스켈레톤 로딩 UI 점검 보고서

> **점검일:** 2026-03-24
> **점검 범위:** src/ 전체 Skeleton 사용처, loading.tsx, animate-pulse 직접 사용

---

## 요약

| 항목 | 수치 |
|------|------|
| Skeleton 임포트 파일 | 40개 |
| loading.tsx 파일 | 3개 |
| animate-pulse 직접 사용 | 16개 (상태 표시용으로 적절) |
| PageLoadingSkeleton 정의 | 5 variant (미사용) |
| **크기 일치율** | **90%+** |
| **불일치 수정** | 2건 (즉시 수정 완료) |

---

## 수정 완료 (2건)

### 1. LicenseUsageTab 스켈레톤 크기 조정
- **파일:** `src/components/teacher/licenses/LicenseUsageTab.tsx`
- **변경 전:** `h-10` + `h-48` + `h-64` + `h-48`
- **변경 후:** `h-9` + `h-56` + `h-56` + `h-48`
- **이유:** 기간 선택 버튼(`h-9`), 사용률 차트(`h-56` = p-4 + 제목 + 7행 + 범례), 일별 활동(`h-56` = p-4 + 필터 + SVG h-36)

### 2. reports/page.tsx 리포트 본문 높이
- **파일:** `src/app/(teacher)/reports/page.tsx`
- **변경 전:** `h-32` (128px)
- **변경 후:** `h-48` (192px)
- **이유:** 리포트 생성 중 플레이스홀더가 실제 리포트 콘텐츠 대비 과소했음

---

## 정확하게 일치하는 주요 사례

### loading.tsx 파일 (3개 모두 정확)

| 파일 | 스켈레톤 수 | 판정 |
|------|-----------|------|
| `(student)/ranking/loading.tsx` | 25개 | 포디움 w-14/20 h-14/20, 리스트 행 정확 |
| `(student)/dashboard/loading.tsx` | 35개 | 배너 h-60, 통계 카드, 진행 학습 등 정확 |
| `(teacher)/overview/loading.tsx` | 22개+ | 통계 h-20, 리스트 h-3/4 정확 |

### 학생 페이지

| 파일 | 주요 크기 | 판정 |
|------|----------|------|
| `my-tests/page.tsx` | 제목 h-7 w-28, 카드 h-6 w-48 | 정확 |
| `concepts/[id]/page.tsx` | 네비 w-8 h-8, 제목 h-5 w-32 | 정확 |
| `practice/arithmetic/homework` | 아바타 w-10 h-10, 텍스트 h-4 | 정확 |
| `quiz/[id]/play` | 다크모드 !bg-slate-700, h-6/h-20 | 정확 |

### 선생님 페이지

| 파일 | 주요 크기 | 판정 |
|------|----------|------|
| `admin/tenants` | 카드 h-24 rounded-xl | 정확 |
| `courses/[id]` | 아이콘 w-9 h-9, 제목 h-7 w-48 | 정확 |
| `homework` | 구성요소별 적절 | 정확 |

---

## 크기 규격 표준 (프로젝트 전체 통일)

### 텍스트 크기 매핑

| Skeleton 높이 | 대응하는 텍스트 | Tailwind |
|---------------|---------------|----------|
| `h-3` | 부제/라벨 | text-xs (12px) |
| `h-4` | 본문/설명 | text-sm (14px) |
| `h-5` | 소제목 | text-base (16px) |
| `h-6` | 제목 | text-lg (18px) |
| `h-7` | 대제목 | text-xl (20px) |

### 아바타/아이콘 크기 매핑

| Skeleton 크기 | 용도 |
|--------------|------|
| `w-4 h-4` | 소형 아이콘 |
| `w-6 h-6` / `w-8 h-8` | 표준/버튼 아이콘 |
| `w-10 h-10` | 표준 아바타 |
| `w-14 h-14` / `w-20 h-20` | 대형 아바타 (랭킹 포디움) |

---

## animate-pulse 직접 사용 현황

모두 **상태 표시용**으로 적절하게 사용 (Skeleton과 혼동 없음):

| 파일 | 용도 | 판정 |
|------|------|------|
| `my-tests/[id]/play.tsx` | "시험 준비 중" 텍스트 깜박임 | 적절 |
| `my-tests/[id]/play.tsx` | 시간 경고 깜박임 | 적절 |
| `quiz/[id]/play.tsx` | 시계 아이콘 깜박임 | 적절 |
| `subjects/page.tsx` | 활성 상태 점 | 적절 |
| `reports/page.tsx` | "리포트 생성 중" | 적절 |
| `RankingList.tsx` | 내 순위 보더 강조 | 적절 |
| `dashboard/loading.tsx` | 차트 바 (동적 높이) | 적절 (style 필요) |

---

## 참고: PageLoadingSkeleton 미사용

`src/components/ui/PageLoadingSkeleton.tsx`에 5개 variant(detail, list, form, result, grid)가 정의되어 있으나 실제 사용 0건. 페이지별 레이아웃이 고유하여 generic variant 대신 직접 Skeleton 조합을 선호한 것으로 판단. 향후 새 페이지 추가 시 활용 검토 가능.

---

*이 보고서는 프로젝트 전체 스켈레톤 사용 현황 전수 조사 결과입니다.*
