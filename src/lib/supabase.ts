/**
 * Supabase 클라이언트 (서버 사이드 전용 — Storage 업로드용)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/** 하위 호환용 alias */
export const supabase = { get storage() { return getSupabase().storage; } };

/** 지점 로고를 Supabase Storage에 업로드하고 공개 URL 반환 */
export async function uploadTenantLogo(
  buffer: Buffer,
  tenantSlug: string,
  contentType: string,
): Promise<string> {
  const client = getSupabase();
  const ext = contentType.split('/')[1] || 'png';
  const path = `tenant-logos/${tenantSlug}.${ext}`;

  const { error } = await client.storage
    .from('uploads')
    .upload(path, buffer, { contentType, upsert: true });

  if (error) throw new Error(`로고 업로드 실패: ${error.message}`);

  const { data } = client.storage.from('uploads').getPublicUrl(path);
  return data.publicUrl;
}

/** 시험지 파일을 Supabase Storage에 업로드하고 공개 URL 반환 */
export async function uploadExamFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const client = getSupabase();
  const path = `exam-analysis/${filename}`;

  const { error } = await client.storage
    .from('uploads')
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage 업로드 실패: ${error.message}`);
  }

  const { data: urlData } = client.storage
    .from('uploads')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * 시험지 파일 직접 업로드용 signed URL 발급.
 * 클라이언트는 반환된 signedUrl로 직접 Supabase에 PUT → Vercel 4.5MB 본문 한계 우회.
 */
export async function createSignedExamUploadUrl(filename: string): Promise<{
  signedUrl: string;
  token: string;
  path: string;
  publicUrl: string;
}> {
  const client = getSupabase();
  const path = `exam-analysis/${filename}`;

  const { data, error } = await client.storage
    .from('uploads')
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`signed URL 발급 실패: ${error?.message ?? '알 수 없는 오류'}`);
  }

  const { data: urlData } = client.storage.from('uploads').getPublicUrl(path);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    publicUrl: urlData.publicUrl,
  };
}
