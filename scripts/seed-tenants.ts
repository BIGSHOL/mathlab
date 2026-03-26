/**
 * 테넌트 시드 스크립트
 * - 기본 테넌트 생성
 * - 기존 User/Classroom에 기본 tenantId 할당
 *
 * Usage: npx tsx scripts/seed-tenants.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏢 테넌트 시드 시작...\n');

  // 1. 기본 테넌트 생성 (이미 있으면 건너뜀)
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      slug: 'default',
      name: 'Injaewon MathLAB 본사',
      isActive: true,
    },
  });
  console.log(`✅ 기본 테넌트: ${defaultTenant.name} (${defaultTenant.id})`);

  // 2. 샘플 지점 생성
  const branches = [
    { slug: 'gangnam', name: '강남점' },
    { slug: 'bundang', name: '분당점' },
  ];

  for (const branch of branches) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: branch.slug },
      update: {},
      create: {
        slug: branch.slug,
        name: branch.name,
        isActive: true,
      },
    });
    console.log(`✅ 지점: ${tenant.name} (${tenant.slug})`);
  }

  // 3. tenantId 없는 기존 사용자 → 기본 테넌트 할당
  const usersWithoutTenant = await prisma.user.updateMany({
    where: { tenantId: null },
    data: { tenantId: defaultTenant.id },
  });
  console.log(`\n📋 기본 테넌트 할당된 사용자: ${usersWithoutTenant.count}명`);

  // 4. tenantId 없는 기존 Classroom → 기본 테넌트 할당
  const classroomsUpdated = await prisma.classroom.updateMany({
    where: { tenantId: null },
    data: { tenantId: defaultTenant.id },
  });
  console.log(`📋 기본 테넌트 할당된 교실: ${classroomsUpdated.count}개`);

  // 5. tenantId 없는 최상위 모델들 → 기본 테넌트 할당
  const models = [
    { name: 'Test', model: prisma.test },
    { name: 'LearningCourse', model: prisma.learningCourse },
    { name: 'ArithmeticHomeworkPlan', model: prisma.arithmeticHomeworkPlan },
    { name: 'ConceptHomeworkPlan', model: prisma.conceptHomeworkPlan },
    { name: 'QuestionHomeworkPlan', model: prisma.questionHomeworkPlan },
    { name: 'QuizSession', model: prisma.quizSession },
    { name: 'DailyQuestion', model: prisma.dailyQuestion },
  ] as const;

  for (const { name, model } of models) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (model as any).updateMany({
      where: { tenantId: null },
      data: { tenantId: defaultTenant.id },
    });
    if (result.count > 0) {
      console.log(`📋 ${name}: ${result.count}개 할당됨`);
    }
  }

  console.log('\n✅ 테넌트 시드 완료!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
