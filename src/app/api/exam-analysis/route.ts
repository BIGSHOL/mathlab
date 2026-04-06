import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, badRequest } from '@/lib/api';
import { examPaperCreateSchema, examPaperQuerySchema } from '@/lib/exam-analysis/schemas';
import { matchSchoolByName } from '@/lib/utils/school-matcher';
import { uploadExamFile } from '@/lib/supabase';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
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

  try {
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

    // 2분 이상 ANALYZING 상태에 갇힌 시험지 자동 FAILED 복구
    const stuckThreshold = new Date(Date.now() - 2 * 60 * 1000);
    await prisma.examPaper.updateMany({
      where: { ...tenantWhere, status: 'ANALYZING', updatedAt: { lt: stuckThreshold } },
      data: { status: 'FAILED', errorMessage: 'ANALYZING 상태 타임아웃 (자동 복구)' },
    });

    const [items, total] = await Promise.all([
      prisma.examPaper.findMany({
        where,
        include: {
          teacher: { select: { id: true, name: true } },
          student: { select: { id: true, name: true } },
          school: { select: { id: true, name: true, district: true } },
          analyses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true, totalQuestions: true, totalPoints: true, earnedPoints: true, analyzedAt: true, modelVersion: true,
              extensions: { select: { agentType: true } },
            },
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
  } catch (error) {
    console.error('[exam-analysis GET] 목록 조회 에러:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '시험지 목록을 불러오는 중 오류가 발생했습니다' } },
      { status: 500 },
    );
  }
}

/** POST /api/exam-analysis — 시험지 업로드 + 생성 */
export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest('요청 데이터를 읽을 수 없습니다. 파일을 다시 업로드해 주세요.');
  }

  const files = formData.getAll('files') as File[];
  const metadataRaw = formData.get('metadata') as string | null;

  if (!files.length) return badRequest('파일을 업로드하세요');

  // 파일 검증
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequest(`허용되지 않는 파일 형식입니다: ${file.type}. JPG, PNG, WebP, PDF만 지원합니다.`);
    }
    if (file.size > MAX_FILE_SIZE) {
      return badRequest('파일 크기가 10MB를 초과합니다. 파일을 압축하거나 나눠서 업로드하세요.');
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

  try {
    // Supabase Storage에 파일 업로드
    const savedUrls: string[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const publicUrl = await uploadExamFile(buffer, filename, file.type);
      savedUrls.push(publicUrl);
    }

    const fileType = files[0].type === 'application/pdf' ? 'pdf' : 'image';

    // 학교 매칭: 프론트에서 선택한 schoolId 우선, 없으면 이름으로 자동 매칭
    const schoolName = parsed.data.schoolName || null;
    let schoolId: string | null = parsed.data.schoolId || null;
    if (!schoolId && schoolName) {
      try {
        schoolId = await matchSchoolByName(schoolName, parsed.data.grade);
      } catch {
        // 매칭 실패해도 시험지 생성은 계속 진행
      }
    }

    // DB 생성
    const examPaper = await prisma.examPaper.create({
      data: {
        tenantId: user.viewingTenantId ?? user.tenantId ?? '',
        teacherId: user.id,
        studentId: parsed.data.studentId || null,
        title: parsed.data.title,
        subject: parsed.data.subject as 'MATH' | 'ENGLISH',
        grade: parsed.data.grade,
        category: parsed.data.category || null,
        unit: parsed.data.unit || null,
        examScope: parsed.data.examScope || undefined,
        schoolName,
        schoolId,
        examType: parsed.data.examType,
        fileUrls: savedUrls.join(','),
        fileType,
      },
    });

    return NextResponse.json({ data: examPaper }, { status: 201 });
  } catch (error) {
    console.error('[exam-analysis POST] 시험지 업로드 에러:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('ENOSPC') || msg.includes('no space')) {
      return NextResponse.json(
        { error: { code: 'STORAGE_FULL', message: '서버 저장 공간이 부족합니다. 관리자에게 문의하세요.' } },
        { status: 500 },
      );
    }
    if (msg.includes('EACCES') || msg.includes('permission')) {
      return NextResponse.json(
        { error: { code: 'PERMISSION_ERROR', message: '파일 저장 권한이 없습니다. 관리자에게 문의하세요.' } },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: { code: 'UPLOAD_FAILED', message: '시험지 업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' } },
      { status: 500 },
    );
  }
}
