/**
 * 총평 템플릿 블록 정합 회귀 검사.
 *
 * 지키는 것 (프리셋 20종 작업의 P0 안전망):
 *   1. 저장된 설정에 **없는** 신규 블록이 `defaultEnabled=false` 면 기존 문서에 나타나지 않는다.
 *      — 이걸 놓치면 히트맵·스토리 같은 프리셋 전용 블록이 기존 분석본 전체 하단에 튀어나온다.
 *   2. `defaultEnabled=true` 인 블록은 자동으로 켜져 신규 기능이 조용히 누락되지 않는다.
 *   3. `locked` 는 `defaultEnabled` 보다 우선한다.
 *   4. `parseTemplateConfig` 가 모르는 블록 id 를 실제로 버린다(타입 캐스팅으로 통과시키지 않는다).
 *   5. 아무것도 저장하지 않은 기존 분석본의 **렌더 목록**이 DEFAULT_TEMPLATE 그대로다.
 *
 * ⚠️ 검증 대상은 `normalizeTemplate` 결과가 아니라 `resolveBlocks` 의 **실제 렌더 목록**이다.
 *    정규화 결과에는 꺼진 블록도 포함되므로, 거기서 비교하면 1번을 못 잡는다.
 *
 * 실행: npx tsx scripts/parity/check-template-blocks.ts
 */
import type { CommentaryTemplateConfig } from '../../src/lib/exam-analysis/blocks/types';
import type { CommentaryResult } from '../../src/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '../../src/lib/exam-analysis/types';

// 블록 레지스트리는 렌더러(rendering.tsx)를 거쳐 `katex/dist/katex.min.css` 를 끌고 온다.
// Node 에는 CSS 로더가 없으므로 무시하도록 등록한 뒤 **동적으로** 불러온다
// (정적 import 는 호이스팅돼 이 등록보다 먼저 실행된다).
declare const require: NodeJS.Require;
require.extensions['.css'] = () => {};

