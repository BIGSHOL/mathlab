/**
 * 교육과정 전략 매칭 유틸리티
 * 토픽 키워드 기반으로 학습 전략을 찾습니다.
 */

import type { TopicStrategy } from './types';
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '../curriculumStrategies';

/**
 * 토픽 경로에서 카테고리(세부과목)를 추출합니다.
 * 예: "공통수학2 > 도형의 방정식 > 원의 방정식" -> { category: '공통수학2', semester: '2학기' }
 */
function extractCategoryFromTopic(topic: string): { category: string | null; semester: string | null } {
  const topicLower = topic.toLowerCase();

  // 공통수학1/2 구분
  if (topicLower.includes('공통수학1') || topicLower.includes('공통수학 1')) {
    return { category: '공통수학1', semester: '1학기' };
  }
  if (topicLower.includes('공통수학2') || topicLower.includes('공통수학 2')) {
    return { category: '공통수학2', semester: '2학기' };
  }

  // 대수/미적분I 등 고2 과목 구분
  if (topicLower.includes('대수')) {
    return { category: '대수', semester: '1학기' };
  }
  if (topicLower.includes('미적분i') || topicLower.includes('미적분1') || topicLower.includes('미적분 i')) {
    return { category: '미적분I', semester: '2학기' };
  }

  // 확률과 통계, 미적분II, 기하 (고2-3 선택)
  if (topicLower.includes('확률과 통계') || topicLower.includes('확률통계')) {
    return { category: '확률과 통계', semester: '선택' };
  }
  if (topicLower.includes('미적분ii') || topicLower.includes('미적분2') || topicLower.includes('미적분 ii')) {
    return { category: '미적분II', semester: '선택' };
  }
  if (topicLower.includes('기하') && !topicLower.includes('도형의')) {
    return { category: '기하', semester: '선택' };
  }

  return { category: null, semester: null };
}

/**
 * 토픽 문자열과 매칭되는 전략 찾기
 * 키워드 기반 점수 시스템으로 최적의 전략 반환
 *
 * @param topic - 분석된 토픽 (예: "공통수학2 > 도형의 방정식 > 원의 방정식")
 * @param grade - 학년 (예: "고1", "고2")
 * @param category - 세부 과목 (예: "공통수학1", "공통수학2")
 */
export function findMatchingStrategies(topic: string, grade?: string, category?: string): TopicStrategy | null {
  if (!topic) return null;

  const topicLower = topic.toLowerCase();
  const allCurriculums = [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM];

  // 토픽에서 카테고리 추출 시도 (topic 경로에 포함된 경우)
  const extracted = extractCategoryFromTopic(topic);
  // category 파라미터 또는 토픽에서 추출한 카테고리를 사용
  const effectiveSemester = category
    ? extractCategoryFromTopic(category).semester || extracted.semester
    : extracted.semester;

  // 학년 + 학기(카테고리) 필터링
  let filteredCurriculums = allCurriculums;

  if (grade) {
    const gradePrefix = grade.replace(/학년|학기/g, '').trim().slice(0, 2);
    filteredCurriculums = filteredCurriculums.filter(c => c.grade.includes(gradePrefix));
  }

  // 학기(세부 과목) 필터링 - 공통수학1은 1학기, 공통수학2는 2학기
  if (effectiveSemester) {
    filteredCurriculums = filteredCurriculums.filter(c => c.semester === effectiveSemester);
  }

  // 매칭 결과 수집 (키워드 길이 기반 점수)
  let bestMatch: { strategy: TopicStrategy; score: number } | null = null;

  for (const curriculum of filteredCurriculums) {
    for (const unit of curriculum.units) {
      for (const topicStrategy of unit.topics) {
        // 키워드 매칭 점수 계산
        let score = 0;
        for (const keyword of topicStrategy.keywords) {
          // 너무 짧은 키워드(2자 이하)는 완전 매칭 필요
          if (keyword.length <= 2) {
            // 단어 경계 확인 (한글은 공백/특수문자 기준)
            const regex = new RegExp(`(^|[\\s>])${keyword}($|[\\s>])`, 'i');
            if (regex.test(topic) || topic === keyword) {
              score += keyword.length * 2; // 정확 매칭 보너스
            }
          } else {
            // 긴 키워드는 부분 매칭 허용
            if (topicLower.includes(keyword.toLowerCase()) || topic.includes(keyword)) {
              score += keyword.length;
            }
          }
        }

        // 더 높은 점수의 매칭 선택
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { strategy: topicStrategy, score };
        }
      }
    }
  }

  if (bestMatch) {
    return bestMatch.strategy;
  }

  // 학년 필터 없이 전체 검색 (폴백)
  if (grade) {
    return findMatchingStrategies(topic);
  }

  return null;
}

/**
 * 여러 토픽에서 전략 배열 추출
 */
export function getStrategiesForTopics(topics: string[], grade?: string): string[] {
  const strategiesSet = new Set<string>();

  for (const topic of topics) {
    const match = findMatchingStrategies(topic, grade);
    if (match) {
      match.strategies.forEach(s => strategiesSet.add(s));
    }
  }

  return Array.from(strategiesSet).slice(0, 5);
}
