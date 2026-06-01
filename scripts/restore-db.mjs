/**
 * DB 복구 — backups/ 의 gzip JSON 백업을 DB 에 복원.
 *
 * 사용법:
 *   node scripts/restore-db.mjs                          # 백업 목록만 표시
 *   node scripts/restore-db.mjs --latest --dry-run       # 최신 백업 복원 미리보기
 *   node scripts/restore-db.mjs --latest --yes           # 최신 백업으로 복원 (실행)
 *   node scripts/restore-db.mjs --file=backups/xxx.json.gz --yes
 *
 * 복원 메커니즘 (핵심):
 *   - DIRECT_URL 전용 클라이언트 (pgbouncer 우회 → 세션 GUC 적용 보장)
 *   - 단일 트랜잭션 내 `SET LOCAL session_replication_role = replica`
 *     → FK 체크/트리거 비활성화 → 삭제/삽입 순서 무관, 자기참조(variantOf/parent) 안전
 *   - 트랜잭션 종료 시 LOCAL GUC 자동 복원 (커넥션 풀 오염 없음)
 *   - 복원 후 자동증가 시퀀스 resync
 *
 * ⚠️ 기존 데이터를 모두 삭제하고 백업 시점으로 교체합니다 (전체 교체).
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { gunzipSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import {
  BACKUP_DIR,
  getModels,
  getAutoincrementColumns,
  reviveRows,
  humanSize,
} from './backup-common.mjs';

const args = process.argv.slice(2);
const useLatest = args.includes('--latest');
const dryRun = args.includes('--dry-run');
const confirmed = args.includes('--yes');
const fileArg = args.find((a) => a.startsWith('--file='));

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('mathlab_') && f.endsWith('.json.gz'))
    .map((f) => {
      const st = fs.statSync(path.join(BACKUP_DIR, f));
      return { f, path: path.join(BACKUP_DIR, f), mtime: st.mtimeMs, size: st.size };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function resolveTarget() {
  if (fileArg) {
    const p = path.resolve(fileArg.split('=')[1]);
    if (!fs.existsSync(p)) throw new Error(`백업 파일을 찾을 수 없습니다: ${p}`);
    return p;
  }
  if (useLatest) {
    const list = listBackups();
    if (list.length === 0) throw new Error('backups/ 에 백업 파일이 없습니다');
    return list[0].path;
  }
  return null;
}

async function main() {
  const target = resolveTarget();

  // 대상 미지정 → 목록만 표시하고 종료
  if (!target) {
    const list = listBackups();
    if (list.length === 0) {
      console.log('📭 backups/ 에 백업 파일이 없습니다. 먼저 `npm run db:backup` 실행.');
      return;
    }
    console.log(`📋 백업 목록 (최신순, ${list.length}개):\n`);
    list.forEach((b, i) => {
      const date = new Date(b.mtime).toLocaleString('ko-KR');
      console.log(`  ${i === 0 ? '→' : ' '} ${b.f}  (${humanSize(b.size)}, ${date})`);
    });
    console.log('\n복원하려면: node scripts/restore-db.mjs --latest --dry-run  (미리보기)');
    console.log('            node scripts/restore-db.mjs --latest --yes      (실행)');
    return;
  }

  console.log(`📂 백업 읽는 중: ${path.basename(target)}`);
  const raw = gunzipSync(fs.readFileSync(target)).toString('utf8');
  const { meta, data } = JSON.parse(raw);

  console.log(`   생성: ${meta?.createdAt ?? '?'} · 모델 ${meta?.modelCount ?? '?'}개 · ${meta?.totalRows?.toLocaleString() ?? '?'}행\n`);

  const models = getModels();

  // dry-run: 복원될 행 수만 표시
  if (dryRun || !confirmed) {
    console.log(dryRun ? '🔍 DRY RUN — 복원 미리보기 (DB 변경 없음):\n' : '⚠️  실제 복원하려면 --yes 플래그 필요. 미리보기:\n');
    let total = 0;
    for (const m of models) {
      const n = (data[m.name] ?? []).length;
      total += n;
      if (n > 0) console.log(`  ${m.name.padEnd(26)} ${n}`);
    }
    console.log(`\n  합계: ${total.toLocaleString()}행`);
    if (!dryRun && !confirmed) {
      console.log('\n⚠️  이 작업은 기존 데이터를 전부 삭제하고 백업 시점으로 교체합니다.');
      console.log('   실행: node scripts/restore-db.mjs ' + args.filter((a) => a !== '--dry-run').join(' ') + ' --yes');
    }
    return;
  }

  // ── 실제 복원 ──
  const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!directUrl) throw new Error('DIRECT_URL(또는 DATABASE_URL) 환경변수가 필요합니다');

  const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });

  try {
    console.log('🔄 복원 시작 (전체 교체)...\n');

    await prisma.$transaction(
      async (tx) => {
        // FK 체크/트리거 비활성화 (트랜잭션 스코프 — 종료 시 자동 복원)
        await tx.$executeRawUnsafe('SET LOCAL session_replication_role = replica');

        // 1) 전체 삭제 (FK 비활성화라 순서 무관)
        for (const m of models) {
          await tx[m.accessor].deleteMany({});
        }

        // 2) 전체 삽입 (FK 비활성화라 순서/자기참조 무관)
        for (const m of models) {
          const rows = reviveRows(m, data[m.name] ?? []);
          if (rows.length > 0) {
            await tx[m.accessor].createMany({ data: rows });
            console.log(`  ✅ ${m.name.padEnd(26)} ${rows.length}`);
          }
        }
      },
      { timeout: 120000, maxWait: 15000 },
    );

    // 3) 자동증가 시퀀스 resync (트랜잭션 밖)
    const seqCols = getAutoincrementColumns();
    for (const { table, column } of seqCols) {
      await prisma.$executeRawUnsafe(
        `SELECT setval(
           pg_get_serial_sequence('"${table}"', '${column}'),
           COALESCE((SELECT MAX("${column}") FROM "${table}"), 1),
           (SELECT COUNT(*) > 0 FROM "${table}")
         )`,
      );
    }
    if (seqCols.length > 0) {
      console.log(`\n🔧 시퀀스 resync: ${seqCols.map((s) => `${s.table}.${s.column}`).join(', ')}`);
    }

    console.log('\n🎉 복원 완료');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('\n❌ 복원 실패:', e.message);
  process.exitCode = 1;
});
