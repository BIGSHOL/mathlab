export const mockSubjects = [
  {
    id: 'subject-1',
    title: '분수',
    description: '분수의 기본 개념과 연산',
    gradeLevel: 5,
    sortOrder: 1,
  },
  {
    id: 'subject-2',
    title: '도형',
    description: '기본 도형의 성질과 넓이',
    gradeLevel: 5,
    sortOrder: 2,
  },
  {
    id: 'subject-3',
    title: '비율',
    description: '비율과 비례의 이해',
    gradeLevel: 6,
    sortOrder: 1,
  },
];

export const mockConcepts = [
  {
    id: 'concept-1',
    subjectId: 'subject-1',
    title: '분수의 뜻',
    fullContent:
      '# 분수의 뜻\n\n분수는 전체를 똑같이 나눈 것 중 일부를 나타내는 수입니다.\n\n예를 들어, 피자 한 판을 4조각으로 나누면 한 조각은 전체의 **1/4**입니다.\n\n## 분수의 구성\n- **분자**: 위에 있는 수 (가져간 부분)\n- **분모**: 아래에 있는 수 (전체를 나눈 수)',
    visualAssets: null,
    sortOrder: 1,
  },
  {
    id: 'concept-2',
    subjectId: 'subject-1',
    title: '분수의 덧셈',
    fullContent:
      '# 분수의 덧셈\n\n분모가 같은 분수끼리는 분자만 더하면 됩니다.\n\n예: **1/5 + 2/5 = 3/5**\n\n분모가 다르면 먼저 통분한 후 더합니다.',
    visualAssets: null,
    sortOrder: 2,
  },
  {
    id: 'concept-3',
    subjectId: 'subject-1',
    title: '분수의 뺄셈',
    fullContent:
      '# 분수의 뺄셈\n\n분모가 같은 분수끼리는 분자만 빼면 됩니다.\n\n예: **3/5 - 1/5 = 2/5**',
    visualAssets: null,
    sortOrder: 3,
  },
];

export const mockBlankExercises = [
  {
    id: 'blank-1',
    conceptId: 'concept-1',
    level: 1,
    templateText:
      '분수는 전체를 똑같이 나눈 것 중 {{1}}를 나타내는 수입니다. 위에 있는 수를 {{2}}라 하고, 아래에 있는 수를 {{3}}라 합니다.',
    blanks: [
      { position: 1, answer: '일부', hint: 'ㅇㅂ' },
      { position: 2, answer: '분자', hint: 'ㅂㅈ' },
      { position: 3, answer: '분모', hint: 'ㅂㅁ' },
    ],
  },
  {
    id: 'blank-2',
    conceptId: 'concept-1',
    level: 2,
    templateText:
      '{{1}}는 전체를 {{2}} 나눈 것 중 {{3}}를 나타내는 수입니다. 위에 있는 수를 {{4}}라 하고, 아래에 있는 수를 {{5}}라 합니다.',
    blanks: [
      { position: 1, answer: '분수', hint: 'ㅂㅅ' },
      { position: 2, answer: '똑같이', hint: 'ㄸㄱㅇ' },
      { position: 3, answer: '일부', hint: 'ㅇㅂ' },
      { position: 4, answer: '분자', hint: 'ㅂㅈ' },
      { position: 5, answer: '분모', hint: 'ㅂㅁ' },
    ],
  },
];

export const mockProgress = [
  {
    id: 'progress-1',
    conceptId: 'concept-1',
    stage: 'READING' as const,
    completed: true,
    attempts: 1,
    score: null,
    startedAt: '2025-03-01T10:00:00.000Z',
    completedAt: '2025-03-01T10:05:00.000Z',
  },
  {
    id: 'progress-2',
    conceptId: 'concept-1',
    stage: 'BLANK_EASY' as const,
    completed: true,
    attempts: 2,
    score: null,
    startedAt: '2025-03-01T10:05:00.000Z',
    completedAt: '2025-03-01T10:15:00.000Z',
  },
  {
    id: 'progress-3',
    conceptId: 'concept-1',
    stage: 'BLANK_HARD' as const,
    completed: false,
    attempts: 1,
    score: null,
    startedAt: '2025-03-01T10:15:00.000Z',
    completedAt: null,
  },
];
