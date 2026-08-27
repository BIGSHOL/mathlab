/**
 * 기출 분석 블로그 글 — 프롬프트 빌더
 *
 * 기존 article-generator.ts의 단일 거대 프롬프트(412~697줄)를
 * 책임별 sub-builder로 분리. 각 빌더는 독립적으로 단위 테스트 가능.
 *
 * 핵심 변화:
 * - buildSectionGuides: 정적 7섹션 목차 → 동적 모듈 셋 (시험마다 달라짐)
 * - buildClosingRules: 학원/강사 변수 주입 (무명 CTA 금지)
 * - 모든 anti-pattern 규칙은 article-anti-patterns.ts로 일원화
 */

import type { CommentaryResult } from './agents/commentary-agent';
import type { Blueprint } from './article-archetype';
import { TONE_GUIDES } from './article-archetype';
import type { SelectedModule, ArticleVariables, BuildChunkContext } from './article-modules';
import { buildAntiPatternsRules } from './article-anti-patterns';
import { getTypeAxes } from './shared/chart-axes';
import { toExamSubjectKey } from './shared/subject';

/** 과목명 — 프롬프트 페르소나·태그에 쓰는 표기. 미지정이면 수학(기존 동작 유지). */
function subjectName(subject?: string | null): string {
  return toExamSubjectKey(subject) === 'ENGLISH' ? '영어' : '수학';
}

const LEVEL_NAMES = ['', '기본', '표준', '응용', '심화', '최고난도'];

// ── 1. 시스템 베이스 (정체성·톤·학원 변수) ──

export function buildSystemBase(variables: ArticleVariables, subject?: string | null): string {
  const academy = variables.academyName?.trim();
  const teacher = variables.teacherName?.trim();
  const tag = variables.branchTag?.trim();
  const subj = subjectName(subject);
  const identityLine = academy
    ? `당신은 "${academy}"${teacher ? `의 ${teacher} 원장/강사` : `의 ${subj} 원장`} 명의로 발행되는 블로그 글을 쓰는 분석가입니다.${tag ? ` 학원 특색: "${tag}".` : ''}`
    : `당신은 한 ${subj} 학원의 원장 명의로 발행되는 블로그 글을 쓰는 분석가입니다.`;

  return `${identityLine}

## 글의 정체성
- 독자: 학부모 (${subj}을 잘 모르는 분들도 이해 가능해야 함)
- 목적: 학원의 전문성과 분석력을 보여 신뢰를 얻고 상담 문의로 이어지게 함
- 톤: 분석가의 차분한 칼럼체. 격식체("~합니다") 기본 + 자연스러운 변형 표현 적극 사용
- 사람이 직접 분석하고 쓴 것처럼 보여야 함 — AI가 작성했다는 인상 절대 금지`;
}

// ── 2. Archetype 헤더 (이 글의 골격이 왜 이렇게 결정됐는지) ──

export function buildArchetypeHeader(blueprint: Blueprint): string {
  return `## 이 시험의 archetype 분류

- **분류: "${blueprint.archetype}"** — ${blueprint.reason}
- **이 글의 톤**: ${TONE_GUIDES[blueprint.tone]}
- **이 archetype의 사용 가능 차트**: ${blueprint.charts.map((c) => `{{CHART:${c}}}`).join(', ')} (이 외 차트 토큰 사용 금지)
- **이 archetype의 등급 라벨 셋**:
${blueprint.gradeBands.map((b) => `  · ${b.label} (${b.cutDesc})${b.subFocus ? ' — ' + b.subFocus : ''}`).join('\n')}

A/B/C 고정 라벨이 아니라 이 archetype에 맞는 라벨을 사용해야 합니다. 위 라벨 셋을 그대로 활용하세요.`;
}

// ── 3. 시험 정보 + 데이터 블록 (수치·총평·분석 데이터) ──

export interface FactsBlockInput {
  schoolName: string;
  grade: string;
  scopeLabel: string;
  totalQ: number;
  totalPts: number;
  formats: { objective: number; short_answer: number; essay: number };
  overallLevel: number;
  diffCounts: [number, number, number, number, number];
  diffPoints: number[];
  typeDistribution: Record<string, number>;
  /** 과목 — 유형 라벨을 고른다. 없으면 수학(기존 동작 유지). */
  subject?: string | null;
  topicStats: Array<{ topic: string; count: number; pts: number }>;
  commentary: CommentaryResult;
  // 정성 분석 (수치 노출 금지)
  discrim: { overallLabel: string; poorRatioLabel: string };
  overpricedLabel: string;
  underpricedLabel: string;
  essayInsight: {
    essayCount: number;
    essayPts: number;
    weightPct: number;
    avgLevelLabel: string;
    topicsLabel: string;
  } | null;
}

