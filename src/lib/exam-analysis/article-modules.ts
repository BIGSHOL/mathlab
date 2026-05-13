/**
 * 기출 분석 블로그 글 — 섹션 모듈 풀
 *
 * 글을 13개의 작은 모듈로 분해. 각 모듈은:
 * - trigger 조건 (어떤 시험에 활성화될지)
 * - priority 점수 (시험에 따라 가중치)
 * - h2Candidates 후보 풀
 * - buildChunk 자체 프롬프트 가이드 생성
 *
 * 같은 archetype이라도 신호가 다르면 활성화된 모듈 셋·순서·H2가 달라져
 * 글의 골격 자체가 시험마다 변동된다.
 */

import type {
  Signals,
  Archetype,
  Blueprint,
  ChartId,
} from './article-archetype';
import { TONE_GUIDES } from './article-archetype';

export type ModuleId =
  | 'exam_overview'
  | 'difficulty_landscape'
  | 'discrimination_spotlight'
  | 'essay_focus'
  | 'topic_concentration'
  | 'topic_balance'
  | 'ability_dominance'
  | 'notable_questions_pack'
  | 'pricing_anomaly'
  | 'tiered_strategy'
  | 'time_pressure'
  | 'nearby_compare'
  | 'study_priorities_cta';

export type LengthHint = 'short' | 'medium' | 'long';

export interface ArticleVariables {
  academyName?: string;
  teacherName?: string;
  branchTag?: string;
}

export interface BuildChunkContext {
  archetype: Archetype;
  blueprint: Blueprint;
  schoolName: string;
  grade: string;
  variables: ArticleVariables;
}

export interface SectionModule {
  id: ModuleId;
  label: string;
  fixedPosition?: 'opening' | 'closing' | 'pre-closing';
  trigger: (s: Signals) => boolean;
  priority: (s: Signals) => number;
  lengthHint: (s: Signals) => LengthHint;
  chartToken?: (s: Signals) => ChartId | null;
  h2Candidates: string[];
  buildChunk: (s: Signals, ctx: BuildChunkContext) => string;
}

// ── 길이 가이드 텍스트 ──
function lengthGuide(hint: LengthHint): string {
  return hint === 'long' ? '3~4문단 (긴 섹션)'
    : hint === 'short' ? '1문단 (짧게)'
      : '2문단 (보통)';
}