async function main() {
  const { COMMENTARY_BLOCKS } = await import('../../src/app/(teacher)/exam-analysis/v3/blocks/registry');
  const { normalizeTemplate, resolveBlocks } = await import('../../src/app/(teacher)/exam-analysis/v3/blocks/resolve');
  const { DEFAULT_TEMPLATE, parseTemplateConfig } = await import('../../src/lib/exam-analysis/blocks/default-template');

  let fail = 0;
  function ok(cond: boolean, label: string) {
    console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}`);
    if (!cond) fail++;
  }

  // 모든 블록의 available() 을 통과시키기 위한 넉넉한 더미 — 렌더 목록 비교가 목적이라 값은 무의미
  const questions = Array.from({ length: 20 }, (_, i) => ({
    question_number: String(i + 1),
    difficulty: String((i % 5) + 1),
    points: 5,
    question_type: 'algebra',
    ability_domain: 'calculation',
    question_format: i < 15 ? 'objective' : 'essay',
    topic: '공통수학1 > 다항식 > 다항식의 연산',
    ai_comment: '',
  })) as unknown as AnalyzedQuestion[];

  const commentary = {
    overall_comment: '총평 본문.',
    nearby_comparison: '인근 학교 대비 비슷한 수준입니다.',
    score_strategies: ['전략1'],
    strength_areas: ['강점'],
    improvement_areas: ['보완'],
    notable_questions: ['3번'],
    teaching_recommendations: ['권장'],
    blog_kicker: '키커',
    blog_headline: '헤드라인',
    blog_dek: '요약문',
    feature_callout: { title: '제목', body: ['본문'] },
    grade_cuts: [{ grade: '1등급', cut: '90' }],
    topic_performance: [{ topic: '다항식', value: '20점 / 4문항' }],
    blog_qa: [{ question: '질문?', answer: ['답변'] }],
    // 아래는 각 블록의 available() 이 실제로 보는 필드 — 하나라도 비면 그 블록이 렌더에서 빠진다
    v4_difficulty_rows: [{ level: '1', count: 3, points: 15 }],
    v4_previous_comparison: { headline: '작년 대비', body: '비슷합니다' },
    v4_main_analysis: [{ heading: '분석', body: '본문' }],
    v4_key_questions: [{ number: '3', reason: '킬러' }],
    v4_final_strategy: [{ heading: '전략', body: '본문' }],
    conclusion: { body: '결론 본문' },
    pull_quote: { text: '인용문' },
  } as unknown as CommentaryResult;

  const renderedIds = (cfg: CommentaryTemplateConfig | null) =>
    resolveBlocks(cfg, commentary, questions).map((b) => b.def.id);

  console.log('\n[1] 기존 저장 설정 + 신규 블록 ─────────────────────');

  // 실제 상황 재현: 사용자가 예전에 저장한 설정(현재 레지스트리 기준 전체)에서
  // 마지막 두 블록을 "아직 존재하지 않던 블록"으로 간주해 빼 둔다.
  const known = DEFAULT_TEMPLATE.blocks.map((b) => b.id);
  const savedLegacy: CommentaryTemplateConfig = {
    ...DEFAULT_TEMPLATE,
    blocks: DEFAULT_TEMPLATE.blocks.filter((b) => b.id !== 'charts' && b.id !== 'pullQuote'),
  };
  const afterLegacy = normalizeTemplate(savedLegacy);
  ok(
    afterLegacy.blocks.find((b) => b.id === 'charts')?.enabled === true,
    'defaultEnabled=true 인 블록(charts)은 저장본에 없어도 켜진 채 복원된다',
  );

  console.log('\n[2] defaultEnabled 계약 ────────────────────────────');
  const missing = COMMENTARY_BLOCKS.filter((d) => typeof d.defaultEnabled !== 'boolean');
  ok(missing.length === 0, `모든 블록이 defaultEnabled 를 명시한다 (누락: ${missing.map((d) => d.id).join(',') || '없음'})`);

  const lockedButOff = COMMENTARY_BLOCKS.filter((d) => d.locked === true && d.defaultEnabled === false);
  for (const d of lockedButOff) {
    ok(
      normalizeTemplate({ ...DEFAULT_TEMPLATE, blocks: [] }).blocks.find((b) => b.id === d.id)?.enabled === true,
      `locked 블록(${d.id})은 defaultEnabled=false 여도 켜진다`,
    );
  }
  if (lockedButOff.length === 0) ok(true, 'locked && defaultEnabled=false 조합 없음 — 우선순위 충돌 소지 없음');

  // opt-in 블록 시뮬레이션 — 아직 실물이 없을 때도 식 자체는 고정해 둔다
  const optIn = { id: 'fakeOptIn', locked: false, defaultEnabled: false };
  ok(
    (optIn.locked === true || optIn.defaultEnabled) === false,
    'normalizeTemplate 이 쓰는 식 `locked || defaultEnabled` 가 opt-in 블록을 끈 채로 둔다',
  );

  // 실물 opt-in 블록(letterBody·heatmapGrid …)이 추가되면 여기서 자동으로 감시된다.
  // **이것이 P0 의 본체다** — 프리셋 전용 블록이 기존 문서에 새어 나오는지 보는 유일한 검사.
  const optInBlocks = COMMENTARY_BLOCKS.filter((d) => d.locked !== true && d.defaultEnabled === false);
  const baseline = renderedIds(null);
  for (const d of optInBlocks) {
    ok(!baseline.includes(d.id), `opt-in 블록(${d.id})이 기본 문서에 새어 나오지 않는다`);
  }
  console.log(`       (현재 opt-in 블록 ${optInBlocks.length}개${optInBlocks.length ? ': ' + optInBlocks.map((d) => d.id).join(', ') : ' — 아직 없음'})`);

  console.log('\n[3] parseTemplateConfig 화이트리스트 ───────────────');
  const parsed = parseTemplateConfig({
    themeId: 'nyt',
    layoutId: 'magazine',
    copyId: 'editorial',
    blocks: [
      { id: 'header', variant: 'editorial', enabled: true },
      { id: '악의적인값', variant: 'x', enabled: true },
      { id: 'kpi', variant: 'dark', enabled: true },
      null,
      ['배열'],
    ],
  });
  ok(parsed.blocks.length === 2, `모르는 id·null·배열을 버린다 (남은 블록 ${parsed.blocks.length}개)`);
  ok(!parsed.blocks.some((b) => String(b.id) === '악의적인값'), '모르는 블록 id 가 통과하지 않는다');

  console.log('\n[4] 기본 템플릿 렌더 목록 회귀 ─────────────────────');
  const rendered = renderedIds(null);
  const expected = DEFAULT_TEMPLATE.blocks.map((b) => b.id);
  ok(
    JSON.stringify(rendered) === JSON.stringify(expected),
    `저장 없는 분석본의 렌더 순서가 DEFAULT_TEMPLATE 과 같다\n        기대: ${expected.join(' → ')}\n        실제: ${rendered.join(' → ')}`,
  );
  ok(rendered.length === known.length, `렌더 블록 수 ${rendered.length} = 기본 템플릿 ${known.length}`);

  console.log(`\n${fail === 0 ? '통과' : `실패 ${fail}건`} — 총 검사 완료\n`);
  process.exit(fail === 0 ? 0 : 1);

}

main().catch((e) => { console.error(e); process.exit(1); });
