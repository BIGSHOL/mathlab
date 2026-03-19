import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthViewAs, isResponse, validateBody, requireResource } from '@/lib/api';
import { blankSubmitSchema } from '@/lib/schemas/learning';

interface BlankItem {
  position: number;
  answer: string;
  hint: string;
}

/**
 * LaTeX를 사람이 읽는 plain text로 변환 (간이 버전)
 * 예: \frac{3}{4} → 3/4, \pm 3 → ±3, \sqrt{2} → √2
 */
function latexToPlain(latex: string): string {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\pm/g, '±')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\sqrt\{([^}]+)\}/g, '√$1')
    .replace(/\\overline\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\ldots/g, '…')
    .replace(/\\cdot/g, '·')
    .replace(/\\neq/g, '≠')
    .replace(/\\geq/g, '≥')
    .replace(/\\leq/g, '≤')
    .replace(/\\approx/g, '≈')
    .replace(/\\bar\{([^}]+)\}/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\\/g, '')
    .trim();
}

/** 공백·장식 제거 정규화 */
function normalize(s: string): string {
  return s.replace(/\s+/g, '').replace(/\\,/g, '').replace(/\\;/g, '').replace(/\\!/g, '');
}

/**
 * 빈칸 정답 매칭 로직
 * - 일반 텍스트: 대소문자 무시, 양쪽 공백 제거
 * - LaTeX 수식 ($...$): 여러 방법으로 비교
 *   1. $ 제거 후 LaTeX 원문 비교 (MathLive 입력)
 *   2. LaTeX → plain text 변환 후 비교 (직접 타이핑)
 *   3. 단순 값은 plain text도 허용 (예: answer="$1$" → "1" 정답)
 */
function matchBlankAnswer(expected: string, submitted: string): boolean {
  const exp = expected.trim();
  const sub = submitted.trim();
  if (!exp || !sub) return false;

  // 1. 완전 일치 (대소문자 무시)
  if (exp.toLowerCase() === sub.toLowerCase()) return true;

  // 2. LaTeX 정답인 경우
  if (exp.startsWith('$') && exp.endsWith('$') && exp.length > 2) {
    const inner = exp.slice(1, -1).trim();

    // 2a. 학생이 plain text로 입력 (단순 값: "1", "a", "12", "-8" 등)
    if (inner.toLowerCase() === sub.toLowerCase()) return true;

    // 2b. LaTeX 공백 정규화 후 비교 (MathLive에서 입력한 LaTeX)
    if (normalize(inner) === normalize(sub)) return true;

    // 2c. 학생 입력도 $...$로 감싸서 비교
    if (sub.startsWith('$') && sub.endsWith('$')) {
      const subInner = sub.slice(1, -1).trim();
      if (normalize(inner) === normalize(subInner)) return true;
    }

    // 2d. LaTeX → plain text 변환 후 비교
    const plainExpected = latexToPlain(inner);
    const plainSubmitted = sub.replace(/\$/g, '');
    if (plainExpected.toLowerCase() === plainSubmitted.toLowerCase()) return true;
    if (normalize(plainExpected) === normalize(plainSubmitted)) return true;
  }

  // 3. 학생이 $...$로 감싼 경우 (정답이 일반 텍스트)
  if (sub.startsWith('$') && sub.endsWith('$') && sub.length > 2) {
    const subInner = sub.slice(1, -1).trim();
    if (exp.toLowerCase() === subInner.toLowerCase()) return true;
  }

  return false;
}

// POST /api/learning/blank-submit
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
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

  const hintCount = parsed.hintCount ?? 0;
  const revealCount = parsed.revealCount ?? 0;
  const usedReveal = revealCount > 0;

  // LearningProgress 업데이트 + BlankAttempt/AnswerLog 저장을 트랜잭션으로
  await prisma.$transaction([
    prisma.learningProgress.upsert({
      where: {
        userId_conceptId_stage: { userId: user.id, conceptId: exercise.conceptId, stage },
      },
      update: {
        score,
        completed: allCorrect,
        completedAt: allCorrect ? new Date() : null,
        attempts: { increment: 1 },
        hintCount: { increment: hintCount },
        revealCount: { increment: revealCount },
        ...(usedReveal && { usedReveal: true }),
      },
      create: {
        userId: user.id,
        conceptId: exercise.conceptId,
        stage,
        score,
        completed: allCorrect,
        completedAt: allCorrect ? new Date() : null,
        attempts: 1,
        hintCount,
        revealCount,
        usedReveal,
      },
    }),
    // 개별 답변 이력 저장
    prisma.blankAttempt.create({
      data: {
        studentId: user.id,
        conceptId: exercise.conceptId,
        stage,
        score,
        allCorrect,
        hintCount,
        revealCount,
        answers: {
          create: results.map((r) => ({
            blankPosition: r.position,
            submittedAnswer: r.submitted,
            correctAnswer: r.expected,
            isCorrect: r.correct,
          })),
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: { correct: allCorrect, results, allCorrect, xpAwarded: 0 },
  });
}
