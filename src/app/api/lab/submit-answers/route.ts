// 🚧 Lab ⑤ — 학생답 제출 API (은닉, SUPER_ADMIN 전용)
//   POST { worksheetId, answers: [{problemId, answer}] } → LabSubmissionItem 저장, 워크시트 SUBMITTED.
//   채점은 별도(다음 runStudentCycle에서 autoGrader). 무작위 시뮬(simulate-grading) 대체.
import { NextRequest, NextResponse } from 'next/server';
import { guardLabApi } from '@/lib/lab/gate';
import { submitAnswers } from '@/lib/lab/service';

export async function POST(req: NextRequest) {
  const gate = await guardLabApi();
  if (gate instanceof Response) return gate;

  try {
    const body = await req.json().catch(() => ({}));
    const worksheetId = typeof body?.worksheetId === 'string' ? body.worksheetId : undefined;
    const answers = Array.isArray(body?.answers) ? body.answers : undefined;
    if (!worksheetId || !answers) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'worksheetId와 answers가 필요합니다' } },
        { status: 400 },
      );
    }
    // answers 정규화: {problemId, answer} 형태만 통과
    const clean = answers
      .filter((a: unknown): a is { problemId: string; answer: unknown } =>
        !!a && typeof a === 'object' && typeof (a as { problemId?: unknown }).problemId === 'string')
      .map((a: { problemId: string; answer: unknown }) => ({ problemId: a.problemId, answer: a.answer }));
    const submission = await submitAnswers(worksheetId, clean);
    return NextResponse.json({ data: { submissionId: submission.id, count: submission.submittedAnswers.length } });
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: e instanceof Error ? e.message : '오류' } },
      { status: 500 },
    );
  }
}
