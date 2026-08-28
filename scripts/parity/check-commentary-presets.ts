/**
 * 총평 프리셋 카탈로그 무결성 검사.
 *
 * 프리셋은 문자열 id 로 테마·레이아웃·문체·블록·variant 를 가리킨다. 타입은 이걸 못 잡는다
 * (전부 `string`). 오타 하나가 조용한 폴백으로 흡수돼 "왜 이 프리셋만 매거진처럼 보이지"
 * 로 나타난다 — 그래서 참조 무결성을 여기서 고정한다.
 *
 * 실행: npx tsx scripts/parity/check-commentary-presets.ts
 */
import { COMMENTARY_PRESETS, presetToConfig, AUDIENCE_LABELS } from '../../src/lib/exam-analysis/commentary-presets';
import { COMMENTARY_THEMES } from '../../src/lib/exam-analysis/commentary-themes';
import { COMMENTARY_LAYOUTS } from '../../src/lib/exam-analysis/commentary-layouts';
import { COMMENTARY_COPIES } from '../../src/lib/exam-analysis/commentary-copy';
import { DEFAULT_TEMPLATE } from '../../src/lib/exam-analysis/blocks/default-template';

// 레지스트리는 렌더러를 거쳐 katex CSS 를 끌고 온다 — Node 에 CSS 로더가 없으므로 무시 등록 후 동적 import
declare const require: NodeJS.Require;
require.extensions['.css'] = () => {};

