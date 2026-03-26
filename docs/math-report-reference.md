# math report 프로젝트 참고 자료

> **출처**: `D:/math report` (수학 시험지 AI 분석 플랫폼)
> **용도**: MathLab 기능 확장 시 참고 (AI 에이전트 패턴 + 보고서 템플릿)

---

## 1. AI 에이전트 패턴

### 아키텍처: Orchestrator + 9개 전문 에이전트

```
기본 분석 (Gemini Vision → 문항별 난이도/유형/배점)
    │
    ▼
Orchestrator (순차 조율)
    ├── WeaknessAgent → 취약점 프로필
    ├── LearningAgent → 8주 학습 계획 (취약점 기반)
    ├── PredictionAgent → 성과 예측 (취약점+학습계획 기반)
    ├── CommentaryAgent → 시험 총평
    ├── TopicStrategyAgent → 단원별 맞춤 전략
    ├── ScoreLevelPlanAgent → 점수대별 학습 계획
    ├── ExamPrepStrategyAgent → D-day 시험 대비
    └── TrendsInsightsAgent → 출제 경향 분석
```

**핵심 설계 원칙:**
- 모든 에이전트는 **AI 실패 시 규칙 기반 폴백** 보유
- JSON 구조화 출력 (`responseMimeType: 'application/json'`)
- 에이전트 간 **의존성 체인**: 취약점 → 학습계획 → 성과예측

---

### 에이전트별 프롬프트 & 출력 스키마

#### 1) WeaknessAgent (취약점 분석)
- **temperature**: 0.2
- **입력**: 문항별 난이도/유형/배점/정오답
- **출력**:
```json
{
  "difficulty_weakness": {
    "high": { "severity": "critical|high|medium|low", "main_issue": "주요 문제점" }
  },
  "type_weakness": {
    "calculation": { "severity": "...", "main_issue": "..." }
  },
  "topic_weaknesses": [
    { "topic": "대단원 > 소단원", "severity_score": 0.0~1.0, "recommendation": "학습 추천" }
  ],
  "mistake_patterns": [
    { "pattern_type": "calculation_error|concept_gap|careless|time_pressure", "description": "설명", "example_questions": [1,5] }
  ],
  "cognitive_assessment": {
    "knowledge": { "achieved": 0~100, "gap_reason": "이유" },
    "comprehension": { "achieved": 0~100, "gap_reason": "..." },
    "application": { "achieved": 0~100, "gap_reason": "..." },
    "analysis": { "achieved": 0~100, "gap_reason": "..." }
  }
}
```
- **폴백 규칙**: 고난도 비율 기반 severity 계산, 인지 수준 기본값 (knowledge=80, comprehension=65, application=50, analysis=35)

#### 2) LearningAgent (학습 계획 생성)
- **temperature**: 0.3
- **입력**: 기본 분석 + 취약점 프로필
- **출력**:
```json
{
  "total_duration": "8주",
  "weekly_hours": 12,
  "phases": [
    {
      "phase_number": 1,
      "title": "기초 개념 복습",
      "duration": "2주",
      "topics": [
        { "topic": "단원명", "duration_hours": 3, "resources": ["개념 강의", "기본 문제 20개"], "checkpoint": "기본 문제 5개 100% 정답" }
      ]
    }
  ],
  "daily_schedule": [
    { "day": "월", "topics": ["주요 학습 내용"], "duration_minutes": 90, "activities": ["개념 학습 30분", "문제 풀이 60분"] }
  ],
  "expected_improvement": { "current_score": 65, "target_score": 85, "confidence": 0.78 }
}
```
- **규칙**: 3단계 (기초 2주 → 심화 4주 → 실전 2주), 주 10-15시간 현실적 학습량

#### 3) PredictionAgent (성과 예측)
- **temperature**: 0.2
- **입력**: 기본 분석 + 취약점 + 학습 계획
- **출력**:
```json
{
  "current_percentile": 35,
  "trajectory": [
    { "timeframe": "3개월", "predicted_score": 72, "confidence_min": 68, "confidence_max": 76, "effort": "주 12시간" }
  ],
  "goal": { "description": "상위 10%", "current_prob": 0.25, "with_plan_prob": 0.78, "optimized_prob": 0.92 },
  "risks": [
    { "factor": "고난도 문제 취약", "impact": "critical", "mitigation": "심화 문제 집중 학습" }
  ]
}
```
- **폴백**: 주 3시간당 1점 상승, 신뢰구간 ±4점, 위험 요소는 인지 수준 기반 자동 생성