export function buildFactsAndDataBlock(facts: FactsBlockInput): string {
  const {
    schoolName, grade, scopeLabel, totalQ, totalPts, formats, overallLevel,
    diffCounts, diffPoints, typeDistribution, topicStats,
    commentary, discrim, overpricedLabel, underpricedLabel, essayInsight,
  } = facts;

  const diffLines = diffCounts.map((count, i) =>
    `  - Level ${i + 1}(${LEVEL_NAMES[i + 1]}): ${count}문항`).join('\n');

  // 예전엔 수학 QUESTION_TYPE_LABELS 전체를 순회해, 영어 시험지 글에도 "수와 연산 0문항" 같은
  // 수학 라벨만 8줄 들어가고 영어 유형은 한 건도 나오지 않았다 (적대적 리뷰 1.4).
  // 레거시 별칭까지 순회해 같은 라벨이 중복 출력되던 문제도 함께 사라진다.
  const typeLines = getTypeAxes(facts.subject, typeDistribution)
    .map((axis) => `  - ${axis.label}: ${typeDistribution[axis.key] || 0}문항`)
    .join('\n');

  const topicLines = topicStats
    .map((s) => `  - ${s.topic}: ${s.count}문항 (${s.pts}점)`)
    .join('\n');

  const strategyText = commentary.score_strategies
    ? commentary.score_strategies.map((s) =>
      `- ${s.grade} (${s.target}): ${s.points?.join(' / ') || s.strategy || ''}`,
    ).join('\n')
    : commentary.score_strategy || '';

  const notableText = commentary.notable_questions
    .map((n) => `- ${n.question_number}번: ${n.comment}`)
    .join('\n');

  const teachingText = commentary.teaching_recommendations
    ?.map((r) => `- [우선순위 ${r.priority}] ${r.topic}: ${r.reason}`)
    .join('\n') || '';

  const nearbyText = commentary.nearby_comparison || '(주변 학교 비교 데이터 없음)';

  const lowDesc = discrim.overallLabel === '높음' ? '높은 편'
    : discrim.overallLabel === '적정' ? '적정한 수준'
      : discrim.overallLabel === '다소 낮음' ? '다소 낮은 편' : '약한 편';

  return `## 시험 정보
- 학교: ${schoolName}
- 학년: ${grade}
- 시험 범위: ${scopeLabel}
- 총 문항수: ${totalQ}문항, 총 배점: ${totalPts}점
- 형식: 객관식 ${formats.objective}문항, 단답형 ${formats.short_answer}문항, 서술형 ${formats.essay}문항
- 종합 난이도: Level ${overallLevel} (${LEVEL_NAMES[overallLevel] || '표준'})

## 추가 분석 인사이트 (본문 자연어로 녹일 것 — 수치 직접 노출 금지!)

**변별력 (차트 없음 → 정성 표현만):**
- 전체 변별력 라벨: **${discrim.overallLabel}**
- 변별력 주의 등급 문항 비중: **${discrim.poorRatioLabel}**
- 활용: 시험 개요에 "변별력이 ${lowDesc}"라는 정성 표현으로 한 번만 자연스럽게 녹일 것
- **금지**: "변별력 지수 38점", "주의 등급 10문항" 같은 정확 수치 노출 절대 금지

**배점-난이도 갭 (차트 없음 → 갭 수치 노출 금지):**
- 공략 우선 가치가 큰 문항: ${overpricedLabel}
- 함정 문항 (효율 낮음): ${underpricedLabel}
- 활용: 등급별 전략 섹션에서 공략·회피 가이드로 활용
- **금지**: "+4.4", "-3.6" 같은 갭 수치 노출 절대 금지

${essayInsight ? `**서술형 집중 (차트 있을 수 있음 — 수치 노출 OK):**
- 서술형 ${essayInsight.essayCount}문항이 전체 배점의 **${essayInsight.weightPct}%** (${essayInsight.essayPts}점)
- 평균 난이도: **${essayInsight.avgLevelLabel}**
- 단원별 출제: ${essayInsight.topicsLabel}` : ''}

## 난이도 분포
${diffLines}
- 난이도별 배점: Level1 ${diffPoints[0]}점, Level2 ${diffPoints[1]}점, Level3 ${diffPoints[2]}점, Level4 ${diffPoints[3]}점, Level5 ${diffPoints[4]}점

## 유형 분포 (5대 교육과정 영역)
${typeLines}

## 단원별 출제 현황
${topicLines}

## AI 총평 요약
${commentary.overall_comment}

## 등급별 전략 데이터
${strategyText}

## 강점 영역
${commentary.strength_areas.map((s) => `- ${s}`).join('\n')}

## 보완 필요 영역
${commentary.improvement_areas.map((s) => `- ${s}`).join('\n')}

## 주목할 문항 데이터
${notableText}

## 지도 추천 데이터
${teachingText}

## 주변 학교 비교 데이터
${nearbyText}`;
}

