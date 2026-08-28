/**
 * 열화(degenerate) 픽스처 — "값이 다 들어 있는 예쁜 데이터"가 아닌 **실제로 들어오는 데이터**.
 *
 * 기존 `check-template-blocks.ts` 의 더미는 20문항 전부 `points:5` · 동일 topic ·
 * 난이도 1~5 순환이라, 블록들이 실제로 마주치는 경로(난이도 판독 실패 · 소수 배점 ·
 * 단원 없음 · 레거시 문항)를 하나도 건드리지 않았다. 그래서 렌더러가 NaN 을 뱉어도
 * 검사는 초록이었다. 여기서 그 반대를 만든다.
 */
import type { AnalyzedQuestion } from '../../src/lib/exam-analysis/types';
import type { CommentaryResult } from '../../src/lib/exam-analysis/agents/commentary-agent';

type Q = Record<string, unknown>;
const q = (o: Q) => o as unknown as AnalyzedQuestion;

/** 정상에 가까운 기준선 — 다른 픽스처와 비교하기 위한 대조군 */
export const normalQuestions: AnalyzedQuestion[] = Array.from({ length: 20 }, (_, i) =>
  q({
    question_number: String(i + 1),
    difficulty: String((i % 5) + 1),
    points: 5,
    question_type: 'algebra',
    ability_domain: 'calculation',
    question_format: i < 15 ? 'objective' : 'essay',
    topic: '공통수학1 > 다항식 > 다항식의 연산',
    ai_comment: '이 문항은 $x^2+1$ 을 다룬다.',
  }),
);

/** 문항 1개 — 평균·최대·분포 계산이 표본 1개에서 무너지는지 */
export const singleQuestion: AnalyzedQuestion[] = [
  q({ question_number: '1', difficulty: '3', points: 100, question_format: 'objective', topic: '수와 연산 > 유리수' }),
];

/**
 * 열화 — 난이도 판독 실패 · 소수/0/null 배점 · 단원 없음 · `is_correct` 키 부재 ·
 * 아주 긴 한국어 단원명 · 서술형 번호 문자열.
 */
export const degenerateQuestions: AnalyzedQuestion[] = [
  q({ question_number: '1', difficulty: null, points: 2.3, topic: null, question_format: 'objective' }),
  q({ question_number: '2', difficulty: '', points: null, topic: '', question_format: 'objective' }),
  q({ question_number: '3', difficulty: 'unknown', points: 0, topic: '미분류', question_format: 'objective' }),
  q({ question_number: '4', difficulty: '3', points: 2.3, topic: '공통수학1 > 방정식과 부등식 > 이차방정식과 이차함수의 위치 관계 및 판별식 활용', question_format: 'objective' }),
  q({ question_number: '5', difficulty: '3', points: 2.3, topic: '공통수학1 > 방정식과 부등식 > 이차방정식과 이차함수의 위치 관계 및 판별식 활용', question_format: 'objective' }),
  q({ question_number: '6', difficulty: '3', points: 2.3, topic: '공통수학1 > 방정식과 부등식 > 이차방정식과 이차함수의 위치 관계 및 판별식 활용', question_format: 'objective' }),
  q({ question_number: '서술형1', difficulty: '5', points: 10.5, topic: '공통수학1 > 다항식 > 인수분해', question_format: 'essay' }),
  q({ question_number: '서술형2', difficulty: undefined, points: undefined, question_format: 'essay' }),
];

/** 전 문항 동일 난이도·동일 단원 — 분포/변별 계산이 분산 0에서 버티는지 */
export const uniformQuestions: AnalyzedQuestion[] = Array.from({ length: 12 }, (_, i) =>
  q({
    question_number: String(i + 1),
    difficulty: '3',
    points: 5,
    question_type: 'number',
    ability_domain: 'calculation',
    question_format: 'objective',
    topic: '중2 수학 > 수와 연산 > 유리수와 순환소수',
  }),
);

