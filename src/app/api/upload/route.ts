import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher, isResponse, badRequest } from '@/lib/api';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'questions');
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return badRequest('파일이 필요합니다');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return badRequest('PNG, JPG, WebP, GIF만 허용됩니다');
  }

  if (file.size > MAX_FILE_SIZE) {
    return badRequest('파일 크기가 4MB를 초과합니다');
  }

  const ext = file.name.split('.').pop() || 'png';
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json(
    { data: { url: `/uploads/questions/${filename}` } },
    { status: 201 },
  );
}
