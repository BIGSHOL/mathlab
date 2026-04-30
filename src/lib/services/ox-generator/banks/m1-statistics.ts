/**
 * 중1-2 / 확률과 통계 / 자료의 정리와 해석
 *
 * curriculum.ts: '자료의 정리와 해석'
 *   subUnits: ['줄기와 잎 그림·도수분포표', '히스토그램과 도수분포다각형', '상대도수']
 */

import type { OxBankMeta, OxStatementInput } from '../types';
import { expandBank, validateBank } from '../utils';

const META: OxBankMeta = {
  schoolLevel: 'middle',
  grade: 'middle_1',
  semester: 2,
  part: 'data',
  chapter: '자료의 정리와 해석',
  category: 'm1_statistics',
};

const INPUTS: OxStatementInput[] = [
  // ── 정답 O ──
  {
    id: 'curated-m1-stats-001',
    content: '계급의 크기는 모든 계급에서 같다.',
    answer: 'O',
    level: 'easy',
    questionType: 'property',
    section: '줄기와 잎 그림·도수분포표',
  },
  {
    id: 'curated-m1-stats-002',
    content: '히스토그램에서 직사각형의 넓이의 합은 전체 도수에 비례한다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '히스토그램과 도수분포다각형',
  },
  {
    id: 'curated-m1-stats-003',
    content: '상대도수의 총합은 항상 $1$이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'property',
    section: '상대도수',
  },
  {
    id: 'curated-m1-stats-004',
    content: '계급값은 그 계급의 양 끝값의 평균이다.',
    answer: 'O',
    level: 'easy',
    questionType: 'definition',
    section: '줄기와 잎 그림·도수분포표',
  },
  {
    id: 'curated-m1-stats-005',
    content: '도수분포표에서 어떤 계급에 속하는 자료의 정확한 값은 알 수 없다.',
    answer: 'O',
    level: 'medium',
    questionType: 'property',
    section: '줄기와 잎 그림·도수분포표',
    explanation: '도수분포표는 자료를 묶어서 정리하므로 개별 자료값은 보존되지 않는다.',
  },
  {
    id: 'curated-m1-stats-006',
    content: '두 집단의 자료 개수가 다를 때 비교는 도수보다 상대도수로 하는 것이 적절하다.',
    answer: 'O',
    level: 'hard',
    questionType: 'application',
    section: '상대도수',
  },
  // ── 정답 X ──
  {
    id: 'curated-m1-stats-007',
    content: '도수분포표의 도수는 자료의 평균값을 의미한다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '줄기와 잎 그림·도수분포표',
    explanation: '도수는 각 계급에 속하는 자료의 개수이다.',
  },
  {
    id: 'curated-m1-stats-008',
    content: '히스토그램의 직사각형 사이에는 항상 간격을 둔다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '히스토그램과 도수분포다각형',
    explanation: '히스토그램은 직사각형을 붙여 그린다. 간격을 두는 것은 막대그래프이다.',
  },
  {
    id: 'curated-m1-stats-009',
    content: '계급의 크기를 작게 할수록 자료의 분포 특성이 항상 더 잘 드러난다.',
    answer: 'X',
    level: 'medium',
    questionType: 'misconception',
    section: '줄기와 잎 그림·도수분포표',
    explanation: '너무 작게 하면 도수가 0이 많아져 오히려 분포 파악이 어렵다.',
  },
  {
    id: 'curated-m1-stats-010',
    content: '상대도수는 도수가 큰 계급일수록 작다.',
    answer: 'X',
    level: 'easy',
    questionType: 'misconception',
    section: '상대도수',
    explanation: '상대도수는 도수에 비례하므로 도수가 클수록 상대도수도 크다.',
  },
  {
    id: 'curated-m1-stats-011',
    content: '도수분포다각형의 양 끝은 항상 가로축에 닿게 그리지 않아도 된다.',
    answer: 'X',
    level: 'medium',
    questionType: 'misconception',
    section: '히스토그램과 도수분포다각형',
    explanation: '도수분포다각형은 양 끝을 도수가 0인 계급으로 가정하여 가로축에 닿게 그린다.',
  },
  {
    id: 'curated-m1-stats-012',
    content: '$($상대도수$)$ $=$ $($그 계급의 도수$)$ $\\times$ $($전체 도수$)$ 이다.',
    answer: 'X',
    level: 'medium',
    questionType: 'computation',
    section: '상대도수',
    explanation: '$($상대도수$)$ $=$ $\\dfrac{($그 계급의 도수$)}{($전체 도수$)}$ 이다.',
  },
];

validateBank(META, INPUTS);

export const M1_STATISTICS = expandBank(META, INPUTS);
