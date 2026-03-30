/**
 * 수학 문제집 추천 시스템
 *
 * 학생의 학습 수준과 시험 결과를 기반으로
 * 최적의 문제집을 추천합니다.
 */

export interface RecommendedBook {
  name: string;
  publisher: string;
  type: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  features: string;
  targetStudent: string;
}

export interface LevelBooks {
  level: '하위권' | '중위권' | '상위권';
  targetGrade: string;
  learningGoal: string;
  books: RecommendedBook[];
  recommendedCombos: {
    name: string;
    sequence: string[];
  }[];
}

export const RECOMMENDED_BOOKS: LevelBooks[] = [
  // 하위권
  {
    level: '하위권',
    targetGrade: '5등급 이하 → 3~4등급 목표',
    learningGoal: '기초 개념 확립, 자신감 회복, 기본 유형 숙달',
    books: [
      { name: '베이직쎈', publisher: '좋은책신사고', type: '기초유형', difficulty: 1, features: '쎈의 가장 쉬운 버전, A단계 집중', targetStudent: '기초가 전혀 없는 학생' },
      { name: '풍산자 개념완성', publisher: '지학사', type: '개념서', difficulty: 1, features: '개념을 가장 쉽게 설명, 주제별 정리', targetStudent: '수학 자신감이 낮은 학생' },
      { name: '개념+유형 개념편', publisher: '비상교육', type: '개념서', difficulty: 1, features: '기초 개념 이해와 유형 반복 학습', targetStudent: '개념 정리가 필요한 학생' },
      { name: '라이트쎈', publisher: '좋은책신사고', type: '기본유형', difficulty: 2, features: '쎈 C단계 생략, 부담 없는 분량', targetStudent: '기본 실력 강화 필요 학생' },
      { name: '체크체크', publisher: '천재교육', type: '개념서', difficulty: 1, features: '교과서 기반, 기초 문제 위주', targetStudent: '교과서 개념부터 다지는 학생' },
      { name: '빨리 이해하는 수학', publisher: '동아출판', type: '개념서', difficulty: 1, features: '짧은 설명, 빠른 개념 이해', targetStudent: '시간이 부족한 학생' },
      { name: '풍산자 반복수학', publisher: '지학사', type: '연산/유형', difficulty: 1, features: '같은 유형 반복으로 체화', targetStudent: '계산 실수가 많은 학생' },
      { name: '개념쎈', publisher: '좋은책신사고', type: '개념서', difficulty: 2, features: '개념 설명 + 기본 문제', targetStudent: '개념과 문제를 동시에 학습' },
      { name: '개념원리', publisher: '개념원리', type: '개념서', difficulty: 2, features: '가장 많이 사용되는 기본 개념서', targetStudent: '개념 학습의 표준 원하는 학생' },
      { name: '개념+유형 라이트', publisher: '비상교육', type: '기본유형', difficulty: 2, features: '기초 유형 문제 반복 연습', targetStudent: '유형 문제 첫 도전 학생' },
      { name: '우공비', publisher: '좋은책신사고', type: '개념서', difficulty: 2, features: '이미지로 개념 정리, 시각적 학습', targetStudent: '시각적 학습 선호 학생' },
      { name: '빨리 강해지는 수학', publisher: '동아출판', type: '기본유형', difficulty: 2, features: '핵심 유형만 선별 수록', targetStudent: '빠른 유형 파악 원하는 학생' },
      { name: '신 수학의 바이블', publisher: '이투스북', type: '개념서', difficulty: 2, features: '친절한 개념 설명, 단계별 구성', targetStudent: '혼자 공부하는 학생' },
      { name: '우공비Q 표준편', publisher: '좋은책신사고', type: '기본유형', difficulty: 2, features: '표준 난이도 유형 문제', targetStudent: '내신 70점대 목표 학생' },
      { name: 'EBS 수능특강', publisher: 'EBS', type: '개념+유형', difficulty: 2, features: '수능 연계, 기본 개념 정리', targetStudent: '수능 기초 다지는 학생' },
      { name: '마플교과서', publisher: '희망에듀', type: '개념서', difficulty: 2, features: '교과서 개념 + 빈출 유형', targetStudent: '내신 대비 개념 정리' },
      { name: '개념원리 RPM', publisher: '개념원리', type: '기본유형', difficulty: 2, features: '개념원리와 연계, 유형별 분류', targetStudent: '유형 연습 첫 문제집' },
      { name: '풍산자 필수유형', publisher: '지학사', type: '유형서', difficulty: 2, features: '출제 빈도 높은 문제만 선별', targetStudent: '효율적 학습 원하는 학생' },
      { name: '숨마쿰라우데 스타트업', publisher: '이룸이앤비', type: '기초개념', difficulty: 2, features: '개념부터 체계적 구성', targetStudent: '기초부터 탄탄히 쌓는 학생' },
      { name: '굿비', publisher: '이룸이앤비', type: '개념+유형', difficulty: 2, features: '9강으로 끝내는 구성, 부담 적음', targetStudent: '단기간 개념 정리 학생' },
    ],
    recommendedCombos: [
      { name: '기초 확립', sequence: ['풍산자 개념완성', '베이직쎈', '라이트쎈'] },
      { name: '개념 중심', sequence: ['개념원리', '개념원리 RPM'] },
    ],
  },
  // 중위권
  {
    level: '중위권',
    targetGrade: '3~4등급 → 2등급 안정화 목표',
    learningGoal: "개념의 '왜' 이해, 유형 숙달, 응용력 향상",
    books: [
      { name: '쎈', publisher: '좋은책신사고', type: '유형서', difficulty: 3, features: 'A/B/C 3단계, 1,500문제 이상', targetStudent: '모든 유형 연습이 필요한 학생' },
      { name: '개념원리 RPM', publisher: '개념원리', type: '유형서', difficulty: 2, features: '유형별 4개 이상 문제, 체계적 분류', targetStudent: '유형 연습 기본서 원하는 학생' },
      { name: '마플 시너지', publisher: '희망에듀', type: '유형서', difficulty: 3, features: '쎈의 1.5~2배 문제량, 양치기 최적화', targetStudent: '문제량으로 승부하는 학생' },
      { name: '개념+유형 파워편', publisher: '비상교육', type: '유형서', difficulty: 3, features: '응용 유형 중심, 단계별 학습', targetStudent: '응용 문제 연습 학생' },
      { name: '숨마쿰라우데', publisher: '이룸이앤비', type: '개념서', difficulty: 3, features: '깊은 개념 설명, 발전 예제 포함', targetStudent: '개념을 깊이 이해하려는 학생' },
      { name: '수학의 정석 기본편', publisher: '성지출판', type: '개념서', difficulty: 3, features: '전통의 명품 개념서', targetStudent: '체계적 개념 학습 원하는 학생' },
      { name: '수학의 바이블', publisher: '이투스북', type: '개념서', difficulty: 3, features: '일반 개념서보다 상세한 설명', targetStudent: '중간 단계 개념 보강 학생' },
      { name: '유형아작', publisher: '비상교육', type: '유형서', difficulty: 3, features: '유형별 집중 훈련', targetStudent: '취약 유형 집중 보완 학생' },
      { name: 'A급 원리해설', publisher: '디딤돌', type: '유형서', difficulty: 3, features: '원리 중심 해설, 사고력 강화', targetStudent: '왜 그런지 이해하려는 학생' },
      { name: '우공비Q 발전편', publisher: '좋은책신사고', type: '응용유형', difficulty: 3, features: '발전된 응용 문제 수록', targetStudent: '내신 80점대 목표 학생' },
      { name: '최상위 라이트', publisher: '디딤돌', type: '준심화', difficulty: 3, features: '심화 입문용, 부담 적은 난이도', targetStudent: '심화 문제 첫 도전 학생' },
      { name: '절대등급', publisher: '능률', type: '준심화', difficulty: 3, features: '내신 상위권 대비, 서술형 강화', targetStudent: '서술형 대비 필요 학생' },
      { name: '최고득점', publisher: '천재교육', type: '준심화', difficulty: 3, features: '고득점 목표 문제 수록', targetStudent: '90점대 목표 학생' },
      { name: '자이스토리', publisher: '수경출판', type: '기출문제', difficulty: 3, features: '모든 기출 수록, 연도별/유형별 정리', targetStudent: '기출 분석 원하는 학생' },
      { name: '마더텅 기출', publisher: '마더텅', type: '기출문제', difficulty: 3, features: '상세한 해설, 기출 총정리', targetStudent: '기출 중심 학습 학생' },
      { name: '1등급 만들기', publisher: '미래엔', type: '기출문제', difficulty: 3, features: '기출 분석 문제집, 483제', targetStudent: '내신 기출 대비 학생' },
      { name: '올백 1등급 MASTER', publisher: '천재교육', type: '고난도기출', difficulty: 3, features: '910제 고난도 기출', targetStudent: '1등급 도전 학생' },
      { name: '플래티넘', publisher: '사설', type: '내신기출', difficulty: 3, features: '학교별 내신 기출 모음', targetStudent: '학교 시험 유형 파악 학생' },
      { name: 'EBS 수능완성', publisher: 'EBS', type: '실전문제', difficulty: 3, features: '수능 연계, 실전 감각 훈련', targetStudent: '수능 대비 학생' },
      { name: '너기출', publisher: '사설', type: '기출문제', difficulty: 3, features: '선별된 기출, 가볍게 풀기 좋음', targetStudent: '핵심 기출만 원하는 학생' },
    ],
    recommendedCombos: [
      { name: '내신 집중', sequence: ['개념원리', '쎈(A~B단계)', '쎈(C단계)'] },
      { name: '양치기형', sequence: ['마플교과서', '마플 시너지', '자이스토리'] },
    ],
  },
  // 상위권
  {
    level: '상위권',
    targetGrade: '1~2등급 → 1등급 안정화/만점 목표',
    learningGoal: '킬러 문항 대비, 실수 제로, 복합 문제 해결력',
    books: [
      { name: '블랙라벨', publisher: '진학사', type: '심화서', difficulty: 4, features: '1등급 명품 문제집, 70~90p 얇은 구성', targetStudent: '킬러 문항 대비 학생' },
      { name: '일품', publisher: '좋은책신사고', type: '심화서', difficulty: 4, features: '쎈 C단계와 비슷하거나 약간 높음', targetStudent: '심화 입문 학생' },
      { name: '고쟁이', publisher: '이투스북', type: '심화서', difficulty: 4, features: '5개년 기출 분석, 최다빈출 문제', targetStudent: '내신 빈출 유형 집중 학생' },
      { name: '일등급 수학', publisher: '수경출판', type: '심화서', difficulty: 4, features: '사고력 요구 문제, 심화 입문용', targetStudent: '유형서→심화 전환 학생' },
      { name: '최상위', publisher: '디딤돌', type: '심화서', difficulty: 5, features: '증명 문제 많음, 적절한 힌트 제공', targetStudent: '수학적 사고력 확장 학생' },
      { name: '수학의 정석 실력편', publisher: '성지출판', type: '심화서', difficulty: 5, features: '수리논술 대비 수준, 사고 확장', targetStudent: '논술/최상위 대비 학생' },
      { name: '올림포스 고난도', publisher: '천재교육', type: '심화서', difficulty: 4, features: '내신 킬러 문항 집중', targetStudent: '학교 고난도 대비 학생' },
      { name: '수학의 고수', publisher: '능률', type: '심화서', difficulty: 4, features: '내신 고득점 심화 학습', targetStudent: '상위권 심화 학습 학생' },
      { name: '최고수준', publisher: '천재교육', type: '심화서', difficulty: 4, features: '최고 난이도 문제 수록', targetStudent: '만점 목표 학생' },
      { name: '에이급 수학', publisher: '에이급', type: '극심화', difficulty: 5, features: '경시대회 수준, 극고난도', targetStudent: '수학 올림피아드 대비 학생' },
      { name: '531 프로젝트', publisher: '이투스북', type: '심화서', difficulty: 4, features: '5지선다→3지선다→1답 구성', targetStudent: '킬러 문항 집중 훈련 학생' },
      { name: 'TOT', publisher: '사설', type: '심화서', difficulty: 4, features: 'Top of the Top, 최상위 문제', targetStudent: '1등급 확정 원하는 학생' },
      { name: '마플', publisher: '희망에듀', type: '기출문제', difficulty: 4, features: '고난도 기출 + 변형 문제', targetStudent: '기출 심화 학습 학생' },
      { name: '킬링캠프', publisher: '사설', type: '실전대비', difficulty: 5, features: '수능 직전 마무리, 고난도 집중', targetStudent: '수능 직전 마무리 학생' },
      { name: '일타에듀 고난도 모의고사', publisher: '사설', type: '실전대비', difficulty: 5, features: '킬러 문제 깊이 있는 접근', targetStudent: '수능 실전 감각 훈련 학생' },
      { name: '뉴런', publisher: '사설', type: '심화서', difficulty: 4, features: '신경망처럼 연결된 개념 학습', targetStudent: '개념 연결성 강화 학생' },
      { name: '프로메쓰', publisher: '사설', type: '내신기출', difficulty: 4, features: '고등학교 내신 기출 분석', targetStudent: '학교별 기출 대비 학생' },
      { name: '수학대왕', publisher: '사설', type: 'AI학습', difficulty: 3, features: 'AI 실력 분석, 맞춤 문제 제공', targetStudent: '취약점 파악 원하는 학생' },
      { name: 'EBS 수능특강 변형문제', publisher: '사설', type: '변형문제', difficulty: 4, features: 'EBS 연계 변형, 실전 감각', targetStudent: '수능특강 심화 학습 학생' },
      { name: '학교별 기출문제', publisher: '족보닷컴 등', type: '내신기출', difficulty: 4, features: '학교 시험 유형 파악', targetStudent: '학교 시험 유형 파악 학생' },
    ],
    recommendedCombos: [
      { name: '내신 1등급', sequence: ['쎈(C단계)', '고쟁이', '블랙라벨', '올림포스 고난도'] },
      { name: '만점 도전', sequence: ['일등급 수학', '블랙라벨', '최상위', '학교 기출'] },
    ],
  },
];

