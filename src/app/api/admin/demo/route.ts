import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import {
  ensureDemoTenant, parseDemoSettings, serializeDemoSettings, clampLimit,
  parseDemoPerms, DEFAULT_DEMO_PERMS, DEMO_TENANT_NAME,
} from '@/lib/demo/accounts';

/**
 * 데모 계정 발급/관리 — SUPER_ADMIN 전용 특수 기능.
 * 데모 전용 지점(slug 'demo')을 자동 보장하고, 일회용 데모 계정(TEACHER)을 발급/회수/모니터링한다.
 * 체험 한도는 지점 settings 에 저장(계정별 override 지원). 사용량 = 그 계정의 분석 완료 시험지 수.
 */

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,49}$/;

/** 혼동 글자(0/o, 1/l/i) 제외한 랜덤 토큰. */
function randToken(len: number): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// GET — 데모 지점 + 계정별 사용 현황 + 전체 집계
export async function GET() {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const tenant = await ensureDemoTenant();
  const settings = parseDemoSettings(tenant.settings);

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, username: true, name: true, createdAt: true },
  });

  const ids = users.map((u) => u.id);
  const papers = ids.length
    ? await prisma.examPaper.findMany({
        where: { teacherId: { in: ids } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, teacherId: true, title: true, grade: true, status: true,
          createdAt: true, updatedAt: true,
          analyses: {
            select: { analyzedAt: true, extensions: { select: { agentType: true, lastRunAt: true } } },
            orderBy: { createdAt: 'desc' }, take: 1,
          },
          articleCopyEvents: { select: { copiedAt: true } },
        },
      })
    : [];

  const byTeacher = new Map<string, typeof papers>();
  for (const p of papers) {
    const arr = byTeacher.get(p.teacherId) ?? [];
    arr.push(p);
    byTeacher.set(p.teacherId, arr);
  }

  const accounts = users.map((u) => {
    const ps = byTeacher.get(u.id) ?? [];
    const used = ps.filter((p) => p.status === 'COMPLETED').length;
    const inProgress = ps.filter((p) => p.status === 'ANALYZING' || p.status === 'PENDING').length;
    const failed = ps.filter((p) => p.status === 'FAILED').length;
    const limit = settings.accountLimits[u.id] ?? settings.demoLimit;

    // 시험지별 총평·블로그·복사 (총평/블로그는 최신 분석의 extension, 복사는 ArticleCopyEvent)
    const paperRows = ps.map((p) => {
      const exts = p.analyses[0]?.extensions ?? [];
      return {
        id: p.id, title: p.title, grade: p.grade, status: p.status,
        createdAt: p.createdAt, analyzedAt: p.analyses[0]?.analyzedAt ?? null,
        hasCommentary: exts.some((e) => e.agentType === 'commentary'),
        hasBlog: exts.some((e) => e.agentType === 'blog-article'),
        copies: p.articleCopyEvents.length,
      };
    });
    const commentary = paperRows.filter((p) => p.hasCommentary).length;
    const blog = paperRows.filter((p) => p.hasBlog).length;
    const copies = paperRows.reduce((s, p) => s + p.copies, 0);

    // 마지막 활동 = 시험지 갱신 / 총평·블로그 실행 / 복사 중 가장 최근
    const stamps: Date[] = [];
    for (const p of ps) {
      stamps.push(p.updatedAt);
      for (const e of p.analyses[0]?.extensions ?? []) if (e.lastRunAt) stamps.push(e.lastRunAt);
      for (const c of p.articleCopyEvents) stamps.push(c.copiedAt);
    }
    const lastActivityAt = stamps.length
      ? new Date(Math.max(...stamps.map((d) => d.getTime())))
      : null;

    return {
      id: u.id, username: u.username, name: u.name, createdAt: u.createdAt,
      used, limit, remaining: Math.max(0, limit - used), exhausted: used >= limit,
      uploads: ps.length, inProgress, failed, commentary, blog, copies,
      perms: settings.accountPerms[u.id] ?? DEFAULT_DEMO_PERMS,
      lastActivityAt, papers: paperRows,
    };
  });

  const summary = {
    accounts: accounts.length,
    active: accounts.filter((a) => !a.exhausted).length,
    exhausted: accounts.filter((a) => a.exhausted).length,
    totalUsed: accounts.reduce((s, a) => s + a.used, 0),
    totalCommentary: accounts.reduce((s, a) => s + a.commentary, 0),
    totalBlog: accounts.reduce((s, a) => s + a.blog, 0),
    totalCopies: accounts.reduce((s, a) => s + a.copies, 0),
  };

  return NextResponse.json({
    data: { tenantId: tenant.id, demoLimit: settings.demoLimit, summary, accounts },
  });
}

