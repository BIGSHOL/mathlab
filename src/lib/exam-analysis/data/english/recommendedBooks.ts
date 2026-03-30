/**
 * 영어 추천 교재 데이터
 *
 * 수준별 추천 교재와 선택 가이드를 제공합니다.
 */
import type { LevelBooks, RecommendedBook } from '../curriculum/types';

export const ENGLISH_RECOMMENDED_BOOKS: LevelBooks[] = [
  {
    level: '하위권',
    description: '기초 문법과 어휘력 향상에 집중',
    books: [
      {
        name: '천일문 기본',
        publisher: '쎄듀',
        level: '기초~중급',
        features: ['1001개 핵심 문장 패턴', '문법 기반 구문 학습', '반복 학습에 최적화'],
        bestFor: '영어 문장 구조의 기초를 다지고 싶은 학생',
      },
      {
        name: '문법의 끝 Start',
        publisher: '메가스터디',
        level: '기초',
        features: ['개념 설명 상세', '단계별 문제 구성', '오답노트 제공'],
        bestFor: '중학 문법부터 체계적으로 복습하고 싶은 학생',
      },
      {
        name: '바로 VOCA',
        publisher: 'NE능률',
        level: '기초~중급',
        features: ['예문 중심 어휘 학습', '품사별 정리', '암기 팁 제공'],
        bestFor: '기본 어휘력이 부족한 학생',
      },
      {
        name: '리딩튜터 기본',
        publisher: 'NE능률',
        level: '기초',
        features: ['짧은 지문', '단계별 독해', '어휘 정리 포함'],
        bestFor: '긴 지문에 부담을 느끼는 학생',
      },
    ],
    studyTips: [
      '하루 30분씩 꾸준히 문법 개념 복습',
      '모르는 단어는 예문과 함께 정리',
      '짧은 지문부터 시작해서 점차 길이 늘리기',
      '틀린 문제는 반드시 오답노트에 정리',
    ],
  },
  {
    level: '중위권',
    description: '문법 심화와 독해 전략 학습',
    books: [
      {
        name: '수능특강 영어',
        publisher: 'EBS',
        level: '중급',
        features: ['수능 연계', '다양한 지문 유형', '해설 상세'],
        bestFor: '수능 유형에 익숙해지고 싶은 학생',
      },
      {
        name: '천일문 완성',
        publisher: '쎄듀',
        level: '중급~상급',
        features: ['1001개 고급 구문', '해석 훈련', '어법 포인트 정리'],
        bestFor: '구문 분석 능력을 키우고 싶은 학생',
      },
      {
        name: '어법끝 5.0',
        publisher: '메가스터디',
        level: '중급',
        features: ['수능 어법 유형 분석', '빈출 포인트 정리', '실전 문제 수록'],
        bestFor: '어법 문제에서 실수가 잦은 학생',
      },
      {
        name: '워드마스터 수능 2000',
        publisher: '이투스',
        level: '중급',
        features: ['수능 빈출 어휘', '유의어/반의어 정리', '예문 풍부'],
        bestFor: '수능 필수 어휘를 완성하고 싶은 학생',
      },
    ],
    studyTips: [
      '지문을 읽을 때 구조 분석하는 습관 기르기',
      '어법 문제는 유형별로 정리하여 패턴 파악',
      '모의고사 오답은 유형별로 분류하여 복습',
      '하루 50개씩 어휘 암기 + 복습',
    ],
  },
  {
    level: '상위권',
    description: '고난도 문제 대비와 실전 연습',
    books: [
      {
        name: '수능완성 영어',
        publisher: 'EBS',
        level: '상급',
        features: ['고난도 지문', '킬러 문항 대비', '실전 모의고사'],
        bestFor: '1등급을 목표로 하는 학생',
      },
      {
        name: '킬러 독해',
        publisher: '메가스터디',
        level: '최상급',
        features: ['고난도 빈칸 추론', '순서/삽입 집중', '오답률 높은 문제'],
        bestFor: '변별력 문항에서 실수를 줄이고 싶은 학생',
      },
      {
        name: '마더텅 수능기출',
        publisher: '마더텅',
        level: '상급',
        features: ['유형별 기출 분류', '상세 해설', '오답률 표시'],
        bestFor: '기출 분석을 철저히 하고 싶은 학생',
      },
      {
        name: '자이스토리 영어',
        publisher: '수경출판사',
        level: '상급',
        features: ['풍부한 문제량', '난이도별 구성', '해설 상세'],
        bestFor: '다양한 문제를 많이 풀어보고 싶은 학생',
      },
    ],
    studyTips: [
      '실전과 동일한 시간 배분으로 연습',
      '오답 원인 분석: 어휘, 구문, 논리 중 무엇이 부족한지 파악',
      '킬러 문항(빈칸 33-34번)은 별도로 집중 훈련',
      '모의고사 후 오답은 당일 복습 필수',
    ],
  },
];

/**
 * 수준별 교재 조회 함수
 */
export function getEnglishBooksByLevel(level: '하위권' | '중위권' | '상위권'): LevelBooks | undefined {
  return ENGLISH_RECOMMENDED_BOOKS.find(b => b.level === level);
}

/**
 * 정답률 기반 수준 판단 함수
 */
export function getEnglishLevelByScore(correctRate: number): '하위권' | '중위권' | '상위권' {
  if (correctRate < 50) return '하위권';
  if (correctRate < 80) return '중위권';
  return '상위권';
}

/**
 * 맞춤형 교재 추천 함수
 */
export function getEnglishPersonalizedBooks(
  correctRate: number,
  weakTopics: string[]
): { books: RecommendedBook[]; tips: string[] } {
  const level = getEnglishLevelByScore(correctRate);
  const levelData = getEnglishBooksByLevel(level);

  if (!levelData) {
    return { books: [], tips: [] };
  }

  const books = [...levelData.books];
  const tips = [...levelData.studyTips];

  // 약점 토픽에 따른 추가 추천
  const weaknessKeywords = weakTopics.join(' ').toLowerCase();

  if (weaknessKeywords.includes('어법') || weaknessKeywords.includes('문법')) {
    tips.unshift('어법 집중 훈련: 어법끝 또는 문법의 끝으로 약점 보완');
  }

  if (weaknessKeywords.includes('어휘') || weaknessKeywords.includes('단어')) {
    tips.unshift('어휘 집중 암기: 하루 30개 이상 꾸준히 + 예문 학습');
  }

  if (weaknessKeywords.includes('빈칸') || weaknessKeywords.includes('추론')) {
    tips.unshift('빈칸 추론 훈련: 논리적 흐름 파악 연습 필요');
  }

  if (weaknessKeywords.includes('순서') || weaknessKeywords.includes('삽입')) {
    tips.unshift('순서/삽입 훈련: 지시어, 연결어 추적 연습 필요');
  }

  return { books, tips };
}