/** 40문항 — 격자·노선도·도트가 넘치는지 */
export const manyQuestions: AnalyzedQuestion[] = Array.from({ length: 40 }, (_, i) =>
  q({
    question_number: String(i + 1),
    difficulty: String((i % 5) + 1),
    points: i % 3 === 0 ? 2.5 : 3,
    question_type: ['number', 'algebra', 'function', 'geometry', 'statistics'][i % 5],
    ability_domain: 'reasoning',
    question_format: i % 7 === 0 ? 'essay' : 'objective',
    topic: `단원${(i % 11) + 1} > 중단원${(i % 4) + 1}`,
  }),
);

/** 총평 확장 필드가 **전부 없는** 경우 — V3 확장 호출이 실패했을 때의 실제 모습 */
export const minimalCommentary = {
  overall_comment: '전반적으로 표준 난이도의 시험입니다.',
} as unknown as CommentaryResult;

/** 확장 필드까지 채워진 경우 */
export const fullCommentary = {
  overall_comment: '전반적으로 표준 난이도의 시험입니다. $x^2$ 관련 문항이 많습니다.',
  nearby_comparison: '인근 학교 대비 다소 높은 편입니다.',
  score_strategies: ['기본 개념 정리', '오답 노트'],
  strength_areas: ['계산력'],
  improvement_areas: ['추론력'],
  notable_questions: ['3번'],
  teaching_recommendations: ['단원 복습'],
  blog_kicker: '키커',
  blog_headline: '변별이 시작되는 지점',
  blog_dek: '이번 시험의 구조를 한 문장으로 요약하면 이렇습니다.',
  feature_callout: { title: '주목', body: ['본문 한 줄'] },
  grade_cuts: [{ grade: '1등급', cut: '90' }],
  topic_performance: [{ topic: '다항식', value: '20점 / 4문항' }],
  blog_qa: [{ question: '이번 시험은 어땠나요?', answer: ['표준 수준입니다.'] }],
  conclusion: { body: '결론 본문입니다.' },
  pull_quote: { text: '한 문장으로 남기는 인용문' },
  // 실제 shape 그대로 — AI 가 일부 필드를 빠뜨린 행도 섞는다(그게 실제로 오는 모습이다)
  v4_difficulty_rows: [
    { question_number: '1', topic: '다항식의 연산', difficulty: '2', points: 4 },
    { question_number: '서술형1', topic: '인수분해', difficulty: '5', points: 10.5, analysis_short: '판별식 활용' },
    { question_number: 3, topic: '이차방정식', difficulty: '3', points: 4.6 },
  ],
  v4_previous_comparison: { headline: '작년 대비', body: '비슷합니다' },
  v4_main_analysis: [{ heading: '분석', body: '본문' }],
  v4_key_questions: [{ number: '3', reason: '킬러' }],
  v4_final_strategy: [{ heading: '전략', body: '본문' }],
} as unknown as CommentaryResult;

/**
 * 영어 시험지 — 능력·유형 축이 수학과 다른 집합이다.
 * 수학 4능력(계산력·이해력·문제해결력·추론력)을 블록에 하드코딩하면 이 픽스처에서
 * 축이 전부 0으로 떨어져 스카우트 카드·대화 블록이 통째로 사라진다.
 */
export const englishQuestions: AnalyzedQuestion[] = Array.from({ length: 18 }, (_, i) =>
  q({
    question_number: String(i + 1),
    difficulty: String((i % 5) + 1),
    points: 5,
    question_type: ['reading', 'grammar', 'vocabulary', 'writing'][i % 4],
    ability_domain: ['accuracy', 'understanding', 'reasoning', 'expression'][i % 4],
    question_format: i < 14 ? 'objective' : 'essay',
    topic: '영어 > 독해 > 주제·요지 추론',
  }),
);

export const QUESTION_FIXTURES: Array<[string, AnalyzedQuestion[]]> = [
  ['정상 20문항', normalQuestions],
  ['1문항', singleQuestion],
  ['열화(난이도/배점/단원 결손)', degenerateQuestions],
  ['전 문항 동일', uniformQuestions],
  ['40문항', manyQuestions],
  ['영어 18문항', englishQuestions],
  ['0문항', []],
];

export const COMMENTARY_FIXTURES: Array<[string, CommentaryResult]> = [
  ['확장 필드 전무', minimalCommentary],
  ['확장 필드 완비', fullCommentary],
];
