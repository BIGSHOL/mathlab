import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireTeacher, isResponse, badRequest, notFound, serverError, hasRole } from '@/lib/api';
import { getExamScope } from '@/lib/demo/accounts';
import { parseTemplateConfig, DEFAULT_TEMPLATE } from '@/lib/exam-analysis/blocks/default-template';

type Params = { params: Promise<{ id: string }> };

/**
 * ⚠️ 이름 혼동 주의 — 이 프로젝트에는 "템플릿"이 둘 있다.
 *   · 여기(`/api/exam-analysis/[id]/template`) = **총평 레이아웃 템플릿** (테마 + 블록 구성). 강사 이상.
 *   · `/api/exam-analysis/templates`           = **AI 프롬프트 템플릿** (`ExamPromptTemplate`). SUPER_ADMIN 전용.
 * 서로 무관하다. 새 코드가 둘을 헷갈리지 않게 할 것.
 */

/** 이 분석본의 총평 템플릿을 담는 확장 레코드 키 (section-images 와 동일 패턴) */
const AGENT_TYPE = 'template';

/** 지점 기본 템플릿이 사는 곳 — Tenant.settings(Json) 안의 한 키 */
const TENANT_SETTINGS_KEY = 'commentaryTemplate';

type TemplateSource = 'analysis' | 'tenant' | 'default';

/**
 * GET /api/exam-analysis/[id]/template
 *
 * 총평 템플릿(테마 + 블록 구성)을 3단계로 해석해 반환한다.
 *   분석본 개별 설정 → 지점 기본값 → 코드 기본 템플릿
 * source 를 함께 주므로 UI 가 "지점 기본값 사용 중" 같은 안내를 띄울 수 있다.
 *
 * 응답: { data: { config, source } }
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  try {
    const tenantWhere = await getExamScope(user);
    const examPaper = await prisma.examPaper.findFirst({
      where: { id, ...tenantWhere },
      select: { id: true, tenantId: true },
    });
    if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

    const analysis = await prisma.examAnalysis.findFirst({
      where: { examPaperId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        extensions: { where: { agentType: AGENT_TYPE }, select: { result: true } },
      },
    });

    const analysisRaw = analysis?.extensions[0]?.result;
    if (analysisRaw) {
      return NextResponse.json({
        data: { config: parseTemplateConfig(analysisRaw), source: 'analysis' as TemplateSource },
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: examPaper.tenantId },
      select: { settings: true },
    });
    // Json? — 객체 여부를 확인하고 나서 키를 읽는다 (배열/문자열/null 이 들어있을 수 있음)
    const settings = tenant?.settings;
    const tenantRaw =
      settings && typeof settings === 'object' && !Array.isArray(settings)
        ? (settings as Record<string, unknown>)[TENANT_SETTINGS_KEY]
        : undefined;
    if (tenantRaw) {
      return NextResponse.json({
        data: { config: parseTemplateConfig(tenantRaw), source: 'tenant' as TemplateSource },
      });
    }

    return NextResponse.json({ data: { config: DEFAULT_TEMPLATE, source: 'default' as TemplateSource } });
  } catch (e) {
    console.error('[exam-analysis template GET] 오류:', e);
    return serverError('템플릿을 불러오지 못했습니다');
  }
}

/**
 * PUT /api/exam-analysis/[id]/template
 *
 * body: { config: CommentaryTemplateConfig, saveAsTenantDefault?: boolean }
 *
 * config 는 항상 이 분석본에 저장된다.
 * saveAsTenantDefault=true 면 지점 기본값(Tenant.settings)에도 반영 — OWNER 이상만.
 * (강사가 자기 분석본 모양을 바꾸는 건 자유롭되, 지점 전체 기본값을 바꾸는 건 권한을 나눈다.)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;
  const { id } = await params;

  let body: { config?: unknown; saveAsTenantDefault?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest('잘못된 요청 본문');
  }
  if (!body.config || typeof body.config !== 'object') return badRequest('config 가 필요합니다');

  // 진입부 정규화 — 클라이언트가 보낸 Json 을 그대로 믿지 않는다 (알 수 없는 블록/variant 제거)
  const config = parseTemplateConfig(body.config);

  try {
    const tenantWhere = await getExamScope(user);
    const examPaper = await prisma.examPaper.findFirst({
      where: { id, ...tenantWhere },
      select: { id: true, tenantId: true },
    });
    if (!examPaper) return notFound('시험지를 찾을 수 없습니다');

    const analysis = await prisma.examAnalysis.findFirst({
      where: { examPaperId: id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!analysis) return notFound('분석 결과가 없습니다');

    const now = new Date();
    const value = config as unknown as Prisma.InputJsonValue;
    await prisma.examAnalysisExtension.upsert({
      where: { analysisId_agentType: { analysisId: analysis.id, agentType: AGENT_TYPE } },
      create: { analysisId: analysis.id, agentType: AGENT_TYPE, result: value, lastRunBy: user.id, lastRunAt: now },
      update: { result: value, lastRunBy: user.id, lastRunAt: now },
    });

    let savedTenantDefault = false;
    if (body.saveAsTenantDefault === true) {
      if (!hasRole(user, 'OWNER')) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: '지점 기본 템플릿은 원장 이상만 변경할 수 있습니다' } },
          { status: 403 },
        );
      }
      const tenant = await prisma.tenant.findUnique({
        where: { id: examPaper.tenantId },
        select: { settings: true },
      });
      // 기존 settings 를 보존하며 한 키만 갱신 (다른 지점 설정을 덮어쓰지 않게)
      const prev =
        tenant?.settings && typeof tenant.settings === 'object' && !Array.isArray(tenant.settings)
          ? (tenant.settings as Record<string, unknown>)
          : {};
      await prisma.tenant.update({
        where: { id: examPaper.tenantId },
        data: {
          settings: { ...prev, [TENANT_SETTINGS_KEY]: config } as unknown as Prisma.InputJsonValue,
        },
      });
      savedTenantDefault = true;
    }

    return NextResponse.json({ data: { config, savedTenantDefault } });
  } catch (e) {
    console.error('[exam-analysis template PUT] 오류:', e);
    return serverError('템플릿을 저장하지 못했습니다');
  }
}
