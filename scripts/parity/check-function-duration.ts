/**
 * Vercel 함수 실행 한도 회귀 검사 — "프로덕션에서만 분석이 잘리는" 사고 방지.
 *
 * 배경: 이 제품의 분석/총평 라우트는 AI 호출이 끝날 때까지 **요청 안에서 기다린다**.
 * 짧은 API 가 아니라 수십~수백 초짜리다. Vercel 은 함수를 `maxDuration` 에서 자르는데,
 * 선언이 없으면 플랫폼 기본값에 맡겨진다. 로컬 dev 에는 이 상한이 아예 없어서
 * **프로덕션에서만** 재현되고, 증상은 "분석이 ANALYZING 에서 멈춤"이라 원인이 안 보인다.
 *
 * 세 가지를 고정한다:
 *  ① AI 를 타는 라우트는 반드시 maxDuration 을 선언한다 (선언 누락 = 기본값 의존).
 *  ② 그 값은 300 이하다. 300 은 Hobby 플랜의 상한이며, 넘기면 **빌드가 거부**된다.
 *     (Pro 는 800 까지 가능하지만, 낮은 쪽에 맞춰 두면 두 플랜 모두에서 안전하다.)
 *  ③ vercel.json 이 fluid 를 켜 두고, supportsCancellation 은 켜지 않는다.
 *
 * ③ 이 왜 중요한가:
 *  - `fluid: true` 가 Hobby 의 상한을 60초 → 300초로 만든다. 이게 꺼지면 180초 예산의
 *    분석이 60초에 잘린다.
 *  - Vercel 은 기본적으로 클라이언트 연결이 끊겨도 함수를 끝까지 돌린다(취소는 opt-in).
 *    그래서 사용자가 분석 도중 페이지를 떠나도 결과가 DB 에 저장된다.
 *    `supportsCancellation` 을 켜는 순간 그 동작이 깨진다 — 켠 사람은 "정리(cleanup)를
 *    제대로 하려고" 켰을 뿐이라 인과를 연결하기 어렵다.
 *
 * "무거운 라우트" 목록은 손으로 적지 않는다 — 손목록은 반드시 산출물과 어긋난다
 * (CLAUDE.md §12-13). AI SDK 를 직접 쓰는 모듈을 먼저 찾고, 각 라우트에서 import 를
 * 전이적으로 따라가 거기 닿는지로 판정한다. 새 AI 라우트는 자동으로 감시 대상이 된다.
 *
 * 실행: npx tsx scripts/parity/check-function-duration.ts
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const SRC = join(ROOT, 'src');
/** Windows 경로 구분자를 '/' 로 정규화한 저장소 상대 경로 */
const WIN_SEP = String.fromCharCode(92);
const rel = (f: string) => f.slice(ROOT.length + 1).split(WIN_SEP).join('/');
/** Hobby 플랜 상한. 넘기면 빌드가 거부된다. */
const PLAN_CEILING = 300;
/** AI SDK — 이걸 직접 import 하는 모듈이 '무거움'의 뿌리다. */
const AI_SDKS = ['@google/genai', '@anthropic-ai/sdk'];

let fail = 0;
function ok(cond: boolean, label: string, detail = '') {
  if (!cond) fail += 1;
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail ? '  → ' + detail : ''}`);
}

/** src/ 아래 모든 .ts/.tsx 수집 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/**
 * import 경로 추출 (정적 import + 동적 import()).
 *
 * `import type` / `export type` 는 **따라가지 않는다** — 컴파일 시 지워지므로 런타임에
 * 그 모듈을 부르지 않는다. 이걸 따라가면 타입 하나 빌려 쓴 CRUD 라우트가 AI 라우트로
 * 잡힌다. 실제로 template 라우트가 `blocks/types.ts` → `commentary-agent`(타입 전용)
 * 경로로 오탐됐다.
 */
function importsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8')
    // `import type ... from '...'` / `export type ... from '...'` 문 통째로 제거
    .replace(/\b(?:import|export)\s+type\s[^;]*?from\s*['"][^'"]+['"]/g, '');
  const specs: string[] = [];
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  return specs;
}

/** '@/x' 또는 './x' → 실제 파일 경로. 외부 패키지면 null. */
function resolveSpec(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null;
  for (const cand of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

const allFiles = walk(SRC);

console.log('── ① AI SDK 를 직접 쓰는 모듈(무거움의 뿌리) ──');
const aiLeaves = new Set(
  allFiles.filter((f) => importsOf(f).some((s) => AI_SDKS.includes(s))),
);
ok(aiLeaves.size > 0, `${aiLeaves.size}개 발견`);
for (const f of [...aiLeaves].sort()) console.log(`     · ${rel(f)}`);

/** file 에서 import 를 전이적으로 따라가 aiLeaves 에 닿으면 true */
const memo = new Map<string, boolean>();
function reachesAI(file: string, seen = new Set<string>()): boolean {
  if (memo.has(file)) return memo.get(file)!;
  if (seen.has(file)) return false;
  seen.add(file);
  if (aiLeaves.has(file)) return true;
  for (const spec of importsOf(file)) {
    const next = resolveSpec(spec, file);
    if (next && reachesAI(next, seen)) {
      memo.set(file, true);
      return true;
    }
  }
  // seen 을 공유하므로 부분 결과는 캐시하지 않는다 (거짓 false 고착 방지)
  return false;
}

console.log('\n── ② AI 를 타는 라우트가 maxDuration 을 선언하는가 ──');
// 경로 구분자에 의존하지 않도록 정규화된 상대경로로 판별한다 (Windows 는 구분자가 다르다)
const routes = allFiles.filter((f) => {
  const r = rel(f);
  return r.startsWith('src/app/api/') && (r.endsWith('/route.ts') || r.endsWith('/route.tsx'));
});
const heavy = routes.filter((f) => reachesAI(f, new Set()));
ok(heavy.length > 0, `AI 라우트 ${heavy.length}개 탐지 (전체 ${routes.length}개 중)`);

for (const f of heavy.sort()) {
  const r = rel(f);
  const m = readFileSync(f, 'utf8').match(/^export const maxDuration\s*=\s*(\d+)/m);
  if (!m) {
    ok(false, `${r}`, 'maxDuration 선언 없음 — 플랫폼 기본값에 맡겨져 있다');
    continue;
  }
  const v = Number(m[1]);
  ok(v <= PLAN_CEILING, `${r} = ${v}s`, v > PLAN_CEILING ? `${PLAN_CEILING}s 초과 — Hobby 에서 빌드 거부` : '');
}

console.log('\n── ③ vercel.json 불변식 ──');
const vercelJson = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
ok(vercelJson.fluid === true, 'fluid: true — Hobby 상한을 60s→300s 로 올린다', JSON.stringify(vercelJson.fluid));
const raw = readFileSync(join(ROOT, 'vercel.json'), 'utf8');
ok(
  !raw.includes('supportsCancellation'),
  'supportsCancellation 미설정 — 페이지를 떠나도 분석이 끝까지 돈다',
);

console.log(fail === 0 ? '\n✅ 통과' : `\n❌ 실패 ${fail}건`);
process.exit(fail === 0 ? 0 : 1);