/**
 * 수준에 맞는 추천 문제집 목록 조회
 */
export function getBooksByLevel(level: '하위권' | '중위권' | '상위권'): LevelBooks | null {
  return RECOMMENDED_BOOKS.find(lb => lb.level === level) || null;
}

/**
 * 스마트 문제집 추천 (2~3권)
 * - 서로 다른 출판사에서 선택 (편향 방지)
 * - 난이도 순서로 정렬 (기초 → 심화)
 * - 개념서 + 유형서 조합 우선
 */
export function getSmartBookRecommendations(
  level: '하위권' | '중위권' | '상위권',
  count: number = 3
): RecommendedBook[] {
  const levelBooks = getBooksByLevel(level);
  if (!levelBooks) return [];

  const books = [...levelBooks.books];
  const selected: RecommendedBook[] = [];
  const usedPublishers = new Set<string>();

  // 타입별 우선순위 (개념서 → 유형서 → 심화서)
  const typeOrder: Record<string, number> = {
    '개념서': 1,
    '기초개념': 1,
    '기초유형': 2,
    '기본유형': 2,
    '개념+유형': 2,
    '유형서': 3,
    '연산/유형': 3,
    '응용유형': 4,
    '준심화': 4,
    '기출문제': 5,
    '심화서': 6,
    '극심화': 7,
  };

  // 난이도 + 타입 순으로 정렬
  books.sort((a, b) => {
    const diffDiff = a.difficulty - b.difficulty;
    if (diffDiff !== 0) return diffDiff;
    return (typeOrder[a.type] || 5) - (typeOrder[b.type] || 5);
  });

  // 1. 먼저 개념서 1권 선택
  const conceptBook = books.find(b =>
    (b.type.includes('개념') || b.type === '기초유형') &&
    !usedPublishers.has(b.publisher)
  );
  if (conceptBook) {
    selected.push(conceptBook);
    usedPublishers.add(conceptBook.publisher);
  }

  // 2. 유형서 1권 선택 (다른 출판사)
  const typeBook = books.find(b =>
    (b.type.includes('유형') && !b.type.includes('개념')) &&
    !usedPublishers.has(b.publisher)
  );
  if (typeBook) {
    selected.push(typeBook);
    usedPublishers.add(typeBook.publisher);
  }

  // 3. 나머지 채우기 (다른 출판사에서)
  for (const book of books) {
    if (selected.length >= count) break;
    if (!usedPublishers.has(book.publisher) && !selected.includes(book)) {
      selected.push(book);
      usedPublishers.add(book.publisher);
    }
  }

  // 부족하면 출판사 중복 허용
  if (selected.length < count) {
    for (const book of books) {
      if (selected.length >= count) break;
      if (!selected.includes(book)) {
        selected.push(book);
      }
    }
  }

  // 최종 난이도순 정렬
  return selected.slice(0, count).sort((a, b) => a.difficulty - b.difficulty);
}

