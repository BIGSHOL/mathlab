import { prisma } from '@/lib/db';
import type { AnalyzedQuestion } from './types';

/**
 * 분석 완료 후 저신뢰/고난도 문항을 자동으로 ExamQuestionReference에 수집
 * 조건: confidence < 0.7 OR difficulty === "4" || "5"
 */
export async function collectLowConfidenceReferences(
  examPaperId: string,
  analysisId: string,
  questions: AnalyzedQuestion[]
) {
  const candidates = questions.filter(q => {
    const conf = q.confidence ?? 1;
    const diff = String(q.difficulty);
    return conf < 0.7 || diff === '4' || diff === '5';
  });

  if (!candidates.length) return 0;

  const paper = await prisma.examPaper.findUnique({
    where: { id: examPaperId },
    select: { subject: true, grade: true },
  });
  if (!paper) return 0;

  const data = candidates.map(q => ({
    subject: paper.subject,
    grade: paper.grade,
    difficulty: String(q.difficulty),
    questionType: q.question_type || 'calculation',
    content: q.ai_comment || `문항 ${q.question_number}`,
    source: `ExamPaper:${examPaperId}`,
    reviewStatus: 'pending',
    examPaperId,
    analysisId,
    questionNumber: typeof q.question_number === 'number'
      ? q.question_number
      : parseInt(String(q.question_number)) || null,
    confidence: q.confidence ?? null,
    topicHierarchy: q.topic || null,
    metadata: q.ability_domain ? { abilityDomain: q.ability_domain } : undefined,
  }));

  await prisma.examQuestionReference.createMany({ data });
  return data.length;
}
