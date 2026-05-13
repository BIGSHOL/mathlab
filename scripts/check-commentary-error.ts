/**
 * 가장 최근의 commentary 에이전트 확장 결과를 조회.
 * errorMessage 필드 + result.overall_comment 앞부분을 함께 출력.
 *
 * 사용: npx tsx scripts/check-commentary-error.ts
 */
import { prisma } from '../src/lib/db';

async function main() {
  // schema 에 updatedAt 이 없음 → createdAt 기준 + errorMessage 있는 것 우선
  const rows = await prisma.examAnalysisExtension.findMany({
    where: { agentType: 'commentary' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      analysis: {
        select: {
          examPaperId: true,
          examPaper: { select: { title: true } },
        },
      },
    },
  });

  if (rows.length === 0) {
    console.log('No commentary extensions found.');
    return;
  }

  for (const r of rows) {
    const result = r.result as Record<string, unknown> | null;
    const overall = result && typeof result === 'object' && 'overall_comment' in result
      ? String((result as Record<string, unknown>).overall_comment ?? '').slice(0, 120)
      : '(no overall_comment)';
    const meta = (result as { _meta?: { generatedAt?: string; promptVersion?: string } })?._meta;
    console.log('────────────────────────────────────────');
    console.log('analysisId   :', r.analysisId);
    console.log('examPaperId  :', r.analysis?.examPaperId);
    console.log('examTitle    :', r.analysis?.examPaper?.title);
    console.log('createdAt    :', r.createdAt.toISOString());
    console.log('generatedAt  :', meta?.generatedAt ?? '(no _meta)');
    console.log('promptVersion:', meta?.promptVersion ?? '(no _meta)');
    console.log('errorMessage :', r.errorMessage ?? '(null)');
    console.log('overall(120) :', overall);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
