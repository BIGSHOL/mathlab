/**
 * 카드형 블록의 텍스트 잘림 회귀 검사.
 *
 * 글자 수로 그냥 자르면 단어 중간이 끊겨("…이 단원에 몰렸습니") 데이터가 아니라
 * 고장으로 읽힌다. 스카우트·벤토·4컷이 같은 헬퍼를 쓰므로 여기서 한 번에 고정한다.
 *
 * 실행: npx tsx scripts/parity/check-clip-line.ts
 */
declare const require: NodeJS.Require;
require.extensions['.css'] = () => {};

let fail = 0;
function ok(cond: boolean, label: string) {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${label}`);
  if (!cond) fail++;
}

async function main() {
  const mod = (await import('../../src/app/(teacher)/exam-analysis/v3/blocks/registry')) as unknown as {
    __clipLineForTest?: (s: string, n: number) => string;
  };
  const clip = mod.__clipLineForTest;
  if (!clip) {
    console.error('registry 가 __clipLineForTest 를 내보내지 않습니다');
    process.exit(1);
  }

  console.log('\n[1] 자르지 않아도 되는 길이 ─────────────────────');
  ok(clip('짧은 문장입니다.', 90) === '짧은 문장입니다.', '제한 이내면 원문 그대로');

  console.log('\n[2] 단어 중간 절단 금지 ────────────────────────');
  const real = '복소수의 연산에 심화 2문항이 몰렸습니다. 켤레복소수 성질을 공식 수준으로 암기하고 반복 훈련하세요.';
  const cut = clip(real, 48);
  ok(cut.length <= 48, `제한 준수 (${cut.length}자)`);
  ok(cut === '복소수의 연산에 심화 2문항이 몰렸습니다.', `문장 부호에서 끝나면 말줄임표 없이 완결 → "${cut}"`);
  ok(!cut.endsWith('…'), '완결된 문장에는 말줄임표를 붙이지 않는다');

  console.log('\n[3] 문장 부호가 없으면 어절 경계 ────────────────');
  const noPunct = '나머지정리 단원이 7번 8번 서답형7 등 3문항 16점으로 출제되었는데 접근 방식이 유사합니다';
  const c2 = clip(noPunct, 40);
  ok(c2.length <= 40, `제한 준수 (${c2.length}자)`);
  ok(c2.endsWith('…'), '말줄임표로 끝난다');
  ok(!c2.slice(0, -1).endsWith(' '), '말줄임표 앞에 공백이 남지 않는다');
  const lastWord = c2.slice(0, -1).split(' ').pop() ?? '';
  ok(noPunct.split(' ').includes(lastWord), `마지막 어절이 원문에 온전히 존재한다 ("${lastWord}")`);

  console.log('\n[4] 경계가 너무 앞이면 글자 단위 폴백 ────────────');
  const longWord = '가'.repeat(200);
  const c3 = clip(longWord, 30);
  ok(c3.length === 30, `공백 없는 긴 문자열도 제한을 지킨다 (${c3.length}자)`);

  console.log(`\n${fail === 0 ? '통과' : `실패 ${fail}건`} — 총 검사 완료\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
