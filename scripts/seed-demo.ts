/**
 * 투자자 데모 계정 시드 스크립트
 * - 데모 테넌트 + OWNER 계정 생성
 * - 샘플 학생 5명 + StudentProfile (XP/레벨)
 * - 샘플 반(Classroom) 생성
 *
 * Usage: npx tsx scripts/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();
const uid = () => crypto.randomUUID();
const hash = (pw: string) => bcrypt.hashSync(pw, 10);

async function main() {
  console.log('🎯 데모 계정 시드 시작...\n');

  // 1. 데모 테넌트
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'MathLAB 데모 학원',
      isActive: true,
    },
  });
  console.log(`✅ 데모 테넌트: ${tenant.name} (${tenant.id})`);

  // 2. 데모 OWNER 계정
  const existingDemo = await prisma.user.findFirst({ where: { username: 'demo' } });
  let demoUser;
  if (existingDemo) {
    demoUser = await prisma.user.update({
      where: { id: existingDemo.id },
      data: { role: 'OWNER', tenantId: tenant.id, name: '투자자 데모' },
    });
    console.log(`✅ 데모 계정 업데이트: ${demoUser.username}`);
  } else {
    demoUser = await prisma.user.create({
      data: {
        id: uid(),
        username: 'demo',
        passwordHash: hash('demo1234'),
        name: '투자자 데모',
        role: 'OWNER',
        tenantId: tenant.id,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ 데모 계정 생성: ${demoUser.username}`);
  }

  // 3. 데모 선생님
  let demoTeacher = await prisma.user.findFirst({ where: { username: 'demo-teacher' } });
  if (demoTeacher) {
    demoTeacher = await prisma.user.update({
      where: { id: demoTeacher.id },
      data: { tenantId: tenant.id },
    });
  } else {
    demoTeacher = await prisma.user.create({
      data: {
        id: uid(),
        username: 'demo-teacher',
        passwordHash: hash('demo1234'),
        name: '김수학',
        role: 'TEACHER',
        tenantId: tenant.id,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`✅ 데모 선생님: ${demoTeacher.name}`);

  // 4. 반 생성
  let classroom = await prisma.classroom.findFirst({
    where: { name: '중등 수학 A반', tenant: { id: tenant.id } },
  });
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        id: uid(),
        name: '중등 수학 A반',
        tenant: { connect: { id: tenant.id } },
        teacherId: demoTeacher.id,
      },
    });
  }
  console.log(`✅ 반: ${classroom.name}`);

  // 5. 샘플 학생 5명
  const studentData = [
    { username: 'demo-s1', name: '이지우', grade: 7, xp: 1250, level: 5, streak: 12 },
    { username: 'demo-s2', name: '박서연', grade: 7, xp: 890, level: 4, streak: 8 },
    { username: 'demo-s3', name: '최민준', grade: 8, xp: 2100, level: 6, streak: 21 },
    { username: 'demo-s4', name: '김하은', grade: 8, xp: 560, level: 3, streak: 5 },
    { username: 'demo-s5', name: '정윤서', grade: 7, xp: 1680, level: 5, streak: 15 },
  ];

  for (const s of studentData) {
    const existing = await prisma.user.findFirst({ where: { username: s.username } });
    let student;
    if (existing) {
      student = existing;
      console.log(`  ↳ 학생 존재: ${s.name}`);
    } else {
      student = await prisma.user.create({
        data: {
          id: uid(),
          username: s.username,
          passwordHash: hash('1234'),
          name: s.name,
          role: 'STUDENT',
          grade: s.grade,
          tenantId: tenant.id,
          classroomId: classroom.id,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✅ 학생 생성: ${s.name} (${s.grade}학년)`);
    }

    // StudentProfile 생성/업데이트
    await prisma.studentProfile.upsert({
      where: { userId: student.id },
      update: {
        totalXp: s.xp,
        level: s.level,
        currentStreak: s.streak,
        longestStreak: s.streak + 3,
      },
      create: {
        id: uid(),
        userId: student.id,
        totalXp: s.xp,
        level: s.level,
        currentStreak: s.streak,
        longestStreak: s.streak + 3,
        updatedAt: new Date(),
      },
    });
  }

  console.log('\n🎉 데모 시드 완료!');
  console.log(`\n📋 로그인 정보:`);
  console.log(`  아이디: demo`);
  console.log(`  비밀번호: demo1234`);
  console.log(`  역할: OWNER (원장)`);
  console.log(`  테넌트: ${tenant.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
