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
    const sameCount = cfg.blocks.length === DEFAULT_TEMPLATE.blocks.length;
    const noDup = new Set(cfg.blocks.map((b) => b.id)).size === cfg.blocks.length;
    ok(sameCount && noDup, `${p.id.padEnd(12)} 블록 ${cfg.blocks.length}개, 중복 없음`);
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

  console.log(`\n${fail === 0 ? '통과' : `실패 ${fail}건`} — 총 검사 완료\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
