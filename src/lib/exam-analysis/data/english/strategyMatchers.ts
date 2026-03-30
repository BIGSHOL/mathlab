/**
 * 영어 전략 매칭 함수
 *
 * 토픽에 맞는 학습 전략을 찾아 반환합니다.
 */
import type { TopicStrategy, GradeUnit } from '../curriculum/types';
import { ENGLISH_MIDDLE_SCHOOL_CURRICULUM } from './middleSchoolCurriculum';
import { ENGLISH_HIGH_SCHOOL_CURRICULUM } from './highSchoolCurriculum';

/**
 * 모든 영어 커리큘럼 통합
 */
const ALL_ENGLISH_CURRICULUM = [
  ...ENGLISH_MIDDLE_SCHOOL_CURRICULUM,
  ...ENGLISH_HIGH_SCHOOL_CURRICULUM,
];

/**
 * 토픽 키워드 매칭 여부 확인
 */
function isEnglishTopicMatch(keywords: string[], searchTerm: string): boolean {
  const normalizedSearch = searchTerm.toLowerCase().trim();

  return keywords.some(keyword => {
    const normalizedKeyword = keyword.toLowerCase().trim();
    return (
      normalizedKeyword.includes(normalizedSearch) ||
      normalizedSearch.includes(normalizedKeyword)
    );
  });
}

/**
 * 단일 토픽에 대한 전략 검색
 */
export function findEnglishStrategies(topic: string): TopicStrategy | null {
  // 토픽에서 소단원 추출 (예: "영어 > 문법 > 관계대명사" → "관계대명사")
  const topicParts = topic.split('>').map(p => p.trim());
  const searchTerms = topicParts.length > 0 ? topicParts : [topic];

  for (const curriculum of ALL_ENGLISH_CURRICULUM) {
    for (const unit of curriculum.units) {
      for (const topicStrategy of unit.topics) {
        // 각 검색어에 대해 매칭 시도
        for (const searchTerm of searchTerms) {
          if (isEnglishTopicMatch(topicStrategy.keywords, searchTerm)) {
            return topicStrategy;
          }
        }

        // 단원명도 매칭 시도
        for (const searchTerm of searchTerms) {
          if (unit.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            return topicStrategy;
          }
        }
      }
    }
  }

  return null;
}

/**
 * 여러 토픽에 대한 전략 검색
 */
export function getEnglishStrategiesForTopics(topics: string[]): Map<string, TopicStrategy> {
  const result = new Map<string, TopicStrategy>();

  for (const topic of topics) {
    const strategy = findEnglishStrategies(topic);
    if (strategy) {
      result.set(topic, strategy);
    }
  }

  return result;
}

/**
 * 학년별 커리큘럼 단원 조회
 */
export function getEnglishUnitsForGrade(grade: string): GradeUnit[] {
  const gradeCurriculum = ALL_ENGLISH_CURRICULUM.filter(c => c.grade === grade);
  return gradeCurriculum.flatMap(c => c.units);
}

/**
 * 특정 단원의 모든 전략 조회
 */
export function getEnglishStrategiesForUnit(unitName: string): TopicStrategy[] {
  for (const curriculum of ALL_ENGLISH_CURRICULUM) {
    for (const unit of curriculum.units) {
      if (unit.name.toLowerCase().includes(unitName.toLowerCase()) ||
          unitName.toLowerCase().includes(unit.name.toLowerCase())) {
        return unit.topics;
      }
    }
  }
  return [];
}

/**
 * 문제 유형별 전략 검색 (수능 유형)
 */
export function getEnglishStrategiesByQuestionType(questionType: string): TopicStrategy | null {
  const typeMapping: Record<string, string[]> = {
    'vocabulary': ['어휘', '단어', 'vocabulary'],
    'grammar': ['문법', '어법', 'grammar'],
    'reading_main_idea': ['주제', '요지', '제목', '대의파악'],
    'reading_detail': ['세부정보', '내용일치', '불일치'],
    'reading_inference': ['추론', '빈칸', '함축'],
    'sentence_completion': ['빈칸', '완성'],
    'conversation': ['대화', '회화'],
  };

  const keywords = typeMapping[questionType] || [questionType];

  for (const curriculum of ALL_ENGLISH_CURRICULUM) {
    for (const unit of curriculum.units) {
      for (const topicStrategy of unit.topics) {
        if (isEnglishTopicMatch(topicStrategy.keywords, keywords.join(' ')) ||
            keywords.some(k => isEnglishTopicMatch(topicStrategy.keywords, k))) {
          return topicStrategy;
        }
      }
    }
  }

  return null;
}

/**
 * 태그 기반 전략 검색
 */
export function getEnglishStrategiesByTag(tag: string): TopicStrategy[] {
  const results: TopicStrategy[] = [];
  const normalizedTag = tag.toLowerCase();

  for (const curriculum of ALL_ENGLISH_CURRICULUM) {
    for (const unit of curriculum.units) {
      for (const topicStrategy of unit.topics) {
        if (topicStrategy.tags?.some(t => t.toLowerCase().includes(normalizedTag))) {
          results.push(topicStrategy);
        }
      }
    }
  }

  return results;
}
