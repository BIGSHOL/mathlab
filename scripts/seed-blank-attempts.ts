import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 학생 1명만
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' },
    select: { id: true, username: true },
  });
  if (!student) { console.log('학생 없음'); return; }
  console.log('학생:', student.username);

  // 빈칸 문제 2개만
  const exercises = await prisma.blankExercise.findMany({
    take: 2,
    select: { id: true, conceptId: true, blanks: true },
  });
  if (exercises.length === 0) { console.log('빈칸 문제 없음'); return; }
  console.log('빈칸 문제:', exercises.length, '개');

  for (const ex of exercises) {
    const blanks = ex.blanks as Array<{ position: number; answer: string; hint?: string }>;
    if (!blanks.length) continue;

    // BLANK_EASY 단계: 2회 시도
    // 1차: 일부 틀림
    const wrongAnswers = blanks.map((b) => ({
      blankPosition: b.position,
      submittedAnswer: b.position % 2 === 0 ? b.answer : (b.hint || '잘모르겠습니다'),
      correctAnswer: b.answer,
      isCorrect: b.position % 2 === 0,
    }));
    const wrongCount = wrongAnswers.filter((a) => a.isCorrect).length;

    await prisma.blankAttempt.create({
      data: {
        studentId: student.id,
        conceptId: ex.conceptId,
        stage: 'BLANK_EASY',
        score: Math.round((wrongCount / blanks.length) * 100),
        allCorrect: false,
        hintCount: 2,
        revealCount: 0,
        answers: { create: wrongAnswers },
      },
    });

    // 2차: 전부 정답
    const correctAnswers = blanks.map((b) => ({
      blankPosition: b.position,
      submittedAnswer: b.answer,
      correctAnswer: b.answer,
      isCorrect: true,
    }));

    await prisma.blankAttempt.create({
      data: {
        studentId: student.id,
        conceptId: ex.conceptId,
        stage: 'BLANK_EASY',
        score: 100,
        allCorrect: true,
        hintCount: 0,
        revealCount: 0,
        answers: { create: correctAnswers },
      },
    });

    // BLANK_HARD 단계: 1회 시도 (전부 정답)
    await prisma.blankAttempt.create({
      data: {
        studentId: student.id,
        conceptId: ex.conceptId,
        stage: 'BLANK_HARD',
        score: 100,
        allCorrect: true,
        hintCount: 1,
        revealCount: 0,
        answers: { create: correctAnswers },
      },
    });
  }

  const count = await prisma.blankAttempt.count();
  console.log('완료! BlankAttempt:', count, '개');
}

main().catch(console.error).finally(() => prisma.$disconnect());
