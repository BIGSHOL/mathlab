/**
 * 기존 빈칸 데이터에서 통문장(full) 빈칸만 상한 적용하여 재생성
 * easy/hard는 유지, full만 addFullSentenceBlanks로 재계산
 */
import { PrismaClient } from '@prisma/client';
import { buildMergedExercise, addFullSentenceBlanks, type BlankDifficulty } from '../src/lib/utils/blank-generator';

const prisma = new PrismaClient();

async function main() {
  const exercises = await prisma.blankExercise.findMany({
    include: { concept: { select: { title: true, fullContent: true } } },
  });

  console.log(`빈칸 exercise ${exercises.length}개 검사...\n`);

  let updated = 0;
  for (const ex of exercises) {
    const blanks = ex.blanks as { position: number; answer: string; hint: string; difficulty: string }[];
    const easyHard = blanks.filter(b => b.difficulty === 'easy' || b.difficulty === 'hard');
    const fullCount = blanks.filter(b => b.difficulty === 'full').length;
    const maxFull = Math.min(30, Math.max(10, easyHard.length * 2));

    if (fullCount <= maxFull) continue; // 이미 상한 이내

    // easy/hard 용어로 재빌드
    const terms = easyHard.map(b => ({
      term: b.answer,
      difficulty: b.difficulty as BlankDifficulty,
    }));

    const fullContent = ex.concept.fullContent || '';
    if (!fullContent) continue;

    const merged = buildMergedExercise(fullContent, terms, false);
    if (!merged) continue;

    const withFull = addFullSentenceBlanks(merged);
    const newFullCount = withFull.blanks.filter(b => b.difficulty === 'full').length;

    await prisma.blankExercise.update({
      where: { id: ex.id },
      data: {
        templateText: withFull.templateText,
        blanks: withFull.blanks.map(b => ({
          position: b.position,
          answer: b.answer,
          hint: b.hint,
          difficulty: b.difficulty,
        })),
      },
    });

    console.log(`${ex.concept.title}: full ${fullCount} → ${newFullCount}`);
    updated++;
  }

  console.log(`\n완료: ${updated}개 재생성`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
