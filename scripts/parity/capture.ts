/**
 * 과목 분리 리팩터링 — 회귀 감시 하네스.
 *
 *   npx tsx scripts/parity/capture.ts <출력경로>
 *
 * 고정 입력(fixtures)으로 수학·영어 산출물을 전부 렌더해 JSON 으로 덤프한다.
 * 리팩터링 전에 baseline 을 뜨고, 각 단계 후 다시 떠서 diff 한다.
 * **수학 항목은 단 1바이트도 달라지면 안 된다.**
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { createHash } from 'crypto';

import { ExamPromptBuilder } from '../../src/lib/exam-analysis/prompt-builder';
import { CommentaryAgent, buildSystemPromptV3, buildSystemPromptV4 } from '../../src/lib/exam-analysis/agents/commentary-agent';
import { buildSystemBase, buildFormatRules, buildOutputSchema } from '../../src/lib/exam-analysis/article-prompt-builders';
import { buildBlueprint, classifyArchetype } from '../../src/lib/exam-analysis/article-archetype';
import type { Signals } from '../../src/lib/exam-analysis/article-archetype';
import {
  generateDifficultyDonutSvg, generateTypeRadarSvg, generateAbilityRadarSvg,
  generateTopicBarSvg, generateDiscriminationSvg,
} from '../../src/lib/exam-analysis/chart-image-generator';
import { getTypeAxes, getAbilityAxes, countAbilities } from '../../src/lib/exam-analysis/shared/chart-axes';
import { weightedAverageDifficulty } from '../../src/lib/exam-analysis/difficulty';
import {
  MATH_CONTEXTS, ENGLISH_CONTEXTS, MATH_QUESTIONS, ENGLISH_QUESTIONS,
  MATH_SUMMARY, ENGLISH_SUMMARY,
} from './fixtures';

const out: Record<string, string> = {};
const put = (k: string, v: unknown) => { out[k] = typeof v === 'string' ? v : JSON.stringify(v); };

// ── 1. 분석 프롬프트 (ExamPromptBuilder) ──
MATH_CONTEXTS.forEach((ctx, i) => {
  const r = ExamPromptBuilder.build(ctx);
  put(`math.promptBuilder[${i}].combined`, r.combined_prompt);
  put(`math.promptBuilder[${i}].base`, r.base_prompt);
  put(`math.promptBuilder[${i}].guidelines`, r.analysis_guidelines);
  put(`math.promptBuilder[${i}].usedTemplates`, r.used_templates);
});
ENGLISH_CONTEXTS.forEach((ctx, i) => {
  const r = ExamPromptBuilder.build(ctx);
  put(`english.promptBuilder[${i}].combined`, r.combined_prompt);
});

// ── 2. 총평 에이전트 프롬프트 ──
const agent = new CommentaryAgent();
const basic = (qs: typeof MATH_QUESTIONS, sum: typeof MATH_SUMMARY) => ({
  exam_info: { total_questions: qs.length, total_points: 100, format_distribution: { objective: 4, short_answer: 1, essay: 1 } },
  summary: sum,
  questions: qs,
}) as never;
put('math.commentary.buildPrompt', agent.buildPrompt({ basicAnalysis: basic(MATH_QUESTIONS, MATH_SUMMARY), subject: 'MATH' }));
put('math.commentary.buildPrompt.noSubject', agent.buildPrompt({ basicAnalysis: basic(MATH_QUESTIONS, MATH_SUMMARY) }));
put('english.commentary.buildPrompt', agent.buildPrompt({ basicAnalysis: basic(ENGLISH_QUESTIONS, ENGLISH_SUMMARY), subject: 'ENGLISH' }));

// V3/V4 블로그 프롬프트 — 지금까지 회귀 감시 밖이었다(적대적 리뷰 5.5에서 모순 발견).
put('math.commentary.v3System', buildSystemPromptV3('수학'));
put('math.commentary.v4System', buildSystemPromptV4('수학'));
put('english.commentary.v3System', buildSystemPromptV3('영어'));
put('english.commentary.v4System', buildSystemPromptV4('영어'));

// ── 3. 블로그 글 프롬프트 빌더 ──
const signals = { discriminationLabel: '적정', essayRatio: 0.2, killerRatio: 0.15, topTopicShare: 0.3, avgDifficulty: 3 } as unknown as Signals;
const bp = buildBlueprint(signals);
put('shared.archetype', classifyArchetype(signals).archetype);
for (const [tag, subj] of [['math', 'MATH'], ['english', 'ENGLISH']] as const) {
  put(`${tag}.article.systemBase`, buildSystemBase({}, subj));
  put(`${tag}.article.systemBase.academy`, buildSystemBase({ academyName: '가나학원', teacherName: '홍길동' }, subj));
  put(`${tag}.article.formatRules`, buildFormatRules(bp, '정화중', '중2', subj));
  put(`${tag}.article.outputSchema`, buildOutputSchema(bp, '정화중', '중2'));
}
put('math.article.systemBase.noSubject', buildSystemBase({}));
put('math.article.formatRules.noSubject', buildFormatRules(bp, '정화중', '중2'));

// ── 4. 차트 SVG ──
for (const [tag, qs, sum, subj] of [
  ['math', MATH_QUESTIONS, MATH_SUMMARY, 'MATH'],
  ['english', ENGLISH_QUESTIONS, ENGLISH_SUMMARY, 'ENGLISH'],
] as const) {
  put(`${tag}.chart.difficulty`, generateDifficultyDonutSvg(sum.difficulty_distribution));
  put(`${tag}.chart.typeRadar`, generateTypeRadarSvg(sum.type_distribution, subj));
  put(`${tag}.chart.abilityRadar`, generateAbilityRadarSvg(qs, subj));
  put(`${tag}.chart.topicBar`, generateTopicBarSvg(qs));
  put(`${tag}.chart.discrimination`, generateDiscriminationSvg(qs));
  put(`${tag}.axes.type`, getTypeAxes(subj, sum.type_distribution));
  put(`${tag}.axes.ability`, getAbilityAxes(subj));
  put(`${tag}.axes.counts`, countAbilities(subj, qs));
  put(`${tag}.difficulty.weighted`, weightedAverageDifficulty(qs));
}
put('math.chart.abilityRadar.noSubject', generateAbilityRadarSvg(MATH_QUESTIONS));

// ── 덤프 ──
const target = process.argv[2];
if (!target) { console.error('사용법: capture.ts <출력경로>'); process.exit(1); }
mkdirSync(dirname(target), { recursive: true });
const payload = Object.fromEntries(
  Object.entries(out).map(([k, v]) => [k, { len: v.length, sha: createHash('sha256').update(v).digest('hex').slice(0, 16), text: v }]),
);
writeFileSync(target, JSON.stringify(payload, null, 1), 'utf8');
const mathKeys = Object.keys(out).filter((k) => k.startsWith('math.')).length;
const enKeys = Object.keys(out).filter((k) => k.startsWith('english.')).length;
console.log(`캡처 완료 → ${target}`);
console.log(`  항목 ${Object.keys(out).length}개 (수학 ${mathKeys} / 영어 ${enKeys})`);
