import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, isResponse } from '@/lib/api';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/tenants — 전체 지점 목록 (SUPER_ADMIN 전용)
 */
export async function GET() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      users: {
        where: { deletedAt: null },
        select: {
          id: true,
          role: true,
          profile: { select: { lastActiveAt: true } },
        },
      },
      classrooms: { select: { id: true } },
      tenantLicenses: {
        where: { isActive: true },
        select: {
          id: true,
          feature: true,
          maxSeats: true,
          usedSeats: true,
          expiresAt: true,
        },
      },
    },
  });

  const data = tenants.map((t) => {
    const students = t.users.filter((u) => u.role === 'STUDENT');
    const teachers = t.users.filter((u) => u.role !== 'STUDENT');
    const activeStudents = students.filter(
      (u) => u.profile?.lastActiveAt && new Date(u.profile.lastActiveAt) > sevenDaysAgo
    );
    const activityRate = students.length > 0
      ? Math.round((activeStudents.length / students.length) * 100)
      : 0;

    const totalSeats = t.tenantLicenses.reduce((s, l) => s + l.maxSeats, 0);
    const usedSeats = t.tenantLicenses.reduce((s, l) => s + l.usedSeats, 0);
    const expiringLicenses = t.tenantLicenses.filter(
      (l) => l.expiresAt && new Date(l.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      logo: t.logo,
      isActive: t.isActive,
      createdAt: t.createdAt,
      studentCount: students.length,
      teacherCount: teachers.length,
      classroomCount: t.classrooms.length,
      activityRate,
      licenseCount: t.tenantLicenses.length,
      totalSeats,
      usedSeats,
      expiringLicenses,
      _count: {
        users: t.users.length,
        classrooms: t.classrooms.length,
      },
    };
  });

  return NextResponse.json({ data });
}

/**
 * POST /api/admin/tenants — 새 지점 생성 (SUPER_ADMIN 전용)
 */
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { slug, name, logo } = body;

  if (!slug || !name) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '슬러그와 이름은 필수입니다' } },
      { status: 400 }
    );
  }

  // 슬러그 형식 검증 (영소문자, 숫자, 하이픈만)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '슬러그는 영소문자, 숫자, 하이픈만 사용 가능합니다' } },
      { status: 400 }
    );
  }

  // 중복 확인
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: '이미 존재하는 슬러그입니다' } },
      { status: 409 }
    );
  }

  // 지점장 계정 정보 (선택)
  const { ownerUsername, ownerName, ownerPassword } = body;
  const createOwner = ownerUsername && ownerName && ownerPassword;

  if (createOwner) {
    // 아이디 중복 확인
    const existingUser = await prisma.user.findUnique({ where: { username: ownerUsername } });
    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: '이미 존재하는 아이디입니다' } },
        { status: 409 }
      );
    }
  }

  // 트랜잭션으로 지점 + 지점장 동시 생성
  const result = await prisma.$transaction(async (tx) => {
    const newTenant = await tx.tenant.create({
      data: { slug, name, logo: logo || null },
    });

    let owner = null;
    if (createOwner) {
      const passwordHash = await bcrypt.hash(ownerPassword, 10);
      owner = await tx.user.create({
        data: {
          username: ownerUsername,
          name: ownerName,
          passwordHash,
          role: 'OWNER',
          tenantId: newTenant.id,
        },
        select: { id: true, username: true, name: true, role: true },
      });
    }

    return { tenant: newTenant, owner };
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
