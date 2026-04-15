/**
 * 개념 중복 차단 규칙 (Concept Dedupe Harness)
 *
 * Layer A (확정 중복, 강제 불가):
 *   - (grade, chapter, section, normalizedTitle) 완전 일치
 * Layer B (유력 중복, force=true 필요):
 *   - (grade, chapter, normalizedTitle) 일치 + section 다름
 * Layer C (통과):
 *   - 그 외 (다른 grade/chapter, chapter=null 혼재 등)
 *
 * 설계 원칙:
 *  - 본문 유사도(fullContent)는 판단 근거에서 제외. 커리큘럼 좌표+제목만 사용.
 *  - RPM 유형 개념(chapter=null)과 교과서 개념(chapter=단원명)은 자동 공존 허용.
 */
import { prisma } from './db';

export type DedupeCandidate = {
  title: string;
  grade?: string | null;
  chapter?: string | null;
  section?: string | null;
};

export type DedupeConflict =
  | { layer: 'A'; reason: 'exact'; existing: { id: string; title: string; grade: string | null; chapter: string | null; section: string | null } }
  | { layer: 'B'; reason: 'same-chapter-title'; existing: { id: string; title: string; grade: string | null; chapter: string | null; section: string | null } };

export function normalizeTitle(t: string): string {
  return t
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/[.,·ㆍ/()\[\]{}'"!?:;~\-_]/g, '')
    .toLowerCase();
}

function sameKey(a: string | null | undefined, b: string | null | undefined): boolean {
  // null/undefined/empty 모두 '빈값'으로 취급. 빈값끼리 일치 = true (같은 null 좌표)
  const na = !a ? '' : a;
  const nb = !b ? '' : b;
  return na === nb;
}

/**
 * 여러 후보에 대해 DB에서 중복 검사.
 * 반환: 각 index별 충돌 정보 (없으면 null)
 */
export async function detectDuplicates(
  candidates: DedupeCandidate[]
): Promise<Array<DedupeConflict | null>> {
  // 관련 grade들만 로드 (효율)
  const grades = [...new Set(candidates.map((c) => c.grade || '').filter(Boolean))];
  const existing = await prisma.concept.findMany({
    where: grades.length > 0 ? { grade: { in: grades } } : {},
    select: { id: true, title: true, grade: true, chapter: true, section: true },
  });

  // 인덱스: grade -> chapter -> normalizedTitle -> rows
  const index = new Map<string, Array<typeof existing[number] & { ntitle: string }>>();
  for (const e of existing) {
    const key = `${e.grade || ''}||${e.chapter || ''}`;
    const arr = index.get(key) || [];
    arr.push({ ...e, ntitle: normalizeTitle(e.title) });
    index.set(key, arr);
  }

  return candidates.map((c) => {
    const ntitle = normalizeTitle(c.title);
    const key = `${c.grade || ''}||${c.chapter || ''}`;
    const rows = index.get(key) || [];

    // Layer A: 완전 일치
    const exact = rows.find(
      (r) => r.ntitle === ntitle && sameKey(r.section, c.section)
    );
    if (exact) {
      return {
        layer: 'A',
        reason: 'exact',
        existing: { id: exact.id, title: exact.title, grade: exact.grade, chapter: exact.chapter, section: exact.section },
      };
    }

    // Layer B: 같은 grade+chapter+title, section만 다름
    //         grade/chapter가 모두 유효(비어있지 않음)한 경우만 적용 — null 혼재는 통과
    if (c.grade && c.chapter) {
      const loose = rows.find((r) => r.ntitle === ntitle && r.chapter && r.grade);
      if (loose) {
        return {
          layer: 'B',
          reason: 'same-chapter-title',
          existing: { id: loose.id, title: loose.title, grade: loose.grade, chapter: loose.chapter, section: loose.section },
        };
      }
    }

    return null;
  });
}

/**
 * 배치 내부 중복 검사 (동일 요청 안에 같은 항목이 중복 포함된 경우)
 * 반환: 충돌이 있으면 배열의 두 번째 등장부터 index+reason 반환
 */
export function detectBatchInternalDuplicates(candidates: DedupeCandidate[]): Array<{ row: number; title: string; layer: 'A' | 'B' }> {
  const seen = new Map<string, number>(); // key -> first row
  const seenLoose = new Map<string, number>(); // grade+chapter+ntitle -> first row
  const conflicts: Array<{ row: number; title: string; layer: 'A' | 'B' }> = [];

  candidates.forEach((c, i) => {
    const ntitle = normalizeTitle(c.title);
    const keyA = `${c.grade || ''}||${c.chapter || ''}||${c.section || ''}||${ntitle}`;
    if (seen.has(keyA)) {
      conflicts.push({ row: i, title: c.title, layer: 'A' });
      return;
    }
    seen.set(keyA, i);

    if (c.grade && c.chapter) {
      const keyB = `${c.grade}||${c.chapter}||${ntitle}`;
      if (seenLoose.has(keyB)) {
        conflicts.push({ row: i, title: c.title, layer: 'B' });
        return;
      }
      seenLoose.set(keyB, i);
    }
  });

  return conflicts;
}
