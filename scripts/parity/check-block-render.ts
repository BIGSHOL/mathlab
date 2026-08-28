/**
 * 블록 렌더 하네스 — **26블록 × 전 variant × 4 문체 × 열화 픽스처**를 실제로 렌더한다.
 *
 * 왜 필요한가: 이 검사가 생기기 전까지 `scripts/parity/` 전체에 `renderToStaticMarkup`
 * 호출이 **0건**이었다. `check-template-blocks.ts` 는 `resolveBlocks(...).map(b => b.def.id)`
 * 즉 **id 배열만** 비교하고, 픽스처는 20문항 전부 `points:5` · 동일 topic 이라
 * 난이도 판독 실패 · 소수 배점 · 단원 없음 같은 실제 경로를 하나도 지나지 않았다.
 * 그래서 렌더러가 NaN 을 뱉거나 throw 해도 CI 는 초록이었고, exam-analysis 하위에는
 * ErrorBoundary 도 없어 블록 하나의 throw 가 분석본 페이지 전체를 흰 화면으로 만든다.
 *
 * 검사하는 계약 4가지:
 *   ① 어떤 입력에도 렌더러가 throw 하지 않는다
 *   ② `available()` 이 통과시킨 블록은 **반드시 무언가를 렌더한다** (게이트 ↔ 렌더 일치)
 *   ③ 출력에 NaN · undefined · Infinity · [object Object] 가 새지 않는다
 *   ④ 소수 배점 누적의 부동소수 쓰레기(13.799999999999999)가 노출되지 않는다
 *
 * 실행: npx tsx scripts/parity/check-block-render.ts
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { COMMENTARY_COPIES } from '../../src/lib/exam-analysis/commentary-copy';
import { QUESTION_FIXTURES, COMMENTARY_FIXTURES } from './fixtures-degenerate';

declare const require: NodeJS.Require;
require.extensions['.css'] = () => {};

// tsx 는 tsconfig 의 `jsx: preserve` 를 고전 런타임(React.createElement)으로 낮춰 컴파일한다.
// Next 런타임에는 자동 주입이 있지만 여기선 없으므로 전역에 심어 준다.
// (레지스트리를 import 하기 **전에** 실행돼야 한다 — 아래 동적 import 로 순서를 보장.)
(globalThis as Record<string, unknown>).React = require('react');

let fail = 0;
const failures: string[] = [];
function bad(label: string, detail: string) {
  fail += 1;
  failures.push(`${label}\n        → ${detail}`);
}

const META = {
  examTitle: '더미고 1학년 1학기 중간고사',
  schoolName: '더미고등학교',
  grade: '고1',
  analyzedAt: '2026-01-15T09:00:00.000Z',
  totalQuestions: 20,
  totalPoints: 100,
  hasStudentData: false,
};

/** 차트 PNG 주입 여부 — 분석 화면은 별도 렌더라 미주입, 블로그 캡처 경로는 주입 */
const CHART_FIXTURES: Array<Record<string, string> | undefined> = [
  undefined,
  { difficulty: 'iVBORw0KGgo=', abilityRadar: 'iVBORw0KGgo=', topicBar: 'iVBORw0KGgo=', discrimination: 'iVBORw0KGgo=' },
];

/** 출력에 새면 안 되는 것들 — 값이 없을 때 화면에 그대로 찍히는 패턴 */
const LEAKS: Array<[RegExp, string]> = [
  [/\bNaN\b/, 'NaN'],
  [/\bundefined\b/, 'undefined'],
  [/\bInfinity\b/, 'Infinity'],
  [/\[object Object\]/, '[object Object]'],
  // 4.6+4.6+4.6 = 13.799999999999999 — sumPoints/roundPoints 를 안 거친 흔적
  [/\d\.\d{6,}/, '부동소수 쓰레기'],
];

async function main() {
  const { COMMENTARY_BLOCKS } = await import('../../src/app/(teacher)/exam-analysis/v3/blocks/registry');

  console.log(
    `\n블록 ${COMMENTARY_BLOCKS.length}종 · variant ${COMMENTARY_BLOCKS.reduce((s, b) => s + b.variants.length, 0)}개 ` +
      `× 문항 픽스처 ${QUESTION_FIXTURES.length} × 총평 픽스처 ${COMMENTARY_FIXTURES.length} × 문체 ${COMMENTARY_COPIES.length}\n`,
  );

  let rendered = 0;
  let gated = 0;

  for (const [qLabel, questions] of QUESTION_FIXTURES) {
    for (const [cLabel, commentary] of COMMENTARY_FIXTURES) {
      const meta = { ...META, totalQuestions: questions.length };
      // 차트는 주입/미주입 두 경우를 모두 돈다 — 미주입만 돌면 차트 블록의 variant 들이
      // 게이트에서 걸려 **한 번도 렌더되지 않는다**(그게 이 하네스의 사각지대가 된다).
      for (const charts of CHART_FIXTURES) {
      const input = { commentary, questions, meta, charts };

      for (const def of COMMENTARY_BLOCKS) {
        let pass: boolean;
        try {
          pass = def.available(input);
        } catch (e) {
          bad(`${def.id} · available · [${qLabel}] [${cLabel}]`, `게이트가 throw: ${(e as Error).message}`);
          continue;
        }
        if (!pass) { gated += 1; continue; }

        for (const variant of def.variants) {
          // 문체는 블록 소유 문구만 바꾸므로 전 조합을 돌 필요는 없다 —
          // 대신 픽스처마다 문체를 순환시켜 4종 전부가 실제로 렌더를 거치게 한다.
          for (const copy of COMMENTARY_COPIES) {
            const where = `${def.id}/${variant.id} · [${qLabel}] [${cLabel}] [${copy.id}]`;
            let html: string;
            try {
              html = renderToStaticMarkup(
                variant.render({ ...input, sectionNum: '01', copy }) as React.ReactElement,
              );
            } catch (e) {
              bad(where, `렌더 throw: ${(e as Error).message}`);
              continue;
            }
            rendered += 1;

            // ② 게이트를 통과했으면 반드시 무언가를 렌더해야 한다.
            //    빈 렌더는 섹션 번호만 소비하고 화면에서 사라지는 유령 블록이 된다.
            if (html.trim().length === 0) {
              bad(where, 'available() 은 통과했는데 렌더 결과가 비었다 (유령 블록)');
              continue;
            }

            // ③④ 값이 없을 때 그대로 찍히는 패턴.
            //    태그·속성은 제외하고 **사람이 읽는 텍스트만** 본다 —
            //    CSS width:46.700507614213194% 나 SVG cx="258.666…" 는 레이아웃 계산값이라
            //    화면에 안 보이고, 이걸 같이 잡으면 검사가 거짓 경보로 죽는다.
            const text = html.replace(/<[^>]*>/g, ' ');
            for (const [re, name] of LEAKS) {
              const m = text.match(re);
              if (!m) continue;
              const at = text.indexOf(m[0]);
              bad(where, `${name} 노출: …${text.slice(Math.max(0, at - 60), at + 60).replace(/\s+/g, ' ')}…`);
              break;
            }
          }
        }
      }
      }
    }
  }

  console.log(`  렌더 ${rendered}회 · 게이트 차단 ${gated}회`);
  if (failures.length) {
    console.log(`\n실패 ${failures.length}건 ──────────────────────────────`);
    for (const f of failures.slice(0, 400)) console.log(`  ❌ ${f}`);
    if (failures.length > 400) console.log(`  … 외 ${failures.length - 400}건`);
  }
  console.log(`\n${fail === 0 ? '통과' : `실패 ${fail}건`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
