/**
 * DB 백업 — 전체 모델을 JSON 으로 익스포트 후 gzip 압축하여 backups/ 에 저장.
 *
 * 사용법:
 *   node scripts/backup-db.mjs                # 백업 생성 (최근 14개 유지)
 *   node scripts/backup-db.mjs --keep=30      # 최근 30개 유지
 *   node scripts/backup-db.mjs --label=before-reset   # 파일명에 라벨 추가
 *
 * 출력: backups/mathlab_YYYYMMDD_HHmmss[_label].json.gz
 *   - 내부 구조: { meta, data: { ModelName: [...rows] } }
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { gzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import {
  BACKUP_DIR,
  BACKUP_FORMAT_VERSION,
  getModels,
  jsonReplacer,
  timestamp,
  humanSize,
} from './backup-common.mjs';

const args = process.argv.slice(2);
const keepArg = args.find((a) => a.startsWith('--keep='));
const labelArg = args.find((a) => a.startsWith('--label='));
const KEEP = keepArg ? Math.max(1, parseInt(keepArg.split('=')[1], 10) || 14) : 14;
const LABEL = labelArg ? labelArg.split('=')[1].replace(/[^a-zA-Z0-9_-]/g, '') : '';

const prisma = new PrismaClient();

async function main() {
  const startedAt = new Date();
  console.log('📦 DB 백업 시작...\n');

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const models = getModels();
  const data = {};
  const counts = {};
  let totalRows = 0;

  for (const m of models) {
    const rows = await prisma[m.accessor].findMany();
    data[m.name] = rows;
    counts[m.name] = rows.length;
    totalRows += rows.length;
    const bar = rows.length > 0 ? '✅' : '·';
    console.log(`  ${bar} ${m.name.padEnd(26)} ${rows.length}`);
  }

  const meta = {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: startedAt.toISOString(),
    modelCount: models.length,
    totalRows,
    counts,
  };

  const payload = JSON.stringify({ meta, data }, jsonReplacer);
  const gz = gzipSync(Buffer.from(payload, 'utf8'), { level: 9 });

  const stamp = timestamp(startedAt);
  const filename = `mathlab_${stamp}${LABEL ? `_${LABEL}` : ''}.json.gz`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filepath, gz);

  console.log(`\n💾 저장: backups/${filename}`);
  console.log(`   모델 ${models.length}개 · 총 ${totalRows.toLocaleString()}행 · ${humanSize(gz.length)} (압축 후)`);

  // 오래된 백업 정리 (최근 KEEP개 유지)
  const pruned = pruneOldBackups(KEEP);
  if (pruned.length > 0) {
    console.log(`\n🧹 오래된 백업 ${pruned.length}개 삭제 (최근 ${KEEP}개 유지)`);
  }

  console.log('\n🎉 백업 완료');
}

/** backups/ 의 *.json.gz 중 최근 keep개만 남기고 삭제. 삭제된 파일명 배열 반환 */
function pruneOldBackups(keep) {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('mathlab_') && f.endsWith('.json.gz'))
    .map((f) => ({ f, t: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);

  const toDelete = files.slice(keep);
  for (const { f } of toDelete) fs.unlinkSync(path.join(BACKUP_DIR, f));
  return toDelete.map((x) => x.f);
}

main()
  .catch((e) => {
    console.error('\n❌ 백업 실패:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
