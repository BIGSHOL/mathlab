import { createServer } from 'net';
import { spawn } from 'child_process';

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