/**
 * 난이도 비교 정보
 */
export const DIFFICULTY_COMPARISON = {
  description: '심화서 기준 난이도 비교',
  sequence: [
    { name: '일품', level: '심화 입문' },
    { name: '일등급 수학', level: '심화 기본' },
    { name: '고쟁이', level: '심화 기본' },
    { name: '블랙라벨', level: '심화 표준' },
    { name: '최상위', level: '심화 고급' },
    { name: '수학의 정석 실력편', level: '최상위' },
    { name: '에이급', level: '경시대회 수준' },
  ],
};

/**
 * 교재 선택 가이드
 */
export const BOOK_SELECTION_GUIDE = {
  하위권: {
    structure: '개념서 1권 + 기본 유형서 1권',
    principle: "여러 권 대충 풀기보다 '1권 완벽히' 마스터",
    example: '풍산자 + 라이트쎈 또는 개념원리 + RPM',
  },
  중위권: {
    structure: '개념서 1권 + 유형서 1~2권',
    principle: '쎈 A~B단계 완벽 후 C단계 도전',
    example: '개념원리 + 쎈 + 자이스토리(기출)',
  },
  상위권: {
    structure: '유형서 1권 + 심화서 1~2권 + 기출',
    principle: '고쟁이, 블랙라벨, 올림포스 고난도 중 2권 이상',
    example: '쎈(C단계) + 고쟁이 + 블랙라벨 + 학교기출',
  },
};

