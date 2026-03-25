/**
 * 문제은행 일괄 자동 태깅 스크립트
 * - domain(4대영역) 자동 매핑
 * - conceptId(연결 개념) 자동 매칭
 *
 * 사용법:
 *   npx tsx scripts/auto-tag-questions.ts              # 전체 문제 (dry-run)
 *   npx tsx scripts/auto-tag-questions.ts --apply       # 실제 적용
 *   npx tsx scripts/auto-tag-questions.ts --book 2-1    # 특정 교재만
 *   npx tsx scripts/auto-tag-questions.ts --domain-only  # domain만 업데이트
 *   npx tsx scripts/auto-tag-questions.ts --concept-only # concept만 업데이트
 */

import { PrismaClient } from '@prisma/client';
import {
  getDomainByChapter,
  refineDomain,
  getConceptCodeByChapter,
} from '../src/lib/constants/question-maps';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const domainOnly = args.includes('--domain-only');
  const conceptOnly = args.includes('--concept-only');
  const bookIdx = args.indexOf('--book');
  const bookFilter = bookIdx >= 0 ? args[bookIdx + 1] : null;

  console.log('=== 문제은행 자동 태깅 스크립트 ===');
  console.log(`모드: ${dryRun ? 'DRY-RUN (미리보기)' : '실제 적용'}`);
  if (bookFilter) console.log(`교재 필터: ${bookFilter}`);
  if (domainOnly) console.log('domain만 업데이트');
  if (conceptOnly) console.log('concept만 업데이트');
  console.log('');

  // conceptCode → DB id 매핑 캐시
  const conceptCodeToId = new Map<string, string>();
  const conceptTitleToId = new Map<string, string>();
  const concepts = await prisma.concept.findMany({
    select: { id: true, conceptCode: true, title: true },
  });
  for (const c of concepts) {
    if (c.conceptCode) conceptCodeToId.set(c.conceptCode, c.id);
    conceptTitleToId.set(c.title, c.id);
  }
  console.log(`개념 로드 완료: ${concepts.length}개 (conceptCode: ${conceptCodeToId.size}개)`);

  // 대상 문제 조회
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (bookFilter) where.bookCode = bookFilter;

  const questions = await prisma.question.findMany({
    where,
    select: {
      id: true,
      bookCode: true,
      chapter: true,
      section: true,
      difficulty: true,
      domain: true,
      conceptId: true,
    },
    orderBy: [{ bookCode: 'asc' }, { chapter: 'asc' }, { questionNum: 'asc' }],
  });

  console.log(`대상 문제: ${questions.length}개\n`);

  let domainUpdated = 0;
  let conceptUpdated = 0;
  let domainSkipped = 0;
  let conceptSkipped = 0;
  let noMapping = 0;

  const updates: { id: string; data: Record<string, string | null> }[] = [];

  for (const q of questions) {
    const updateData: Record<string, string | null> = {};

    // Domain 자동 매핑
    if (!conceptOnly) {
      if (!q.domain) {
        const baseDomain = getDomainByChapter(q.chapter, q.bookCode, q.section);
        if (baseDomain) {
          const domain = refineDomain(baseDomain, q.section, q.difficulty);
          updateData.domain = domain;
          domainUpdated++;
        } else {
          noMapping++;
        }
      } else {
        domainSkipped++;
      }
    }

    // Concept 자동 매칭
    if (!domainOnly) {
      if (!q.conceptId) {
        let conceptId: string | null = null;

        // 1차: chapter/section → conceptCode → DB id
        const conceptCode = getConceptCodeByChapter(q.chapter, q.section);
        if (conceptCode) {
          conceptId = conceptCodeToId.get(conceptCode) ?? null;
        }

        // 2차: chapter 이름으로 title 매칭
        if (!conceptId) {
          conceptId = conceptTitleToId.get(q.chapter) ?? null;
        }

        // 3차: section 이름으로 title 매칭 (prefix 제거 후)
        if (!conceptId && q.section) {
          conceptId = conceptTitleToId.get(q.section) ?? null;
          if (!conceptId) {
            const stripped = q.section
              .replace(/^유형\s+(?:UP\s+)?\d+\s+/, '')
              .replace(/^\d+\s+/, '')
              .trim();
            conceptId = conceptTitleToId.get(stripped) ?? null;
          }
        }

        if (conceptId) {
          updateData.conceptId = conceptId;
          conceptUpdated++;
        }
      } else {
        conceptSkipped++;
      }
    }

    if (Object.keys(updateData).length > 0) {
      updates.push({ id: q.id, data: updateData });
    }
  }

  // 결과 요약
  console.log('=== 결과 요약 ===');
  if (!conceptOnly) {
    console.log(`Domain 업데이트 대상: ${domainUpdated}개`);
    console.log(`Domain 이미 설정됨 (스킵): ${domainSkipped}개`);
    console.log(`Domain 매핑 없음: ${noMapping}개`);
  }
  if (!domainOnly) {
    console.log(`Concept 업데이트 대상: ${conceptUpdated}개`);
    console.log(`Concept 이미 설정됨 (스킵): ${conceptSkipped}개`);
  }
  console.log(`총 업데이트 대상: ${updates.length}개\n`);

  // 미리보기: 일부 샘플 출력
  if (updates.length > 0) {
    console.log('--- 업데이트 샘플 (최대 20개) ---');
    for (const u of updates.slice(0, 20)) {
      const q = questions.find((x) => x.id === u.id)!;
      const parts = [`[${q.bookCode}] ${q.chapter}`];
      if (q.section) parts.push(`> ${q.section}`);
      if (u.data.domain) parts.push(`domain=${u.data.domain}`);
      if (u.data.conceptId) {
        const concept = concepts.find((c) => c.id === u.data.conceptId);
        parts.push(`concept=${concept?.conceptCode || '?'} (${concept?.title || '?'})`);
      }
      console.log(`  ${parts.join(' | ')}`);
    }
    if (updates.length > 20) {
      console.log(`  ... 외 ${updates.length - 20}개`);
    }
    console.log('');
  }

  // 실제 적용
  if (!dryRun && updates.length > 0) {
    console.log('DB 업데이트 중...');
    let done = 0;
    // 배치 처리 (100개씩)
    for (let i = 0; i < updates.length; i += 100) {
      const batch = updates.slice(i, i + 100);
      await prisma.$transaction(
        batch.map((u) =>
          prisma.question.update({
            where: { id: u.id },
            data: u.data,
          })
        )
      );
      done += batch.length;
      if (done % 500 === 0 || done === updates.length) {
        console.log(`  ${done}/${updates.length} 완료`);
      }
    }
    console.log(`\n완료! ${updates.length}개 문제 업데이트됨.`);
  } else if (dryRun && updates.length > 0) {
    console.log('⚠️  DRY-RUN 모드입니다. 실제 적용하려면 --apply 플래그를 추가하세요:');
    console.log('    npx tsx scripts/auto-tag-questions.ts --apply');
  } else {
    console.log('업데이트할 문제가 없습니다.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
