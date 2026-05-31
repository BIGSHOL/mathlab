/**
 * 네이버 섹션 캡처 이미지 전체 초기화 — Supabase 'uploads' 버킷의 naver-sections/** 삭제.
 *
 * 실행: npx tsx scripts/reset-naver-sections.ts
 *
 * 참고: 클라이언트 localStorage 캐시는 NAVER_CAPTURE_VERSION bump(v1→v2)으로 자동 무효화되므로,
 *   이 스크립트로 서버 이미지를 지워도 클라가 죽은 URL을 재사용하지 않는다.
 *   이후엔 일일 Cron(extract-batch-tick)이 3일 지난 이미지를 자동 정리한다.
 */
import { config as dotenvConfig } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenvConfig({ path: join(process.cwd(), '.env.local'), override: true });
dotenvConfig({ path: join(process.cwd(), '.env'), override: false });

const BUCKET = 'uploads';
const ROOT = 'naver-sections';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수 미설정');
  const client = createClient(url, key);

  const { data: folders, error } = await client.storage.from(BUCKET).list(ROOT, { limit: 1000 });
  if (error) throw new Error(`목록 조회 실패: ${error.message}`);
  if (!folders || folders.length === 0) {
    console.log('naver-sections 비어 있음 — 삭제할 파일 없음');
    return;
  }

  const toRemove: string[] = [];
  for (const folder of folders) {
    if (!folder.name) continue;
    const prefix = `${ROOT}/${folder.name}`;
    const { data: files } = await client.storage.from(BUCKET).list(prefix, { limit: 1000 });
    for (const f of files ?? []) {
      if (f.name) toRemove.push(`${prefix}/${f.name}`);
    }
  }

  console.log(`삭제 대상: ${toRemove.length}개 파일 (${folders.length}개 시험지 폴더)`);
  let deleted = 0;
  for (let i = 0; i < toRemove.length; i += 100) {
    const batch = toRemove.slice(i, i + 100);
    const { error: e } = await client.storage.from(BUCKET).remove(batch);
    if (e) console.error('remove 실패:', e.message);
    else deleted += batch.length;
  }
  console.log(`✅ ${deleted}개 파일 삭제 완료`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
