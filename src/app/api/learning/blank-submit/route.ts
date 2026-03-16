import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, isResponse, validateBody, requireResource } from '@/lib/api';
import { blankSubmitSchema } from '@/lib/schemas/learning';

interface BlankItem {
  position: number;
  answer: string;
  hint: string;
}

/**
 * 빈칸 정답 매칭 로직
 * - 일반 텍스트: 대소문자 무시, 양쪽 공백 제거
 * - LaTeX 수식 ($...$): $ 제거 후 비교, 단순 수식은 plain text도 허용
 *   예: answer="$1$" → "1" 입력 시 정답
 *   예: answer="$a^2$" → "a^2" 입력 시 정답
 */
function matchBlankAnswer(expected: string, submitted: string): boolean {
  const exp = expected.trim();
  const sub = submitted.trim();
  if (!exp || !sub) return false;

  // 일반 텍스트 비교
  if (exp.toLowerCase() === sub.toLowerCase()) return true;

  // LaTeX 정답인 경우: $...$ 내부와 비교
  if (exp.startsWith('$') && exp.endsWith('$') && exp.length > 2) {
    const inner = exp.slice(1, -1).trim();
    // 학생이 plain text로 입력한 경우 (단순 수식: "1", "a", "12" 등)
    if (inner.toLowerCase() === sub.toLowerCase()) return true;
    // 학생이 LaTeX로 입력한 경우 (MathLive 사용): 공백 정규화 후 비교
    const normalize = (s: string) => s.replace(/\s+/g, '').replace(/\\,/g, '').replace(/\\;/g, '');
    if (normalize(inner) === normalize(sub)) return true;
  }

  return false;
}

// POST /api/learning/blank-submit
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  const parsed = await validateBody(request, blankSubmitSchema);
  if (isResponse(parsed)) return parsed;

  const exercise = await requireResource(
    () => prisma.blankExercise.findUnique({ where: { id: parsed.exerciseId } }),
    '문제를 찾을 수 없습니다'
  );
  if (isResponse(exercise)) return exercise;

  const blanks = exercise.blanks as unknown as BlankItem[];

  const results = parsed.answers.map((a) => {
    const blank = blanks.find((b) => b.position === a.position);
    const isCorrect = blank ? matchBlankAnswer(blank.answer, a.value) : false;
    return {
      position: a.position,
      correct: isCorrect,
      expected: blank?.answer ?? '',
      submitted: a.value,
    };
  });

  const allCorrect = results.every((r) => r.correct);
  const stage = exercise.level === 1 ? 'BLANK_EASY' : exercise.level === 2 ? 'BLANK_HARD' : 'BLANK_FULL';

  // Record progress (XP is awarded via /api/learning/progress when stage is completed)
  const correctCount = results.filter((r) => r.correct).length;
  const score = Math.round((correctCount / results.length) * 100);

  await prisma.learningProgress.upsert({
    where: {
      userId_conceptId_stage: { userId: user.id, conceptId: exercise.conceptId, stage },
    },
    update: {
      score,
      completed: allCorrect,
      completedAt: allCorrect ? new Date() : null,
      attempts: { increment: 1 },
    },
    create: {
      userId: user.id,
      conceptId: exercise.conceptId,
      stage,
      score,
      completed: allCorrect,
      completedAt: allCorrect ? new Date() : null,
      attempts: 1,
    },
  });

  return NextResponse.json({
    data: { correct: allCorrect, results, allCorrect, xpAwarded: 0 },
  });
}
