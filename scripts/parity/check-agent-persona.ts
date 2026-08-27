/**
 * 확장 에이전트 페르소나 과목 분기 확인 (DB 불필요, 순수 프롬프트 렌더).
 *
 * - 수학 입력: 문구가 예전 그대로 '수학 …' 인가 (회귀 없음)
 * - 영어 입력: '영어 …' 로 바뀌는가
 * - 과목 미지정(구 분석본): 수학으로 폴백하는가
 *
 * 실행: npx tsx scripts/parity/check-agent-persona.ts
 */
import type { AgentInput } from '../../src/lib/exam-analysis/agents/base-agent';
import { LearningAgent } from '../../src/lib/exam-analysis/agents/learning-agent';
import { PredictionAgent } from '../../src/lib/exam-analysis/agents/prediction-agent';
import { TopicStrategyAgent } from '../../src/lib/exam-analysis/agents/topic-strategy-agent';
import { WeaknessAgent } from '../../src/lib/exam-analysis/agents/weakness-agent';

const basicAnalysis = {
  questions: [
    { question_number: 1, difficulty: '2', question_type: 'number', ability_domain: 'calculation', points: 4, topic: 'A > B > C' },
    { question_number: 2, difficulty: '4', question_type: 'change_relation', ability_domain: 'reasoning', points: 6, topic: 'A > B > D' },
  ],
  summary: {
    difficulty_distribution: { '1': 0, '2': 1, '3': 0, '4': 1, '5': 0 },
    type_distribution: { number: 1, change_relation: 1, shape_measure: 0, data_possibility: 0 },
    average_difficulty: '2',
    dominant_type: 'number',
  },
  exam_info: { total_questions: 2, total_points: 10, format_distribution: { objective: 2, short_answer: 0, essay: 0 } },
} as unknown as AgentInput['basicAnalysis'];

const weaknessProfile = {
  difficulty_weakness: {},
  type_weakness: {},
  topic_weaknesses: [
    { topic: 'A > B > C', severity: 'high', error_count: 1, total_count: 2, error_rate: 0.5 },
  ],
  mistake_patterns: [],
  cognitive_levels: {
    knowledge: { score: 50, level: 'medium' },
    comprehension: { score: 50, level: 'medium' },
    application: { score: 50, level: 'medium' },
    analysis: { score: 50, level: 'medium' },
  },
} as unknown as AgentInput['weaknessProfile'];

const learningPlan = {
  phases: [{ phase_number: 1, title: 'P1', duration_weeks: 4, focus_topics: [], goals: [], activities: [] }],
  weekly_hours: 10,
  total_weeks: 8,
} as unknown as AgentInput['learningPlan'];

function inputFor(subject: string | null): AgentInput {
  const base: Record<string, unknown> = { basicAnalysis, weaknessProfile, learningPlan };
  if (subject !== null) base.subject = subject;
  return base as unknown as AgentInput;
}

const AGENTS: Array<[string, { buildPrompt(i: AgentInput): string }, string]> = [
  ['weakness', new WeaknessAgent(), '교육 전문가입니다'],
  ['learning', new LearningAgent(), '학습 계획 전문가입니다'],
  ['topic-strategy', new TopicStrategyAgent(), '단원별 학습 전략 전문가입니다'],
  ['prediction', new PredictionAgent(), '교육 성과 예측 전문가입니다'],
];

let failed = 0;

for (const [name, agent, tail] of AGENTS) {
  const cases: Array<[string, string | null, string]> = [
    ['수학', 'MATH', `당신은 수학 ${tail}`],
    ['영어', 'ENGLISH', `당신은 영어 ${tail}`],
    ['미지정(폴백)', null, `당신은 수학 ${tail}`],
  ];
  for (const [label, subject, expected] of cases) {
    const prompt = agent.buildPrompt(inputFor(subject));
    const ok = prompt.includes(expected);
    if (!ok) failed += 1;
    console.log(`  ${ok ? '✅' : '❌'} ${name.padEnd(15)} ${label.padEnd(12)} "${expected}"`);
    if (!ok) {
      const hit = prompt.match(/당신은 [^\n]{0,40}/)?.[0] ?? '(페르소나 문장 없음)';
      console.log(`      실제: ${hit}`);
    }
    if (prompt.includes('${')) {
      console.log(`      ⚠ 보간 안 된 \${...} 잔존 — 템플릿 리터럴이 아닐 수 있음`);
      failed += 1;
    }
  }
}

console.log('\n──────────────────────────────');
if (failed) {
  console.log(`❌ ${failed}건 실패`);
  process.exit(1);
}
console.log('✅ 12건 전부 통과 — 수학 문구 불변, 영어 전환, 미지정 폴백');
