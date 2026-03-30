/**
 * 영어 교육과정 데이터 통합 내보내기
 *
 * 영어 시험지 분석을 위한 전략, 커리큘럼, 킬러 패턴 등을 제공합니다.
 */

// 타입 정의
export * from './types';

// 커리큘럼 데이터
export { ENGLISH_MIDDLE_SCHOOL_CURRICULUM } from './middleSchoolCurriculum';
export { ENGLISH_HIGH_SCHOOL_CURRICULUM } from './highSchoolCurriculum';

// 킬러 패턴 및 학년 연계
export {
  ENGLISH_KILLER_PATTERNS,
  findEnglishKillerPatterns,
  ENGLISH_GRADE_CONNECTIONS,
  findEnglishGradeConnections,
} from './killerPatterns';

// 자주 하는 실수
export { ENGLISH_COMMON_MISTAKES, findEnglishCommonMistakes } from './commonMistakes';

// 추천 교재
export { ENGLISH_RECOMMENDED_BOOKS, getEnglishBooksByLevel } from './recommendedBooks';

// 수준별 학습 전략
export { ENGLISH_LEVEL_STRATEGIES } from './levelStrategies';

// 전략 매칭 함수
export { findEnglishStrategies, getEnglishStrategiesForTopics } from './strategyMatchers';
