import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, badRequest } from '@/lib/api';
import { examPaperCreateSchema, examPaperQuerySchema } from '@/lib/exam-analysis/schemas';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'exam-analysis');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** GET /api/exam-analysis — 시험지 목록 조회 */
export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const params = examPaperQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!params.success) return badRequest('잘못된 쿼리 파라미터입니다');

  const { page, limit, subject, grade, status, studentId, search } = params.data;
  const tenantWhere = getTenantFilter(user);

  const where: Record<string, unknown> = {
    ...tenantWhere,
    ...(subject && { subject }),
    ...(grade && { grade }),
    ...(status && { status }),
    ...(studentId && { studentId }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { schoolName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.examPaper.findMany({
      where,
      include: {
        teacher: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
        analyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, totalQuestions: true, totalPoints: true, earnedPoints: true, analyzedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.examPaper.count({ where }),
  ]);

  return NextResponse.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/** POST /api/exam-analysis — 시험지 업로드 + 생성 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const metadataRaw = formData.get('metadata') as string | null;

  if (!files.length) return badRequest('파일을 업로드하세요');

  // 파일 검증
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequest(`허용되지 않는 파일 형식입니다: ${file.type}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      return badRequest('파일 크기가 10MB를 초과합니다');
    }
  }

  // 메타데이터 파싱
  let metadata: Record<string, unknown> = {};
  if (metadataRaw) {
    try {
      metadata = JSON.parse(metadataRaw);
    } catch {
      return badRequest('메타데이터 형식이 올바르지 않습니다');
    }
  }

  const parsed = examPaperCreateSchema.safeParse(metadata);
  if (!parsed.success) {
    return badRequest('시험지 정보가 올바르지 않습니다', parsed.error.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  // 파일 저장
  await mkdir(UPLOAD_DIR, { recursive: true });
  const savedUrls: string[] = [];

  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    savedUrls.push(`/uploads/exam-analysis/${filename}`);
  }

  const fileType = files[0].type === 'application/pdf' ? 'pdf' : 'image';

  // DB 생성
  const examPaper = await prisma.examPaper.create({
    data: {
      tenantId: user.tenantId || '',
      teacherId: user.id,
      studentId: parsed.data.studentId || null,
      title: parsed.data.title,
      subject: parsed.data.subject as 'MATH' | 'ENGLISH',
      grade: parsed.data.grade,
      category: parsed.data.category || null,
      unit: parsed.data.unit || null,
      examScope: parsed.data.examScope || undefined,
      schoolName: parsed.data.schoolName || null,
      examType: parsed.data.examType,
      fileUrls: savedUrls.join(','),
      fileType,
    },
  });

  return NextResponse.json({ data: examPaper }, { status: 201 });
}
