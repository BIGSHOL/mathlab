/**
 * 교육과정 전략 매칭 유틸리티
 * 1:1 정확 매칭 방식 — 소단원명(shortTopic)과 DB 키워드의 정확 일치
 */

import type { TopicStrategy } from './types';
import { MIDDLE_SCHOOL_CURRICULUM } from './middleSchoolCurriculum';
import { HIGH_SCHOOL_CURRICULUM } from './highSchoolCurriculum';

/**
 * 토픽 문자열에서 소단원명(마지막 > 이후)을 추출하고,
 * DB의 키워드와 정확 일치하는 전략을 반환합니다.
 *
 * 매칭 우선순위:
 * 1. 소단원명(shortTopic) 정확 일치 (가장 높은 우선순위)
 * 2. 전체 토픽 경로에서 키워드 정확 포함
 * 3. 학년 필터 없이 전체 검색 (폴백)
 */
export function findMatchingStrategies(topic: string, grade?: string, category?: string): TopicStrategy | null {
  if (!topic) return null;

  const allCurriculums = [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM];

  // 토픽 경로에서 소단원명 추출: "중3 수학 > 제곱근과 실수 > 제곱근의 활용" → "제곱근의 활용"
  const parts = topic.split('>').map(p => p.trim());
  const shortTopic = parts[parts.length - 1].toLowerCase();

  // 학년 필터링
  let filtered = allCurriculums;
  if (grade) {
    const gradePrefix = grade.replace(/학년|학기/g, '').trim().slice(0, 2);
    filtered = filtered.filter(c => c.grade.includes(gradePrefix));
  }

  // 카테고리(세부과목) 필터링
  if (category) {
    const extracted = extractCategoryFromTopic(category);
    if (extracted.semester) {
      filtered = filtered.filter(c => c.semester === extracted.semester);
    }
  }

  // 1차: 소단원명 정확 일치
  let bestMatch = findExactMatch(filtered, shortTopic);
  if (bestMatch) return bestMatch;

  // 2차: 중단원명으로 시도 (두 번째 부분)
  if (parts.length >= 2) {
    const middleTopic = parts[parts.length >= 3 ? 1 : 0].toLowerCase();
    bestMatch = findExactMatch(filtered, middleTopic);
    if (bestMatch) return bestMatch;
  }

  // 3차: 학년 필터 없이 전체 검색
  if (grade) {
    bestMatch = findExactMatch(allCurriculums, shortTopic);
    if (bestMatch) return bestMatch;
  }

  // 4차: 부분 포함 매칭 (최후 폴백)
  return findPartialMatch(filtered.length > 0 ? filtered : allCurriculums, shortTopic, topic.toLowerCase());
}

/** 키워드 정확 일치 검색 */
function findExactMatch(curriculums: typeof MIDDLE_SCHOOL_CURRICULUM, shortTopic: string): TopicStrategy | null {
  for (const curriculum of curriculums) {
    for (const unit of curriculum.units) {
      for (const topicStrategy of unit.topics) {
        for (const keyword of topicStrategy.keywords) {
          const kw = keyword.toLowerCase();
          // 정확 일치 (양쪽 모두 체크)
          if (kw === shortTopic || shortTopic === kw) {
            return topicStrategy;
          }
        }
      }
    }
  }
  return null;
}

/** 부분 포함 매칭 (최후 폴백) */
function findPartialMatch(curriculums: typeof MIDDLE_SCHOOL_CURRICULUM, shortTopic: string, fullTopicLower: string): TopicStrategy | null {
  let bestMatch: { strategy: TopicStrategy; score: number } | null = null;

  for (const curriculum of curriculums) {
    for (const unit of curriculum.units) {
      for (const topicStrategy of unit.topics) {
        let score = 0;
        for (const keyword of topicStrategy.keywords) {
          const kw = keyword.toLowerCase();
          // shortTopic이 keyword를 포함하거나, keyword가 shortTopic을 포함
          if (shortTopic.includes(kw) && kw.length >= 2) {
            score += kw.length * 2;
          } else if (kw.includes(shortTopic) && shortTopic.length >= 2) {
            score += shortTopic.length * 2;
          } else if (fullTopicLower.includes(kw) && kw.length >= 3) {
            score += kw.length;
          }
        }
        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { strategy: topicStrategy, score };
        }
      }
    }
  }

  return bestMatch?.strategy || null;
}

/** 카테고리에서 학기 정보 추출 */
function extractCategoryFromTopic(topic: string): { category: string | null; semester: string | null } {
  const t = topic.toLowerCase();
  if (t.includes('공통수학1') || t.includes('공통수학 1')) return { category: '공통수학1', semester: '1학기' };
  if (t.includes('공통수학2') || t.includes('공통수학 2')) return { category: '공통수학2', semester: '2학기' };
  if (t.includes('대수')) return { category: '대수', semester: '1학기' };
  if (t.includes('미적분i') || t.includes('미적분1')) return { category: '미적분I', semester: '2학기' };
  if (t.includes('확률과 통계') || t.includes('확률통계')) return { category: '확률과 통계', semester: '선택' };
  if (t.includes('미적분ii') || t.includes('미적분2')) return { category: '미적분II', semester: '선택' };
  if (t.includes('기하') && !t.includes('도형의')) return { category: '기하', semester: '선택' };
  return { category: null, semester: null };
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
