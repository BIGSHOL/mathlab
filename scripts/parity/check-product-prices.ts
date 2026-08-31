/**
 * 상품 금액 정합 검사 — "화면 가격 ≠ 실제 결제 금액" 재발 방지.
 *
 * 토스페이먼츠 「계약과정 FAQ」 §2 가 두 가지를 요구한다:
 *   ① "가격 명시 없이 문의나 상담 창구만 확인되는 경우" → 입점 불가
 *   ② "상품 금액과 결제 금액이 같아야 해요"
 *
 * ①을 지키려면 결제창 진입 **전에** 금액을 보여줘야 하고, 그러려면 금액이
 * mathlab 쪽에도 있어야 한다. 그 순간 금액이 두 곳(mathlab 표시가 / para-x
 * 카탈로그의 실청구액)에 존재하게 되고, 한쪽만 고치면 ②를 위반한다.
 * 그 드리프트를 이 검사가 막는다.
 *
 * para-x 레포는 이 레포 밖에 있다(별도 배포). 경로는 PARAX_DIR 로 덮어쓸 수 있고,
 * 없으면 **검사를 건너뛰지 않고 실패**한다 — "옆 레포가 없어서 통과"는 이 검사의
 * 존재 이유를 지운다. CI 처럼 para-x 를 둘 수 없는 곳에서는 PARAX_SKIP=1 로
 * 명시적으로 꺼야 한다(끄는 선택이 로그에 남는다).
 *
 * 실행: npx tsx scripts/parity/check-product-prices.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CREDIT_PRODUCTS, SUB_PRODUCTS, formatKrw } from '../../src/lib/constants/parax-products';

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

const OURS = [...CREDIT_PRODUCTS, ...SUB_PRODUCTS];

console.log('── ① 모든 상품이 가격을 갖는가 (FAQ §2 — 가격 미명시 시 입점 불가) ──');
for (const p of OURS) {
  ok(
    Number.isInteger(p.priceKrw) && p.priceKrw > 0,
    `${p.id} = ${formatKrw(p.priceKrw)}`,
    p.priceKrw > 0 ? '' : '가격이 없거나 0원 — 0원 상품은 심사 불가',
  );
}

console.log('\n── ② para-x 카탈로그의 실제 청구액과 일치하는가 (FAQ §2) ──');
if (process.env.PARAX_SKIP === '1') {
  console.log('  ⏭️  PARAX_SKIP=1 — 대조를 건너뛴다 (명시적으로 끈 것)');
} else {
  const paraxDir = process.env.PARAX_DIR || 'D:/para-x';
  const catalogPath = join(paraxDir, 'lib', 'products.js');
  if (!existsSync(catalogPath)) {
    ok(false, 'para-x 카탈로그를 찾을 수 없다', `${catalogPath} — PARAX_DIR 로 경로를 주거나 PARAX_SKIP=1`);
  } else {
    const src = readFileSync(catalogPath, 'utf8');
    // 카탈로그는 id 를 **키로 쓰는 객체**다:
    //   'credit-exam-3': { site: …, amount: 30000 },
    // 그래서 `'키': {` 다음의 첫 `amount:` 를 짝지어 읽는다. 주석에도 숫자가 있으므로
    // (`// 회당 10,000원`) 반드시 `amount:` 에 붙은 값만 잡아야 한다.
    // 정규식으로 읽는 이유: para-x 는 별도 패키지라 여기서 import 할 수 없다(ESM/경로/의존성).
    const catalog = new Map<string, number>();
    for (const m of src.matchAll(/['"]([a-z0-9-]+)['"]\s*:\s*\{[\s\S]{0,500}?\bamount:\s*(\d+)/g)) {
      if (!catalog.has(m[1])) catalog.set(m[1], Number(m[2]));
    }
    ok(catalog.size > 0, `카탈로그에서 ${catalog.size}개 상품 파싱`, catalogPath);

    for (const p of OURS) {
      const theirs = catalog.get(p.id);
      if (theirs === undefined) {
        ok(false, `${p.id}`, 'para-x 카탈로그에 없는 상품 id — 결제가 400 으로 거절된다');
        continue;
      }
      ok(
        theirs === p.priceKrw,
        `${p.id}  표시 ${formatKrw(p.priceKrw)} = 청구 ${formatKrw(theirs)}`,
        theirs === p.priceKrw ? '' : `불일치 — 표시 ${p.priceKrw} vs 청구 ${theirs}`,
      );
    }

    console.log('\n── ③ 카탈로그에만 있고 화면에 없는 상품 (판매 경로 없음) ──');
    const oursIds = new Set(OURS.map((p) => p.id));
    const orphans = [...catalog.keys()].filter((id) => !oursIds.has(id));
    console.log(
      orphans.length
        ? `  ℹ️  ${orphans.join(', ')} — mathlab 결제 화면에 노출되지 않는다(다른 사이트 상품이면 정상)`
        : '  ℹ️  없음',
    );
  }
}

console.log(fail === 0 ? '\n✅ 통과' : `\n❌ 실패 ${fail}건`);
process.exit(fail === 0 ? 0 : 1);
