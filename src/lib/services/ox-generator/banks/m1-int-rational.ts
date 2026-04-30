/**
 * 중1-1 / 수와 연산 / 정수와 유리수
 *
 * curriculum.ts: '정수와 유리수'
 *   subUnits: ['정수와 유리수', '정수와 유리수의 덧셈과 뺄셈', '정수와 유리수의 곱셈과 나눗셈']
 */

import type { OxBankMeta, OxStatementInput } from '../types';
import { expandBank, validateBank } from '../utils';

const META: OxBankMeta = {
  schoolLevel: 'middle',
  grade: 'middle_1',
  semester: 1,
  part: 'calc',
  chapter: '정수와 유리수',
  category: 'm1_int_rational',
};

const INPUTS: OxStatementInput[] = [
  // ── 정답 O ──
  {
    id: 'curated-m1-int-001',
    content: '$0$은 양수도 음수도 아니다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '정수와 유리수',
  },
  {
    id: 'curated-m1-int-002',
    content: '음의 정수는 $0$보다 작은 정수이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '정수와 유리수',
  },
  {
    id: 'curated-m1-int-003',
    content: '두 음수에서는 절댓값이 큰 수가 더 작다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '정수와 유리수',
    explanation: '예: $-7 < -5$ 인데 $|-7|=7 > |-5|=5$.',
  },
  {
    id: 'curated-m1-int-004',
    content: '모든 정수는 유리수이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '정수와 유리수',
    explanation: '정수 $n$은 분수 $\\dfrac{n}{1}$로 나타낼 수 있다.',
  },
  {
    id: 'curated-m1-int-005',
    content: '두 음수의 곱은 양수이다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '정수와 유리수의 곱셈과 나눗셈',
  },
  {
    id: 'curated-m1-int-006',
    content: '$|-3| = |3|$ 이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'property',
    section: '정수와 유리수',
    explanation: '절댓값은 부호와 무관하게 원점으로부터의 거리이므로 항상 양수(또는 0)이다.',
  },
  {
    id: 'curated-m1-int-013',
    content: '음수 두 개를 더하면 절댓값은 커지고 부호는 음수이다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '정수와 유리수의 덧셈과 뺄셈',
  },
  {
    id: 'curated-m1-int-014',
    content: '$0$의 절댓값은 $0$이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '정수와 유리수',
  },
  // ── 정답 X ──
  {
    id: 'curated-m1-int-007',
    content: '$-2$는 $-5$보다 작다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '정수와 유리수',
    explanation: '음수는 절댓값이 작을수록 크다. $-2 > -5$.',
  },
  {
    id: 'curated-m1-int-008',
    content: '절댓값은 음수일 수도 있다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '정수와 유리수',
    explanation: '절댓값은 거리 개념이므로 항상 $0$ 이상이다.',
  },
  {
    id: 'curated-m1-int-009',
    content: '$0$의 절댓값은 정의되지 않는다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '정수와 유리수',
    explanation: '$|0|=0$ 이다.',
  },
  {
    id: 'curated-m1-int-010',
    content: '$\\dfrac{1}{2}$는 정수이다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '정수와 유리수',
    explanation: '$\\dfrac{1}{2}$는 유리수이지만 정수는 아니다.',
  },
  {
    id: 'curated-m1-int-011',
    content: '$(-2) - (-5) = -7$ 이다.',
    answer: 'X',
    level: 'medium',
    questionType: 'computation',
    section: '정수와 유리수의 덧셈과 뺄셈',
    explanation: '$(-2) - (-5) = -2 + 5 = 3$.',
  },
  {
    id: 'curated-m1-int-012',
    content: '두 유리수 사이에는 또 다른 유리수가 존재하지 않는다.',
    answer: 'X',
    level: 'hard',
    questionType: 'misconception',
    section: '정수와 유리수',
    explanation: '두 유리수 사이에는 항상 무수히 많은 유리수가 존재한다(조밀성).',
  },
];

validateBank(META, INPUTS);

export const M1_INT_RATIONAL = expandBank(META, INPUTS);