// POST — 데모 계정 발급 (아이디/이름/초기횟수/비밀번호 선택, 비우면 자동). 비밀번호 평문 1회 반환.
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const tenant = await ensureDemoTenant();
  const settings = parseDemoSettings(tenant.settings);

  let username = String(body?.username ?? '').trim().toLowerCase();
  if (username) {
    if (!USERNAME_RE.test(username)) {
      return badRequest('아이디는 영소문자/숫자로 시작하고 영소문자·숫자·-·_ 2~50자여야 합니다');
    }
    // 활성 계정만 중복으로 본다 — 회수된 계정은 username 을 비워두므로 같은 아이디 재발급 허용.
    const dupe = await prisma.user.findFirst({ where: { username, deletedAt: null }, select: { id: true } });
    if (dupe) return badRequest('이미 존재하는 아이디입니다');
  } else {
    for (let i = 0; i < 12; i++) {
      const cand = `demo-${randToken(5)}`;
      if (!(await prisma.user.findUnique({ where: { username: cand } }))) { username = cand; break; }
    }
    if (!username) return badRequest('아이디 자동 생성에 실패했습니다. 다시 시도해 주세요.');
  }

  const name = String(body?.name ?? '').trim() || DEMO_TENANT_NAME;
  const password = String(body?.password ?? '').trim() || randToken(8);
  const passwordHash = await bcrypt.hash(password, 10);

  // 발급 시 한도를 계정별 스냅샷(accountLimits)으로 고정 → 이후 기본 demoLimit 변경이 기존 계정에
  // 소급되지 않는다(요구: 계정별 독립). 미지정이면 현재 기본값을 스냅샷.
  const initialLimit = body?.limit !== undefined && body?.limit !== null && String(body.limit).trim() !== ''
    ? clampLimit(body.limit)
    : settings.demoLimit;

  try {
    // 계정 생성 + 한도 스냅샷을 한 트랜잭션으로(half-state 방지, settings 재조회로 lost-update 창 축소).
    const created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { username, name, passwordHash, role: 'TEACHER', tenantId: tenant.id },
      });
      const fresh = await tx.tenant.findUnique({ where: { id: tenant.id }, select: { settings: true } });
      const s = parseDemoSettings(fresh?.settings);
      s.accountLimits = { ...s.accountLimits, [u.id]: initialLimit };
      // 신규 계정은 전체 권한(분석·총평·블로그복사) 허용 — superadmin 이 표에서 개별 회수.
      s.accountPerms = { ...s.accountPerms, [u.id]: { ...DEFAULT_DEMO_PERMS } };
      await tx.tenant.update({ where: { id: tenant.id }, data: { settings: serializeDemoSettings(s) } });
      return u;
    });
    return NextResponse.json({ data: { id: created.id, username: created.username, password } });
  } catch (e) {
    // soft-deleted 등으로 username 전역 unique 충돌
    if ((e as { code?: string }).code === 'P2002') return badRequest('이미 존재하는 아이디입니다');
    throw e;
  }
}

// PATCH — 계정별 한도 즉시 증감 / 신규 기본 한도 변경 / 사용 기록 초기화
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const tenant = await ensureDemoTenant();
  const settings = parseDemoSettings(tenant.settings);

  // 1) 계정별 한도 즉시 증감
  if (body?.userId !== undefined && body?.limit !== undefined) {
    const userId = String(body.userId);
    const target = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id, deletedAt: null },
      select: { id: true },
    });
    if (!target) return badRequest('데모 계정을 찾을 수 없습니다');
    const limit = clampLimit(body.limit);
    settings.accountLimits = { ...settings.accountLimits, [userId]: limit };
    await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: serializeDemoSettings(settings) } });
    return NextResponse.json({ data: { userId, limit } });
  }

  // 1b) 계정별 체험 권한(분석/총평/블로그복사) 부여·회수
  if (body?.userId !== undefined && body?.perms !== undefined) {
    const userId = String(body.userId);
    const target = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id, deletedAt: null },
      select: { id: true },
    });
    if (!target) return badRequest('데모 계정을 찾을 수 없습니다');
    const perms = parseDemoPerms(body.perms);
    settings.accountPerms = { ...settings.accountPerms, [userId]: perms };
    await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: serializeDemoSettings(settings) } });
    return NextResponse.json({ data: { userId, perms } });
  }

  // 2) 사용 기록 초기화 (시험지 + 분석 cascade 삭제)
  if (body?.resetUserId !== undefined) {
    const userId = String(body.resetUserId);
    const target = await prisma.user.findFirst({
      where: { id: userId, tenantId: tenant.id, deletedAt: null },
      select: { id: true },
    });
    if (!target) return badRequest('데모 계정을 찾을 수 없습니다');
    await prisma.examPaper.deleteMany({ where: { teacherId: userId } });
    return NextResponse.json({ data: { ok: true } });
  }

  // 3) 신규 계정 기본 한도 변경 (기존 계정 override 는 유지)
  if (body?.demoLimit !== undefined) {
    settings.demoLimit = clampLimit(body.demoLimit);
    await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: serializeDemoSettings(settings) } });
    return NextResponse.json({ data: { demoLimit: settings.demoLimit } });
  }

  return badRequest('변경할 항목이 없습니다 (userId+limit / userId+perms / demoLimit / resetUserId)');
}

// DELETE — 데모 계정 회수(소프트 삭제) ?id=
export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (isResponse(auth)) return auth;

  const tenant = await ensureDemoTenant();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return badRequest('id는 필수입니다');

  const target = await prisma.user.findFirst({
    where: { id, tenantId: tenant.id, deletedAt: null },
    select: { id: true },
  });
  if (!target) return badRequest('데모 계정을 찾을 수 없습니다');

  // 데모 데이터 정리(시험지 + 분석 cascade) + username 해제(같은 아이디 재발급 허용).
  await prisma.examPaper.deleteMany({ where: { teacherId: id } });
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), username: `deleted_${randToken(12)}` },
  });

  // accountLimits / accountPerms 정리 (있으면 제거)
  const settings = parseDemoSettings(tenant.settings);
  if (settings.accountLimits[id] !== undefined || settings.accountPerms[id] !== undefined) {
    delete settings.accountLimits[id];
    delete settings.accountPerms[id];
    await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: serializeDemoSettings(settings) } });
  }

  return NextResponse.json({ data: { ok: true } });
}
