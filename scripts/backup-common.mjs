/**
 * DB 백업/복구 공통 유틸 (backup-db.mjs, restore-db.mjs, safe-reset.mjs 공유)
 *
 * 설계 핵심:
 * - 모델 목록은 Prisma.dmmf 에서 동적 수집 → 스키마에 모델 추가해도 자동 반영 (드리프트 방지)
 * - 직렬화: Date → ISO 문자열(자동), BigInt → { __bigint } 래퍼
 * - 복원: 필드 타입 기반으로 Date/BigInt 복원
 */

import { Prisma } from '@prisma/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 백업 파일 보관 폴더 (프로젝트 루트/backups) */
export const BACKUP_DIR = path.resolve(__dirname, '..', 'backups');

/** 백업 포맷 버전 — 포맷 변경 시 bump */
export const BACKUP_FORMAT_VERSION = 1;

/**
 * 전체 모델 메타 목록.
 * @returns {{ name: string, accessor: string, fields: any[] }[]}
 *   name=PascalCase(테이블), accessor=camelCase(prisma 접근자)
 */
export function getModels() {
  return Prisma.dmmf.datamodel.models.map((m) => ({
    name: m.name,
    accessor: m.name.charAt(0).toLowerCase() + m.name.slice(1),
    fields: m.fields,
  }));
}

/**
 * 자동증가(@default(autoincrement())) 컬럼 목록 — 복원 후 시퀀스 resync 대상.
 * @returns {{ table: string, column: string }[]}
 */
export function getAutoincrementColumns() {
  const out = [];
  for (const m of Prisma.dmmf.datamodel.models) {
    for (const f of m.fields) {
      if (
        f.kind === 'scalar' &&
        f.default &&
        typeof f.default === 'object' &&
        f.default.name === 'autoincrement'
      ) {
        out.push({ table: m.name, column: f.dbName || f.name });
      }
    }
  }
  return out;
}

/** JSON.stringify replacer — BigInt 안전 처리 (Date는 toISOString 자동 적용) */
export function jsonReplacer(_key, value) {
  if (typeof value === 'bigint') return { __bigint: value.toString() };
  return value;
}

/**
 * 복원 시 행 데이터의 Date/BigInt 필드를 원래 타입으로 복원.
 * createMany 는 ISO 문자열도 받지만, 타입 명시 복원이 가장 안전.
 */
export function reviveRows(model, rows) {
  const dateFields = model.fields.filter((f) => f.type === 'DateTime').map((f) => f.name);
  const bigintFields = model.fields.filter((f) => f.type === 'BigInt').map((f) => f.name);
  if (dateFields.length === 0 && bigintFields.length === 0) return rows;

  return rows.map((row) => {
    const r = { ...row };
    for (const f of dateFields) {
      if (r[f] != null) r[f] = new Date(r[f]);
    }
    for (const f of bigintFields) {
      if (r[f] != null) {
        r[f] = typeof r[f] === 'object' && r[f].__bigint != null ? BigInt(r[f].__bigint) : BigInt(r[f]);
      }
    }
    return r;
  });
}

/** YYYYMMDD_HHmmss 타임스탬프 (로컬 시간) */
export function timestamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** 바이트 → 사람이 읽는 단위 */
export function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
