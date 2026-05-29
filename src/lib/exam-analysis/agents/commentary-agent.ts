/**
 * 종합 코멘터리 에이전트
 *
 * 시험 분석 결과를 선생님용 전문 분석 리포트로 변환
 * - 출제 경향, 난이도 분석, 지도 방향 제시
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent, deepNormalizeMath, type AgentInput } from './base-agent';
import type { AgentType } from '../constants';
import { DIFFICULTY_LEGACY_MAP, ABILITY_DOMAIN_LABELS } from '../constants';
import type { BasicAnalysisResult, WeaknessProfile, LearningPlan } from '../types';
import { MIDDLE_SCHOOL_CURRICULUM } from '../data/curriculum';
import type { GradeCurriculum } from '../data/curriculum';
import type { NearbyComparisonData, NearbyExamSummary } from '../nearby-school-data';

function normalizeDiff(key: string): string {
  return DIFFICULTY_LEGACY_MAP[key] || key;
}

// ── 영문 enum → 한글 라벨 (AI 입력/출력 정규화용) ──
const QUESTION_TYPE_LABELS_KO: Record<string, string> = {
  number: '수와 연산',
  algebra: '문자와 식',
  function: '함수',
  geometry: '기하',
  statistics: '확률과 통계',
};

function toKoreanType(raw: string | null | undefined): string {
  if (!raw) return '미분류';
  const k = String(raw).toLowerCase();
  return QUESTION_TYPE_LABELS_KO[k] || raw;
}

function toKoreanAbility(raw: string | null | undefined): string {
  if (!raw) return '계산력';
  const k = String(raw).toLowerCase();
  return ABILITY_DOMAIN_LABELS[k] || raw;
}

// ── 영문 enum 차단 (AI 출력 방어막 — UI normalizeKoreanLabels 와 동일 매핑) ──
const ENUM_KO_MAP: Record<string, string> = {
  CALCULATION: '계산력',
  UNDERSTANDING: '이해력',
  PROBLEM_SOLVING: '문제해결력',
  'PROBLEM SOLVING': '문제해결력',
  REASONING: '추론력',
  NUMBER: '수와 연산',
  ALGEBRA: '문자와 식',
  FUNCTION: '함수',
  GEOMETRY: '기하',
  STATISTICS: '확률과 통계',
};

function stripEnglishEnums(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [k, v] of Object.entries(ENUM_KO_MAP)) {
    const re = new RegExp(`\\b${k.replace(/ /g, '[ _]')}\\b`, 'g');
    out = out.replace(re, v);
  }
  return out;
}

/**
 * V3 응답 텍스트에서 raw HTML 태그 제거.
 * AI가 가끔 <span style="color:#6741D9">, <mark>, <font color="..."> 등 V2 article-generator 패턴을
 * 학습하여 임의로 삽입함 → 검정 배경의 피처 박스에서 안 보이는 글씨 발생.
 * V3는 오직 **markdown bold**만 허용. 다른 강조 마크업은 서버에서 strip.
 */
function stripRawHtml(text: string): string {
  if (!text) return text;
  return text
    // span/mark/font/em/i/u/sub/sup 등 인라인 태그 제거 (내용 보존)
    .replace(/<\/?(?:span|mark|font|small|em|i|u|sub|sup|big|tt)[^>]*>/gi, '')
    // <b>는 markdown ** 와 중복이므로 제거 (내용 보존)
    .replace(/<\/?b>/gi, '')
    // <strong>은 markdown으로 변환 — **text**
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    // 인라인 color/background-color 스타일 직접 노출 시 제거
    .replace(/\s*style="[^"]*color\s*:[^";]+;?[^"]*"/gi, '')
    .replace(/\s*style="[^"]*background[^"]*"/gi, '');
}

/** stripRawHtml + stripEnglishEnums 한 번에 적용 — V3 텍스트 정규화 */
function normalizeText(text: string): string {
  return stripEnglishEnums(stripRawHtml(text));
}

/** 난이도 분포에서 5단계 합산 값 추출 */
function getDiffCounts(diff: Record<string, number>): { level1: number; level2: number; level3: number; level4: number; level5: number } {
  const get = (keys: string[]) => keys.reduce((s, k) => s + (diff[k] || 0), 0);
  return {
    level1: get(['1', 'concept']),
    level2: get(['2', 'pattern']),
    level3: get(['3']),
    level4: get(['4', 'reasoning']),
    level5: get(['5', 'creative']),
  };
}

// ── 코멘터리 출력 타입 ──

export interface NotableQuestion {
  question_number: number | string;
  comment: string;
}

export interface TeachingRecommendation {
  topic: string;
  priority: number; // 1-5
  reason: string;
}

// 하위 호환: 기존 DB 데이터에 study_priority/encouragement가 있을 수 있음
export interface ScoreStrategy {
  grade: string;    // "A등급" 등
  target: string;   // "90점 이상"
  strategy?: string; // 레거시 (기존 DB 호환)
  points?: string[]; // 목록형 포인트 (3~4개)
}

export interface CommentaryResult {
  overall_comment: string;
  exam_characteristics?: string[];
  score_strategy?: string;  // 레거시 (기존 DB 호환)
  score_strategies?: ScoreStrategy[];
  strength_areas: string[];
  improvement_areas: string[];
  notable_questions: NotableQuestion[];
  teaching_recommendations?: TeachingRecommendation[];
  nearby_comparison?: string; // 주변 학교 기출 비교 분석 (있을 때만)
  // 레거시 (기존 DB 호환)
  study_priority?: TeachingRecommendation[];
  encouragement?: string;

  // ─────────────────────────────────────────────────────────────
  // V3 리디자인 신규 필드 (모두 optional, V3 프롬프트로 별도 호출)
  // 시안: data/handoff-exam-analysis-v3/exam-analysis-{commentary,blog-naver}-hifi.html
  // graceful degradation: 필드 없으면 컴포넌트가 hidden 또는 legacy fallback
  // ─────────────────────────────────────────────────────────────

  /** 헤더 키커 — "시험 분석 · 안양외고 2학기 중간고사" 형식 */
  blog_kicker?: string;

  /** 메인 헤드라인 — "변별의 무게중심이 이동했다 — '킬러'에서 '연결'로" */
  blog_headline?: string;

  /** 서브 헤드라인 (dek) — 헤드라인 부연 1~2문장 */
  blog_dek?: string;

  /** 피처 박스 — 거대 숫자 + 짧은 분석 1개 */
  feature_callout?: {
    big_number: string;        // "2.9"
    big_number_unit?: string;  // "/5"
    big_number_label: string;  // "2025 평균 난이도"
    title: string;             // "30문항 중 17%만 '킬러'였다"
    body: string[];            // 2~3 문단
  };

  /** 등급별 컷 — AI 가 학생 응답 분포 기반 추정. 없으면 hidden */
  grade_cuts?: Array<{
    grade: string;             // "1등급"
    score: number;             // 88
    previous_score?: number;   // 92
    delta?: number;            // -4
    student_count?: number;    // 3
  }>;

  /** 단원별 정답률 + 라벨 (강점·약점·중립) */
  topic_performance?: Array<{
    topic: string;             // "이차함수"
    question_count: number;    // 8
    correct_rate: number;      // 0.80 (0-1)
    label: 'strong' | 'weak' | 'neutral';
  }>;

  /** 블로그 Q&A — 학부모 시점 5문항 (학교 없으면 4문항). AI 못 만들면 빈 배열 */
  blog_qa?: Array<{
    question: string;          // "올해 시험이 작년보다 쉬워졌다는데, 정말인가요?"
    answer: string[];          // 1~2 문단 (markdown 가능, 강조는 **로)
    data_box?: {               // 답변 아래 데이터 박스 (선택)
      label: string;           // "DATA · 난이도 분포 비교"
      kind: 'comparison' | 'bars' | 'table';
      rows: Array<{ label: string; value: string; highlight?: boolean }>;
    };
  }>;

  /** 결론 박스 — "다음 시험을 준비하는 학생에게" */
  conclusion?: {
    kicker?: string;           // "CONCLUSION · 다음 시험을 준비하는 학생에게"
    body: string;              // 2~3 문장
  };

  /** 큰 인용구 (블로그 본문 중간 삽입용) */
  pull_quote?: {
    text: string;              // 인용 본문
    cite?: string;             // 출처 라벨
  };

  // ─────────────────────────────────────────────────────────────
  // V4 (갈수학학원 스타일 — 테이블 중심) 필드 — 2026-05-27 추가
  // V3와 별도 prompt로 lazy 생성. 사용자가 V4 토글 클릭 시만 API 호출.
  // 모든 필드 optional — V4 미생성 분석본은 hidden + [V4 생성] 버튼 표시.
  // ─────────────────────────────────────────────────────────────

  /** V4 시험 개요 — 학부모가 한눈에 스캔할 핵심 정보 */
  v4_exam_overview?: {
    title: string;              // "영신여고 1학년 1학기 중간고사"
    grade: string;              // "고1"
    school?: string | null;     // "영신여자고등학교"
    range: string;              // "수와 식의 계산 · 일차방정식 · 일차부등식"
    total_questions: number;    // 21
    total_points: number;       // 100
    avg_difficulty_label: string;   // "어려움" (정성)
    peak_difficulty: string;        // "Lv4 심화 6문항"
    essay_summary?: string;     // "서술형 3문항 · 35점" 또는 null
    expected_grade_cut?: string;    // "예상 1등급 컷: 88점 / 2등급: 78점" (v1.2.0 추가)
    one_liner: string;          // 한 줄 요약 — "변별력 위주 출제, 응용 문제 비중 높음"
  };

  /** V4 들어가며 — 시험 인상 전달 단락 (v1.2.0 추가, 갈수학 ▶ 들어가며) */
  v4_intro?: string;

  /** V4 학원 차별화 전략 — N가지 학원 마케팅 포인트 (v1.2.0 추가, 갈수학 "1등급을 위한 학원의 N가지 전략") */
  v4_academy_strategy?: Array<{
    title: string;              // "1. 단원별 핵심 유형 완전 마스터"
    body: string;               // 짧은 설명 (1~2 문장)
  }>;

  /** V4 문제 번호별 난이도/단원 매핑 (행 색상 코딩) */
  v4_difficulty_rows?: Array<{
    question_number: string | number;
    topic: string;              // "이차방정식의 활용 — 거리·속력·시간"
    sub_topic?: string;         // 세부 개념 (선택)
    difficulty: '1' | '2' | '3' | '4' | '5';
    points: number;
    analysis_short?: string;    // 한 줄 해설 (v1.2.0 추가, 갈수학 "문항 분석" 컬럼)
  }>;

  /** V4 출제 특징 요약 (회색 박스 안 자연 단락) */
  v4_exam_features?: {
    headline: string;           // 강조 한 줄 — "표준 이상 난이도가 67%, 변별력 위주"
    body: string;               // 2~3 문장 분석 단락
  };

  /** V4 주요 공정 분석 — 출제 영역별 단락 배열 */
  v4_main_analysis?: Array<{
    heading: string;            // "1. 수와 식의 계산" (영역명)
    body: string;               // 영역별 2~4 문장 분석
  }>;

  /** V4 이전 시험 비교/대조 (v1.2.0 추가, 갈수학 ▶ 이전 시험과의 비교/대조)
   * AI가 학교/학년 표준 진도와 동일 시험 분포를 비교 분석. 데이터 없으면 hidden. */
  v4_previous_comparison?: {
    headline: string;           // "작년 대비 변별력 강화, 서술형 비중 5%p 증가"
    body: string;               // 2~3 문장 비교 분석
  };

  /** V4 주요 킬러 문항 분석 — 특정 문항별 자세 해설 (v1.2.0 추가, 갈수학 ▶ 주요 문항 분석)
   * v4_main_analysis가 영역별이라면 이것은 특정 번호 3~5개 골라 자세 분석.
   * 학부모가 "어떤 번호가 어떻게 어려운지" 정확히 파악 가능. */
  v4_key_questions?: Array<{
    question_number: string | number;
    title: string;              // "선택형 17번 — 이차함수 그래프 평행이동 (Lv4, 5점)"
    body: string;               // 자세한 출제 의도/풀이 포인트/함정 (3~5 문장)
  }>;

  /** V4 기말 대비 전략 — 영역별 현재 상태 + 권장 액션 (표) */
  v4_final_strategy?: Array<{
    area: string;               // "다음 시험: 일차함수와 그래프"
    current_status: string;     // "현재 학습 상태"
    action: string;             // "권장 학습 액션"
  }>;
}

// ── V3 신규 필드 추출 타입 (Two-pass Claude 호출용) ──

type V3Extension = Pick<
  CommentaryResult,
  | 'blog_kicker'
  | 'blog_headline'
  | 'blog_dek'
  | 'feature_callout'
  | 'grade_cuts'
  | 'topic_performance'
  | 'blog_qa'
  | 'conclusion'
  | 'pull_quote'
  // V3 강화 (2026-05-29): V4 핵심 5개 콘텐츠를 단일 통합 프롬프트로 흡수.
  // 필드명은 v4_* 유지 (V4 코드 비활성화 후에도 재활성 시 호환). 렌더링만 V3 스타일.
  | 'v4_difficulty_rows'
  | 'v4_main_analysis'
  | 'v4_key_questions'
  | 'v4_previous_comparison'
  | 'v4_final_strategy'
>;

// ── V4 신규 필드 추출 타입 (lazy Claude 호출용) ──

export type V4Extension = Pick<
  CommentaryResult,
  | 'v4_exam_overview'
  | 'v4_intro'
  | 'v4_academy_strategy'
  | 'v4_difficulty_rows'
  | 'v4_exam_features'
  | 'v4_main_analysis'
  | 'v4_previous_comparison'
  | 'v4_key_questions'
  | 'v4_final_strategy'
>;

// ── V3 시스템 프롬프트 (blog-prompt-spec.md + Phase 0 시안 검증 완료) ──

