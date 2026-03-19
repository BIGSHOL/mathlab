/**
 * fullContent에서 templateText를 재생성하여 BlankExercise 업데이트.
 * 시드 데이터의 templateText/fullContent 불일치를 수정합니다.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BlankItem {
  position: number;
  answer: string;
  hint?: string;
  difficulty?: string;
}

async function main() {
  console.log('=== BlankExercise templateText 재생성 시작 ===\n');

  const exercises = await prisma.blankExercise.findMany({
    include: {
      concept: { select: { id: true, title: true, fullContent: true } },
    },
  });

  let updated = 0;

  for (const ex of exercises) {
    const fullContent = ex.concept.fullContent;
    if (!fullContent) {
      console.log(`⏭ ${ex.concept.title}: fullContent 없음, 스킵`);
      continue;
    }

    const blanks = ex.blanks as unknown as BlankItem[];
    if (!blanks || blanks.length === 0) {
      console.log(`⏭ ${ex.concept.title}: blanks 없음, 스킵`);
      continue;
    }

    // fullContent에서 각 blank answer를 {{position}}으로 치환하여 templateText 생성
    // 긴 답부터 치환 (부분 문자열 매칭 방지)
    const sortedBlanks = [...blanks].sort((a, b) => b.answer.length - a.answer.length);

    let template = fullContent;
    const usedRanges: { start: number; end: number; position: number }[] = [];

    for (const blank of sortedBlanks) {
      const answer = blank.answer;
      // fullContent에서 이 답이 나타나는 위치 찾기
      let searchFrom = 0;
      let found = false;

      while (searchFrom < template.length) {
        const idx = template.indexOf(answer, searchFrom);
        if (idx === -1) break;

        // 이미 {{}} 플레이스홀더 내부가 아닌지 확인
        const before = template.substring(Math.max(0, idx - 2), idx);
        if (before.includes('{{')) {
          searchFrom = idx + 1;
          continue;
        }

        // 이미 치환된 범위와 겹치지 않는지 확인
        const end = idx + answer.length;
        const overlap = usedRanges.some(
          (r) => idx < r.end && end > r.start
        );
        if (overlap) {
          searchFrom = idx + 1;
          continue;
        }

        // 치환
        const placeholder = `{{${blank.position}}}`;
        template = template.substring(0, idx) + placeholder + template.substring(end);
        usedRanges.push({ start: idx, end: idx + placeholder.length, position: blank.position });
        found = true;
        break;
      }

      if (!found) {
        console.log(`  ⚠ ${ex.concept.title}: "${answer}" (pos ${blank.position}) not found in fullContent`);
      }
    }

    // 기존과 다르면 업데이트
    if (template !== ex.templateText) {
      await prisma.blankExercise.update({
        where: { id: ex.id },
        data: { templateText: template },
      });
      updated++;
      console.log(`✅ ${ex.concept.title}: templateText 업데이트됨`);
      console.log(`   old: ${ex.templateText.substring(0, 80)}...`);
      console.log(`   new: ${template.substring(0, 80)}...`);
    } else {
      console.log(`✓ ${ex.concept.title}: 이미 일치`);
    }
  }

  console.log(`\n=== 완료! ${updated}/${exercises.length}개 업데이트 ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
