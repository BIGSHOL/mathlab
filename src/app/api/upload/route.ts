import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const BUCKET = 'uploads';
const PREFIX = 'question-images';

export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) return badRequest('파일이 필요합니다');
  if (!ALLOWED_TYPES.includes(file.type)) return badRequest('PNG, JPG, WebP, GIF만 허용됩니다');
  if (file.size > MAX_FILE_SIZE) return badRequest('파일 크기가 4MB를 초과합니다');

  const ext = file.type.split('/')[1] || 'png';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const storagePath = `${PREFIX}/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (error) {
      console.error('[upload] supabase error', error);
      return badRequest(`업로드 실패: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return NextResponse.json({ data: { url: data.publicUrl } }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '업로드 중 오류';
    console.error('[upload] error', msg);
    return badRequest(msg);
  }
}