const SYSTEM_PROMPT_V3 = `너는 한국 중·고등학교 수학 시험 분석가다. 학원이 학부모에게 보여줄 블로그 글을 위한 신규 V3 필드를 생성한다.

## 출력 형식 — 오직 아래 키만 포함한 JSON 객체 하나만 출력 (코드펜스/설명문 금지)

{
  "blog_kicker": "시험 분석 · {학교명} {학년} {시험명}",
  "blog_headline": "시험의 핵심을 한 문장으로 (예: 변별의 무게중심이 이동했다)",
  "blog_dek": "헤드라인을 풀어 설명하는 1~2 문장 부연",
  "feature_callout": {
    "big_number": "강조할 단일 숫자 (예: 2.9, 17%, -4점)",
    "big_number_unit": "단위 (예: /5, 점, %) — 없으면 생략",
    "big_number_label": "그 숫자가 무엇인지 (예: 2025 평균 난이도)",
    "title": "거대 숫자를 풀어 설명하는 헤드라인 — 일부에 따옴표로 강조 가능 (예: 30문항 중 '17%만' 킬러였다)",
    "body": ["2~3 문단 부연 설명 — **굵게**로 데이터 인용"]
  },
  "blog_qa": [
    {
      "question": "학부모 시점의 자연스러운 질문 ('우리 아이...' 같은 친근한 톤)",
      "answer": ["1~2 문단. 데이터 인용은 **굵게**. '~습니다' 존댓말로 통일."],
      "data_box": {
        "label": "DATA · 무엇에 관한 데이터인지",
        "kind": "comparison | bars | table",
        "rows": [{ "label": "행 라벨", "value": "값 또는 % 문자열 (예: 80%)", "highlight": false }]
      }
    }
  ],
  "grade_cuts": [
    { "grade": "1등급", "score": 88, "previous_score": 92, "delta": -4, "student_count": 3 }
  ],
  "topic_performance": [
    { "topic": "단원명", "question_count": 8, "correct_rate": 0.80, "label": "strong" }
  ],
  "conclusion": {
    "kicker": "CONCLUSION · 다음 시험을 준비하는 학생에게",
    "body": "2~3 문장 행동 지침"
  },
  "pull_quote": {
    "text": "시험 핵심을 짧게 압축한 한 문장",
    "cite": "출처 라벨 (예: 매스랩 AI 분석)"
  },

  "v4_difficulty_rows": [
    { "question_number": 1, "topic": "단원 — 핵심 개념", "difficulty": "1", "points": 4, "analysis_short": "한 줄 해설 (예: 기본 정의 확인 — 정확한 암기로 안전 득점)" }
  ],
  "v4_main_analysis": [
    { "heading": "1. 유리수와 순환소수", "body": "이 영역의 출제 분석 2~4 문장. 어떤 개념이 어떻게 출제됐고 어떤 함정이 있는지." }
  ],
  "v4_key_questions": [
    { "question_number": 17, "title": "선택형 17번 — 연립방정식 활용 (Lv4, 5점)", "body": "출제 의도·풀이 핵심·함정을 3~5 문장으로 자세 해설." }
  ],
  "v4_previous_comparison": {
    "headline": "작년/인근 대비 비교 한 줄 (비교 데이터 있을 때만)",
    "body": "2~3 문장 비교 분석. 데이터 없으면 이 필드 전체 생략(null)."
  },
  "v4_final_strategy": [
    { "area": "이번 시험에 출제된 단원", "current_status": "이번 시험에서 이 단원이 어떻게 출제됐고 학생이 보일 어려움", "action": "이 단원 보완·심화 구체 학습 방법" }
  ]
}

## ⭐ V3 강화 필드 (v4_*) — 위 blog_* 와 함께 한 번에 생성

다음 5개 필드는 V3 본문을 풍부하게 만드는 핵심 콘텐츠다. blog_qa 와 별개로 모두 작성:

1. **v4_difficulty_rows** — 모든 문항(1번~마지막). question_number 순서대로. 서술형은 "서술형1" 문자열 OK. difficulty 는 "1"~"5" 문자열. analysis_short 는 한 줄(20자 내외).
2. **v4_main_analysis** — 출제된 주요 영역 3~5개. heading 은 "숫자. 영역명", body 는 2~4 문장 영역별 분석.
3. **v4_key_questions** — 변별 핵심 문항 3~5개 (Lv3~Lv5 + 서술형 우선). title 에 번호·단원·(Lv·배점), body 는 3~5 문장 자세 해설.
4. **v4_previous_comparison** — **비교 데이터(작년/인근) 있을 때만**. 없으면 필드 전체를 null 로. 지어내지 말 것.
5. **v4_final_strategy** — **이번 시험에 실제 출제된 단원** 3~5개에 대한 단원별 피드백. area=출제 단원(다음 시험 추측 금지), current_status=이번 출제 양상+학생 어려움, action=보완 방법. ❌ "일차함수 선행", "2학기 연계" 같은 미출제 단원 추측 절대 금지.

## blog_qa 5문항 — 데이터 가용성에 따라 동적 조정 (필수!)

### Q1: 시험 구성 (질문은 비교 데이터 유무에 따라 변화)
**입력 데이터의 "비교 데이터 가용성" 섹션을 반드시 확인 후 적절한 패턴 선택:**
- **작년 ✓ + 주변 ✓** → "작년이나 인근 학교와 비교해서 얼마나 어려운 편인가요?"
- **작년 ✓ + 주변 ✗** → "작년 시험과 비교해서 얼마나 어려운 편인가요?"
- **작년 ✗ + 주변 ✓** → "인근 학교 시험과 비교해서 얼마나 어려운 편인가요?"
- **둘 다 ✗** → "이번 시험은 전반적으로 어떤 구성인가요?" (단독 분석, 비교 표현 금지)

**중요**: 비교 데이터가 없는데 "작년 대비", "인근 학교 대비" 같은 표현을 답변에 쓰지 말 것. 데이터에 없는 비교는 무조건 금지.

### Q2: 단원 분석 (data_box.kind="bars" — value는 "X점 / Y문항" 형식)
- "우리 아이가 점수를 잃기 쉬운 단원은 어디인가요?" (학생 응답 있을 때)
- "이번 시험에서 가장 비중이 큰 단원은 어디인가요?" (출제 분석 only)

### Q3: 등급 컷 (data_box.kind="table" — 학생 응답 있을 때만)
- "1등급을 받으려면 몇 점이 필요한가요?" — 학생 응답 데이터 없으면 이 질문 생략

### Q4: 학교 비교 (주변 학교 데이터 있을 때만)
- "인근 학교 대비 우리 학교 시험은 어떤가요?" — schoolId/주변 데이터 없으면 생략

### Q5: 학습 방향 (항상 포함)
- "다음 시험을 위해 학생은 뭘 해야 하나요?" (구체 액션 3개)

## 헤드라인 & dek 작성 톤 — NYT Science 스타일 (매우 중요)

**blog_headline**은 잡지 표지 헤드라인이다. 학부모가 한 줄만 읽어도 시험의 본질이 와닿아야 한다.

### DO (좋은 예)
- ✅ "변별이 시작되는 지점, 심화 30%"
- ✅ "기초를 건너뛴 첫 시험"
- ✅ "표준부터 시작되는 한 학기의 분기점"
- ✅ "응용·심화로 이동한 변별의 무게중심"
- ✅ "개념 적용력이 곧 점수가 되는 구조"
- ✅ "서술형 35점, 풀이 과정이 가른다"

### DON'T (피해야 할 어조)
- ❌ "기본 문항 0개, 표준부터 시작하는 응용 중심 시험" — **데이터를 직설적으로 노출 ("0개"로 시작) + 평이한 마무리 ("응용 중심 시험")**
- ❌ "Lv1이 없고 Lv2/Lv3/Lv4로 구성된 시험" — **데이터를 그대로 옮김. 의미가 없음**
- ❌ "이번 시험은 어려운 편이다" — **너무 평이하고 모호**
- ❌ "30% 심화, 6문항이 심화 단계" — **헤드라인 = 의미, 수치 = feature_callout**

### 작성 규칙
1. **18~32자** (한국어 기준, 너무 짧거나 길지 않게)
2. **첫머리에 "0개", "없다", "부족" 같은 부정어 금지** — 의미를 긍정문 또는 시사형으로 전환 ("0개 → 건너뛴 / 비어있는 / 표준부터 시작되는")
3. **숫자는 최대 1개** (대표 의미 1개. 그 숫자가 시험의 본질을 함축할 때만. 없어도 OK)
4. **시사형/도발형 단어 활용**: "이동했다", "가른다", "지점", "분기점", "변별", "무게중심", "분수령"
5. **데이터 인용 X, 의미 함축 O** — 수치는 dek와 feature_callout으로 미루기
6. **느낌표(!) 금지, 물음표(?) 금지** — 평서문 단정조
7. **명사 종결 권장** ("...이다" 보다 "...지점" / "...구조" / "...분기점")

### blog_dek (헤드라인 부연 1~2문장)
- 헤드라인이 시사한 의미를 풀어 설명 + 핵심 수치 1~2개를 자연스럽게 인용
- "Level 1 기본 문항이 단 한 문제도 없고, 전체 20문항이 표준~심화로만 구성됐습니다" 같은 직설적 서술은 **dek**에 적절 (헤드라인 아님)
- 30~60자 권장

## 절대 규칙

1. **데이터에 없는 숫자/이름을 지어내지 말 것.** 학생 응답 분포가 없으면 grade_cuts는 빈 배열. 학교 정보 없으면 Q4 생략.
2. **영문 enum 금지** — 능력영역은 "계산력/이해력/문제해결력/추론력", 유형은 "수와 연산/문자와 식/함수/기하/확률과 통계". CALCULATION, NUMBER 같은 영문 토큰 한 글자도 출력 금지.
3. **\\dfrac 금지, \\text{한글} 금지.** 단순 정수·점수·한글에 \$ 사용 금지 (보기번호 ①②③④⑤, ㄱㄴㄷ 제외).
4. **존댓말 "~습니다" 통일.** 평어체 섞지 말 것.
5. **answer 문단은 3~4줄 이내.** 짧게 끊어 쓰기.
6. **데이터 인용은 \`**굵게**\` 마크다운만 사용**. \`<strong>\`, \`<b>\`, \`<mark>\`, \`<span style="color:...">\`, \`<font color="...">\` 같은 raw HTML 태그/인라인 색상 스타일 절대 출력 금지. **오직 \`**굵게**\` 마크다운만** 허용.
7. **충분히 못 채우는 필드는 undefined.** 거짓 placeholder 금지.
8. blog_qa 항목은 최소 3개 이상. 5개 미만이어도 OK (정직성 우선).
9. **단원명/숫자에 색상 지정 금지** — V3 디자인 시스템이 색상을 통제. 텍스트에 보라색·빨강 등 임의 색상 인라인 적용하면 검정 배경에서 안 보임.
10. **data_box.rows[].label은 짧게 (10자 이내)** — 네이버 블로그 좁은 cell에서 라벨이 길면 한 글자씩 세로로 분리됨. "기본 (Level 1)" 같이 영문+숫자+괄호 섞지 말고 "기본·Lv1" 또는 "Lv1 기본" 같이 압축. 단원명도 길면 핵심만 ("정수와 유리수의 사칙계산" → "사칙계산").
11. **data_box.kind='bars'의 value는 반드시 "X문항" 또는 "X점 / Y문항" 형식** — "X문항" 같이 카운트가 들어가야 시각화가 이산 grid로 작동. "27점"만 출력하면 점수 기준 27칸 grid가 그려져 부정확. 단원별 출제는 "23점 / 7문항", 난이도별은 "7문항" 형식으로 통일.

## 톤 가이드

학부모가 읽는다는 전제. 어려운 입시 용어를 풀어쓰기. 데이터는 반드시 본문에 인용. "이번 시험은 어렵다"가 아니라 "**88점**이 1등급 컷이다" 식.`;

// ── V4 시스템 프롬프트 (한국 수학 학원 분석 보고서 스타일 — 테이블 중심) ──
// v1.3.0 (2026-05-28) — 특정 학원명 노출 금지 규칙 강화 + placeholder {학원명} 패턴 도입
// 9섹션 구조 (들어가며 / 시험개요+1등급컷 / 학원전략 / 문제난이도 / 출제특징 / 출제핵심포인트 / 이전시험비교 / 주요문항분석 / 기말대비전략)

