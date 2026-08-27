/**
 * baseline 과 현재 코드의 산출물을 대조한다.
 *   npx tsx scripts/parity/check.ts <baseline.json> <current.json>
 * 수학 항목이 하나라도 다르면 exit 1.
 */
import { readFileSync } from 'fs';

type Entry = { len: number; sha: string; text: string };
const [, , basePath, curPath] = process.argv;
if (!basePath || !curPath) { console.error('사용법: check.ts <baseline> <current>'); process.exit(1); }

const base = JSON.parse(readFileSync(basePath, 'utf8')) as Record<string, Entry>;
const cur = JSON.parse(readFileSync(curPath, 'utf8')) as Record<string, Entry>;

const allKeys = [...new Set([...Object.keys(base), ...Object.keys(cur)])].sort();
let mathDiff = 0, enDiff = 0, missing = 0;

for (const k of allKeys) {
  const b = base[k], c = cur[k];
  const isMath = k.startsWith('math.') || k.startsWith('shared.');
  if (!b || !c) {
    missing++;
    console.log(`${!b ? '＋신규' : '－삭제'}  ${k}`);
    continue;
  }
  if (b.sha === c.sha) continue;
  if (isMath) mathDiff++; else enDiff++;
  console.log(`${isMath ? '🔴 수학' : '🟡 영어'} 변경  ${k}  (${b.len} → ${c.len}자)`);
  // 첫 차이 지점 표시
  for (let i = 0; i < Math.max(b.text.length, c.text.length); i++) {
    if (b.text[i] !== c.text[i]) {
      console.log(`        위치 ${i}\n         전: ${JSON.stringify(b.text.slice(Math.max(0, i - 60), i + 60))}\n         후: ${JSON.stringify(c.text.slice(Math.max(0, i - 60), i + 60))}`);
      break;
    }
  }
}

console.log('\n──────────────────────────────');
console.log(`대조 ${allKeys.length}개 | 수학 변경 ${mathDiff} | 영어 변경 ${enDiff} | 신규·삭제 ${missing}`);
if (mathDiff === 0) console.log('✅ 수학 회귀 없음');
else console.log('❌ 수학 회귀 발생 — 위 항목 확인');
process.exit(mathDiff === 0 ? 0 : 1);
