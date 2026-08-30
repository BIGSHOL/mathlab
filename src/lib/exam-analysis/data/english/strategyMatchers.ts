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
 * 토픽 키워드 매칭 여부 확인 (느슨) — 아래 getEnglishStrategiesByQuestionType 전용.
 * 문항 topic 매칭에는 쓰지 말 것. 양방향 부분문자열이라 오매칭이 난다(matchEnglishStrategy 주석 참고).
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

/** 매칭 결과 — 단원 이름과 확신도를 함께 돌려준다(화면이 근거를 밝힐 수 있도록). */
export interface EnglishStrategyMatch {
  unit: string;
  strategy: TopicStrategy;
  /** 100=키워드 정확일치, 40~99=부분일치. 40 미만은 반환하지 않는다. */
  score: number;
  /** 무엇으로 맞췄는지 (툴팁·디버깅용) */
  via: string;
}

/**
 * 문항 topic("고1 영어 > 문법 > 가정법 과거, 과거완료")의 **소단원**만 뽑고 괄호 주석·구두점을 턴다.
 * "빈칸 추론 (단어·구)" → "빈칸 추론"
 */
function leafOf(topic: string): string {
  const leaf = topic.split('>').pop()?.trim() ?? topic;
  return leaf
    .replace(/\([^)]*\)/g, '')
    .replace(/[,·]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 문항 topic → 학습 전략. **확신이 없으면 null.**
 *
 * ## 왜 엄격해야 하는가 (2026-08-30)
 * 예전 구현은 키워드와 검색어를 **양방향 부분문자열**로 비교했다. 실제 시험지 8개 topic 으로
 * 재 보니 이런 일이 났다:
 *   - "가정법 과거, 과거완료" → **현재완료** 전략 (안에 든 "과거완료" 글자가 완료시제에 먼저 걸림)
 *   - 독해 4유형(주제·요지 / 글의 구조 / 함축적 의미 / 세부 정보 파악)이 **전부 같은 항목**으로 뭉침
 *
 * 틀린 특정 조언은 일반론보다 나쁘다 — 구체적이라 더 믿게 된다.
 * 그래서 점수제로 바꾸고 임계값(40) 아래는 **아무것도 주지 않는다**. 못 맞추면 화면이 비는 게 맞다.
 */
export function matchEnglishStrategy(topic: string): EnglishStrategyMatch | null {
  const leaf = leafOf(topic);
  if (!leaf) return null;

  // 소단원이 여러 개념을 담을 때 앞머리도 후보로 ("가정법 과거 과거완료" → "가정법")
  const candidates = [leaf];
  const head = leaf.split(' ')[0];
  if (head && head !== leaf && head.length >= 2) candidates.push(head);

  let best: EnglishStrategyMatch | null = null;
  for (const curriculum of ALL_ENGLISH_CURRICULUM) {
    for (const unit of curriculum.units) {
      for (const strategy of unit.topics) {
        for (const rawKeyword of strategy.keywords) {
          const keyword = rawKeyword.trim();
          for (const candidate of candidates) {
            let score = 0;
            let via = '';
            if (keyword === candidate) {
              score = 100;
              via = `정확일치 "${keyword}"`;
            } else if (candidate.includes(keyword) && keyword.length >= 3) {
              score = 60 + keyword.length;
              via = `키워드 "${keyword}"`;
            } else if (keyword.includes(candidate) && candidate.length >= 3) {
              score = 40 + candidate.length;
              via = `키워드 "${keyword}"`;
            }
            if (score > (best?.score ?? 0)) best = { unit: unit.name, strategy, score, via };
          }
        }
      }
    }
  }
  return best && best.score >= 40 ? best : null;
}

/**
 * 단일 토픽에 대한 전략 검색 (전략만 필요할 때).
 * 판정은 matchEnglishStrategy 단일 소스를 따른다.
 */
export function findEnglishStrategies(topic: string): TopicStrategy | null {
  return matchEnglishStrategy(topic)?.strategy ?? null;
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