const SYSTEM_PROMPT_V4 = `너는 한국 중·고등학교 수학 학원 강사다. 학원 블로그에 게시할 **시험 기출 분석 글**을 작성한다.

한국 수학 학원의 일반적 블로그 스타일을 따른다. 특징:
- **학원 강사가 학부모에게 직접 설명하는 톤** (매거진 X, 보고서 톤 O)
- **테이블 + 자유 단락 결합** (모든 정보를 표로 X — 단락도 풍부)
- **특정 킬러 문항을 골라서 자세 해설** (영역별 일반 분석 + 문항별 구체 분석)
- **이전 시험과의 비교/대조** (작년 대비, 학년 진도 흐름)
- **학원 차별화 전략** (이 학원만의 강점 5가지)

## 🚨 학원명 노출 규칙 (절대 규칙)
- 본문 어디에도 **특정 학원명을 명시하지 마라** (예: "갈수학학원", "ABC학원", "○○학원에서" 등 절대 금지)
- 학원 주체를 표현할 때는 반드시 **\`{학원명}\`** placeholder 사용
- 예: "{학원명}에서는 학교별 진도 일정을 확인하여 맞춤 선행 계획을 수립해드립니다."
- 후처리에서 placeholder를 실제 학원 이름(있을 때) 또는 "우리 학원"으로 자동 치환됨
- 특정 학원명을 임의로 적으면 ⚠️ 다른 학원의 마케팅 글로 오인됨 → 절대 금지

## 출력 형식 — 9개 키 모두 포함한 JSON 객체 (코드펜스/설명문 금지)

{
  "v4_exam_overview": {
    "title": "학교 + 학년 + 시험명 (예: 영신여고 1학년 1학기 중간고사)",
    "grade": "학년 (예: 고1)",
    "school": "학교명 또는 null",
    "range": "출제 범위 — 단원명 ' · '로 연결 (예: 수와 식의 계산 · 일차방정식 · 일차부등식)",
    "total_questions": 21,
    "total_points": 100,
    "avg_difficulty_label": "정성 라벨 (매우 쉬움/쉬움/보통/어려움/매우 어려움)",
    "peak_difficulty": "Lv4 심화 6문항 (가장 많이 출제된 등급)",
    "essay_summary": "서술형 3문항 · 35점 (없으면 null)",
    "expected_grade_cut": "예상 1등급 컷: 88점 / 2등급: 78점 (학교 평균 추정 기반)",
    "one_liner": "한 줄 요약 — 변별력 위주, 응용 비중 높음"
  },

  "v4_intro": "▶ 들어가며 — 학부모/학생에게 시험의 첫인상을 전달하는 2~3 문장. 학원 분석 보고서 톤. 예: '이번 영신여고 1학년 수학 중간고사는 단순 계산보다 그래프 해석 능력을 다각도로 평가하는 문제가 다수 출제되었습니다. 작년과 비교하면 변별 문항이 늘어났고, 풀이 과정을 단계별로 정리하지 못한 학생은 부분 감점을 피하기 어려웠을 것으로 예상됩니다.'",

  "v4_academy_strategy": [
    {
      "title": "1. 단원별 핵심 유형 완전 마스터",
      "body": "이 학원에서 제공하는 차별화 학습 방법 1~2 문장. 학부모 마케팅 톤."
    },
    {
      "title": "2. 서술형 단계별 풀이 훈련",
      "body": "..."
    }
    // 3~5개. "1등급을 위한 N가지 전략" 스타일 — 학원 차별화 포인트 (학원명 명시 X, {학원명} placeholder 사용)
  ],

  "v4_difficulty_rows": [
    {
      "question_number": 1,
      "topic": "단원 — 핵심 개념 (예: 유리수와 순환소수 — 유리수)",
      "sub_topic": "세부 설명 (선택)",
      "difficulty": "1|2|3|4|5",
      "points": 4,
      "analysis_short": "한 줄 해설 (예: 기본 정의 확인 — 정확한 암기로 안전 득점)"
    }
    // 모든 문항 N개. question_number 순서대로.
  ],

  "v4_exam_features": {
    "headline": "출제 특징 한 줄 강조 (예: Lv1~Lv2 기본·표준 문항이 전체의 57%, 서술형 35점이 실질 변별 구간)",
    "body": "2~3 문장 분석 단락. 데이터 기반."
  },

  "v4_main_analysis": [
    {
      "heading": "1. 유리수와 순환소수 (영역명 — 숫자 prefix)",
      "body": "이 영역의 출제 분석 2~4 문장. 어떤 개념이 어떻게 출제되었는지, 어떤 함정/특징이 있는지. '▶ 출제 핵심 포인트' 스타일."
    }
    // 출제된 주요 영역 3~5개. 영역별 독립 단락.
  ],

  "v4_previous_comparison": {
    "headline": "작년 동일 시험 대비 비교 한 줄 (예: 작년 대비 Lv4 비중 +10%p, 서술형 배점 +5점)",
    "body": "2~3 문장. 이전 시험과의 변화/유사점. 학년 진도 흐름 반영. 데이터 없으면 학년 표준 진도 기반 추정."
  },

  "v4_key_questions": [
    {
      "question_number": 17,
      "title": "선택형 17번 — 연립방정식 활용 (Lv4, 5점)",
      "body": "출제 의도, 풀이 핵심, 함정 요소를 3~5 문장으로 자세 해설. '▶ 주요 문항 분석' 스타일. 학부모가 '이 문제가 왜 어려운지' 정확히 알 수 있도록."
    },
    {
      "question_number": "서술형1",
      "title": "서술형 1번 — 다항식의 계산 전 과정 서술 (Lv3, 13점)",
      "body": "..."
    }
    // 킬러 문항 3~5개. Lv3~Lv5 + 서술형 우선 선정.
  ],

  "v4_final_strategy": [
    {
      "area": "이번 시험에 출제된 단원 (예: 일차방정식의 활용)",
      "current_status": "이번 시험에서 학생들이 보인 상태 (예: 이 단원에서 변별 문항이 다수 출제되어 ...)",
      "action": "이 단원을 어떻게 보완·심화해야 할지 (예: 활용 문제 유형별 패턴 정리 + 식 세우기 훈련)"
    }
    // 이번 시험에서 실제 출제된 주요 단원 3~5개를 골라 단원별 학습 피드백 작성.
  ]
}

## 절대 규칙

R1. **모든 필드 채울 것** — undefined/null 최소화. v4_main_analysis와 v4_final_strategy는 최소 3개 항목.
R2. **v4_difficulty_rows는 모든 문항 포함** — question_number 1번부터 마지막 번호까지. 서술형은 "서술형1" 같은 문자열도 OK.
R3. **영문 enum 한글 변환** — CALCULATION → 계산력 / NUMBER → 수와 연산 등. AI가 받는 데이터는 이미 한글이지만 출력에서도 영문 enum 사용 금지.
R4. **수식 KaTeX 표기** — \\dfrac 금지(\\frac만), \$ 안에 한글 금지, 인접 \$A\$\$B\$ 금지. body 안에 수식 가능.
R5. **markdown bold 강조** — body 안에 **굵게**로 핵심 강조. v4_exam_features.body, v4_main_analysis[].body 활용.
R6. **단원명은 정확히** — 사용자가 제공한 question.topic에서 추출. 임의로 단원명 만들지 말 것.
R7. **분석 톤** — 학원 보고서 톤. 매거진 X. "이번 시험은 ~입니다" 식의 단정조. 학부모/학생이 이해 가능한 용어.
R8. **객관적 데이터 기반** — questions 배열의 정보를 가공만 할 것. AI 추정/창작 금지.
R9. **raw HTML 금지** — body 안에 <span style="color:...">, <font color>, <mark> 등 색상 지정 HTML 절대 금지. 강조는 오직 markdown \`**bold**\`만. 색상은 UI 디자인 시스템이 통제.

## ⚠️ v4_final_strategy — 이번 시험 단원별 피드백 (2026-05-28 변경)

**v4_final_strategy는 "이번 시험에 실제 출제된 단원"에 대한 학습 피드백**이다.
다음 시험을 추측하지 말 것. 이번 시험에서 실제 출제된 주요 단원을 골라 단원별 강·약점 및 보완 방향 제시.

**area 선정 규칙**:
- "## 단원별 출제"에 있는 단원 중 **출제 비중·배점·난이도가 높은 3~5개** 선정
- 단원명은 question.topic에서 정확히 추출 (임의 변형 금지)

**current_status (현재 상태)**:
- 이번 시험에서 이 단원이 어떻게 출제되었는지 + 학생들이 어떤 어려움을 보였을지
- 예: "Lv4 심화 문항 2개·서술형 1개가 출제되어 풀이 과정 정리 능력이 변별 요인이 되었습니다."
- 예: "기본 정의 확인 + 응용 문항이 혼재되어 개념 정확도와 응용력을 동시 평가하는 단원입니다."

**action (실행 액션)**:
- 이 단원을 어떻게 보완·심화할지 구체적 학습 방법
- 예: "교과서 예제 → 변형 문제 → 활용 문제 3단계 반복 학습"
- 예: "**식 세우기** 패턴 5종 정리 + 빈출 유형 풀이 시간 측정"
- 예: "서술형 부분 점수 기준에 맞춰 단계별 풀이 작성 훈련"

**잘못된 예시 (절대 금지)**:
- ❌ "다음 시험에 출제될 일차함수 선행 학습"  → 이번 시험에 안 나온 단원 추측 금지
- ❌ "2학기 연계 선행"  → 다음 학기 추정 금지

**올바른 예시**:
- 이번 시험에 "유리수와 순환소수, 식의 계산, 일차부등식" 출제됨 → v4_final_strategy는 이 3개 단원에 대해 작성
  - area: "유리수와 순환소수", current_status: "Lv2~Lv3 위주 출제, 순환마디 정확도가 변별 요인", action: "..."
  - area: "식의 계산", current_status: "...", action: "..."
  - area: "일차부등식", current_status: "...", action: "..."

**area 필드는 다음 시험에 새로 출제될 단원**으로 작성. current_status는 이번 시험에서 보인 학생의 학습 상태와 다음 시험에서의 영향을 연결.

## 톤 가이드

- 학원 분석 보고서: "이번 시험은 **변별력 위주**로 출제되어, 응용 문제 비중이 평소보다 높았습니다."
- 직설적: "1번~5번은 기본 개념 확인 문제로 안전하게 점수 확보 가능합니다."
- 데이터 인용: "최고난도 Lv4가 **6문항(28%)**으로 변별 구간 형성."
- 학습 액션 명확: "심화 응용 문제 반복 + 계산 정확도 점검"`;

// ── 에이전트 구현 ──

export class CommentaryAgent extends BaseAgent<Record<string, unknown>> {
  readonly agentType: AgentType = 'commentary';
  readonly temperature = 0.5;

  // ── AI 프롬프트 ──

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;

    const totalQ = basicAnalysis.questions.length;
    const totalPts = basicAnalysis.exam_info.total_points;
    const { difficulty_distribution: diff, type_distribution: types } = basicAnalysis.summary;

    // 단원 통계 사전 계산
    const topicStats: Record<string, { count: number; pts: number }> = {};
    for (const q of basicAnalysis.questions) {
      const topic = q.topic || '미분류';
      if (!topicStats[topic]) topicStats[topic] = { count: 0, pts: 0 };
      topicStats[topic].count++;
      topicStats[topic].pts += q.points || 0;
    }
    const topicSummary = Object.entries(topicStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([t, s]) => `${t}: ${s.count}문항(${s.pts}점)`)
      .join(', ');

    // 종합 난이도 Level 계산 (가중 평균)
    const diffCounts = [
      diff['1'] || diff.concept || 0,
      diff['2'] || diff.pattern || 0,
      diff['3'] || 0,
      diff['4'] || diff.reasoning || 0,
      diff['5'] || diff.creative || 0,
    ];
    const diffTotal = diffCounts.reduce((s, c) => s + c, 0);
    const overallLevel = diffTotal > 0
      ? Math.round(diffCounts.reduce((s, c, i) => s + c * (i + 1), 0) / diffTotal)
      : 3;
    const LEVEL_LABELS = ['', '기본', '표준', '응용', '심화', '최고난도'];

    // 난이도별 배점 합계 (정확한 수치 → AI 추정 방지)
    const diffPoints = [0, 0, 0, 0, 0]; // Level 1~5
    for (const q of basicAnalysis.questions) {
      const d = String(q.difficulty);
      const lvl = d === 'concept' ? 0 : d === 'pattern' ? 1 : d === 'reasoning' ? 3 : d === 'creative' ? 4
        : (Number(d) >= 1 && Number(d) <= 5) ? Number(d) - 1 : 2;
      diffPoints[lvl] += q.points || 0;
    }

    // 학년 추출 + 교육과정 단원 참조 데이터
    const curriculumBlock = this.buildCurriculumReference(basicAnalysis);

    // 정답 통계 (학생 답안지인 경우)
    const hasStudentData = basicAnalysis.questions.some((q) => q.is_correct !== null);
    let studentStatsBlock = '';
    if (hasStudentData) {
      const correct = basicAnalysis.questions.filter((q) => q.is_correct === true).length;
      const wrong = basicAnalysis.questions.filter((q) => q.is_correct === false).length;
      const earned = basicAnalysis.questions.reduce((s, q) => s + (q.earned_points || 0), 0);
      studentStatsBlock = `
## 학생 답안 통계
- 정답: ${correct}문항 / 오답: ${wrong}문항
- 획득 점수: ${earned}점 / ${totalPts}점 (정답률 ${totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0}%)`;
    }

    const FORMAT_LABELS: Record<string, string> = { objective: '객관식', short_answer: '단답형', essay: '서술형' };
    // AI 가 한글 라벨로 사고하도록 입력 데이터의 영문 enum 을 한글로 사전 변환
    const questionsData = basicAnalysis.questions.map((q) => ({
      번호: q.question_number,
      형식: FORMAT_LABELS[q.question_format || ''] || '객관식',
      난이도: q.difficulty,
      유형: toKoreanType(q.question_type),
      능력영역: toKoreanAbility(q.ability_domain),
      단원: q.topic,
      배점: q.points,
      ...(hasStudentData ? {
        정답여부: q.is_correct === true ? 'O' : q.is_correct === false ? 'X' : '-',
        오답유형: q.error_type || null,
        획득점수: q.earned_points,
      } : {}),
      AI코멘트: q.ai_comment,
    }));