#### 4) CommentaryAgent (시험 총평)
- **temperature**: 0.4
- **핵심**: 차트에서 이미 보이는 통계(%) 중복 금지, 고유한 인사이트만 제공
- **출력**:
```json
{
  "overview_summary": "종합 요약 2-3문장",
  "exam_intent": "출제 의도 추론 (상위권 변별/기초 확인 등)",
  "notable_questions": [
    { "question_number": 15, "tag": "고배점|함정|시간주의|킬러|기본|연계|서술형주의", "reason": "이유" }
  ],
  "topic_priorities": [
    { "topic": "미분", "question_count": 5, "total_points": 22, "priority": 1 }
  ],
  "strategic_advice": "전략적 조언 1-2문장",
  "key_insights": ["고유한 인사이트 1", "인사이트 2"]
}
```

#### 5) TopicStrategyAgent (단원별 맞춤 전략)
- **temperature**: 0.5
- **핵심 주의사항**: "각 단원의 전략은 반드시 서로 다른 내용이어야 합니다. 복사 금지."
- **출력**:
```json
{
  "strategies": [
    {
      "topic": "단원명",
      "weakness_summary": "취약점 요약",
      "priority": "high|medium|low",
      "study_methods": [{ "method": "방법명", "description": "설명", "estimated_time": "2시간" }],
      "key_concepts": ["핵심 개념 3-7개"],
      "practice_tips": ["문제 풀이 팁 3-5개"],
      "common_mistakes": ["흔한 실수 2-5개"],
      "recommended_resources": ["추천 자료 2-4개"],
      "progress_checklist": ["학습 진도 체크 3-5개"]
    }
  ],
  "overall_guidance": "전반적인 학습 방향",
  "study_sequence": ["우선 학습 순서"]
}
```

#### 6) ScoreLevelPlanAgent (점수대별 학습 계획)
- **temperature**: 0.6
- **점수대 분류**: 90%+=최상위, 80-89%=상위, 70-79%=중상위, 60-69%=중급, 50-59%=중하위, <50%=기초
- **출력**:
```json
{
  "characteristics": {
    "score_range": "60-70점", "level_name": "중급",
    "strengths": ["강점"], "weaknesses": ["약점"], "typical_mistakes": ["전형적 실수"]
  },
  "improvement_goal": {
    "target_score_range": "75-85점", "estimated_duration": "8주",
    "key_focus_areas": ["집중 영역"], "success_criteria": ["달성 기준"]
  },
  "study_phases": [
    { "phase_name": "기초 다지기", "duration": "2주", "objectives": [], "activities": [], "study_hours_per_week": 10, "milestone": "점검 기준" }
  ],
  "daily_routine": ["일일 루틴"],
  "motivational_message": "격려 메시지"
}
```

#### 7) ExamPrepStrategyAgent (D-day 시험 대비)
- **temperature**: 0.6
- **입력**: 현재 점수 + 취약 단원 + 시험까지 남은 일수
- **출력**:
```json
{
  "target_score_improvement": "10-15점 향상",
  "priority_areas": [
    { "topic": "단원명", "reason": "우선순위 이유", "key_points": ["집중 포인트"], "estimated_hours": 3 }
  ],
  "daily_plans": [
    { "day_label": "D-7", "focus": "집중 사항", "activities": ["활동"], "time_allocation": "3시간", "dos": ["할 것"], "donts": ["하지 말 것"] }
  ],
  "exam_day_strategy": {
    "before_exam": ["시험 전 체크"], "during_exam": ["시험 중 전략"],
    "time_management": ["시간 관리 팁"], "stress_management": ["긴장 완화"]
  },
  "final_advice": "마지막 조언"
}
```
- **수준별 전략 내장**: 하위권(쉬운 문제 완벽하게), 중위권(유형 완성), 상위권(만점+실수 제로)
- **4주 타임라인**: D-28~D-22(개념), D-21~D-15(유형), D-14~D-8(실전), D-7~D-1(마무리), D-day(실전)

#### 8) TrendsInsightsAgent (출제 경향 분석)
- **temperature**: 0.4
- **입력**: 여러 시험의 통계 데이터 (난이도/단원/유형/형식 분포)
- **출력**:
```json
{
  "overall_trend": "전반적 경향 2-3문장",
  "key_patterns": ["핵심 패턴 3개"],
  "difficulty_analysis": "난이도 트렌드",
  "topic_focus": "집중 출제 단원 분석",
  "preparation_tips": ["실전 대비 팁 3개"],
  "future_prediction": "향후 출제 예측 (시험 3개 이상일 때)"
}
```

---

### 프롬프트 설정 데이터 (prompt_config)