// ── 4. 섹션 가이드 (★ 핵심 — 동적 모듈 셋) ──

export function buildSectionGuides(
  modules: SelectedModule[],
  ctx: BuildChunkContext,
  signals: import('./article-archetype').Signals,
): string {
  const sectionBlocks = modules.map((sel, idx) => {
    const chunk = sel.module.buildChunk(signals, ctx);
    const chartLine = sel.chartToken
      ? `\n- **차트 토큰**: 이 섹션 끝에 정확히 {{CHART:${sel.chartToken}}} 1회 삽입`
      : '';
    return `### 섹션 ${idx + 1}: ${sel.module.label}
- 예상 H2 제목: "${sel.h2}" (이대로 쓰거나 자연스럽게 변형, 키워드 "${ctx.schoolName} ${ctx.grade}" 포함 유지)
${chunk}${chartLine}`;
  }).join('\n\n');

  return `## 글 구조 — 이번 시험에 활성화된 ${modules.length}개 섹션 (이 순서대로 작성)

이 시험의 archetype과 특성에 맞춰 자동 선정된 섹션들입니다.
다음 규칙을 엄격히 지키세요:

1. **이 ${modules.length}개 섹션만** 작성. 위에 없는 섹션 추가 금지 (예: 별도 "결론" 섹션 추가 금지)
2. **이 순서대로** 작성
3. 각 섹션은 자연스러운 \\<h2\\>로 시작 — "1. 시험 개요", "Section 2:" 같은 번호·목차 표현 절대 금지
4. 각 섹션의 H2 제목은 후보를 그대로 쓰거나 자연스럽게 변형 가능. 단 "${ctx.schoolName}" 포함 유지
5. 차트 토큰({{CHART:...}})은 지정된 섹션 끝에만 1회. 캡션 텍스트(▲ 등) 추가 금지

${sectionBlocks}`;
}

// ── 5. 글쓰기 규칙 (수식·enum·HTML·SEO·자연 글쓰기 — 기존 article-generator 유지부) ──