// ── 13개 모듈 정의 ──
export const MODULE_POOL: SectionModule[] = [
  // 1. 시험 개요 (항상 최상단)
  {
    id: 'exam_overview',
    label: '시험 개요',
    fixedPosition: 'opening',
    trigger: () => true,
    priority: () => 95,
    lengthHint: () => 'medium',
    h2Candidates: [], // blueprint.openingH2Candidates 사용
    buildChunk: (s, ctx) => {
      const openingPool = ctx.blueprint.openingH2Candidates
        .map((h) => `  · "${h.replace(/{{SCHOOL}}/g, ctx.schoolName).replace(/{{GRADE}}/g, ctx.grade)}"`)
        .join('\n');
      return `### 섹션: 시험 개요 (도입)
- archetype: **${ctx.archetype}** — ${ctx.blueprint.reason}
- 톤: ${TONE_GUIDES[ctx.blueprint.tone]}
- 이 시험의 "성격"을 한 문장으로 규정하는 도입. 정보 나열 금지.
- 추천 H2 후보 (이 풀에서 픽한 표현이 이미 제목으로 정해져 있음 — 본문 첫 문단은 그 문맥을 살리는 방향으로):
${openingPool}
- 사용 가능한 객관 정보: 총 ${s.totalQuestions}문항 ${s.totalPoints}점, 서술형 ${s.essayCount}문항(배점 ${s.essayPts}점, ${s.essayWeightPct}%), 변별력 ${s.discrimOverall}
- 분량: ${lengthGuide('medium')}`;
    },
  },

  // 2. 난이도 지형 (항상 활성, 차트 포함)
  {
    id: 'difficulty_landscape',
    label: '난이도 지형',
    trigger: () => true,
    priority: (s) => 60 + Math.round(s.highDiffShare * 40),
    lengthHint: (s) => s.discrimOverall === '높음' ? 'long' : s.discrimOverall === '낮음' ? 'short' : 'medium',
    chartToken: () => 'difficulty',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 난이도 분석',
      '{{SCHOOL}} {{GRADE}} 난이도 지형 — 어디서 갈리는가',
      '{{SCHOOL}} {{GRADE}} 시험 난이도 — 등급 라인의 좌표',
    ],
    buildChunk: (s) => {
      const [l1, l2, l3, l4, l5] = s.diffCounts;
      const lowDesc = s.discrimOverall === '높음' ? '높은 편'
        : s.discrimOverall === '적정' ? '적정한 수준'
          : s.discrimOverall === '다소 낮음' ? '다소 낮은 편' : '약한 편';
      return `### 섹션: 난이도 지형
- 난이도 분포: Lv1=${l1} / Lv2=${l2} / Lv3=${l3} / Lv4=${l4} / Lv5=${l5}
- 기본~표준(Lv1+2) 비중 ${Math.round(s.lowDiffShare * 100)}% / 심화 이상(Lv4+5) 비중 ${Math.round(s.highDiffShare * 100)}%
- 숫자 나열 금지 — 어디서 점수가 갈리는지 정성 표현으로 풀어쓸 것
- 변별력이 "${lowDesc}"라는 정성 표현을 자연스럽게 한 번만 녹일 것 (수치 노출 금지)
- 분량: ${lengthGuide(s.discrimOverall === '높음' ? 'long' : s.discrimOverall === '낮음' ? 'short' : 'medium')}
- **섹션 끝에 정확히 {{CHART:difficulty}} 토큰 삽입**`;
    },
  },

  // 3. 변별력 진단 (적정 제외 — 할 말 있는 모든 케이스에 활성)
  {
    id: 'discrimination_spotlight',
    label: '변별력 진단',
    trigger: (s) => s.discrimOverall !== '적정',
    priority: (s) => {
      if (s.discrimOverall === '높음') return 85;
      if (s.discrimOverall === '낮음') return 80;
      return 70; // '다소 낮음'
    },
    lengthHint: () => 'medium',
    chartToken: () => 'discrimination',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 변별력 진단 — 시험이 무엇을 묻는가',
      '{{SCHOOL}} {{GRADE}} 수학 — 변별력이 만든 격차',
      '{{SCHOOL}} {{GRADE}} 시험 — 점수 차이가 어디서 생기는가',
    ],
    buildChunk: (s) => {
      const meaning = s.discrimOverall === '높음'
        ? '"실력대로 점수가 나뉜다" — 공부한 만큼 결과가 나오는 시험'
        : s.discrimOverall === '낮음'
          ? '"실수 한 번이 등급을 바꾼다" — 비슷한 점수대가 좁은 범위에 몰림'
          : '"기본은 다 같이 맞고 응용에서만 갈린다" — 차이가 만들어지는 구간이 좁음';
      return `### 섹션: 변별력 진단
- 변별력 라벨: **${s.discrimOverall}** (저변별 문항 비중 "${s.poorRatioLabel}")
- 변별력 "${s.discrimOverall}"이 학부모/학생에게 의미하는 바 = ${meaning}
- 수치 노출 금지 — 변별력 지수/점수는 *차트가 표시*하므로 본문에서 같은 수치를 반복 인용하지 말 것 (차트 ↔ 본문 역할 분담)
- 분량: ${lengthGuide('medium')}
- **섹션 끝에 정확히 {{CHART:discrimination}} 토큰 삽입** — 차트는 평균 지수 + 우수/양호/보통/주의 4단계 문항 분포를 보여줌`;
    },
  },

  // 4. 서술형 비중
  {
    id: 'essay_focus',
    label: '서술형 비중',
    trigger: (s) => s.essayWeightPct >= 25,
    priority: (s) => 40 + s.essayWeightPct,
    lengthHint: (s) => s.essayWeightPct >= 40 ? 'long' : 'medium',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 서술형 — 풀이 과정이 곧 점수',
      '{{SCHOOL}} {{GRADE}} 시험 서술형 비중 분석',
      '{{SCHOOL}} {{GRADE}} 수학 — 서술형이 만드는 격차',
    ],
    buildChunk: (s) => `### 섹션: 서술형 비중
- 서술형 ${s.essayCount}문항 / 배점 ${s.essayPts}점 (전체의 ${s.essayWeightPct}%)
- 평균 난이도: ${s.essayAvgLevelLabel}
- 단원별 출제: ${s.essayTopicsLabel}
- 풀이 과정 작성 훈련의 필요성을 학부모가 체감할 수 있는 표현으로
- 부분 점수 가능성 언급 (틀려도 0점이 아닌 점)을 한 번 짚을 것
- 분량: ${lengthGuide(s.essayWeightPct >= 40 ? 'long' : 'medium')}`,
  },

  // 5. 단원 편중
  {
    id: 'topic_concentration',
    label: '단원 편중',
    trigger: (s) => s.top1TopicShare >= 0.4 || s.top1MinusTop2 >= 0.2,
    priority: (s) => 50 + Math.round(s.top1TopicShare * 60),
    lengthHint: (s) => s.top1TopicShare >= 0.5 ? 'long' : 'medium',
    chartToken: () => 'topic_bar',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 단원별 출제 — 어디에 시간을 써야 하는가',
      '{{SCHOOL}} {{GRADE}} 시험 — 한 단원이 점수를 좌우',
      '{{SCHOOL}} {{GRADE}} 수학 — 핵심 단원 집중도',
    ],
    buildChunk: (s) => {
      const top1 = s.topicStats[0];
      const top2 = s.topicStats[1];
      const topName1 = top1?.topic.split(' > ').pop() || '핵심 단원';
      const topName2 = top2?.topic.split(' > ').pop() || '';
      return `### 섹션: 단원 편중
- 최다 단원: **${topName1}** (${top1?.count}문항 / ${top1?.pts}점, 전체의 ${Math.round((top1?.share || 0) * 100)}%)
${topName2 ? `- 두번째 단원: ${topName2} (${top2?.pts}점)` : ''}
- 한 단원에 ${Math.round(s.top1TopicShare * 100)}%가 집중된 사실을 학습 우선순위로 해석
- 이 단원 하나의 완성도가 결과를 좌우한다는 메시지
- 분량: ${lengthGuide(s.top1TopicShare >= 0.5 ? 'long' : 'medium')}
- **섹션 끝에 정확히 {{CHART:topic_bar}} 토큰 삽입**`;
    },
  },

  // 6. 단원 균형
  {
    id: 'topic_balance',
    label: '단원 균형',
    trigger: (s) => s.top1TopicShare < 0.30 && s.topicCount >= 4,
    priority: () => 55,
    lengthHint: () => 'medium',
    chartToken: () => 'topic_bar',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 단원별 출제 — 어느 단원도 비울 수 없는 시험',
      '{{SCHOOL}} {{GRADE}} 시험 단원 구성 — 골고루 묻는 시험',
      '{{SCHOOL}} {{GRADE}} 수학 — 단원별 배점 균형',
    ],
    buildChunk: (s) => {
      const top3 = s.topicStats.slice(0, 3)
        .map((t) => `${t.topic.split(' > ').pop()}(${t.pts}점)`).join(', ');
      return `### 섹션: 단원 균형
- 단원 ${s.topicCount}개에 배점 분산 (최대도 ${Math.round(s.top1TopicShare * 100)}% 미만)
- 상위 3개 단원: ${top3}
- 어느 한 단원도 비울 수 없음 = 골고루 학습이 필수
- 분량: ${lengthGuide('medium')}
- **섹션 끝에 정확히 {{CHART:topic_bar}} 토큰 삽입**`;
    },
  },

  // 7. 능력 영역 편중
  {
    id: 'ability_dominance',
    label: '능력 영역 편중',
    trigger: (s) => s.maxAbilityShare >= 0.4 || (s.minAbilityShare <= 0.1 && s.minAbilityShare > 0),
    priority: (s) => 40 + Math.round(Math.abs(s.maxAbilityShare - 0.25) * 120),
    lengthHint: () => 'medium',
    chartToken: () => 'ability_radar',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 능력 영역 — 무엇을 잘해야 하는가',
      '{{SCHOOL}} {{GRADE}} 시험 — 요구되는 사고력 분포',
      '{{SCHOOL}} {{GRADE}} 수학 — 핵심 능력 진단',
    ],
    buildChunk: (s) => {
      const labels: Record<string, string> = {
        calculation: '계산력', understanding: '이해력', problem_solving: '문제해결력', reasoning: '추론력',
      };
      const entries = Object.entries(s.abilityCounts)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a);
      const desc = entries.map(([k, v]) => `${labels[k]} ${v}문항`).join(' / ');
      return `### 섹션: 능력 영역 편중
- 영역별 출제: ${desc}
- 가장 비중 큰 능력: **${s.dominantAbility}** (${Math.round(s.maxAbilityShare * 100)}%)
- 미출제 영역은 절대 언급 금지 ("~은 한 문항도 없습니다" 류 정보 가치 없음)
- 클리셰 금지 ("균형 잡힌 시험", "수학적 사고력을 길러야" 등 어느 시험에든 통할 멘트)
- 지배적 능력이 학생에게 요구하는 학습 습관을 구체적으로 서술
- 분량: ${lengthGuide('medium')}
- **섹션 끝에 정확히 {{CHART:ability_radar}} 토큰 삽입**`;
    },
  },

  // 8. 주목할 문항
  {
    id: 'notable_questions_pack',
    label: '주목할 문항',
    trigger: (s) => (s.diffCounts[3] + s.diffCounts[4]) >= 3,
    priority: (s) => 45 + s.lv5Count * 8,
    lengthHint: (s) => (s.diffCounts[3] + s.diffCounts[4]) >= 6 ? 'long' : 'medium',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 점수를 만드는 문항들',
      '{{SCHOOL}} {{GRADE}} 시험 — 당락을 가르는 문항',
      '{{SCHOOL}} {{GRADE}} 수학 — 반드시 짚어야 할 문항',
    ],
    buildChunk: (s, ctx) => {
      const long = (s.diffCounts[3] + s.diffCounts[4]) >= 6;
      return `### 섹션: 주목할 문항
- 심화 이상(Lv4+5) ${s.diffCounts[3] + s.diffCounts[4]}문항 (Lv5만 ${s.lv5Count}문항)
- 이미 제공된 "주목할 문항" 데이터의 문항 번호와 코멘트를 활용
- 3~5개 문항을 골라 "왜 어려운지", "어떤 함정이 있는지" 구체적으로 서술
- 정답·풀이는 직접 노출하지 말고, 접근법과 함정 포인트만 언급
- 톤: ${TONE_GUIDES[ctx.blueprint.tone]}
- 분량: ${lengthGuide(long ? 'long' : 'medium')}`;
    },
  },

  // 9. 배점 함정
  {
    id: 'pricing_anomaly',
    label: '배점 함정',
    trigger: (s) => (s.overpricedCount + s.underpricedCount) >= 1,
    priority: (s) => 30 + (s.overpricedCount + s.underpricedCount) * 10,
    lengthHint: () => 'short',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 배점이 알려주는 우선순위',
      '{{SCHOOL}} {{GRADE}} 시험 — 노력 대비 점수가 다른 문항',
    ],
    buildChunk: (s) => `### 섹션: 배점 함정
- 난이도 대비 배점 후한 문항(공략 우선) ${s.overpricedCount}개
- 노력 대비 박한 문항(B/C등급 회피 후보) ${s.underpricedCount}개
- 갭 수치(+/-) 절대 노출 금지 — 문항 번호·배점·난이도까지만 언급
- 분량: ${lengthGuide('short')}`,
  },

  // 10. 등급별 전략
  {
    id: 'tiered_strategy',
    label: '등급별 전략',
    trigger: (s) => s.discrimOverall !== '낮음',
    priority: (s) => s.discrimOverall === '낮음' ? 0 : 70,
    lengthHint: (s) => s.discrimOverall === '높음' ? 'long' : 'medium',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 등급별 점수 확보 전략',
      '{{SCHOOL}} {{GRADE}} 시험 — 점수대별 공략법',
      '{{SCHOOL}} {{GRADE}} 수학 — 어디서부터 채워야 하는가',
    ],
    buildChunk: (s, ctx) => {
      const bands = ctx.blueprint.gradeBands;
      const bandList = bands.map((b) =>
        `  · **${b.label}** (${b.cutDesc})${b.subFocus ? ' — ' + b.subFocus : ''}`,
      ).join('\n');
      const longSec = s.discrimOverall === '높음';
      return `### 섹션: 등급별 전략
- archetype "${ctx.archetype}"의 등급 라벨 셋 사용 (A/B/C 강제 아님):
${bandList}
- **각 등급 분량 비대칭 필수** — 승부처 등급은 길고 깊게, 나머지는 짧게. 기계적 균등 금지 (사람은 강조 구간에 열을 올림)
- 분량: ${bands.length}개 등급 각각 ${longSec ? '3~4문단' : '2문단'}, 단 한 등급은 다른 것보다 50% 길어야 함`;
    },
  },

  // 11. 시간 관리
  {
    id: 'time_pressure',
    label: '시간 관리',
    trigger: (s) => s.totalQuestions >= 25 || s.essayCount >= 4,
    priority: (s) => 35 + Math.max(0, (s.totalQuestions - 20) * 2),
    lengthHint: () => 'short',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 시간 배분 전략',
      '{{SCHOOL}} {{GRADE}} 시험 — 50분을 어떻게 쓸 것인가',
    ],
    buildChunk: (s) => `### 섹션: 시간 관리
- 총 ${s.totalQuestions}문항 (서술형 ${s.essayCount}문항 포함)
- 객관식 평균 X분, 서술형 한 문항당 Y분 가이드를 자연스럽게 본문에 녹일 것
- 시간 압박이 있는 시험임을 학부모가 체감하도록
- 분량: ${lengthGuide('short')}`,
  },

  // 12. 주변 학교 비교 (pre-closing)
  {
    id: 'nearby_compare',
    label: '주변 학교 비교',
    fixedPosition: 'pre-closing',
    trigger: (s) => s.hasNearbyCompare,
    priority: () => 50,
    lengthHint: () => 'medium',
    h2Candidates: [
      '{{SCHOOL}} 인근 학교 시험과의 비교',
      '{{SCHOOL}} {{GRADE}} 시험 — 인근 학교 대비 특징',
    ],
    buildChunk: () => `### 섹션: 주변 학교 비교
- 이미 제공된 "주변 학교 비교" 데이터를 활용
- 인근 학교 대비 이 학교만의 출제 경향·난이도 차이 부각
- **단위 일관성 유지** — 한 문단 안에서 문항수와 배점을 섞어 쓰지 말 것
- 분량: ${lengthGuide('medium')}`,
  },

  // 13. 학습 방향 + CTA (closing)
  {
    id: 'study_priorities_cta',
    label: '학습 방향 + 마무리',
    fixedPosition: 'closing',
    trigger: () => true,
    priority: () => 25,
    lengthHint: () => 'medium',
    h2Candidates: [
      '{{SCHOOL}} {{GRADE}} 수학 — 학습 방향 제안',
      '{{SCHOOL}} {{GRADE}} 시험 대비 — 어디부터 시작할까',
      '{{SCHOOL}} {{GRADE}} 수학 — 우선순위 학습 가이드',
    ],
    buildChunk: (s, ctx) => {
      const top3 = s.topicStats.slice(0, 3)
        .map((t, i) => `${i + 1}순위 ${t.topic.split(' > ').pop()}(${t.pts}점)`).join(' / ');
      const academy = ctx.variables.academyName?.trim();
      const teacher = ctx.variables.teacherName?.trim();
      const tag = ctx.variables.branchTag?.trim();
      const ctaGuide = academy
        ? `- CTA에 학원명 "${academy}"${teacher ? ` (강사 "${teacher}")` : ''} 사용 가능${tag ? `. 특색 키워드: "${tag}"` : ''}.
- 마지막 1~2문장으로 자연스러운 학원 언급. 광고 톤 금지 — 분석의 연장선.`
        : `- 학원명 미입력 → **무명 CTA 금지** ("문의 주시기 바랍니다" 류 금지). 대신 분석을 정리하는 마무리 1~2문장으로 degrade.`;
      return `### 섹션: 학습 방향 + 마무리 (글의 종결)
- 배점 비중 순 단원 우선순위 제시: ${top3}
${ctaGuide}
- 분량: ${lengthGuide('medium')} + 마무리 1문장`;
    },
  },
];

