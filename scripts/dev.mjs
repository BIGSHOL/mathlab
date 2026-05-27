import { createServer } from 'net';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * .env.local 파일을 명시적으로 로드 + process.env에 inject.
 * Next.js가 자동 로드하긴 하지만, OS-User 환경변수에 동일 키가 빈 값/잘못된 값으로 있으면
 * OS env가 우선되어 .env.local 값이 무시되는 케이스 방지.
 * 우선순위: .env.local > OS env > .env (이 함수는 .env.local로 OS env를 강제 override)
 */
function loadEnvLocal() {
  const cwd = process.cwd();
  for (const filename of ['.env.local', '.env']) {
    const filePath = join(cwd, filename);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf-8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx < 0) continue;
      const key = line.slice(0, eqIdx).trim();
      let value = line.slice(eqIdx + 1).trim();
      // quote 제거
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // 보이지 않는 문자 제거 (NUL/CR 등 — 이전 ANTHROPIC_API_KEY 이슈 패턴)
      value = value.replace(/[\r\n\0]/g, '').trim();
      if (!key || !value) continue;
      // .env.local 값을 강제로 우선 — OS env 무시
      if (filename === '.env.local') {
        process.env[key] = value;
      } else if (!process.env[key]) {
        // .env 는 OS env 없을 때만 fallback
        process.env[key] = value;
      }
    }
  }
}

loadEnvLocal();

function isPortFree(port) {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(port, () => { s.close(() => resolve(true)); });
    s.on('error', () => resolve(false));
  });
}

async function findPort(start, max = start + 10) {
  for (let p = start; p <= max; p++) {
    if (await isPortFree(p)) return p;
  }
  return start; // fallback
}

// PORT 환경변수가 지정되면 우선 사용 (Claude Code preview 등 외부 래퍼 호환)
const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : null;
const port = envPort && Number.isFinite(envPort) ? envPort : await findPort(3000);
if (!envPort && port !== 3000) console.log(`\x1b[33m⚠ 포트 3000 사용 중 → ${port}번으로 시작합니다\x1b[0m\n`);

// Node.js 메모리 한도 4GB로 증설 — Pro Preview + base64 image + Turbopack compile 동시 처리 시 OOM 방지
// 기본 Node.js heap = 1.4GB (32bit) 또는 2GB (64bit). 시험지 분석 모델 비교 같은 무거운 작업엔 부족.
const child = spawn(`npx next dev --turbopack -p ${port}`, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=4096`.trim(),
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
