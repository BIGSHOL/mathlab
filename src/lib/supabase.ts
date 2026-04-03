/**
 * Supabase 클라이언트 (서버 사이드 전용 — Storage 업로드용)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/** 시험지 파일을 Supabase Storage에 업로드하고 공개 URL 반환 */
export async function uploadExamFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const path = `exam-analysis/${filename}`;

  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage 업로드 실패: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('uploads')
    .getPublicUrl(path);

  return urlData.publicUrl;
}