| 설정 | 용도 |
|------|------|
| **MATH_TOPICS** | 중1~고3 학년별 단원-소단원 전체 분류표 |
| **DIFFICULTY_SYSTEM_4LEVEL** | 4단계 난이도 (concept/pattern/reasoning/creative) 정량 기준 |
| **ESSAY_GRADING_GUIDE** | 서술형 채점 가이드 (4단계 필수 구조, 감점 요인) |
| **MATH_COMMON_MISTAKES** | 과목별 흔한 실수 목록 (공통수학~중3) |
| **PREREQUISITE_MAPPING** | 중→고 교육과정 연계 (선수학습 진단) |
| **SCORE_LEVEL_STRATEGIES** | 수준별 학습 전략 (하위/중위/상위) |
| **MATH_MIDDLE_STUDY_POINTS** | 중학교 단원별 핵심 학습 포인트 |

---

## 2. 보고서 템플릿 시스템

### 4가지 템플릿

| 템플릿 | 대상 | 핵심 구성 | 특징 |
|--------|------|----------|------|
| **DetailedTemplate** | 교사/전문가 | 5개 탭 (기본분석/AI코멘트/학습대책/정오답/확장) | 차트 풍부, 전문적 |
| **SummaryTemplate** | 빠른 확인 | 핵심지표 카드, 난이도/유형 분포, 취약단원 | 카드 그리드 |
| **ParentTemplate** | 학부모 | 종합평가, 오답원인, 액션아이템, 학습도움판단, 향상전망, 응원 | 쉬운 언어 |
| **PrintTemplate** | 인쇄 | 요약표, 난이도분포표, 문항별분석표, 유형별분포표 | 흑백 테이블 |

### ParentTemplate 고유 기능 (MathLab에 가장 참고할 만함)

1. **종합 평가**: 점수 + 정답률 + 난이도(쉬운편/보통/어려운편) + 핵심 메시지
2. **오답 원인 이분화**: 단순실수 vs 개념부족 (학부모가 이해하기 쉽게)
3. **액션 아이템**: "오늘/이번 주/다음 주" 시간 기반 할일 목록
4. **학습 도움 판단**: 혼자 가능(self) / 단기특강(tutor) / 학원추천(academy) 자동 판별
5. **성적 향상 전망**: 현재점수 → 목표점수 시각화
6. **응원 메시지**: 수준별 격려

### 학습 대책 시스템 (10개 섹션)

| # | 섹션 | 설명 |
|---|------|------|
| 1 | 맞춤형 학습 대책 | 정오답 분석 기반 |
| 2 | 출제 영역별 분석 | 대단원 그룹핑 아코디언 |
| 3 | 영역별 학습 전략 | 교육과정 기반 + 규칙 기반 |
| 4 | 서술형 대비 | 체크리스트 + 심화 가이드 |
| 5 | 시간 배분 전략 | 단원별 권장 시간 |
| 6 | 자주하는 실수 | 실수 유형 + 예방법 |
| 7 | 학년별 연계 경고 | 필수/중요/권장 연계 |
| 8 | 킬러 문항 경고 | 고난도 함정 + 해결 핵심 |
| 9 | 수준별 학습 전략 | 하위/중위/상위권 + 교재 추천 |
| 10 | 4주 타임라인 | 시험 4주전 준비 계획 |

### 차트 컴포넌트 (11종)

| 차트 | 용도 |
|------|------|
| DifficultyPieChart | 난이도 분포 (3/4단계 자동 감지) |
| TypePieChart | 유형 분포 |
| TopicDistributionChart | 단원 분포 (계층형) |
| PointsDistributionChart | 배점 분포 (객관식/서답형 분리) |
| FormatDistributionChart | 문항 형식 분포 |
| TopicAnalysisChart | 과목별+단원별 출제현황 |
| TypeRadarChart | 유형별 균형 레이더 |
| DifficultyPointsAreaChart | 난이도별 누적 배점 |
| QuestionPointsChart | 문항별 배점+난이도 콤보 |
| CognitiveLevelRadar | Bloom 인지수준 레이더 |
| ScoreTrajectoryChart | 성적 예측 라인 |

---

## 3. MathLab 적용 아이디어

### 즉시 적용 가능
- **레벨테스트 보고서 확장**: 현재 Claude 1개 → 에이전트 패턴으로 취약점/학습계획/예측 분리
- **학부모용 보고서 추가**: ParentTemplate 패턴 (쉬운 언어 + 액션아이템 + 학습도움판단)

### 중기 적용 가능
- **시험 결과 분석 고도화**: WeaknessAgent + TopicStrategyAgent 패턴으로 시험 후 자동 분석
- **인쇄용 보고서**: PrintTemplate 패턴으로 성적표 인쇄 지원

### 참고만
- 크레딧 시스템 → 이미 이용권 시스템 있음
- 출제 경향 분석 → 학원 LMS에서 우선순위 낮음
