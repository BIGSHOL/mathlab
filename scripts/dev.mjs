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

const port = await findPort(3000);
if (port !== 3000) console.log(`\x1b[33m⚠ 포트 3000 사용 중 → ${port}번으로 시작합니다\x1b[0m\n`);

const child = spawn('npx', ['next', 'dev', '--turbopack', '-p', String(port)], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
