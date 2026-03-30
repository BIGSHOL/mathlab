/**
 * 교육과정 데이터 통합 내보내기
 *
 * curriculumStrategies.ts에서 분리된 모듈들을 re-export합니다.
 */

// 타입 정의
export * from './types';

// 유틸리티 함수
export { isTopicMatch, estimateLevel, filterMessagesByGrade, getMajorUnitFromCurriculum } from './utils';

// 커리큘럼 데이터
export { MIDDLE_SCHOOL_CURRICULUM } from './middleSchoolCurriculum';
export { HIGH_SCHOOL_CURRICULUM } from './highSchoolCurriculum';

// 전략 매칭 함수
export { findMatchingStrategies, getStrategiesForTopics } from './strategyMatchers';

// 흔한 실수
export { COMMON_MISTAKES, findCommonMistakes } from './commonMistakes';

// 수준별/시간 전략
export {
  LEVEL_STRATEGIES,
  TIME_STRATEGIES,
  generateTimeStrategies,
  ESSAY_CHECKLIST,
  FOUR_WEEK_TIMELINE,
  generateFourWeekTimeline,
} from './levelTimeStrategies';

// 서술형 가이드
export { ESSAY_ADVANCED_GUIDE, getEssayGuideByCategory } from './essayGuide';

// 추천 교재
export {
  RECOMMENDED_BOOKS,
  getBooksByLevel,
  getSmartBookRecommendations,
  getPersonalizedBookRecommendations,
  BOOK_CAUTIONS,
  DIFFICULTY_COMPARISON,
  BOOK_SELECTION_GUIDE,
  recommendLevelByPerformance,
} from './recommendedBooks';

// 격려 메시지
export { ENCOURAGEMENT_MESSAGES, getEncouragementMessages } from './encouragementMessages';

// 시간 배분 전략
export { TIME_ALLOCATION_STRATEGIES } from './timeAllocationStrategies';

// 아직 분리되지 않은 것들 - 기존 파일에서 re-export
export {
  GRADE_CONNECTIONS,
  findGradeConnections,
  KILLER_QUESTION_TYPES,
  findKillerPatterns,
  getKillerPatternsByGrade,
} from '../curriculumStrategies';