// ── 컴포지션 결과 타입 ──
export interface SelectedModule {
  module: SectionModule;
  score: number;
  h2: string;
  chartToken: ChartId | null;
}

// ── 컴포지션 알고리즘 ──
export function composeBlueprint(
  signals: Signals,
  blueprint: Blueprint,
  schoolName: string,
  grade: string,
): SelectedModule[] {
  const allowed = blueprint.allowedModules.length
    ? new Set(blueprint.allowedModules)
    : null;
  const excluded = new Set(blueprint.excludedModules);

  // 1. archetype 필터 + trigger
  const candidates = MODULE_POOL.filter((m) => {
    if (excluded.has(m.id)) return false;
    if (allowed && !allowed.has(m.id)) return false;
    return m.trigger(signals);
  });

  // 2. priority 점수 계산
  const scored: SelectedModule[] = candidates.map((m) => ({
    module: m,
    score: m.priority(signals),
    h2: '',
    chartToken: m.chartToken ? m.chartToken(signals) : null,
  }));

  // 3. dedupe: essay와 topic_concentration이 같은 단원 거론 시 essay priority -15
  if (signals.essayCount > 0 && signals.essayPrimaryTopic) {
    const topConcen = scored.find((x) => x.module.id === 'topic_concentration');
    const essayF = scored.find((x) => x.module.id === 'essay_focus');
    if (topConcen && essayF && signals.topicStats[0]?.topic.includes(signals.essayPrimaryTopic)) {
      essayF.score -= 15;
    }
  }

  // 4. 차트 화이트리스트 검사 + 중복 방지 (priority 높은 쪽에만 차트 부여)
  const usedCharts = new Set<ChartId>();
  scored.sort((a, b) => b.score - a.score);
  for (const item of scored) {
    if (!item.chartToken) continue;
    if (!blueprint.charts.includes(item.chartToken)) {
      item.chartToken = null;  // archetype이 허용하지 않는 차트
      continue;
    }
    if (usedCharts.has(item.chartToken)) {
      item.chartToken = null;  // 이미 다른 모듈이 점유
      continue;
    }
    usedCharts.add(item.chartToken);
  }

  // 5. fixedPosition 분리
  const opening = scored.filter((x) => x.module.fixedPosition === 'opening');
  const closing = scored.filter((x) => x.module.fixedPosition === 'closing');
  const preClosing = scored.filter((x) => x.module.fixedPosition === 'pre-closing');
  const middle = scored.filter((x) => !x.module.fixedPosition);

  // 6. 상위 5~7개 본론 슬롯 (고정 위치 제외)
  const fixedCount = opening.length + closing.length + preClosing.length;
  const middleSlots = Math.max(3, Math.min(7 - fixedCount, 6));
  const middlePicked = middle.slice(0, middleSlots);

  // 7. H2 후보 픽 (모듈별 후보 풀에서 랜덤)
  const pickH2 = (item: SelectedModule, openingPool?: string[]) => {
    const pool = (item.module.id === 'exam_overview' && openingPool?.length)
      ? openingPool
      : item.module.h2Candidates;
    if (!pool.length) return `${schoolName} ${grade}`;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx].replace(/{{SCHOOL}}/g, schoolName).replace(/{{GRADE}}/g, grade);
  };

  for (const item of opening) item.h2 = pickH2(item, blueprint.openingH2Candidates);
  for (const item of middlePicked) item.h2 = pickH2(item);
  for (const item of preClosing) item.h2 = pickH2(item);
  for (const item of closing) item.h2 = pickH2(item);

  // 8. reorder: opening → middle(priority desc) → pre-closing → closing
  return [...opening, ...middlePicked, ...preClosing, ...closing];
}