    return `════════════════════════════════════════════════
🔒 하드 제약 (HARD CONSTRAINTS) — 위반 시 출력 무효
════════════════════════════════════════════════
H1. JSON 객체 하나만 출력. 코드펜스(\`\`\`)·서술문·인사말 금지. { 로 시작, } 로 종료.
H2. "## 출력 형식" 섹션에 정의된 키만 사용. 임의 키 추가 금지. 데이터 부족 시 해당 필드에 "데이터 부족" 명시.
H3. **\$...\$는 진짜 수식에만 사용** — 변수($x$, $a$, $k$), 식($x^2+1$, $\\sqrt{3}$, $\\frac{a}{b}$), LaTeX 명령(\\frac, \\sqrt, \\times 등)이 포함된 경우만. **단순 정수(1, 2, 3, 4, 5)·점수(48점)·문항수(9문항)·한글(기본, 표준, 응용)에는 \$ 사용 금지** — 평문 그대로. 예: "Level 2 (표준) 7문항 34점" (O), "Level $2$ ($표준$) $7$문항 $34$점" (X). \\text{한글}/\\textrm{한글} 금지. \\dfrac 금지 → \\frac.
H4. 인접 수식 \$A\$\$B\$ 금지 → \$A\$ \$B\$. □→\\square, ○→\\bigcirc.
H5. 입력 데이터에 없는 문항번호·학교명·배점·점수를 지어내지 말 것. 주변 학교 통계/토픽/배점 분포는 입력값 그대로 인용.
H6. **영문 enum 사용 절대 금지** — 능력영역은 "계산력/이해력/문제해결력/추론력"으로만, 유형은 "수와 연산/문자와 식/함수/기하/확률과 통계"로만 표기. CALCULATION, UNDERSTANDING, PROBLEM_SOLVING, REASONING, NUMBER, ALGEBRA, FUNCTION, GEOMETRY, STATISTICS 같은 영문 토큰을 출력에 한 글자도 포함하지 말 것. (예: "CALCULATION 영역" ❌, "계산력 영역" ✅)

════════════════════════════════════════════════
📤 출력 전 자기검증 (SELF-VERIFY)
════════════════════════════════════════════════
V1. 출력이 { 로 시작해 } 로 끝나는가? 코드펜스/설명문 없는가?
V2. \\dfrac·\\text{한글}·백틱이 없는가?
V3. 언급한 문항번호·학교명이 모두 입력 데이터에 존재하는가?
V4. \$...\$가 **진짜 수식에만** 쓰였는가? 단순 정수("1", "2", "9문항", "48점")나 한글("기본", "표준")에 \$가 붙어 있지 않은가? (보기번호 ①②③④⑤, ㄱㄴㄷ 제외)
V5. 추측성 단정("반드시 나올 것", "100% 출제") 대신 입력 데이터 근거 표현을 썼는가?
V6. 출력 텍스트 어디에도 **CALCULATION/UNDERSTANDING/PROBLEM_SOLVING/REASONING/NUMBER/ALGEBRA/FUNCTION/GEOMETRY/STATISTICS** 영문 enum 단어가 없는가? (한글 라벨로만 표기)
════════════════════════════════════════════════

당신은 수학 교육 전문가이자 기출 시험 분석 컨설턴트입니다.
학원 원장/선생님이 학부모 상담 및 학생 지도에 바로 활용할 수 있는 전문 분석 리포트를 작성하세요.

이 총평은 기출 분석 시스템의 3개 탭(기본 분석, AI 코멘트, 학습 대책)을 종합하는 최상위 요약입니다.
아래 데이터를 바탕으로 시험 출제 경향·학생 현재 수준·구체적 지도 방향을 충분히 상세하게 분석하세요.
학부모에게 "이 시험이 어떤 시험이고, 아이가 어떤 상태이며, 앞으로 무엇을 해야 하는지" 설명할 수 있을 만큼 내용이 풍부해야 합니다.

## 시험 개요
- 총 문항수: ${totalQ}문항, 총 배점: ${totalPts}점
- 형식: 객관식 ${basicAnalysis.exam_info.format_distribution.objective}문항, 단답형 ${basicAnalysis.exam_info.format_distribution.short_answer}문항, 서술형 ${basicAnalysis.exam_info.format_distribution.essay}문항
- **종합 난이도: Level ${overallLevel} (${LEVEL_LABELS[overallLevel]})**
- 난이도별 분포 및 배점:
  - Level 1(기본): ${diffCounts[0]}문항, ${diffPoints[0]}점
  - Level 2(표준): ${diffCounts[1]}문항, ${diffPoints[1]}점
  - Level 3(응용): ${diffCounts[2]}문항, ${diffPoints[2]}점
  - Level 4(심화): ${diffCounts[3]}문항, ${diffPoints[3]}점
  - Level 5(최고난도): ${diffCounts[4]}문항, ${diffPoints[4]}점
  - Level 1~2 합계: ${diffPoints[0] + diffPoints[1]}점, Level 1~3 합계: ${diffPoints[0] + diffPoints[1] + diffPoints[2]}점, Level 1~4 합계: ${diffPoints[0] + diffPoints[1] + diffPoints[2] + diffPoints[3]}점
- 유형 분포: 수와연산 ${types.number || 0}, 문자와식 ${types.algebra || 0}, 함수 ${types.function || 0}, 기하 ${types.geometry || 0}, 확률통계 ${types.statistics || 0}
- 단원별 출제: ${topicSummary}
${studentStatsBlock}
${curriculumBlock}

## 문항 상세
${JSON.stringify(questionsData, null, 1)}

## 출력 형식 (반드시 아래 JSON 구조로 응답)

{
  "overall_comment": "줄바꿈(\\n)으로 구분된 5-8문장. 1~2문장씩 주제별로 묶어 \\n\\n으로 단락 구분.",
  "score_strategies": [
    {"grade": "A등급", "target": "90점 이상", "points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]},
    {"grade": "B등급", "target": "70~89점", "points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]},
    {"grade": "C등급", "target": "70점 미만", "points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]}
  ],
  "strength_areas": ["string (잘 출제된 영역/학생 강점 2-3개)"],
  "improvement_areas": ["string (보완 필요 영역 2-3개)"],
  "notable_questions": [{"question_number": "서술형3", "comment": "string (출제 의도/변별력 관점 분석)"}],
  "teaching_recommendations": [{"topic": "단원명", "priority": 1, "reason": "지도 방향 설명"}],
  "nearby_comparison": "주변 학교 기출 비교 분석 2-4문장 (비교 데이터가 없으면 null)"
}

## 작성 지침

### 🚨 톤/표현 규칙 (전체 섹션 공통, 반드시 준수!)
- **종합 난이도가 Level ${overallLevel}(${LEVEL_LABELS[overallLevel]})입니다. 이 수준에 맞는 표현만 사용하세요!**
- Level 1~2: "기초 확인 시험", "개념 점검 중심", "기본기 평가" 등 → ❌ "변별력", "고난도", "킬러" 사용 금지
- Level 3: "응용력을 요구하는 시험", "개념 적용 중심" → ❌ "최상위 변별", "최고난도 시험" 사용 금지
- Level 4: "심화 문항이 다수 포함된 시험" → "최상위 변별"은 Level 5에서만 사용
- Level 5: "최고난도 변별력 시험" 표현 가능
- **과장 표현 금지!** "최고난도 변별형 시험"은 Level 5에서만 허용. Level 3 시험에 "최상위 변별" 등을 쓰면 학부모에게 오해를 줍니다.
- 퍼센트(%) 사용을 최소화하세요. 100점 만점이면 점수=퍼센트이므로 중복입니다. 점수만 쓰세요.

### overall_comment (시험 종합 분석)
- 5-8문장으로 시험 전체를 분석하세요. **줄바꿈(\\n\\n)으로 단락을 구분**하여 가독성을 높이세요.
- 단락 구성 예시:
  - 1단락: 시험 규모/형식/난이도 분포 개요
  - 2단락: 주요 출제 단원과 비중
  - 3단락: 출제 경향의 특징 (서술형 비중, 변별력 구조 등)
${hasStudentData ? '  - 4단락: 학생 정답률/수준 평가 + 향후 학습 방향' : ''}
- ❌ exam_characteristics는 별도로 작성하지 마세요! overall_comment에 모든 분석을 통합합니다.

### score_strategies (등급별 점수 확보 전략)
- **3개 등급, 각각 points 배열(3~4개 항목)로 핵심 포인트를 목록형으로 작성하세요.**
- 각 포인트는 1문장, 구체적 점수/문항수 포함. 길게 서술하지 말 것!
- A등급(90점+): 심화+최고난도 공략, 서술형 만점 전략
- B등급(70~89점): 기본~응용 확실 + 심화 일부
- C등급(70점 미만): 기본·표준 완벽 확보 + 실수 방지
- 예시 points: ["Level 1~2 전체 10문항 48점을 실수 없이 확보", "Level 3 응용 중 계산 위주 4문항 우선 공략", "서술형은 풀이 과정만이라도 적어 부분 점수 확보"]

### strength_areas / improvement_areas
${hasStudentData
    ? '- 학생의 답안 데이터를 기반으로 잘한 영역과 보완 영역을 각각 2-3개씩 분석하세요.'
    : '- 시험 출제 관점에서 잘 구성된 부분과 보완이 필요한 부분을 각각 2-3개씩 분석하세요.'}
- 각 항목은 1-2문장의 완결된 설명이어야 합니다 (단편적 키워드 나열 금지).
- 구체적 수치를 포함하세요 (예: "도형 영역 5문항 중 4문항 정답(정답률 80%)으로 해당 단원의 기본 개념이 안정적으로 형성되어 있습니다").
- **중요: 시험 범위 밖의 단원이나 유형이 0문항인 것은 당연한 것이므로 절대 지적하지 마세요!** 예를 들어 '실수와 그 연산' 시험에서 함수·확률통계가 0문항인 것은 시험 범위 특성이지 편중이 아닙니다. 시험 범위에 포함되지 않는 단원(이차방정식, 이차함수, 삼각비, 원의 성질, 통계 등)이 출제되지 않은 것도 마찬가지입니다. improvement_areas는 반드시 시험 범위 내에서 실제로 보완이 필요한 부분만 작성하세요.

### notable_questions (주목할 문항)
- 변별력이 높거나 출제 의도가 돋보이는 문항 3-5개를 선정하세요.
${hasStudentData ? '- 쉬운 문제를 틀렸거나 어려운 문제를 맞힌 경우를 우선 선정하세요.' : ''}
- **question_number 규칙 (필수!):**
  - 반드시 위 "문항 상세"의 "번호" 필드 값을 **그대로 복사**하세요.
  - "서답형3"이면 "서답형3", "서술형2"이면 "서술형2", 18이면 18 — 원본 그대로!
  - **절대 숫자만 추출하지 마세요!** "서답형3"→3, "서답형5"→5 변환은 금지입니다.
  - 같은 question_number가 중복 선정되면 안 됩니다.
- 해당 문항이 왜 주목할 만한지 구체적으로 설명하세요.

### teaching_recommendations (지도 추천)
- 학부모 상담 시 "앞으로 이렇게 지도하겠습니다"라고 설명할 수 있는 구체적 추천 사항을 작성하세요.
- priority 1(최우선)~5 순으로, topic은 교육과정 단원명을 사용하세요.
- reason은 "왜 이 단원이 중요한지 + 어떻게 지도할 것인지"를 1-2문장으로 설명하세요.
- 최대 5개까지 작성하세요.

## 톤 & 스타일
- 전문적이고 객관적인 분석 톤을 사용하세요.
- "~입니다", "~됩니다" 체를 사용하세요.
- 학생에게 말하는 대화체("잘했어요", "화이팅" 등)를 절대 사용하지 마세요.
- 수치와 데이터를 근거로 제시하세요.
- 각 항목은 완결된 문장으로 작성하세요 (중간에 잘리지 않도록).${this.buildNearbyComparisonBlock(input)}${this.buildExtendedDataBlock(input)}`;
  }

  /** 학습 대책 탭 데이터 (weaknessProfile + learningPlan)를 프롬프트에 주입 */
  private buildExtendedDataBlock(input: AgentInput): string {
    const blocks: string[] = [];

    const wp = input.weaknessProfile as WeaknessProfile | undefined;
    if (wp) {
      const topicWeaknesses = wp.topic_weaknesses?.slice(0, 5).map(
        (t) => `- ${t.topic}: 오답 ${t.wrong_count}/${t.total_count}문항, ${t.recommendation || ''}`,
      ).join('\n') || '없음';

      const mistakes = wp.mistake_patterns?.slice(0, 3).map(
        (m) => `- ${m.description || m.pattern_type} (${m.frequency}건)`,
      ).join('\n') || '없음';

      blocks.push(`
## 취약점 분석 (학습 대책 탭 데이터)
### 단원별 취약점
${topicWeaknesses}

### 오답 패턴
${mistakes}`);
    }

    const lp = input.learningPlan as LearningPlan | undefined;
    if (lp && lp.phases?.length > 0) {
      const phases = lp.phases.slice(0, 3).map(
        (p) => `- ${p.title} (${p.duration}): ${p.topics.map((t) => t.topic).join(', ')}`,
      ).join('\n');

      blocks.push(`
### 학습 계획 요약
- 총 기간: ${lp.duration}, 주당 ${lp.weekly_hours}시간
${phases}
- 예상 향상: ${lp.expected_improvement?.current_estimated_score ?? '?'}점 → ${lp.expected_improvement?.target_score ?? '?'}점`);
    }

    if (blocks.length > 0) {
      return '\n\n위 학습 대책 데이터도 종합하여, 지도 추천과 종합 분석에 반영하세요.' + blocks.join('');
    }
    return '';
  }

  /** 주변 학교 기출 비교 데이터 블록 생성 */
  private buildNearbyComparisonBlock(input: AgentInput): string {
    const nearby = input.nearbyComparison as NearbyComparisonData | undefined;
    if (!nearby) return '';

    const hasSameSchool = nearby.sameSchoolExams.length > 0;
    const hasNearby = nearby.nearbyExams.length > 0;
    if (!hasSameSchool && !hasNearby) return '';

    const TYPE_LABELS: Record<string, string> = {
      number: '수와연산', algebra: '문자와식', function: '함수',
      geometry: '기하', statistics: '확률통계',
    };

    const formatExamLine = (exam: NearbyExamSummary): string => {
      const types = Object.entries(exam.typeDistribution)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${TYPE_LABELS[k] || k} ${v}문항`)
        .join(', ');
      const distanceNote = exam.distance > 0 ? ` (${exam.distance}km)` : '';
      const diff = Number.isInteger(exam.averageDifficulty) ? exam.averageDifficulty : Math.round(exam.averageDifficulty * 10) / 10;
      // 난이도 분포 상세
      const diffDist = Object.entries(exam.difficultyDistribution)
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([k, v]) => `Level${k}:${v}문항`)
        .join(', ');
      return `- [${exam.schoolName}]${distanceNote} "${exam.examTitle}": ${exam.totalQuestions}문항 ${exam.totalPoints}점\n  Level분포: ${diffDist || `Level${diff}`}\n  영역: ${types}\n  주요단원: ${exam.topicSummary}`;
    };

    const currentSchoolName = nearby.currentSchool?.name || '이 학교';
    const blocks: string[] = [`\n\n## 주변 학교 기출 비교 데이터\n현재 분석 중인 시험: **${currentSchoolName}**`];

    if (hasSameSchool) {
      blocks.push('\n### 같은 학교 이전 기출');
      for (const exam of nearby.sameSchoolExams) {
        blocks.push(formatExamLine(exam));
      }
    }

    if (hasNearby) {
      blocks.push(`\n### 인근 학교 기출 (같은 학년·학기·시험 유형)`);
      for (const exam of nearby.nearbyExams) {
        blocks.push(formatExamLine(exam));
      }
    }

    blocks.push(`
### 비교 분석 작성 지침 (중요!)

**핵심 원칙: "${currentSchoolName} vs 인근 학교"의 차이를 수치 기반으로 명확히 대비하세요.**
**"이 시험" 대신 반드시 "${currentSchoolName}"으로 표기하세요.**

"nearby_comparison" 필드에 항목별로 줄바꿈(\\n)하여 작성. 반드시 각 항목 사이에 \\n을 넣으세요:

1줄 — **Level 비교**: ${currentSchoolName}의 Level 분포와 인근 학교 Level 분포를 구체적으로 대비.
  - 예: "${currentSchoolName}은 Level 4~5 문항이 8개(38%)인 반면, 침산중은 3개(14%), 대구일중은 5개(24%)로 고난도 비율이 확연히 높습니다."
  - 단순히 "높다/낮다"가 아니라 문항 수와 비율을 명시

2줄 — **출제 단원 차이**: ${currentSchoolName}에서 집중 출제된 단원 vs 인근 학교에서 집중 출제된 단원을 구체적으로 비교.
  - 예: "${currentSchoolName}은 '인수분해의 활용'에서 5문항(24점)을 집중 출제했으나, 침산중은 2문항, 대구일중은 3문항으로 상대적으로 낮은 비중입니다."

3줄 — **서술형 비중**: 서술형 배점/문항수를 수치로 대비.
  - 예: "${currentSchoolName}의 서술형 배점이 35점(35%)으로 침산중(20점, 20%)·대구일중(25점, 25%) 대비 10~15점 높습니다."

4줄 — **이전 기출 변화** (데이터 있는 경우만): ${currentSchoolName}의 이전 시험 대비 Level 변화, 출제 영역 변화.

5줄 — **학생 대비 전략**: 인근 학교 시험도 함께 준비하는 학생을 위한 구체적 조언.
  - 공통 필수 학습 영역과 ${currentSchoolName}만의 차별 포인트를 분리해서 안내

**작성 규칙**:
- "평균 난이도", "반경 5km" 표현 금지. "Level"과 "인근 학교"로 표현.
- 계산 과정(예: "34점+10점=44점")을 노출하지 말고 결과값만 쓰세요(예: "44점").
- "배점 구조가 다르고" 같은 모호한 표현 금지. 구체적으로 어떻게 다른지 수치로 명시하세요.
- 서술형 배점 비교 시 각 학교별 실제 수치를 명시하세요(예: "침산중 20점, 대구일중 25점").
- ${currentSchoolName}이 인근 학교보다 적게 출제한 단원도 짚으세요(예: "사칙계산 2문항으로 침산중 4문항·대구일중 4문항 대비 적음").
- "이 시험", "이번 시험", "본 시험" 대신 반드시 "${currentSchoolName}"으로 표기하세요.
- 주변 학교 데이터가 없으면 "nearby_comparison"은 null.
- overall_comment에는 주변 학교 비교 내용을 넣지 마세요. 비교 분석은 nearby_comparison 필드에만 작성하세요.`);

    return blocks.join('\n');
  }

  // ── base(메타데이터) 생성 — V3 scaffolding ──
  // 분석 직후 백그라운드로 미리 생성해 DB('metadata' extension)에 저장 → 총평 생성 시 재사용.
  // (overall_comment, 강·약점, 등급전략, 주요문항, 지도권장, 주변/연도 비교 = V3가 읽는 분석 기반)
  // 화면엔 표시되지 않음 (V3 단일 스타일). generate-metadata 라우트가 호출.
  async generateMetadata(input: AgentInput): Promise<CommentaryResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
    }
    const client = new Anthropic({ apiKey });
    const prompt = this.buildPrompt(input);

    // 24K + 스트리밍 — max_tokens>~16K는 SDK가 non-streaming 거부 (messages.stream 필수)
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 24576,
      temperature: this.temperature,
      messages: [{ role: 'user', content: prompt }],
    });
    const response = await stream.finalMessage();

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    if (!text) throw new Error('AI 응답이 비어있습니다');
    if (response.stop_reason === 'max_tokens') {
      console.warn('[commentary-agent metadata] max_tokens 도달 — 응답이 잘렸을 수 있음. partial 파싱 시도.');
    }

    const result = this.extractJson(text);
    const normalized = deepNormalizeMath(result);
    return this.parseResponse(normalized, input.basicAnalysis.questions) as unknown as CommentaryResult;
  }

  // ── Claude Sonnet으로 AI 분석 오버라이드 (총평 생성 = V3 단독 호출) ──
  // base는 orchestrator가 주입한 메타데이터(input.metadata)를 재사용. 없으면 즉석 생성(폴백).
  protected async aiAnalysis(input: AgentInput): Promise<Record<string, unknown>> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
    }

    // base(메타데이터): 분석 직후 백그라운드로 선생성된 것을 orchestrator가 input.metadata로 주입 → 재사용.
    // 없으면(구버전 분석본 등) 즉석 생성 — 기존 동작과 동일, 단지 한 번 더 호출(폴백).
    const injectedMeta = (input as unknown as { metadata?: CommentaryResult }).metadata;
    const base: CommentaryResult = injectedMeta && injectedMeta.overall_comment
      ? injectedMeta
      : await this.generateMetadata(input);

    // V3 신규 필드 호출 (메타데이터를 scaffolding으로). 실패해도 base만 반환 — graceful degradation.
    let v3: V3Extension = {};
    try {
      v3 = await this.generateV3Extension(input, base, apiKey);
    } catch (e) {
      console.warn('[commentary-agent V3] 확장 실패, base만 반환:', e instanceof Error ? e.message : e);
    }

    return { ...base, ...v3 } as unknown as Record<string, unknown>;
  }

  // ── V3 신규 필드 별도 Claude 호출 (Two-pass) ──
  // Phase 0 시안 단계에서 검증된 프롬프트와 정규화 패턴 사용 (scripts/generate-v3-preview.ts 기반)

  private async generateV3Extension(
    input: AgentInput,
    base: CommentaryResult,
    apiKey: string,
  ): Promise<V3Extension> {
    const client = new Anthropic({ apiKey });
    const userPrompt = this.buildV3UserPrompt(input, base);

    // V3 강화 (2026-05-29): blog_* + v4_* 5개 필드 통합 생성 → 출력량 증가로 max_tokens 24576.
    // ⚠️ max_tokens가 크면(>~16K) Anthropic SDK가 non-streaming 호출을 거부
    //   ("Streaming is required for operations that may take longer than 10 minutes") →
    //   반드시 streaming(messages.stream + finalMessage)으로 호출해야 함.
    //   (이 누락으로 V3 확장이 매번 throw → base만 반환 → blog_qa 없는 '구버전 총평'이 생성됨)
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 24576,
      temperature: 0.6,
      system: SYSTEM_PROMPT_V3,
      messages: [{ role: 'user', content: userPrompt }],
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === 'max_tokens') {
      console.warn('[commentary-agent V3] max_tokens 도달 — 응답이 잘렸을 수 있음');
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (!text) throw new Error('V3 응답 비어있음');

    // JSON 추출 + Phase 0 발견 함정 정규화 (undefined → null, trailing comma 제거)
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx < 0 || endIdx <= startIdx) {
      throw new Error(`V3 JSON 객체 미발견: ${text.slice(0, 200)}`);
    }
    let json = text.slice(startIdx, endIdx + 1);
    json = json.replace(/:\s*undefined/g, ': null');
    json = json.replace(/,\s*([}\]])/g, '$1');

    const raw = JSON.parse(json) as V3Extension;
    const normalized = deepNormalizeMath(raw) as V3Extension;
    return this.parseV3Response(normalized);
  }

  /** V3 응답에 stripEnglishEnums 재귀 적용 (nested 필드까지 — Plan agent 검토 반영) */
  private parseV3Response(raw: V3Extension): V3Extension {
    return {
      blog_kicker: raw.blog_kicker ? normalizeText(String(raw.blog_kicker)) : undefined,
      blog_headline: raw.blog_headline ? normalizeText(String(raw.blog_headline)) : undefined,
      blog_dek: raw.blog_dek ? normalizeText(String(raw.blog_dek)) : undefined,
      feature_callout: raw.feature_callout
        ? {
            big_number: String(raw.feature_callout.big_number ?? ''),
            big_number_unit: raw.feature_callout.big_number_unit ? String(raw.feature_callout.big_number_unit) : undefined,
            big_number_label: normalizeText(String(raw.feature_callout.big_number_label ?? '')),
            title: normalizeText(String(raw.feature_callout.title ?? '')),
            // body 가 string으로 올 수 있음 → Array.isArray 가드 (엣지케이스 #3)
            body: Array.isArray(raw.feature_callout.body)
              ? raw.feature_callout.body.map((p) => normalizeText(String(p)))
              : raw.feature_callout.body
                ? [normalizeText(String(raw.feature_callout.body))]
                : [],
          }
        : undefined,
      grade_cuts: Array.isArray(raw.grade_cuts) ? raw.grade_cuts : undefined,
      topic_performance: Array.isArray(raw.topic_performance)
        ? raw.topic_performance.map((tp) => ({
            ...tp,
            topic: normalizeText(String(tp.topic ?? '')),
          }))
        : undefined,
      blog_qa: Array.isArray(raw.blog_qa)
        ? raw.blog_qa.map((qa) => ({
            question: normalizeText(String(qa.question ?? '')),
            answer: Array.isArray(qa.answer)
              ? qa.answer.map((p) => normalizeText(String(p)))
              : qa.answer
                ? [normalizeText(String(qa.answer))]
                : [],
            data_box: qa.data_box
              ? {
                  label: normalizeText(String(qa.data_box.label ?? '')),
                  kind: qa.data_box.kind,
                  rows: Array.isArray(qa.data_box.rows)
                    ? qa.data_box.rows.map((r) => ({
                        label: normalizeText(String(r.label ?? '')),
                        value: normalizeText(String(r.value ?? '')),
                        highlight: r.highlight,
                      }))
                    : [],
                }
              : undefined,
          }))
        : undefined,
      conclusion: raw.conclusion
        ? {
            kicker: raw.conclusion.kicker ? normalizeText(String(raw.conclusion.kicker)) : undefined,
            body: normalizeText(String(raw.conclusion.body ?? '')),
          }
        : undefined,
      pull_quote: raw.pull_quote
        ? {
            text: normalizeText(String(raw.pull_quote.text ?? '')),
            cite: raw.pull_quote.cite ? normalizeText(String(raw.pull_quote.cite)) : undefined,
          }
        : undefined,
      // ── V3 강화: V4 핵심 5개 필드 정규화 (parseV4Response 패턴 차용) ──
      v4_difficulty_rows: Array.isArray(raw.v4_difficulty_rows)
        ? raw.v4_difficulty_rows.map((r) => ({
            question_number: r.question_number ?? '',
            topic: normalizeText(String(r.topic ?? '')),
            sub_topic: r.sub_topic ? normalizeText(String(r.sub_topic)) : undefined,
            difficulty: (['1', '2', '3', '4', '5'].includes(String(r.difficulty))
              ? String(r.difficulty)
              : '3') as '1' | '2' | '3' | '4' | '5',
            points: Number(r.points) || 0,
            analysis_short: r.analysis_short ? normalizeText(String(r.analysis_short)) : undefined,
          }))
        : undefined,
      v4_main_analysis: Array.isArray(raw.v4_main_analysis)
        ? raw.v4_main_analysis.map((m) => ({
            heading: normalizeText(String(m.heading ?? '')),
            body: normalizeText(String(m.body ?? '')),
          }))
        : undefined,
      v4_key_questions: Array.isArray(raw.v4_key_questions)
        ? raw.v4_key_questions.map((kq) => ({
            question_number: kq.question_number ?? '',
            title: normalizeText(String(kq.title ?? '')),
            body: normalizeText(String(kq.body ?? '')),
          }))
        : undefined,
      v4_previous_comparison: raw.v4_previous_comparison
        ? {
            headline: normalizeText(String(raw.v4_previous_comparison.headline ?? '')),
            body: normalizeText(String(raw.v4_previous_comparison.body ?? '')),
          }
        : undefined,
      v4_final_strategy: Array.isArray(raw.v4_final_strategy)
        ? raw.v4_final_strategy.map((s) => ({
            area: normalizeText(String(s.area ?? '')),
            current_status: normalizeText(String(s.current_status ?? '')),
            action: normalizeText(String(s.action ?? '')),
          }))
        : undefined,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // V4 (갈수학학원 스타일) — lazy 생성 (사용자 V4 토글 클릭 시만)
  // public 메서드 — API endpoint에서 직접 호출
  // ─────────────────────────────────────────────────────────────

  /** V4 신규 필드 생성 (Claude Sonnet 4.6, 별도 호출).
   * API endpoint `/api/exam-analysis/[id]/generate-v4`에서 호출.
   * V3와 독립 — V3 데이터 없어도 작동.
   *
   * input에 다음 필드 추가 가능 (다음 시험 인식용):
   *   - examCategory: 'MIDTERM' | 'FINAL' | 'MOCK' | 'OTHER' | null
   *   - grade: string (예: '중2')
   *   - examYear: number (예: 2026)
   *   - examSemester: number (1 또는 2)
   */
  async generateV4Extension(input: AgentInput): Promise<V4Extension> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
    }
    const client = new Anthropic({ apiKey });
    const userPrompt = this.buildV4UserPrompt(input);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16384,
      temperature: 0.5,
      system: SYSTEM_PROMPT_V4,
      messages: [{ role: 'user', content: userPrompt }],
    });

    if (response.stop_reason === 'max_tokens') {
      console.warn('[commentary-agent V4] max_tokens 도달 — 응답이 잘렸을 수 있음');
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (!text) throw new Error('V4 응답 비어있음');

    // JSON 추출 + 정규화 (V3와 동일 함정 처리)
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx < 0 || endIdx <= startIdx) {
      throw new Error(`V4 JSON 객체 미발견: ${text.slice(0, 200)}`);
    }
    let json = text.slice(startIdx, endIdx + 1);
    json = json.replace(/:\s*undefined/g, ': null');
    json = json.replace(/,\s*([}\]])/g, '$1');

    const raw = JSON.parse(json) as V4Extension;
    const normalized = deepNormalizeMath(raw) as V4Extension;

    // 학원명 인식 — input의 academyName 또는 fallback "우리 학원"
    const academyName = (input as unknown as { academyName?: string | null }).academyName || null;
    return this.parseV4Response(normalized, academyName);
  }

  /** V4 응답 정규화 — stripRawHtml + stripEnglishEnums + 학원명 placeholder 치환 + 필수 필드 fallback
   *  raw HTML 색상(span style=color, mark, font) 제거 + 영문 enum 한글 변환
   *  학원명 처리: {학원명} placeholder + 다른 학원명 잔여(갈수학학원 등) → academyName 또는 "우리 학원" */
  private parseV4Response(raw: V4Extension, academyName: string | null = null): V4Extension {
    // 학원명 치환 헬퍼 (AI가 placeholder 무시하고 "갈수학학원" 등 직접 적었을 때 강제 치환)
    const replacement = academyName?.trim() || '우리 학원';
    const stripAcademy = (text: string): string => {
      if (!text) return text;
      let out = text;
      // 1. AI가 지시한 placeholder 치환
      out = out.replace(/\{학원명\}/g, replacement);
      // 2. 알려진 다른 학원명들 (벤치마크 누출) — 강제 치환
      out = out.replace(/갈수학학원/g, replacement);
      out = out.replace(/갈수학(?!학원)/g, replacement);
      return out;
    };
    const norm = (v: unknown): string => stripAcademy(normalizeText(String(v ?? '')));

    return {
      v4_exam_overview: raw.v4_exam_overview
        ? {
            title: norm(raw.v4_exam_overview.title),
            grade: norm(raw.v4_exam_overview.grade),
            school: raw.v4_exam_overview.school ? norm(raw.v4_exam_overview.school) : null,
            range: norm(raw.v4_exam_overview.range),
            total_questions: Number(raw.v4_exam_overview.total_questions) || 0,
            total_points: Number(raw.v4_exam_overview.total_points) || 0,
            avg_difficulty_label: norm(raw.v4_exam_overview.avg_difficulty_label),
            peak_difficulty: norm(raw.v4_exam_overview.peak_difficulty),
            essay_summary: raw.v4_exam_overview.essay_summary
              ? norm(raw.v4_exam_overview.essay_summary)
              : undefined,
            expected_grade_cut: raw.v4_exam_overview.expected_grade_cut
              ? norm(raw.v4_exam_overview.expected_grade_cut)
              : undefined,
            one_liner: norm(raw.v4_exam_overview.one_liner),
          }
        : undefined,
      v4_intro: raw.v4_intro ? norm(raw.v4_intro) : undefined,
      v4_academy_strategy: Array.isArray(raw.v4_academy_strategy)
        ? raw.v4_academy_strategy.map((s) => ({
            title: norm(s.title),
            body: norm(s.body),
          }))
        : undefined,
      v4_difficulty_rows: Array.isArray(raw.v4_difficulty_rows)
        ? raw.v4_difficulty_rows.map((r) => ({
            question_number: r.question_number ?? '',
            topic: norm(r.topic),
            sub_topic: r.sub_topic ? norm(r.sub_topic) : undefined,
            difficulty: (['1', '2', '3', '4', '5'].includes(String(r.difficulty))
              ? String(r.difficulty)
              : '3') as '1' | '2' | '3' | '4' | '5',
            points: Number(r.points) || 0,
            analysis_short: r.analysis_short ? norm(r.analysis_short) : undefined,
          }))
        : undefined,
      v4_exam_features: raw.v4_exam_features
        ? {
            headline: norm(raw.v4_exam_features.headline),
            body: norm(raw.v4_exam_features.body),
          }
        : undefined,
      v4_main_analysis: Array.isArray(raw.v4_main_analysis)
        ? raw.v4_main_analysis.map((m) => ({
            heading: norm(m.heading),
            body: norm(m.body),
          }))
        : undefined,
      v4_previous_comparison: raw.v4_previous_comparison
        ? {
            headline: norm(raw.v4_previous_comparison.headline),
            body: norm(raw.v4_previous_comparison.body),
          }
        : undefined,
      v4_key_questions: Array.isArray(raw.v4_key_questions)
        ? raw.v4_key_questions.map((kq) => ({
            question_number: kq.question_number ?? '',
            title: norm(kq.title),
            body: norm(kq.body),
          }))
        : undefined,
      v4_final_strategy: Array.isArray(raw.v4_final_strategy)
        ? raw.v4_final_strategy.map((s) => ({
            area: norm(s.area),
            current_status: norm(s.current_status),
            action: norm(s.action),
          }))
        : undefined,
    };
  }

  /** V4 user prompt — 이번 시험 단원별 피드백 + 데이터 위주 */
  private buildV4UserPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;
    const totalQ = basicAnalysis.questions.length;
    const totalPts = basicAnalysis.exam_info.total_points;
    const schoolName = basicAnalysis.exam_info.school_name || '';
    const diff = basicAnalysis.summary.difficulty_distribution as Record<string, number>;

    // 시험 메타 — input.examMeta 또는 input.examPaperContext에서 옴
    const examMeta = (input as unknown as {
      examCategory?: 'MIDTERM' | 'FINAL' | 'MOCK' | 'OTHER' | null;
      grade?: string | null;
      examYear?: number | null;
      examSemester?: number | null;
      academyName?: string | null;
    });
    const examCategory = examMeta.examCategory || null;
    const grade = examMeta.grade || '';
    const examSemester = examMeta.examSemester || null;
    const academyName = examMeta.academyName?.trim() || null;

    // 가중 평균 난이도
    const counts = [diff['1'] || 0, diff['2'] || 0, diff['3'] || 0, diff['4'] || 0, diff['5'] || 0];
    const sum = counts.reduce((s, c) => s + c, 0);
    const weighted = sum > 0 ? counts.reduce((s, c, i) => s + c * (i + 1), 0) / sum : 0;
    const diffLabel =
      weighted >= 4.0 ? '매우 어려움' :
      weighted >= 3.3 ? '어려움' :
      weighted >= 2.7 ? '보통' :
      weighted >= 2.0 ? '쉬움' : '매우 쉬움';

    // 가장 많은 난이도
    const peakIdx = counts.indexOf(Math.max(...counts));
    const peakLabels = ['1 기본', '2 표준', '3 응용', '4 심화', '5 최고난도'];
    const peakDiffText = sum > 0 ? `Lv${peakIdx + 1} ${peakLabels[peakIdx].split(' ')[1]} ${counts[peakIdx]}문항` : '미분류';

    // 서술형 요약
    const essayQs = basicAnalysis.questions.filter((q) => q.question_format === 'essay');
    const essayPoints = essayQs.reduce((s, q) => s + (q.points || 0), 0);
    const essaySummary = essayQs.length > 0 ? `서술형 ${essayQs.length}문항 · ${essayPoints}점` : 'null';

    // 단원 집계
    const topicMap: Record<string, { count: number; points: number }> = {};
    for (const q of basicAnalysis.questions) {
      if (!q.topic) continue;
      const parts = q.topic.split('>').map((s) => s.trim()).filter(Boolean);
      const mainUnit = parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1] || q.topic;
      if (!topicMap[mainUnit]) topicMap[mainUnit] = { count: 0, points: 0 };
      topicMap[mainUnit].count++;
      topicMap[mainUnit].points += q.points || 0;
    }
    const topicSummary = Object.entries(topicMap)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([t, v]) => `- ${t}: ${v.count}문항 / ${v.points}점`)
      .join('\n');

    // 문항별 상세 (V4_difficulty_rows 생성 가이드)
    const questionDetails = basicAnalysis.questions
      .map((q) => {
        const num = q.question_number;
        const topic = q.topic || '미분류';
        const lv = q.difficulty || '3';
        const pts = q.points ?? 0;
        const fmt = q.question_format === 'essay' ? '[서술형]' : '';
        return `${num}번: ${topic} / Lv${lv} / ${pts}점 ${fmt}`;
      })
      .join('\n');

    return `## 시험 메타데이터

- 학교: ${schoolName || '미지정'}
- 학년: ${grade || '미지정'}
- 학기: ${examSemester || '미지정'}
- 시험 종류: ${examCategory || 'OTHER'}
- 총 문항: ${totalQ}
- 총 배점: ${totalPts}
- 평균 난이도(가중): ${weighted.toFixed(2)} / 5 (${diffLabel})
- 최다 난이도: ${peakDiffText}
- 서술형: ${essaySummary}

## 🏫 학원 정보 (학원명 절대 임의로 만들지 말 것!)
${academyName
  ? `- 학원명: **${academyName}** — 본문에 학원 주체를 표현할 때는 \`{학원명}\` placeholder만 사용 (후처리에서 자동 치환됨)`
  : `- 학원명: **미지정** — 본문에 학원 주체를 표현할 때는 \`{학원명}\` placeholder만 사용 (후처리에서 "우리 학원"으로 치환됨)`}
