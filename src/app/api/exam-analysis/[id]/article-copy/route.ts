import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, getTenantFilter, notFound } from '@/lib/api';
import { assertDemoFeature } from '@/lib/demo/accounts';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/exam-analysis/[id]/article-copy
 *
 * "서식 복사" 버튼 클릭 시 호출. ArticleCopyEvent 1행 append.
 * - 권한: TEACHER 이상 (같은 테넌트 시험지만)
 * - fire-and-forget 패턴 — 실패해도 사용자 영향 없음, 응답은 빠르게
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  // 테넌트 격리: 같은 테넌트 시험지인지 확인
  const tenantFilter = getTenantFilter(user);
  const examPaper = await prisma.examPaper.findFirst({
    where: { id, ...tenantFilter },
    select: { id: true },
  });
  if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

  // 데모 계정: 블로그 복사 체험 권한 확인
  const demoGate = await assertDemoFeature(user, 'blog');
  if (demoGate.response) return demoGate.response;

  await prisma.articleCopyEvent.create({
    data: { examPaperId: id, userId: user.id },
  });

  return NextResponse.json({ data: { ok: true } });
}