export function buildFormatRules(blueprint: Blueprint, schoolName: string, grade: string, subject?: string | null): string {
  const subj = subjectName(subject);
  const isEnglish = toExamSubjectKey(subject) === 'ENGLISH';
  const allowedCharts = blueprint.charts.map((c) => `{{CHART:${c}}}`).join(', ');
  const forbiddenCharts = ['difficulty', 'ability_radar', 'topic_bar']
    .filter((c) => !blueprint.charts.includes(c as Blueprint['charts'][number]))
    .map((c) => `{{CHART:${c}}}`);
  const forbiddenChartsLine = forbiddenCharts.length
    ? `**${forbiddenCharts.join(', ')} 절대 사용 금지** (이 archetype은 위 차트만 허용)`
    : '';

  return `## 글쓰기 규칙

### 수식 표기 (네이버 블로그 컨텍스트 — 필수)
네이버는 KaTeX/LaTeX를 렌더링하지 않습니다. \\$...\\$ 문법 절대 금지.
- 단순 변수 \\$x\\$, \\$a\\$도 금지 — 그냥 x, a로
- 제곱: x², a², n³ / 첨자: x₁, x₂, aₙ / 분수: a/b
- 제곱근: √(A²) / 절댓값: |A| / 부등호: ≤, ≥, ≠ / 곱셈: ×, ·
- 복잡한 수식은 자연어로: "A² 의 제곱근은 A 의 절댓값"

### 영문 enum 사용 금지
- 능력영역: ${isEnglish ? '"정확성 / 이해력 / 추론력 / 표현력"' : '"계산력 / 이해력 / 문제해결력 / 추론력"'}만 사용
- 유형: ${isEnglish ? '"어법 / 어휘 / 독해 / 듣기 / 서술·영작 / 의사소통"' : '"수와 연산 / 변화와 관계 / 도형과 측정 / 자료와 가능성"'}만 사용
- CALCULATION, PROBLEM_SOLVING, NUMBER, ALGEBRA 등 영문 토큰 글에 한 글자도 포함 금지

### 차트 토큰
- **이 글에서 허용된 차트**: ${allowedCharts}
${forbiddenChartsLine}
- 토큰은 지정된 섹션 끝에만 정확히 1회. "▲ 21문항 난이도 분포" 같은 텍스트 캡션으로 대체 금지

### 네이버 SEO
- **제목**: 25~40자, 핵심 키워드(${schoolName} + 기출 분석)를 앞쪽 15자 내
- **H2**: 모든 섹션에 \\<h2\\>. 모든 H2에 "${schoolName} ${grade}" 포함
- **키워드 빈도**: "${schoolName}" 10~14회, "${grade}" 5~8회. 같은 문단에 학교명 2회 이상 금지
- **문단**: 2~4문장씩, 문장당 40자 이내 권장
- **태그**: 8~12개. 필수 #${schoolName.replace(/\s/g, '')} #${schoolName.replace(/\s/g, '')}기출 #${schoolName.replace(/\s/g, '')}${subj} #${grade ? grade.replace(/\s/g, '') + subj : `중학${subj}`} #기출분석 #${subj}기출분석

### HTML 서식 (네이버 100% 호환)
- content는 HTML. 마크다운(##, **, -) 금지
- 속성에 작은따옴표 사용: style='color: #E03131' ✓ / style="..." ✗ (JSON 파싱 오류)
- **사용 금지 태그**: \\<p\\>, \\<ul\\>, \\<li\\>, \\<ol\\>, \\<table\\>, \\<blockquote\\>, \\<h3\\>, \\<div\\>
- **사용 가능**: \\<h2\\>, \\<strong\\>, \\<span\\>, \\<mark\\>, \\<br\\>, \\<img\\>, {{CHART:*}} 토큰
- 하위 제목 (등급 라벨 등): \\<strong style='font-size: 17px;'\\>라벨\\</strong\\>\\<br\\>\\<br\\>
- 리스트: \\<ul\\>\\<li\\> 대신 "• 항목\\<br\\>"
- 줄바꿈: 문장 끝 \\<br\\>, 문단 사이 \\<br\\>\\<br\\>
- 색상 강조: 핵심 수치 \\<span style='color: #E03131'\\>84점\\</span\\>, 등급 라벨 \\<span style='color: #1971C2'\\>, 단원명 \\<strong style='color: #6741D9'\\>
- 형광펜 (섹션마다 다른 색!): 노란 #FFF3BF, 연두 #D8F5A2, 하늘 #BAE3FF, 살구 #FFE8CC, 분홍 #FFD8D8, 연보라 #E8D5FF

### 자연스러운 글쓰기
- **문장 시작 다양화** — 연속 3문장 같은 구조 금지. 질문/역접/비유/도치 혼용
- **종결어 10가지 이상 혼용** (같은 종결어 연속 2회 금지): ~입니다 / ~인 셈입니다 / ~볼 수 있습니다 / ~어렵습니다 / ~눈여겨볼 대목입니다 / ~때문입니다 / ~보입니다 / ~달라집니다 / ~중요합니다 / ~가능합니다
- **인사이트 먼저, 데이터는 근거로** — 숫자 나열 후 결론 ✗ / 결론 먼저 + 근거 숫자 ✓
- **학부모 관점 프레이밍** — 학부모가 체감할 수 있는 표현, 추상적 분석 금지
- **리듬 변화** — 짧은 강조 문장 + 긴 설명 문장 혼합
- **비대칭 분량** — 등급별·문항별 분량 기계적 균등 금지. 승부처는 길게, 뻔한 곳은 짧게
- **글 길이**: 2,500~3,500자 (3,500자 절대 초과 금지)`;
}

// ── 6. 출력 형식 (JSON 스키마) ──

export function buildOutputSchema(blueprint: Blueprint, schoolName: string, grade: string): string {
  const allowedTokens = blueprint.charts.map((c) => `{{CHART:${c}}}`).join(', ');
  return `## 출력 형식 (반드시 아래 JSON으로만 응답. 마크다운 코드블록 없이 순수 JSON만!)

{
  "title": "블로그 제목 (25~40자, "${schoolName}" + 기출 관련 키워드를 앞쪽 15자에)",
  "content": "HTML 본문 (\\<h2\\>, \\<strong\\>, \\<mark\\>, \\<span style=color\\>, \\<br\\>, ${allowedTokens} 사용. \\<p\\>/\\<ul\\>/\\<li\\>/\\<blockquote\\>/\\<h3\\> 사용 금지!)",
  "tags": ["#태그1", "#태그2", "..."],
  "metaDescription": "검색 결과 미리보기용 설명 (50~120자, "${schoolName} ${grade}" 키워드 포함)"
}`;
}

// ── 7. 최종 조립 ──

export interface AssemblePromptInput {
  systemBase: string;
  archetypeHeader: string;
  factsAndData: string;
  sectionGuides: string;
  formatRules: string;
  antiPatternsRules?: string;  // optional - 기본은 buildAntiPatternsRules()
  outputSchema: string;
}

export function assembleArticlePrompt(parts: AssemblePromptInput): string {
  return [
    parts.systemBase,
    parts.archetypeHeader,
    parts.factsAndData,
    parts.sectionGuides,
    parts.formatRules,
    parts.antiPatternsRules || buildAntiPatternsRules(),
    parts.outputSchema,
  ].join('\n\n');
}
