/**
 * 중1-1 / 문자와 식 / 일차방정식
 *
 * curriculum.ts: '일차방정식'
 *   subUnits: ['일차방정식의 풀이', '일차방정식의 활용']
 */

import type { OxBankMeta, OxStatementInput } from '../types';
import { expandBank, validateBank } from '../utils';

const META: OxBankMeta = {
  schoolLevel: 'middle',
  grade: 'middle_1',
  semester: 1,
  part: 'algebra',
  chapter: '일차방정식',
  category: 'm1_equation',
};

const INPUTS: OxStatementInput[] = [
  // ── 정답 O ──
  {
    id: 'curated-m1-eq-001',
    content: '등식의 양변에 같은 수를 더해도 등식은 성립한다.',
    answer: 'O',
    level: 'easy',
    questionType: 'property',
    section: '일차방정식의 풀이',
    explanation: '등식의 성질 1: 양변에 같은 수를 더해도 등식은 성립한다.',
  },
  {
    id: 'curated-m1-eq-002',
    content: '등식의 양변을 $0$이 아닌 같은 수로 나누어도 등식은 성립한다.',
    answer: 'O',
    level: 'easy',
    questionType: 'property',
    section: '일차방정식의 풀이',
  },
  {
    id: 'curated-m1-eq-003',
    content: '$3x + 2 = 11$ 의 해는 $x = 3$ 이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'computation',
    section: '일차방정식의 풀이',
    explanation: '$3 \\times 3 + 2 = 11$ 이므로 $x=3$ 이 해이다.',
  },
  {
    id: 'curated-m1-eq-004',
    content: '항등식은 미지수에 어떤 값을 대입해도 항상 참인 등식이다.',
    answer: 'O',
    level: 'medium',
    questionType: 'definition',
    section: '일차방정식의 풀이',
  },
  {
    id: 'curated-m1-eq-005',
    content: '일차방정식 $ax = b$ 에서 $a \\neq 0$ 이면 해는 $\\dfrac{b}{a}$ 하나뿐이다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '일차방정식의 풀이',
  },
  {
    id: 'curated-m1-eq-006',
    content: '$2x - 5 = x + 3$ 의 해는 $x = 8$ 이다.',
    answer: 'O',
    level: 'medium',
    questionType: 'computation',
    section: '일차방정식의 풀이',
    explanation: '$2x - x = 3 + 5$ → $x = 8$.',
  },
  // ── 정답 X ──
  {
    id: 'curated-m1-eq-007',
    content: '$x + 3 = 5$ 와 $5 = x + 3$ 은 다른 방정식이다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '일차방정식의 풀이',
    explanation: '등식의 좌변과 우변을 바꾸어도 같은 방정식이다.',
  },
  {
    id: 'curated-m1-eq-008',
    content: '등식의 양변에 $0$을 곱해도 등식은 성립하므로 일반적인 등식 변형 도구로 사용해도 된다.',
    answer: 'X',
    level: 'medium',
    questionType: 'misconception',
    section: '일차방정식의 풀이',
    explanation: '양변에 $0$을 곱하면 $0=0$이 되어 정보가 사라진다. 등식 변형으로 부적절하다.',
  },
  {
    id: 'curated-m1-eq-009',
    content: '$x = 0$ 은 어떤 일차방정식의 해도 될 수 없다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '일차방정식의 풀이',
    explanation: '$2x = 0$ 의 해는 $x=0$ 이다.',
  },
  {
    id: 'curated-m1-eq-010',
    content: '일차방정식의 이항은 항을 그대로 옮기면 된다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '일차방정식의 풀이',
    explanation: '이항할 때는 부호를 반대로 바꾸어야 한다.',
  },
  {
    id: 'curated-m1-eq-011',
    content: '$5x - 3 = 5x + 2$ 는 해가 무수히 많다.',
    answer: 'X',
    level: 'medium',
    questionType: 'computation',
    section: '일차방정식의 풀이',
    explanation: '정리하면 $-3 = 2$가 되어 모순. 해가 없다.',
  },
  {
    id: 'curated-m1-eq-012',
    content: '$ax + b = 0$ 형태이면 모두 일차방정식이다.',
    answer: 'X',
    level: 'hard',
    questionType: 'misconception',
    section: '일차방정식의 풀이',
    explanation: '$a = 0$ 이면 일차방정식이 아니다 ($x$의 차수가 1이어야 함).',
  },
];

validateBank(META, INPUTS);

export const M1_EQUATION = expandBank(META, INPUTS);
