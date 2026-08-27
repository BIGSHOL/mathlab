/**
 * 과목 분리 리팩터링 회귀 감시용 고정 입력.
 * 이 파일은 절대 바뀌면 안 된다 — 바뀌면 baseline 과 비교가 무의미해진다.
 */
import type { AnalyzedQuestion, ExamContext } from '../../src/lib/exam-analysis/types';

export const MATH_CONTEXTS: ExamContext[] = [
  { subject: 'MATH', grade_level: '중2', unit: null, category: '중간', exam_scope: ['수와 연산', '문자와 식'], paper_type: 'blank', has_essay: true, exam_year: 2026, exam_semester: 1, exam_category: 'MIDTERM' },
  { subject: 'MATH', grade_level: '고1', unit: null, category: '기말', exam_scope: null, paper_type: 'student', has_essay: false, exam_year: 2026, exam_semester: 2, exam_category: 'FINAL' },
  { subject: 'MATH', grade_level: null, unit: null, category: null, exam_scope: null, paper_type: 'blank', has_essay: false },
];

export const ENGLISH_CONTEXTS: ExamContext[] = [
  { subject: 'ENGLISH', grade_level: '중2', unit: null, category: '중간', exam_scope: ['중2 > 능률 김기택 > L4. Always Stay Healthy'], paper_type: 'blank', has_essay: true, exam_year: 2026, exam_semester: 1, exam_category: 'MIDTERM' },
  { subject: 'ENGLISH', grade_level: '고1', unit: null, category: '기말', exam_scope: null, paper_type: 'blank', has_essay: false },
];

function q(
  n: number, type: string, ability: string | null, diff: string, pts: number,
  topic: string | null, fmt: 'objective' | 'short_answer' | 'essay' = 'objective',
): AnalyzedQuestion {
  return {
    question_number: n, question_format: fmt, difficulty: diff, difficulty_reason: '이유',
    question_type: type, ability_domain: ability, points: pts, topic,
    ai_comment: '두 문장짜리 코멘트입니다. 풀이 포인트를 설명합니다.',
    confidence: 0.9, confidence_reason: '문항 내용 명확',
    is_correct: null, student_answer: null, earned_points: null, error_type: null,
  };
}

export const MATH_QUESTIONS: AnalyzedQuestion[] = [
  q(1, 'number', 'calculation', '1', 4, '수학 > 소인수분해 > 소수'),
  q(2, 'number', 'calculation', '2', 4.6, '수학 > 소인수분해 > 거듭제곱'),
  q(3, 'change_relation', 'understanding', '3', 5, '수학 > 문자와 식 > 일차식'),
  q(4, 'shape_measure', 'understanding', '4', 5, '수학 > 기본도형 > 각'),
  q(5, 'data_possibility', 'problem_solving', '5', 6, '수학 > 자료의 정리 > 도수분포', 'essay'),
  q(6, 'algebra', 'reasoning', '3', 5, null, 'short_answer'),
];

export const ENGLISH_QUESTIONS: AnalyzedQuestion[] = [
  q(1, 'grammar', 'accuracy', '2', 4, '중2 영어 > 문법 > 수동태'),
  q(2, 'vocabulary', 'accuracy', '3', 4, '중2 영어 > 어휘 > 교육과정 기본 어휘'),
  q(3, 'reading', 'understanding', '3', 5, '중2 영어 > 독해 > 주제·요지'),
  q(4, 'reading', 'reasoning', '5', 5, '중2 영어 > 독해 > 세부 정보 파악'),
  q(5, 'writing', 'expression', '4', 6, '중2 영어 > 문법 > 관계대명사', 'essay'),
];

export const MATH_SUMMARY = {
  difficulty_distribution: { '1': 1, '2': 1, '3': 2, '4': 1, '5': 1 },
  type_distribution: { number: 2, change_relation: 1, shape_measure: 1, data_possibility: 1, algebra: 1 },
};

export const ENGLISH_SUMMARY = {
  difficulty_distribution: { '2': 1, '3': 2, '4': 1, '5': 1 },
  type_distribution: { grammar: 1, vocabulary: 1, reading: 2, writing: 1 },
};