let fail = 0;
function ok(cond: boolean, label: string) {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}`);
  if (!cond) fail++;
}

async function main() {
  const { COMMENTARY_BLOCKS } = await import('../../src/app/(teacher)/exam-analysis/v3/blocks/registry');

  const themeIds = new Set(COMMENTARY_THEMES.map((t) => t.id));
  const layoutIds = new Set(COMMENTARY_LAYOUTS.map((l) => l.id));
  const copyIds = new Set(COMMENTARY_COPIES.map((c) => c.id));
  const variantIds = new Map(COMMENTARY_BLOCKS.map((b) => [b.id as string, new Set(b.variants.map((v) => v.id))]));

  console.log(`\n프리셋 ${COMMENTARY_PRESETS.length}종 / 테마 ${themeIds.size} · 레이아웃 ${layoutIds.size} · 문체 ${copyIds.size} · 블록 ${variantIds.size}\n`);

  console.log('[1] id 유일성 ─────────────────────────────────────');
  const ids = COMMENTARY_PRESETS.map((p) => p.id);
  ok(new Set(ids).size === ids.length, `프리셋 id 중복 없음 (${ids.join(', ')})`);

  console.log('\n[2] 참조 무결성 ───────────────────────────────────');
  for (const p of COMMENTARY_PRESETS) {
    const bad: string[] = [];
    if (!themeIds.has(p.themeId)) bad.push(`theme=${p.themeId}`);
    if (!layoutIds.has(p.layoutId)) bad.push(`layout=${p.layoutId}`);
    if (!copyIds.has(p.copyId)) bad.push(`copy=${p.copyId}`);
    if (!AUDIENCE_LABELS[p.audience]) bad.push(`audience=${p.audience}`);
    for (const [blockId, change] of Object.entries(p.changes)) {
      const known = variantIds.get(blockId);
      if (!known) { bad.push(`block=${blockId}`); continue; }
      if (change?.variant && !known.has(change.variant)) bad.push(`${blockId}.variant=${change.variant}`);
    }
    for (const blockId of p.order ?? []) {
      if (!variantIds.has(blockId)) bad.push(`order=${blockId}`);
    }
    ok(bad.length === 0, `${p.id.padEnd(12)} ${bad.length ? '알 수 없는 참조: ' + bad.join(', ') : '모든 참조 유효'}`);
  }

  console.log('\n[3] presetToConfig 전개 ───────────────────────────');
  for (const p of COMMENTARY_PRESETS) {
    const cfg = presetToConfig(p);
    const ids: string[] = cfg.blocks.map((b) => b.id);
    const noDup = new Set(ids).size === ids.length;
    // 개수만 세면 기본 템플릿에 없는 블록(letterBody)이 조용히 버려져도 통과한다.
    // 기본 전부 + changes 로 새로 끌어온 것이 **모두** 들어왔는지를 본다.
    const missing = [
      ...DEFAULT_TEMPLATE.blocks.map((b) => b.id).filter((id) => !ids.includes(id)),
      ...Object.keys(p.changes).filter((id) => !ids.includes(id)),
    ];
    ok(
      noDup && missing.length === 0,
      `${p.id.padEnd(12)} 블록 ${ids.length}개${missing.length ? ' — 누락: ' + missing.join(',') : ''}${noDup ? '' : ' — 중복'}`,
    );
    for (const [id, c] of Object.entries(p.changes)) {
      if (c?.enabled !== true) continue;
      ok(cfg.blocks.find((b) => b.id === id)?.enabled === true, `${p.id.padEnd(12)} ${id} 이(가) 켜진 채 전개된다`);
    }
  }

  // 결론은 마지막에 온다 — 이건 지면의 의미이지 취향이 아니다.
  // `order` 는 앞머리만 적고 나머지를 기본 순서로 흘려보내는 접두사 표기라, order 에 conclusion 을
  // 적어 두고 켜진 블록을 빠뜨리면 그 블록이 `999 + index` 꼬리로 밀려 **결론 뒤에** 뜬다.
  // (실제 사례: frontpage 가 previousComparison 을 빠뜨려 '작년 대비'가 결론 다음에 나왔다.)
  // 예외는 의도적으로 결론을 앞에 두는 프리셋뿐 — 이유와 함께 여기 적는다.
  const CONCLUSION_FIRST = new Map([
    ['chalkboard', '판서는 "오늘 이것만 기억해라"를 맨 위에 적는다 — 결론이 헤더 다음'],
  ]);
  for (const p of COMMENTARY_PRESETS) {
    const ids = presetToConfig(p)
      .blocks.filter((b) => b.enabled && b.id !== 'footer')
      .map((b) => b.id);
    const ci = ids.indexOf('conclusion');
    if (ci < 0) continue;
    const after = ids.slice(ci + 1);
    const why = CONCLUSION_FIRST.get(p.id);
    if (why) {
      console.log(`  skip  ${p.id.padEnd(12)} 결론을 앞에 두는 프리셋 — ${why}`);
      continue;
    }
    ok(
      after.length === 0,
      `${p.id.padEnd(12)} 결론이 마지막이다${after.length ? ' — 뒤에 밀린 블록: ' + after.join(',') : ''}`,
    );
  }

  console.log('\n[4] 상수 오염 방지 ────────────────────────────────');
  // 편집기가 프리셋을 적용한 뒤 variant 를 바꿔도 원본 상수가 변하면 안 된다
  const a = presetToConfig(COMMENTARY_PRESETS[0]);
  const b = presetToConfig(COMMENTARY_PRESETS[0]);
  a.blocks[0].variant = '오염된값';
  ok(b.blocks[0].variant !== '오염된값', '두 번 전개한 결과가 객체를 공유하지 않는다');
  ok(
    DEFAULT_TEMPLATE.blocks[0].variant !== '오염된값',
    'presetToConfig 결과를 수정해도 DEFAULT_TEMPLATE 이 오염되지 않는다',
  );

  console.log('\n[5] 회귀 기준 ────────────────────────────────────');
  const magazine = presetToConfig(COMMENTARY_PRESETS[0]);
  ok(
    JSON.stringify(magazine) === JSON.stringify(DEFAULT_TEMPLATE),
    '매거진 프리셋 = 기본 템플릿 (변경 없는 프리셋의 전개 결과가 원본과 동일)',
  );

  console.log('');
  console.log('[6] 차별성 (수락 기준) ────────────────────────────');
  // "MAGAZINE 과 블록 순서가 같은 스킨은 실패" — 팔레트만 바꾼 프리셋이 늘어나는 것을 막는다.
  // 켜진 블록의 **순서열**을 지문으로 삼는다. 색·활자는 여기 안 들어간다(그건 스킨이다).
  const fingerprint = (preset: (typeof COMMENTARY_PRESETS)[number]) =>
    presetToConfig(preset)
      .blocks.filter((b) => b.enabled)
      .map((b) => b.id)
      .join('>');

  // 기존 부채 — 이 3종은 수락 기준이 생기기 전에 만들어졌고 실제로 매거진의 스킨이다.
  // 지우지 않고 여기 적어 둔다: 목록이 곧 "아직 문서로 갈리지 않은 프리셋"의 명세다.
  // **새로 추가하는 프리셋은 절대 여기 넣지 마라.** 넣는 순간 이 검사는 무의미해진다.
  const KNOWN_SKINS = new Set(['newspaper', 'brutal', 'quiet']);

  const seenFp = new Map<string, string>();
  for (const preset of COMMENTARY_PRESETS) {
    const fp = fingerprint(preset);
    const twin = seenFp.get(fp);
    if (twin && KNOWN_SKINS.has(preset.id)) {
      console.log(`  skip  ${preset.id.padEnd(12)} '${twin}' 의 스킨 — 기존 부채로 기록됨(새 프리셋은 불가)`);
      continue;
    }
    ok(!twin, `${preset.id.padEnd(12)} ${twin ? `블록 순서가 '${twin}' 와 동일 — 스킨 변형이다` : '블록 순서가 고유하다'}`);
    if (!twin) seenFp.set(fp, preset.id);
  }
  // 부채 목록이 낡는 것도 막는다 — 스킨을 고쳐 고유해졌으면 목록에서 빼야 한다
  for (const id of KNOWN_SKINS) {
    const preset = COMMENTARY_PRESETS.find((x) => x.id === id);
    if (!preset) { ok(false, `KNOWN_SKINS 의 '${id}' 가 카탈로그에 없다 — 목록을 정리하라`); continue; }
    const fp = fingerprint(preset);
    const isDup = COMMENTARY_PRESETS.some((x) => x.id !== id && fingerprint(x) === fp);
    ok(isDup, `KNOWN_SKINS '${id}' 는 여전히 스킨이다 (고유해졌으면 목록에서 뺄 것)`);
  }
  console.log(`       (고유한 문서 골격 ${seenFp.size}종 / 프리셋 ${COMMENTARY_PRESETS.length}종)`);

  console.log(`\n${fail === 0 ? '통과' : `실패 ${fail}건`} — 총 검사 완료\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
