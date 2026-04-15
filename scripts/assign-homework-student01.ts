/**
 * student01에게 문제 숙제를 할당하는 스크립트
 * 실행: npx tsx scripts/assign-homework-student01.ts
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    // 1. student01 찾기
    const student = await prisma.user.findFirst({ where: { username: 'student01' } });
    if (!student) {
        console.log('student01 not found, listing users...');
        const users = await prisma.user.findMany({ take: 5, select: { id: true, username: true, role: true } });
        console.log(users);
        throw new Error('student01 not found');
    }
    console.log('Student:', student.id, student.username);

    // 2. admin 찾기 (TEACHER 또는 ADMIN 역할)
    let admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!admin) {
        admin = await prisma.user.findFirst({ where: { role: 'TEACHER' } });
    }
    if (!admin) {
        throw new Error('No admin or teacher found');
    }
    console.log('Admin:', admin.id, admin.username);

    // 3. 기존 enrollment 정리
    await prisma.questionHomeworkEnrollment.deleteMany({
        where: { studentId: student.id }
    });

    // 4. 문제 5개 가져오기
    const qs = await prisma.question.findMany({
        where: { source: { contains: 'RPM' } },
        take: 5,
    });
    if (qs.length < 1) throw new Error('No questions found');
    console.log('Questions:', qs.length);

    const qIds = qs.map(q => q.id);

    // 5. 오늘 날짜 (startDate)
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);

    const planId = crypto.randomUUID();

    // 6. 플랜 생성
    await prisma.questionHomeworkPlan.create({
        data: {
            id: planId,
            title: '시나리오5 테스트용 문제 숙제',
            createdBy: admin.id,
            startDate: startDate,
            totalDays: 7,
            passingScore: 80,
            updatedAt: new Date(),
            dailyQuestions: [qIds, [], [], [], [], [], []],
        }
    });
    console.log('Plan created:', planId);

    // 7. 학생 등록
    await prisma.questionHomeworkEnrollment.create({
        data: {
            id: crypto.randomUUID(),
            planId: planId,
            studentId: student.id,
        }
    });
    console.log('Enrollment created');

    // 8. HomeworkQuestion 항목 생성
    for (let i = 0; i < qIds.length; i++) {
        await prisma.homeworkQuestion.create({
            data: {
                id: crypto.randomUUID(),
                planId: planId,
                questionId: qIds[i],
                dayIndex: 0,
                sortOrder: i,
            }
        });
    }
    console.log('HomeworkQuestions created:', qIds.length);

    console.log('\n✅ student01에게 문제 숙제 할당 완료!');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
