/**
 * 안전한 DB reset — `prisma migrate reset` 실행 전 자동으로 전체 백업을 먼저 생성.
 *
 * 사용법:
 *   npm run db:reset                 # 백업 후 대화형 reset (Prisma 확인 프롬프트)
 *   npm run db:reset -- --force      # 백업 후 확인 없이 reset
 *
 * 백업이 실패하면 reset 을 진행하지 않습니다. (이번 세션의 데이터 증발 사고 방지)
 */

import { spawnSync } from 'node:child_process';

const passthrough = process.argv.slice(2); // 예: --force

console.log('🛡️  안전 reset — 먼저 백업을 생성합니다.\n');

// 1) 백업 (라벨: before-reset)
const backup = spawnSync('node', ['scripts/backup-db.mjs', '--label=before-reset'], {
  stdio: 'inherit',
});
if (backup.status !== 0) {
  console.error('\n❌ 백업 실패 → reset 을 중단합니다. (데이터 보호)');
  process.exit(1);
}

// 2) prisma migrate reset (대화형 확인 통과 — 사용자 터미널에서 직접 확인)
console.log('\n⏭️  이제 prisma migrate reset 을 실행합니다...\n');
const reset = spawnSync('npx', ['prisma', 'migrate', 'reset', ...passthrough], {
  stdio: 'inherit',
  shell: true, // Windows npx 호환
});

if (reset.status === 0) {
  console.log('\n✅ reset 완료. 직전 백업: backups/mathlab_*_before-reset.json.gz');
  console.log('   복원이 필요하면: node scripts/restore-db.mjs --latest --yes');
}
process.exit(reset.status ?? 1);
