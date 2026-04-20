/**
 * 교과서 스타일 강제 체크.
 *
 * 다음 상황을 감지하여 빌드를 실패시킵니다:
 *   1. 도형 렌더러(src/lib/diagram/**, src/lib/utils/svg-diagrams/**)에서
 *      하드코딩된 어두운 색상(#000, #333, #444, #555 등) 사용
 *   2. 도형 토큰을 우회하고 직접 색상 리터럴을 stroke/fill 값으로 사용
 *
 * 허용되는 경우:
 *   - 중앙 토큰 정의 파일 자체 (primitives.ts, shared/svg-utils.ts)
 *   - DATASET_COLORS 내에서 다색 데이터 시리즈를 구분하는 경우 (차트용)
 *   - COLORS.* / TEXTBOOK_STYLE.* 상수를 통한 참조
 *
 * 실행:
 *   npx tsx scripts/check-textbook-style.ts
 *
 * 신규 프리셋 PR에서 자동 실패시키려면 CI 파이프라인(또는 npm run build 직전)에 포함.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// 금지된 어두운 색상 리터럴 패턴 (토큰 우회 하드코딩)
const FORBIDDEN_COLORS: RegExp[] = [
  /["'`]#000(?:000)?["'`]/,
  /["'`]#111(?:111)?["'`]/,
  /["'`]#222(?:222)?["'`]/,
  /["'`]#333(?:333)?["'`]/,
  /["'`]#444(?:444)?["'`]/,
  /["'`]#555(?:555)?["'`]/,
  /["'`]#666(?:666)?["'`]/,
];

// 이 파일들은 토큰 정의 소스이므로 리터럴이 허용됨
const ALLOWLIST: string[] = [
  'src/lib/diagram/primitives.ts',
  'src/lib/utils/svg-diagrams/shared/svg-utils.ts',
];

const ROOT_DIRS: string[] = [
  'src/lib/diagram',
  'src/lib/utils/svg-diagrams',
];

function norm(p: string): string {
  return p.replace(/\\/g, '/');
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const files = ROOT_DIRS.flatMap((d) => walk(d)).map(norm);
const violations: Array<{ file: string; line: number; snippet: string }> = [];

for (const file of files) {
  if (ALLOWLIST.some((a) => file.endsWith(a))) continue;

  const text = readFileSync(file, 'utf-8');
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    // 주석 라인은 무시
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    for (const pattern of FORBIDDEN_COLORS) {
      if (pattern.test(line)) {
        violations.push({
          file,
          line: idx + 1,
          snippet: line.trim().slice(0, 140),
        });
        break;
      }
    }
  });
}

if (violations.length > 0) {
  console.error('\n\x1b[31m✗ 교과서 스타일 위반 — 하드코딩된 어두운 색상 사용 금지\x1b[0m\n');
  console.error(`검사 파일: ${files.length}개, 위반: ${violations.length}건\n`);
  for (const v of violations) {
    console.error(`  \x1b[33m${v.file}:${v.line}\x1b[0m  ${v.snippet}`);
  }
  console.error('\n해결 방법:');
  console.error('  - src/lib/diagram/primitives.ts의 STYLE 상수를 사용 (DiagramSpec)');
  console.error('  - src/lib/utils/svg-diagrams/shared/svg-utils.ts의 TEXTBOOK_STYLE 사용 (DiagramParam)');
  console.error('  - 예: stroke="#333"  →  stroke="${TEXTBOOK_STYLE.MAIN_STROKE}"');
  console.error('');
  process.exit(1);
}

console.log(`\x1b[32m✓ 교과서 스타일 준수 — 검사 ${files.length}개 파일, 위반 0건\x1b[0m`);
