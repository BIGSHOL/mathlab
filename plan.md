# 주변 학교 기출 비교 분석 기능

## 개요
AI 총평(CommentaryAgent) 생성 시, 주변 학교의 기존 기출 분석 데이터를 프롬프트에 포함하여 비교 분석을 수행한다.

## 구현 계획

### 1단계: 주변 학교 기출 데이터 수집 유틸 생성
**파일: `src/lib/exam-analysis/nearby-school-data.ts`** (신규)

```typescript
interface NearbyExamSummary {
  schoolName: string;
  distance: number; // km
  examTitle: string;
  analyzedAt: Date;
  totalQuestions: number;
  totalPoints: number;
  difficultyDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  averageDifficulty: number;
  topicSummary: string; // "단원1: N문항, 단원2: N문항"
}

interface NearbyComparisonData {
  currentSchool: { name: string; latitude?: number; longitude?: number } | null;
  nearbyExams: NearbyExamSummary[];     // 주변 학교 기출 (반경 5km)
  sameSchoolExams: NearbyExamSummary[];  // 같은 학교 이전 기출
}
```

**로직:**
1. `ExamAnalysis.examPaperId` → `ExamPaper.schoolName` 가져오기
2. `schoolName` → `School` 테이블에서 name 매칭 (contains, case-insensitive)
3. 매칭된 School의 `latitude`, `longitude`로 주변 학교 검색:
   - 같은 `schoolType` (중학교끼리, 고등학교끼리)
   - Haversine 공식으로 반경 5km 이내
   - Prisma raw SQL 또는 JS에서 필터링 (같은 regionCode 학교만 먼저 가져와서 JS에서 거리 계산 — 더 간단)
4. 주변 학교 이름 목록으로 `ExamPaper` 검색 → `ExamAnalysis` 결과 수집
5. 같은 schoolName의 다른 ExamPaper → ExamAnalysis도 수집
6. 요약 통계만 추출하여 반환

### 2단계: 오케스트레이터에서 데이터 주입
**파일: `src/lib/exam-analysis/agents/orchestrator.ts`** (수정)

- commentary 에이전트 실행 전, `findNearbyExamData(analysisId)` 호출
- 결과를 `AgentInput.nearbyComparison`으로 전달

### 3단계: CommentaryAgent 프롬프트 확장
**파일: `src/lib/exam-analysis/agents/commentary-agent.ts`** (수정)

프롬프트에 새 섹션 추가:
```
## 주변 학교 기출 비교 데이터

### 같은 학교 이전 기출
- [제목] (분석일): 난이도 Level X, 수와연산 N/문자와식 N/함수 N/기하 N/확통 N

### 반경 5km 내 주변 학교 기출
- [학교명] (Xkm) [제목]: 난이도 Level X, ...
```

출력 형식에 선택적 필드 추가:
```json
{
  "nearby_comparison": "주변 학교와의 비교 분석 (2-3문장). 없으면 null"
}
```

### 4단계: CommentaryResult 타입 확장
**파일: `src/lib/exam-analysis/agents/commentary-agent.ts`** (수정)

```typescript
export interface CommentaryResult {
  // ... 기존 필드
  nearby_comparison?: string; // 주변 학교 비교 분석 (optional)
}
```

### 5단계: UI에서 비교 분석 표시
**파일: `src/components/exam-analysis/ExtendedReportView.tsx`** (수정)

- `nearby_comparison` 필드가 있으면 총평 하단에 "📊 주변 학교 비교" 섹션으로 표시

## 비용/성능 고려
- GPS 계산: 같은 regionCode 학교만 먼저 필터링 후 JS에서 Haversine → DB 부하 최소
- 총평 생성 시 1회만 실행, 결과는 DB에 영구 저장
- 프롬프트 토큰: 요약 통계만 포함하여 ~200토큰 추가 (전체 8192 대비 미미)
- 주변 학교 기출이 없으면 해당 섹션 생략 (기존 동작과 동일)

## 파일 변경 목록
1. `src/lib/exam-analysis/nearby-school-data.ts` — **신규** (주변 학교 검색 + 기출 수집)
2. `src/lib/exam-analysis/agents/orchestrator.ts` — **수정** (commentary 실행 전 데이터 주입)
3. `src/lib/exam-analysis/agents/commentary-agent.ts` — **수정** (프롬프트 + 출력 타입 확장)
4. `src/components/exam-analysis/ExtendedReportView.tsx` — **수정** (비교 분석 UI 표시)