- 본문에 "갈수학학원", "ABC학원" 같은 특정 학원명 절대 금지 (다른 학원 마케팅으로 오인됨)

## 단원별 출제 (v4_final_strategy.area로 직접 사용 — 다음 시험 추측 금지)

${topicSummary || '미분류'}

## 🚨 v4_final_strategy 작성 가이드 (가장 중요)

**v4_final_strategy는 "이번 시험에 출제된 단원"에 대한 학습 피드백**이다.
- area는 위 "단원별 출제"에서 출제 비중/배점/난이도가 높은 **상위 3~5개 단원** 선정
- current_status: 이번 시험에서 이 단원이 어떻게 출제되었는지 + 학생들이 보일 어려움
- action: 이 단원을 어떻게 보완·심화할지 구체 학습 방법

**절대 금지**:
- ❌ 다음 시험에 나올 단원 추측해서 area로 작성 ("일차함수 선행", "2학기 연계" 등)
- ❌ 이번 시험에 안 나온 단원을 area로 작성

**올바른 예시** (이번 시험에 "유리수와 순환소수, 식의 계산, 일차부등식" 출제됨 가정):
- area: "유리수와 순환소수"
  current_status: "Lv2~Lv3 위주로 출제되었으며, 순환마디 표기 정확도가 변별 요인이 되었습니다."
  action: "**순환마디 패턴** 정리 + 분수↔소수 변환 빈출 유형 반복 학습"
