import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { createSignedExamUploadUrl } from '@/lib/supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILES_PER_REQUEST = 10;

interface RequestedFile {
  name: string;
  type: string;
}

/**
 * POST /api/exam-analysis/signed-upload-urls
 * 시험지 파일 직접 업로드용 Supabase signed URL을 발급한다.
 * 클라이언트는 반환된 signedUrl로 직접 PUT 업로드 → Vercel 본문 4.5MB 한계 우회.
 *
 * Request:  { files: [{ name, type }] }
 * Response: { data: [{ signedUrl, publicUrl, path, contentType }] }
 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  let body: { files?: RequestedFile[] };
  try {
    body = await request.json();
  } catch {
    return badRequest('요청 형식이 올바르지 않습니다');
  }

  const files = body.files;
  if (!Array.isArray(files) || files.length === 0) {
    return badRequest('업로드할 파일 정보가 필요합니다');
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return badRequest(`한 번에 최대 ${MAX_FILES_PER_REQUEST}개 파일만 처리합니다`);
  }

  for (const f of files) {
    if (!f?.name || typeof f.name !== 'string') {
      return badRequest('파일명이 누락되었습니다');
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      return badRequest(`허용되지 않는 파일 형식: ${f.type}. JPG/PNG/WebP/PDF만 지원합니다`);
    }
  }

  try {
    const results = await Promise.all(
      files.map(async (f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() || 'bin';
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const issued = await createSignedExamUploadUrl(safeName);
        return {
          signedUrl: issued.signedUrl,
          publicUrl: issued.publicUrl,
          path: issued.path,
          contentType: f.type,
        };
      }),
    );

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('[signed-upload-urls POST] 오류:', error);
    return NextResponse.json(
      { error: { code: 'SIGNED_URL_FAILED', message: '업로드 URL 발급에 실패했습니다. 잠시 후 다시 시도해 주세요' } },
      { status: 500 },
    );
  }
}
