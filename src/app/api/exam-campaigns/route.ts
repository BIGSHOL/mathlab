/**
 * 내신대비 캠페인 CRUD API (목록/생성)
 *
 * GET  /api/exam-campaigns       — 캠페인 목록 (테넌트 스코프)
 * POST /api/exam-campaigns       — 캠페인 생성 + 즉시 큐레이션 (PREPARING → ACTIVE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  badRequest,
  serverError,
  getTenantFilter,
  clamp,
} from '@/lib/api';
import { runCurationAndActivate } from '@/lib/services/exam-campaign-curator';
import type { ExamCampaignType } from '@prisma/client';

const scopeChapterSchema = z.object({
  chapter: z.string().min(1).max(100),
  sections: z.array(z.string()).optional(),
});

const createCampaignSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  schoolId: z.string().nullable().optional(),
  schoolName: z.string().nullable().optional(),
  classroomId: z.string().nullable().optional(),
  grade: z.string().min(1, '학년을 선택하세요').max(30),
  semester: z.number().int().min(0).max(2),
  examType: z.enum(['MIDTERM', 'FINAL', 'PERFORMANCE']),
  examDate: z.string().min(1, '시험일을 입력하세요'),
  scopeChapters: z.array(scopeChapterSchema).min(1, '시험 범위를 1개 이상 선택하세요'),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PREPARING', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  classroomId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return badRequest('잘못된 쿼리 파라미터입니다');

  const { page, limit, status, classroomId } = parsed.data;
  const tenantWhere = getTenantFilter(user);

  try {
    const where = {
      ...tenantWhere,
      ...(status && { status }),
      ...(classroomId && { classroomId }),
    };

    const [items, total] = await Promise.all([
      prisma.examCampaign.findMany({
        where,
        include: {
          classroom: { select: { id: true, name: true } },
          school: { select: { id: true, name: true, district: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: [{ examDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * clamp(limit, 1, 100),
        take: clamp(limit, 1, 100),
      }),
      prisma.examCampaign.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[exam-campaigns GET]', err);
    return serverError('캠페인 목록을 불러오지 못했습니다');
  }
}

export async function POST(request: NextRequest) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('요청 본문을 읽을 수 없습니다');
  }

  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('입력값을 확인하세요', parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    })));
  }

  const tenantId = user.viewingTenantId ?? user.tenantId;
  if (!tenantId) return badRequest('소속 지점이 없습니다');

  const examDate = new Date(parsed.data.examDate);
  if (Number.isNaN(examDate.getTime())) return badRequest('시험일 형식이 올바르지 않습니다');

  // 클래스룸 권한 확인
  if (parsed.data.classroomId) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: parsed.data.classroomId, tenantId },
      select: { id: true },
    });
    if (!classroom) return badRequest('해당 반을 찾을 수 없습니다');
  }

  try {
    const campaign = await prisma.examCampaign.create({
      data: {
        tenantId,
        classroomId: parsed.data.classroomId ?? null,
        schoolId: parsed.data.schoolId ?? null,
        schoolName: parsed.data.schoolName ?? null,
        title: parsed.data.title.trim(),
        grade: parsed.data.grade,
        semester: parsed.data.semester,
        examType: parsed.data.examType as ExamCampaignType,
        examDate,
        scopeChapters: parsed.data.scopeChapters,
        status: 'PREPARING',
        createdById: user.id,
      },
    });

    // 즉시 큐레이션 실행 (오래 걸리지 않음, 동기 처리)
    try {
      await runCurationAndActivate(campaign.id);
    } catch (err) {
      console.error('[exam-campaigns POST] 큐레이션 실패:', err);
      // 큐레이션 실패해도 캠페인은 PREPARING 상태로 남김 → 재시도 가능
    }

    const reloaded = await prisma.examCampaign.findUnique({
      where: { id: campaign.id },
      include: {
        classroom: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        _count: { select: { enrollments: true } },
      },
    });

    return NextResponse.json({ data: reloaded }, { status: 201 });
  } catch (err) {
    console.error('[exam-campaigns POST]', err);
    return serverError('캠페인 생성에 실패했습니다');
  }
}