/**
 * 시험 분석 결과 기반 자동 수준 판정
 */
export interface LevelRecommendation {
  level: '하위권' | '중위권' | '상위권';
  confidence: number; // 0~100
  reason: string;
  weakPoints: string[];
  recommendedBookTypes: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function recommendLevelByPerformance(questions: any[]): LevelRecommendation {
  // 정답 여부가 있는 문제만 필터링 (학생 답안지 분석 시)
  const answeredQuestions = questions.filter(q => q.is_correct !== undefined && q.is_correct !== null);

  // 답안지가 아니면 null 반환 (수동 선택만 가능)
  if (answeredQuestions.length === 0) {
    return {
      level: '중위권',
      confidence: 0,
      reason: '답안 분석 데이터 없음',
      weakPoints: [],
      recommendedBookTypes: [],
    };
  }

  // 1. 전체 정답률 계산
  const correctCount = answeredQuestions.filter(q => q.is_correct).length;
  const totalCorrectRate = (correctCount / answeredQuestions.length) * 100;

  // 2. 난이도별 정답률 계산 (4단계 시스템)
  const difficultyStats: Record<string, { correct: number; total: number }> = {
    concept: { correct: 0, total: 0 },
    pattern: { correct: 0, total: 0 },
    reasoning: { correct: 0, total: 0 },
    creative: { correct: 0, total: 0 },
    low: { correct: 0, total: 0 },
    medium: { correct: 0, total: 0 },
    high: { correct: 0, total: 0 },
  };

  answeredQuestions.forEach(q => {
    const diff = q.difficulty;
    if (difficultyStats[diff]) {
      difficultyStats[diff].total++;
      if (q.is_correct) {
        difficultyStats[diff].correct++;
      }
    }
  });

  const getRate = (diff: string) => {
    const stat = difficultyStats[diff];
    return stat.total > 0 ? (stat.correct / stat.total) * 100 : null;
  };

  // 3. 난이도별 정답률
  const conceptRate = getRate('concept') ?? getRate('low') ?? 0;
  const patternRate = getRate('pattern') ?? getRate('medium') ?? 0;
  const reasoningRate = getRate('reasoning') ?? getRate('high') ?? 0;
  const creativeRate = getRate('creative') ?? 0;

  // 4. 시험 난이도 파악 (어려운 문제 비율)
  const hardQuestions = answeredQuestions.filter(q =>
    q.difficulty === 'reasoning' || q.difficulty === 'creative' || q.difficulty === 'high'
  );
  const hardQuestionsRate = (hardQuestions.length / answeredQuestions.length) * 100;

  // 5. 수준 판정 로직
  const weakPoints: string[] = [];
  const recommendedBookTypes: string[] = [];
  let level: '하위권' | '중위권' | '상위권';
  let reason = '';
  let confidence = 0;

  // 개념(쉬운 문제) 정답률이 낮으면 → 하위권
  if (conceptRate < 60) {
    level = '하위권';
    reason = `기초 개념 문제 정답률 ${Math.round(conceptRate)}% - 개념 보강 필요`;
    weakPoints.push('기초 개념 이해 부족');
    recommendedBookTypes.push('개념서', '기초유형');
    confidence = 85;
  }
  // 전체 정답률이 50% 미만 → 하위권
  else if (totalCorrectRate < 50) {
    level = '하위권';
    reason = `전체 정답률 ${Math.round(totalCorrectRate)}% - 기초부터 다시 학습`;
    weakPoints.push('전반적인 실력 부족');
    recommendedBookTypes.push('개념서', '기본유형');
    confidence = 90;
  }
  // 유형(중간 문제) 정답률 낮으면 → 중위권
  else if (patternRate < 70) {
    level = '중위권';
    reason = `유형 문제 정답률 ${Math.round(patternRate)}% - 유형 연습 필요`;
    weakPoints.push('유형별 문제 풀이 연습 부족');
    recommendedBookTypes.push('유형서', '기본유형');
    confidence = 80;
  }
  // 전체 정답률 50~75% → 중위권
  else if (totalCorrectRate >= 50 && totalCorrectRate < 75) {
    level = '중위권';
    reason = `전체 정답률 ${Math.round(totalCorrectRate)}% - 유형 숙달로 2등급 목표`;
    if (patternRate < 80) {
      weakPoints.push('응용 유형 문제 약점');
      recommendedBookTypes.push('유형서', '응용유형');
    }
    confidence = 75;
  }
  // 추론/창의(어려운 문제) 정답률 낮으면 → 상위권 (하지만 개선 필요)
  else if (reasoningRate < 60 || (creativeRate > 0 && creativeRate < 60)) {
    level = '상위권';
    reason = `고난도 문제 정답률 낮음 - 심화 학습 필요`;
    weakPoints.push('킬러 문항 대비 부족');
    recommendedBookTypes.push('심화서', '기출문제');
    confidence = 70;
  }
  // 전체 정답률 75% 이상 → 상위권
  else if (totalCorrectRate >= 75) {
    level = '상위권';
    reason = `전체 정답률 ${Math.round(totalCorrectRate)}% - 1등급 목표 가능`;
    if (hardQuestionsRate > 30 && reasoningRate < 80) {
      weakPoints.push('킬러 문항 완성도 부족');
      recommendedBookTypes.push('심화서', '극심화');
    } else {
      weakPoints.push('실수 방지');
      recommendedBookTypes.push('심화서', '기출문제');
    }
    confidence = 85;
  }
  // 기본값
  else {
    level = '중위권';
    reason = '표준 학습 수준';
    recommendedBookTypes.push('유형서');
    confidence = 60;
  }

  // 6. 추가 취약점 분석
  if (conceptRate > 0 && conceptRate < 70) {
    weakPoints.push('개념 이해 보완 필요');
    if (!recommendedBookTypes.includes('개념서')) {
      recommendedBookTypes.unshift('개념서');
    }
  }

  return {
    level,
    confidence,
    reason,
    weakPoints,
    recommendedBookTypes,
  };
}

/**
 * 취약점 기반 스마트 교재 추천
 */
export function getPersonalizedBookRecommendations(
  level: '하위권' | '중위권' | '상위권',
  preferredTypes: string[] = [],
  count: number = 3
): RecommendedBook[] {
  const levelBooks = getBooksByLevel(level);
  if (!levelBooks) return [];

  const books = [...levelBooks.books];
  const selected: RecommendedBook[] = [];
  const usedPublishers = new Set<string>();

  // 선호 타입이 있으면 우선 선택
  if (preferredTypes.length > 0) {
    for (const prefType of preferredTypes) {
      const matchedBook = books.find(b =>
        b.type.includes(prefType) && !usedPublishers.has(b.publisher)
      );
      if (matchedBook && selected.length < count) {
        selected.push(matchedBook);
        usedPublishers.add(matchedBook.publisher);
      }
    }
  }

  // 부족하면 기존 스마트 추천 로직 활용
  if (selected.length < count) {
    const remaining = getSmartBookRecommendations(level, count);
    for (const book of remaining) {
      if (selected.length >= count) break;
      if (!selected.find(s => s.name === book.name)) {
        selected.push(book);
      }
    }
  }

  return selected.slice(0, count);
}

/**
 * 교재 선택 주의사항
 */
export const BOOK_CAUTIONS = [
  '2022 개정 교육과정 적용 여부 확인 (2025년 고1부터)',
  '너무 어려운 문제집은 자신감 하락 유발',
  '문제집 선택 후 최소 2회독 권장',
  '오답노트 병행 필수',
  '사설 문제집은 학교 시험 스타일 확인 후 선택',
];
