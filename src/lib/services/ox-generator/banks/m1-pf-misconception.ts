/**
 * 중1-1 / 수와 연산 / 소인수분해
 *
 * curriculum.ts: '소인수분해' → subUnits: ['소인수분해', '최대공약수와 최소공배수']
 */

import type { OxBankMeta, OxStatementInput } from '../types';
import { expandBank, validateBank } from '../utils';

const META: OxBankMeta = {
  schoolLevel: 'middle',
  grade: 'middle_1',
  semester: 1,
  part: 'calc',
  chapter: '소인수분해',
  category: 'm1_pf_misconception',
};

const INPUTS: OxStatementInput[] = [
  // ── 정답 O (참) ──
  {
    id: 'curated-m1-pf-001',
    content: '소수의 약수는 2개이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '소인수분해',
    explanation: '소수는 1과 자기 자신만 약수로 가지므로 약수의 개수는 항상 2개이다.',
  },
  {
    id: 'curated-m1-pf-002',
    content: '$1$은 소수도 아니고 합성수도 아니다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '소인수분해',
    explanation: '$1$의 약수는 자기 자신뿐이라 소수의 정의(약수 2개)에 어긋나고, 합성수는 약수가 3개 이상이어야 한다.',
  },
  {
    id: 'curated-m1-pf-003',
    content: '$2$는 가장 작은 소수이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '소인수분해',
  },
  {
    id: 'curated-m1-pf-004',
    content: '$2$를 제외한 모든 소수는 홀수이다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '소인수분해',
    explanation: '짝수는 모두 $2$를 약수로 가지므로 $2$ 외의 짝수는 합성수이다.',
  },
  {
    id: 'curated-m1-pf-005',
    content: '서로 다른 두 소수의 곱은 합성수이다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '소인수분해',
  },
  {
    id: 'curated-m1-pf-006',
    content: '소인수분해의 결과는 (지수와 곱셈 순서를 무시하면) 유일하다.',
    answer: 'O',
    level: 'hard',
    questionType: 'property',
    section: '소인수분해',
    explanation: '소인수분해의 유일성 정리에 의해 표기 순서와 무관하게 한 가지로 결정된다.',
  },
  // ── 정답 X (거짓) ──
  {
    id: 'curated-m1-pf-007',
    content: '모든 소수는 홀수이다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '소인수분해',
    explanation: '$2$는 짝수이지만 소수이다.',
  },
  {
    id: 'curated-m1-pf-008',
    content: '가장 작은 소수는 $1$이다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '소인수분해',
    explanation: '$1$은 소수가 아니다. 가장 작은 소수는 $2$이다.',
  },
  {
    id: 'curated-m1-pf-009',
    content: '두 자연수의 공약수는 항상 $1$ 하나뿐이다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '최대공약수와 최소공배수',
    explanation: '예: $12$와 $18$의 공약수는 $1, 2, 3, 6$로 여러 개이다. 공약수가 $1$뿐인 두 수를 서로소라고 한다.',
  },
  {
    id: 'curated-m1-pf-010',
    content: '합성수는 모두 짝수이다.',
    answer: 'X',
    level: 'medium',
    questionType: 'misconception',
    section: '소인수분해',
    explanation: '$9, 15, 21, 25$ 처럼 홀수인 합성수가 많다.',
  },
  {
    id: 'curated-m1-pf-011',
    content: '$2^{3} \\times 3^{2} = 24$ 이다.',
    answer: 'X',
    level: 'medium',
    questionType: 'computation',
    section: '소인수분해',
    explanation: '$2^{3} \\times 3^{2} = 8 \\times 9 = 72$',
  },
  {
    id: 'curated-m1-pf-012',
    content: '두 자연수가 서로소이면 둘 중 하나는 반드시 $1$이다.',
    answer: 'X',
    level: 'hard',
    questionType: 'misconception',
    section: '최대공약수와 최소공배수',
    explanation: '$8$과 $15$는 서로 $1$이 아니지만 공약수가 $1$뿐이라 서로소이다.',
  },
];

validateBank(META, INPUTS);

export const M1_PF_MISCONCEPTION = expandBank(META, INPUTS);
