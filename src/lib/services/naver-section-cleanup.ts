/**
 * 네이버 섹션 캡처 이미지 정리 — Supabase 'uploads' 버킷의 `naver-sections/{시험지ID}/*.png`.
 *
 * 배경: V3 총평을 네이버 블로그에 붙여넣기 위해 캡처한 섹션 PNG는 "붙여넣기~발행" 사이에만 필요하다.
 *   네이버는 발행 시 외부 이미지를 자기 CDN(pstatic.net)으로 재호스팅하므로 그 이후엔 원본 불필요.
 *   → 마지막 업로드(=마지막 캡처) 기준 N일 지난 파일은 정리한다. 다시 복사하면 재캡처되므로 안전.
 *
 * 클라이언트 localStorage 캐시도 동일 TTL(3일, AnalysisDetail.tsx NAVER_CACHE_TTL_MS)이라
 *   서버에서 지운 뒤 클라가 죽은 URL을 재사용하지 않는다.
 */
import { getSupabase } from '@/lib/supabase';

const BUCKET = 'uploads';
const ROOT = 'naver-sections';

/** 캡처 이미지 보관 기간 — 3일 (클라 캐시 TTL과 일치) */
export const NAVER_SECTION_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export interface NaverCleanupResult {
  folders: number;
  scanned: number;
  deleted: number;
}

/**
 * naver-sections/ 하위 캡처 PNG 정리.
 * @param maxAgeMs 이보다 오래된(마지막 업로드 기준) 파일 삭제. 0 이하면 전부 삭제(초기화).
 * @param nowMs 기준 시각(ms). 보통 Date.now().
 */
export async function cleanupNaverSections(maxAgeMs: number, nowMs: number): Promise<NaverCleanupResult> {
  const client = getSupabase();
  const out: NaverCleanupResult = { folders: 0, scanned: 0, deleted: 0 };

  // 시험지별 폴더 목록 (Supabase에서 '폴더'는 id=null 항목으로 반환)
  const { data: folders, error } = await client.storage.from(BUCKET).list(ROOT, { limit: 1000 });
  if (error) throw new Error(`naver-sections 목록 조회 실패: ${error.message}`);

  const toRemove: string[] = [];
  for (const folder of folders ?? []) {
    if (!folder.name) continue;
    out.folders += 1;
    const prefix = `${ROOT}/${folder.name}`;
    const { data: files, error: e2 } = await client.storage.from(BUCKET).list(prefix, { limit: 1000 });
    if (e2 || !files) continue;
    for (const f of files) {
      if (!f.name) continue;
      out.scanned += 1;
      const tsStr = f.updated_at ?? f.created_at ?? null;
      const ageMs = tsStr ? nowMs - new Date(tsStr).getTime() : Infinity;
      if (maxAgeMs <= 0 || ageMs >= maxAgeMs) toRemove.push(`${prefix}/${f.name}`);
    }
  }

  // 100개씩 일괄 삭제
  for (let i = 0; i < toRemove.length; i += 100) {
    const batch = toRemove.slice(i, i + 100);
    const { error: e3 } = await client.storage.from(BUCKET).remove(batch);
    if (e3) console.error('[cleanupNaverSections] remove 실패:', e3.message);
    else out.deleted += batch.length;
  }
  return out;
}