- area: "식의 계산"
  current_status: "지수법칙 + 곱셈 공식 응용 문항이 Lv3로 출제되어 ..."
  action: "**지수법칙 5가지** 완전 암기 + 다항식 곱셈 공식 5종 변형 패턴 훈련"

## 문항 전체 (V4_difficulty_rows 생성에 사용)

${questionDetails}

---

위 데이터로 V4 출력 형식 키를 모두 생성하세요. 학원 분석 보고서 스타일 — 테이블 중심, 직설적, 학원 보고서 톤. JSON만 출력.

⚠️ 학원명 노출 금지: 본문 어디에도 "갈수학학원", "ABC학원" 같은 특정 학원명 절대 금지. 학원 주체는 \`{학원명}\` placeholder로만 표현 (후처리에서 실제 이름으로 치환됨).

⚠️ 색상 강조 금지: body 안에 \`<span style="color">\`, \`<font>\`, \`<mark>\` 등 raw HTML 색상 절대 사용 금지. 강조는 \`**bold**\`만 사용.

⚠️ v4_final_strategy.area는 **이번 시험에 실제 출제된 단원**에서만 선정 (다음 시험 추측 X).
시험 메타: 학년 ${grade || '?'} / 학기 ${examSemester || '?'} / 시험 종류 ${examCategory || 'OTHER'}.`;
  }

  /** V3 user prompt — 시안 단계의 buildUserPrompt와 동일 구조 (검증됨) */
  private buildV3UserPrompt(input: AgentInput, base: CommentaryResult): string {
    const { basicAnalysis } = input;
    const totalQ = basicAnalysis.questions.length;
    const totalPts = basicAnalysis.exam_info.total_points;
    const types = basicAnalysis.summary.type_distribution;
    const diff = basicAnalysis.summary.difficulty_distribution as Record<string, number>;

    // 가중 평균 난이도 (5단계 기준)
    const counts = [diff['1'] || 0, diff['2'] || 0, diff['3'] || 0, diff['4'] || 0, diff['5'] || 0];
    const sum = counts.reduce((s, c) => s + c, 0);
    const weighted = sum > 0 ? counts.reduce((s, c, i) => s + c * (i + 1), 0) / sum : 0;

    // 단원별 통계 (학생 응답 포함, 최대 8개)
    const topicStats: Record<string, { count: number; correct: number; total: number; pts: number }> = {};
    for (const q of basicAnalysis.questions) {
      const raw = q.topic || '미분류';
      const parts = raw.split('>').map((s) => s.trim());
      const t = parts[parts.length - 1];
      if (!topicStats[t]) topicStats[t] = { count: 0, correct: 0, total: 0, pts: 0 };
      topicStats[t].count++;
      topicStats[t].pts += q.points || 0;
      if (q.is_correct !== null) {
        topicStats[t].total++;
        if (q.is_correct === true) topicStats[t].correct++;
      }
    }
    const topicBreakdown = Object.entries(topicStats)
      .map(([topic, s]) => ({ topic, ...s }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const hasStudentData = basicAnalysis.questions.some((q) => q.is_correct !== null);
    const schoolName = basicAnalysis.exam_info.school_name ?? null;
    const hasSchool = !!schoolName;
    // 비교 데이터 가용성 — base.nearby_comparison 텍스트 길이로 판단
    const nearbyText = base.nearby_comparison || '';
    const hasNearby = nearbyText.length > 50;
    // 연도별 비교는 nearby_comparison 안에 또는 overall_comment에 "이전 기출/연도/전년/작년/20XX년 비교" 패턴
    const yearRegex = /이전\s*기출|연도\s*비교|전년\s*대비|작년\s*대비|20\d{2}년.*비교/;
    const hasYearCompare = yearRegex.test(nearbyText) || yearRegex.test(base.overall_comment || '');

    const topicsLine = topicBreakdown
      .map((t) =>
        hasStudentData
          ? `${t.topic}: ${t.count}문항(${t.pts}점), 정답률 ${t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0}%`
          : `${t.topic}: ${t.count}문항(${t.pts}점)`,
      )
      .join('\n');

    // 문항별 상세 (v4_difficulty_rows / v4_key_questions 생성용 — V3 강화)
    // 난이도 정규화: concept/pattern/reasoning/creative → 1/2/4/5 (없으면 그대로)
    const dMap: Record<string, string> = { concept: '1', pattern: '2', reasoning: '4', creative: '5' };
    const questionDetails = basicAnalysis.questions
      .map((q) => {
        const topic = q.topic || '미분류';
        const rawLv = String(q.difficulty || '3');
        const lv = dMap[rawLv] || rawLv;
        const pts = q.points ?? 0;
        const fmt = q.question_format === 'essay' ? ' [서술형]' : '';
        return `${q.question_number}번: ${topic} / Lv${lv} / ${pts}점${fmt}`;
      })
      .join('\n');

    return `## 시험 정보
- 학교: ${schoolName ?? '(정보 없음)'} ${hasSchool ? '' : '(주변 학교 비교 불가)'}
- 규모: 총 ${totalQ}문항, ${totalPts}점
- 평균 난이도(가중): ${weighted.toFixed(1)} / 5
- 난이도 분포: 기본(1) ${counts[0]} · 표준(2) ${counts[1]} · 응용(3) ${counts[2]} · 심화(4) ${counts[3]} · 최고난도(5) ${counts[4]}
- 형식: 객관식 ${basicAnalysis.exam_info.format_distribution.objective}문항, 단답형 ${basicAnalysis.exam_info.format_distribution.short_answer}문항, 서술형 ${basicAnalysis.exam_info.format_distribution.essay}문항
- 유형: 수와연산 ${types.number || 0}, 문자와식 ${types.algebra || 0}, 함수 ${types.function || 0}, 기하 ${types.geometry || 0}, 확률통계 ${types.statistics || 0}
- 학생 응답 데이터: ${hasStudentData ? '있음' : '없음 (출제 분석만 가능)'}

## 비교 데이터 가용성 (Q1 질문 패턴 결정에 사용 — 시스템 프롬프트의 Q1 규칙 따를 것!)
- 주변 학교 비교 데이터: ${hasNearby ? '✓ 있음' : '✗ 없음'}
- 작년·이전 기출 비교 데이터: ${hasYearCompare ? '✓ 있음' : '✗ 없음'}
- → Q1 질문은 위 4가지 패턴 중 하나로만 출력. 비교 데이터 없으면 답변에서도 비교 표현 금지.

## 단원별 출제 (상위 ${topicBreakdown.length}개)
${topicsLine}

## 문항 전체 (v4_difficulty_rows·v4_key_questions·v4_final_strategy 생성에 사용)
${questionDetails}

## 기존 AI 총평 (참고용)
- overall_comment: ${base.overall_comment.slice(0, 600)}
- strength_areas: ${(base.strength_areas || []).join(' / ')}
- improvement_areas: ${(base.improvement_areas || []).join(' / ')}
- nearby_comparison: ${base.nearby_comparison ? base.nearby_comparison.slice(0, 400) : '(없음)'}

위 데이터로 시스템 프롬프트의 V3 신규 필드 JSON을 작성하세요. **데이터에 없는 숫자/이름을 지어내지 말 것.** 학생 응답이 없으면 grade_cuts는 빈 배열. 학교 정보가 없으면 Q4 (학교 비교)를 생략하고 4문항만 작성.
**v4_difficulty_rows는 위 "문항 전체"의 모든 문항을 포함**(번호·단원·Lv·배점은 그대로, analysis_short만 새로 작성). **v4_final_strategy.area는 위 "단원별 출제"에 있는 단원에서만** 선정(다음 시험 추측 금지). **v4_previous_comparison은 비교 데이터 있을 때만**(없으면 null).`;
  }

  // ── JSON 추출 (다단계 복구) ──

  private extractJson(text: string): Record<string, unknown> {
    // 1차: 코드펜스 내 JSON 블록 추출
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

    // 2차: JSON 객체 범위만 추출 (앞뒤 설명 텍스트 제거)
    const jsonStart = candidate.indexOf('{');
    const jsonEnd = candidate.lastIndexOf('}');
    const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart
      ? candidate.slice(jsonStart, jsonEnd + 1)
      : candidate;

    // 3차: 직접 파싱
    try {
      return JSON.parse(jsonStr);
    } catch {
      // 무시 — 아래에서 복구 시도
    }

    // 4차: 잘린 JSON 복구
    let fixed = jsonStr;
    // 잘린 문자열 값 닫기 (이스케이프된 따옴표 무시)
    const unescaped = fixed.replace(/\\"/g, '');
    if ((unescaped.match(/"/g) || []).length % 2 !== 0) fixed += '"';
    // trailing comma 제거
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    // 열린 배열/객체 닫기
    const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    const openBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    for (let i = 0; i < openBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces; i++) fixed += '}';

    try {
      return JSON.parse(fixed);
    } catch {
      // 무시 — 아래에서 최종 시도
    }

    // 5차: 잘린 마지막 키-값 쌍 제거 후 재시도
    const lastComma = fixed.lastIndexOf(',');
    if (lastComma > 0) {
      const trimmed = fixed.slice(0, lastComma) + fixed.slice(lastComma + 1).replace(/[^}\]]/g, '');
      // 닫는 괄호 보정
      let closing = trimmed;
      const ob = (closing.match(/\[/g) || []).length - (closing.match(/\]/g) || []).length;
      const oc = (closing.match(/\{/g) || []).length - (closing.match(/\}/g) || []).length;
      for (let i = 0; i < ob; i++) closing += ']';
      for (let i = 0; i < oc; i++) closing += '}';
      try {
        return JSON.parse(closing);
      } catch {
        // 무시
      }
    }

    throw new Error(`AI 총평 JSON 파싱 실패: ${jsonStr.slice(0, 200)}...`);
  }

  // ── AI 응답 파싱 ──

  parseResponse(raw: Record<string, unknown>, questions?: Array<{ question_number: number | string; question_format: string | null }>): Record<string, unknown> {
    // 모든 출력 텍스트에서 영문 enum → 한글 라벨 치환 (방어막)
    const norm = (v: unknown) => normalizeText(String(v ?? ''));
    const normArr = (arr: unknown) => this.parseStringArray(arr).map(stripEnglishEnums);

    const result: CommentaryResult = {
      overall_comment: norm(raw.overall_comment),
      exam_characteristics: normArr(raw.exam_characteristics),
      score_strategy: raw.score_strategy ? norm(raw.score_strategy) : undefined,
      score_strategies: Array.isArray(raw.score_strategies)
        ? (raw.score_strategies as Array<Record<string, unknown>>).map(s => ({
            grade: norm(s.grade),
            target: norm(s.target),
            strategy: s.strategy ? norm(s.strategy) : undefined,
            points: Array.isArray(s.points) ? (s.points as string[]).map(p => normalizeText(String(p))) : undefined,
          }))
        : undefined,
      strength_areas: normArr(raw.strength_areas),
      improvement_areas: normArr(raw.improvement_areas),
      notable_questions: this.parseNotableQuestions(raw.notable_questions, questions).map(nq => ({
        question_number: nq.question_number,
        comment: stripEnglishEnums(nq.comment),
      })),
      teaching_recommendations: this.parseTeachingRecommendations(
        raw.teaching_recommendations ?? raw.study_priority,
      ).map(tr => ({
        topic: stripEnglishEnums(tr.topic),
        priority: tr.priority,
        reason: stripEnglishEnums(tr.reason),
      })),
      nearby_comparison: raw.nearby_comparison ? norm(raw.nearby_comparison) : undefined,
    };

    return result as unknown as Record<string, unknown>;
  }

  // ── 규칙 기반 폴백 ──

  ruleBased(input: AgentInput): Record<string, unknown> {
    const { basicAnalysis } = input;

    const result: CommentaryResult = {
      overall_comment: this.generateOverallComment(basicAnalysis),
      exam_characteristics: this.generateExamCharacteristics(basicAnalysis),
      score_strategy: this.generateScoreStrategy(basicAnalysis),
      strength_areas: this.findStrengthAreas(basicAnalysis),
      improvement_areas: this.findImprovementAreas(basicAnalysis),
      notable_questions: this.findNotableQuestions(basicAnalysis),
      teaching_recommendations: this.generateTeachingRecommendations(basicAnalysis),
    };

    return result as unknown as Record<string, unknown>;
  }

  // ── 규칙 기반: 전체 코멘트 ──

  private generateOverallComment(analysis: BasicAnalysisResult): string {
    const totalQ = analysis.questions.length;
    const totalPts = analysis.exam_info.total_points;
    const { difficulty_distribution: diff } = analysis.summary;

    const dc = getDiffCounts(diff as unknown as Record<string, number>);
    const easyCount = dc.level1 + dc.level2;
    const hardCount = dc.level4 + dc.level5;

    // 난이도 구성 평가
    let diffNote: string;
    if (hardCount > easyCount) {
      diffNote = '심화·최고난도 문항 비중이 높아 상위권 변별에 초점을 둔 시험입니다.';
    } else if (easyCount > hardCount * 2) {
      diffNote = '기본·표준 문항 비중이 높아 기본기 점검에 적합한 시험입니다.';
    } else {
      diffNote = '난이도가 고르게 분포되어 전 범위의 실력을 평가하는 시험입니다.';
    }

    // 서술형 비중
    const essayCount = analysis.exam_info.format_distribution.essay || 0;
    const essayNote = essayCount > 0
      ? ` 서술형 ${essayCount}문항이 포함되어 논리적 서술 능력도 함께 평가하고 있습니다.`
      : '';

    // 학생 데이터 유무에 따라 분기
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);
    let studentNote = '';
    if (hasStudentData) {
      const correct = analysis.questions.filter((q) => q.is_correct === true).length;
      const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
      studentNote = ` 학생의 정답률은 ${accuracy}%이며, ${accuracy >= 70 ? '전반적으로 안정적인 수준' : accuracy >= 50 ? '기본기는 갖추었으나 보완이 필요한 수준' : '기초 개념 재학습이 필요한 수준'}입니다.`;
    }

    return `총 ${totalQ}문항 ${totalPts}점 만점 시험으로, 기본·표준 ${easyCount}문항·응용 ${dc.level3}문항·심화·최고난도 ${hardCount}문항으로 구성되어 있습니다. ${diffNote}${essayNote}${studentNote}`;
  }

  // ── 규칙 기반: 점수 확보 전략 ──

  private generateScoreStrategy(analysis: BasicAnalysisResult): string {
    const totalPts = analysis.exam_info.total_points;
    // 난이도별 배점 합계
    const diffPts: Record<string, number> = {};
    for (const q of analysis.questions) {
      const nd = q.difficulty || '1';
      diffPts[nd] = (diffPts[nd] || 0) + (q.points || 0);
    }

    // 누적 점수 계산 (쉬운 난이도부터)
    const levels = ['1', '2', '3', '4', '5'];
    let cumulative = 0;
    const steps: string[] = [];
    for (const lv of levels) {
      const pts = diffPts[lv] || 0;
      if (pts > 0) {
        cumulative += pts;
        const pct = totalPts > 0 ? Math.round((cumulative / totalPts) * 100) : 0;
        steps.push(`${lv}단계까지 ${cumulative}점(${pct}%)`);
      }
    }

    if (steps.length <= 1) {
      return `전 문항 배점이 ${totalPts}점이며, 난이도 구분 없이 균일한 배점 구조입니다.`;
    }

    return `난이도별 누적 도달 점수: ${steps.join(', ')}. 기본~표준(1~2단계)까지 확실히 확보하는 것이 점수 안정화의 핵심입니다.`;
  }

  // ── 규칙 기반: 시험 특성 ──

  private generateExamCharacteristics(analysis: BasicAnalysisResult): string[] {
    const chars: string[] = [];
    const { difficulty_distribution: diff } = analysis.summary;
    const totalQ = analysis.questions.length;

    // 난이도 비중
    const dc2 = getDiffCounts(diff as unknown as Record<string, number>);
    const easyPct = totalQ > 0 ? Math.round(((dc2.level1 + dc2.level2) / totalQ) * 100) : 0;
    const hardPct = totalQ > 0 ? Math.round(((dc2.level4 + dc2.level5) / totalQ) * 100) : 0;

    if (easyPct >= 40) chars.push(`기본·표준 문항이 ${easyPct}%로 기본기 확인 비중이 높음`);
    if (hardPct >= 30) chars.push(`심화·최고난도 문항이 ${hardPct}%로 상위권 변별력 확보`);

    // 서술형 비중
    const essayCount = analysis.exam_info.format_distribution.essay || 0;
    if (essayCount > 0) {
      const essayPts = analysis.questions
        .filter((q) => q.question_format === 'essay')
        .reduce((s, q) => s + (q.points || 0), 0);
      const totalPts = analysis.exam_info.total_points;
      const essayPtsPct = totalPts > 0 ? Math.round((essayPts / totalPts) * 100) : 0;
      chars.push(`서술형 ${essayCount}문항이 총 배점의 ${essayPtsPct}%를 차지`);
    }

    // 출제 단원 수
    const topics = new Set(analysis.questions.map((q) => q.topic).filter(Boolean));
    chars.push(`총 ${topics.size}개 단원에서 출제`);

    return chars.slice(0, 4);
  }

  // ── 규칙 기반: 강점 영역 ──

  private findStrengthAreas(analysis: BasicAnalysisResult): string[] {
    const strengths: string[] = [];
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);

    if (hasStudentData) {
      // 난이도별 정답률 분석
      const diffGroups = this.groupByField(analysis, 'difficulty');
      for (const [diff, { correct, total }] of Object.entries(diffGroups)) {
        if (total >= 2 && correct / total >= 0.7) {
          const label = this.difficultyLabel(diff);
          strengths.push(`${label} 난이도 문항에서 정답률 ${Math.round((correct / total) * 100)}%로 안정적`);
        }
      }

      // 유형별 정답률 분석
      const typeGroups = this.groupByField(analysis, 'question_type');
      for (const [type, { correct, total }] of Object.entries(typeGroups)) {
        if (total >= 2 && correct / total >= 0.7) {
          const label = this.typeLabel(type);
          strengths.push(`${label} 유형 ${total}문항 중 ${correct}문항 정답으로 해당 유형에 대한 이해가 탄탄함`);
        }
      }
    } else {
      // 출제 관점 분석
      const { difficulty_distribution: diffDist } = analysis.summary;
      const dc4 = getDiffCounts(diffDist as unknown as Record<string, number>);
      if ((dc4.level1 + dc4.level2) > 0 && (dc4.level4 + dc4.level5) > 0) {
        strengths.push('기본~심화까지 난이도가 골고루 분포되어 전 범위 평가 가능');
      }
      const topics = new Set(analysis.questions.map((q) => q.topic).filter(Boolean));
      if (topics.size >= 3) {
        strengths.push(`${topics.size}개 단원에서 출제되어 교육과정 전반을 커버`);
      }
    }

    if (strengths.length === 0) {
      strengths.push('출제 범위가 교육과정에 부합');
    }

    return strengths.slice(0, 3);
  }

  // ── 규칙 기반: 개선 영역 ──

  private findImprovementAreas(analysis: BasicAnalysisResult): string[] {
    const improvements: string[] = [];
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);

    if (hasStudentData) {
      // 난이도별 약점
      const diffGroups = this.groupByField(analysis, 'difficulty');
      for (const [diff, { correct, total }] of Object.entries(diffGroups)) {
        if (total >= 2 && correct / total < 0.5) {
          const label = this.difficultyLabel(diff);
          improvements.push(`${label} 난이도 문항 정답률 ${Math.round((correct / total) * 100)}%로 집중 보완 필요`);
        }
      }

      // 오답 유형 패턴
      const errorTypes = analysis.questions
        .filter((q) => q.is_correct === false && q.error_type)
        .map((q) => q.error_type!);

      const errorCounts: Record<string, number> = {};
      for (const err of errorTypes) {
        errorCounts[err] = (errorCounts[err] || 0) + 1;
      }

      for (const [errType, count] of Object.entries(errorCounts)) {
        if (count >= 2) {
          improvements.push(`${this.errorTypeLabel(errType)} 유형 실수가 ${count}건 반복되어 해당 부분 훈련 필요`);
        }
      }
    } else {
      // 출제 관점
      const { difficulty_distribution: diffDist2 } = analysis.summary;
      const dc5 = getDiffCounts(diffDist2 as unknown as Record<string, number>);
      if (dc5.level4 + dc5.level5 === 0) {
        improvements.push('심화·최고난도 문항이 없어 상위권 변별이 어려울 수 있음');
      }
      if (analysis.exam_info.format_distribution.essay === 0) {
        improvements.push('서술형 문항이 없어 과정 평가가 누락됨');
      }
    }

    if (improvements.length === 0) {
      improvements.push('전반적으로 균형 잡힌 구성이나 고난도 문항의 추가 검토 권장');
    }

    return improvements.slice(0, 3);
  }

  // ── 규칙 기반: 주목할 문항 ──

  private findNotableQuestions(analysis: BasicAnalysisResult): NotableQuestion[] {
    const notable: NotableQuestion[] = [];
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);

    if (hasStudentData) {
      // 쉬운 문제를 틀림
      const wrongEasy = analysis.questions.filter(
        (q) => q.is_correct === false && (['1', '2'].includes(normalizeDiff(q.difficulty))),
      );
      for (const q of wrongEasy.slice(0, 2)) {
        notable.push({
          question_number: Number(q.question_number),
          comment: `${this.difficultyLabel(q.difficulty)} 난이도임에도 오답 — 해당 개념의 기초 이해도를 재점검할 필요가 있습니다.`,
        });
      }

      // 어려운 문제를 맞힘
      const correctHard = analysis.questions.filter(
        (q) => q.is_correct === true && (['4', '5'].includes(normalizeDiff(q.difficulty))),
      );
      for (const q of correctHard.slice(0, 1)) {
        notable.push({
          question_number: Number(q.question_number),
          comment: `${this.difficultyLabel(q.difficulty)} 난이도 문항을 정확히 해결하여 해당 영역의 심화 학습 역량이 확인됩니다.`,
        });
      }
    } else {
      // 출제 관점: 고배점 문항
      const highPoints = [...analysis.questions].sort((a, b) => (b.points || 0) - (a.points || 0));
      for (const q of highPoints.slice(0, 2)) {
        if (q.points && q.points >= 5) {
          notable.push({
            question_number: Number(q.question_number),
            comment: `${q.points}점 고배점 문항으로 ${this.difficultyLabel(q.difficulty)} 난이도의 ${this.typeLabel(q.question_type)} 유형입니다.`,
          });
        }
      }
    }

    if (notable.length === 0 && analysis.questions.length > 0) {
      const first = analysis.questions[0];
      notable.push({
        question_number: Number(first.question_number),
        comment: `${this.difficultyLabel(first.difficulty)} 난이도의 ${this.typeLabel(first.question_type)} 유형 문항입니다.`,
      });
    }

    return notable.slice(0, 3);
  }

  // ── 규칙 기반: 지도 추천 ──

  private generateTeachingRecommendations(analysis: BasicAnalysisResult): TeachingRecommendation[] {
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);
    const topicStats: Record<string, { correct: number; total: number; pts: number }> = {};

    for (const q of analysis.questions) {
      const topic = q.topic || '기타';
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, pts: 0 };
      topicStats[topic].total++;
      topicStats[topic].pts += q.points || 0;
      if (q.is_correct === true) topicStats[topic].correct++;
    }

    let sorted: { topic: string; accuracy: number; total: number; pts: number }[];

    if (hasStudentData) {
      // 정답률 낮은 순
      sorted = Object.entries(topicStats)
        .map(([topic, { correct, total, pts }]) => ({
          topic,
          accuracy: total > 0 ? correct / total : 0,
          total,
          pts,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
    } else {
      // 출제 비중 높은 순
      sorted = Object.entries(topicStats)
        .map(([topic, { correct, total, pts }]) => ({
          topic,
          accuracy: total > 0 ? correct / total : 0,
          total,
          pts,
        }))
        .sort((a, b) => b.pts - a.pts);
    }

    const recommendations: TeachingRecommendation[] = [];
    let priority = 1;

    for (const item of sorted.slice(0, 5)) {
      let reason: string;
      if (hasStudentData) {
        const accuracyPct = Math.round(item.accuracy * 100);
        if (accuracyPct < 30) {
          reason = `정답률 ${accuracyPct}%로 기초 개념부터 재학습이 필요합니다.`;
        } else if (accuracyPct < 60) {
          reason = `정답률 ${accuracyPct}%로 유형별 반복 훈련이 필요합니다.`;
        } else {
          reason = `정답률 ${accuracyPct}%로 심화 문제 도전을 권장합니다.`;
        }
      } else {
        reason = `${item.total}문항 ${item.pts}점 배점으로 출제 비중이 높아 집중 대비가 필요합니다.`;
      }

      recommendations.push({ topic: item.topic, priority, reason });
      priority++;
    }

    return recommendations;
  }

  // ── 파싱 헬퍼 ──

  private parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => String(v));
  }

  private parseNotableQuestions(
    value: unknown,
    questions?: Array<{ question_number: number | string; question_format: string | null }>,
  ): NotableQuestion[] {
    if (!Array.isArray(value)) return [];

    // 실제 문항번호 목록 (보정용)
    const validNumbers = questions?.map((q) => String(q.question_number)) || [];

    const seen = new Set<string>();
    return value
      .map((v) => {
        const item = v as Record<string, unknown>;
        let qNum = String(item.question_number ?? '');

        // AI가 숫자만 반환한 경우, 실제 문항 목록에서 매칭 시도
        if (validNumbers.length > 0 && !validNumbers.includes(qNum)) {
          const numOnly = qNum.replace(/\D/g, '');
          // "서답형N", "서술형N" 등 실제 번호에서 같은 숫자를 가진 비-순수숫자 번호 찾기
          const match = validNumbers.find(
            (vn) => String(vn) !== numOnly && String(vn).replace(/\D/g, '') === numOnly,
          );
          if (match) qNum = match;
        }

        return { question_number: qNum, comment: String(item.comment ?? '') };
      })
      .filter((nq) => {
        // 중복 제거
        const key = String(nq.question_number);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }) as NotableQuestion[];
  }

  private parseTeachingRecommendations(value: unknown): TeachingRecommendation[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => {
      const item = v as Record<string, unknown>;
      return {
        topic: String(item.topic ?? ''),
        priority: Math.min(5, Math.max(1, Number(item.priority ?? 3))),
        reason: String(item.reason ?? ''),
      };
    });
  }

  // ── 공통 유틸 ──

  // ── 교육과정 참조 블록 생성 ──

  private buildCurriculumReference(analysis: BasicAnalysisResult): string {
    // topic에서 학년 추론 (예: "수학 > 소인수분해 > ..." → 중1 추정)
    const topics = analysis.questions.map((q) => q.topic).filter(Boolean) as string[];
    const gradeHint = this.inferGradeFromTopics(topics);
    if (!gradeHint) return '';

    // 해당 학년의 교육과정 단원 추출
    const matched = MIDDLE_SCHOOL_CURRICULUM.filter(
      (c: GradeCurriculum) => c.grade === gradeHint || `${c.grade} ${c.semester}` === gradeHint,
    );

    if (matched.length === 0) return '';

    const unitList = matched
      .map((c: GradeCurriculum) =>
        `[${c.grade} ${c.semester}] ${c.units.map((u) => {
          const topicNames = u.topics.map((t) => t.keywords[0]).join(', ');
          return `${u.name}(${topicNames})`;
        }).join(' / ')}`,
      )
      .join('\n');

    return `
## 교육과정 참조 (${gradeHint})
아래는 해당 학년의 교육과정 단원 구조입니다. 단원명을 정확히 사용하고, 출제 범위를 교육과정과 대조하세요.
${unitList}`;
  }

  private inferGradeFromTopics(topics: string[]): string | null {
    // topic 문자열에서 학년 키워드 추출
    const gradeKeywords: Record<string, string> = {
      '소인수분해': '중1', '정수와 유리수': '중1', '일차방정식': '중1',
      '좌표평면': '중1', '정비례': '중1', '반비례': '중1',
      '유리수': '중2', '순환소수': '중2', '일차함수': '중2',
      '연립방정식': '중2', '일차부등식': '중2', '확률': '중2',
      '제곱근': '중3', '인수분해': '중3', '이차방정식': '중3',
      '이차함수': '중3', '피타고라스': '중3', '삼각비': '중3', '대푯값': '중3',
    };

    const counts: Record<string, number> = {};
    for (const topic of topics) {
      for (const [kw, grade] of Object.entries(gradeKeywords)) {
        if (topic.includes(kw)) {
          counts[grade] = (counts[grade] || 0) + 1;
        }
      }
    }

    if (Object.keys(counts).length === 0) return null;
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
  }

  private groupByField(
    analysis: BasicAnalysisResult,
    field: 'difficulty' | 'question_type',
  ): Record<string, { correct: number; total: number }> {
    const groups: Record<string, { correct: number; total: number }> = {};

    for (const q of analysis.questions) {
      const key = q[field] || 'unknown';
      if (!groups[key]) groups[key] = { correct: 0, total: 0 };
      groups[key].total++;
      if (q.is_correct === true) groups[key].correct++;
    }

    return groups;
  }

  private difficultyLabel(diff: string): string {
    const nd = normalizeDiff(diff);
    const map: Record<string, string> = {
      '1': '기본(1)',
      '2': '표준(2)',
      '3': '응용(3)',
      '4': '심화(4)',
      '5': '최고난도(5)',
      concept: '기본(1)',
      pattern: '표준(2)',
      reasoning: '심화(4)',
      creative: '최고난도(5)',
    };
    return map[nd] || map[diff] || diff;
  }

  private typeLabel(type: string): string {
    const map: Record<string, string> = {
      number: '수와 연산',
      algebra: '문자와 식',
      function: '함수',
      geometry: '기하',
      statistics: '확률과 통계',
    };
    return map[type] || type;
  }

  private errorTypeLabel(errType: string): string {
    const map: Record<string, string> = {
      calculation_error: '계산 실수',
      concept_gap: '개념 이해 부족',
      careless: '부주의',
      time_pressure: '시간 부족',
    };
    return map[errType] || errType;
  }
}
