/**
 * 중1-2 / 기하 / 기본 도형
 *
 * curriculum.ts: '기본 도형'
 *   subUnits: ['점·선·면·각', '위치 관계', '평행선의 성질']
 */

import type { OxBankMeta, OxStatementInput } from '../types';
import { expandBank, validateBank } from '../utils';

const META: OxBankMeta = {
  schoolLevel: 'middle',
  grade: 'middle_1',
  semester: 2,
  part: 'geo',
  chapter: '기본 도형',
  category: 'm1_geometry',
};

const INPUTS: OxStatementInput[] = [
  // ── 정답 O ──
  {
    id: 'curated-m1-geo-001',
    content: '두 점을 지나는 직선은 단 하나뿐이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'property',
    section: '점·선·면·각',
  },
  {
    id: 'curated-m1-geo-002',
    content: '직각은 $90^{\\circ}$ 이고, 평각은 $180^{\\circ}$ 이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '점·선·면·각',
  },
  {
    id: 'curated-m1-geo-003',
    content: '맞꼭지각은 서로 크기가 같다.',
    answer: 'O',
    level: 'easy',
    questionType: 'property',
    section: '점·선·면·각',
  },
  {
    id: 'curated-m1-geo-004',
    content: '한 점을 지나고 주어진 직선에 수직인 직선은 단 하나 그을 수 있다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '위치 관계',
  },
  {
    id: 'curated-m1-geo-005',
    content: '동위각과 엇각은 두 직선이 평행할 때 같다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '평행선의 성질',
  },
  {
    id: 'curated-m1-geo-006',
    content: '한 직선과 그 직선 밖의 한 점이 주어지면, 그 점을 지나며 주어진 직선과 평행한 직선은 단 하나 그을 수 있다.',
    answer: 'O',
    level: 'hard',
    questionType: 'property',
    section: '평행선의 성질',
  },
  // ── 정답 X ──
  {
    id: 'curated-m1-geo-007',
    content: '직선과 반직선은 같은 도형이다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '점·선·면·각',
    explanation: '직선은 양쪽으로 끝없이 뻗고, 반직선은 한쪽으로만 뻗는다.',
  },
  {
    id: 'curated-m1-geo-008',
    content: '평각은 직각의 세 배이다.',
    answer: 'X',
    level: 'easy',
    questionType: 'computation',
    section: '점·선·면·각',
    explanation: '평각 $180^{\\circ}$ 는 직각 $90^{\\circ}$ 의 두 배이다.',
  },
  {
    id: 'curated-m1-geo-009',
    content: '두 직선이 만나서 생기는 네 각의 합은 $360^{\\circ}$ 가 아닐 수도 있다.',
    answer: 'X',
    level: 'medium',
    questionType: 'misconception',
    section: '점·선·면·각',
    explanation: '두 직선이 한 점에서 만날 때 생기는 네 각의 합은 항상 $360^{\\circ}$ 이다.',
  },
  {
    id: 'curated-m1-geo-010',
    content: '서로 다른 두 직선이 만나지 않으면 항상 평행하다.',
    answer: 'X',
    level: 'medium',
    questionType: 'misconception',
    section: '위치 관계',
    explanation: '공간에서는 만나지 않으면서 평행하지도 않은 두 직선(꼬인 위치)이 존재한다.',
  },
  {
    id: 'curated-m1-geo-011',
    content: '동위각의 크기가 같으면 두 직선이 항상 수직이다.',
    answer: 'X',
    level: 'medium',
    questionType: 'misconception',
    section: '평행선의 성질',
    explanation: '동위각이 같으면 두 직선이 평행하다는 뜻이다.',
  },
  {
    id: 'curated-m1-geo-012',
    content: '작도는 자, 컴퍼스, 각도기를 사용한다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '점·선·면·각',
    explanation: '작도는 눈금 없는 자와 컴퍼스만 사용한다(각도기 사용 금지).',
  },
];

validateBank(META, INPUTS);

export const M1_GEOMETRY = expandBank(META, INPUTS);
