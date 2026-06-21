// 🚧 Lab P1 — 채점(Grader) auto 구현체 (객관식·단답 자동채점)
//   학생이 제출한 답(LabSubmissionItem)을 LabProblem.answer(정답)와 비교해
//   정/오를 산출하고 LabGradedItem을 영속화한다.
//     - 객관식·단답(P1): answer-compare 결정적 비교.
//     - 서술형(P5): descriptive-grader가 Lab 자체 AI(Gemini)로 채점 → 저신뢰는 needsReview.
//   genMode=AUTO. manualGrader를 p0Pipeline에서 교체(grader 필드 1줄).
//
//   ⚠️ 격리(CLAUDE.md): 기출분석 코드 무import. 비교/AI 채점 모두 Lab 자체(../answer-compare, ./descriptive-grader).
//
//   멱등성: 이미 채점된 제출(items 존재)은 다시 채점하지 않고 그대로 read(AI 재호출 비용도 방지).
//     runStudentCycle이 매 사이클 grader.run을 부르므로 중복 LabGradedItem 생성을 막는다.
import { prisma } from '@/lib/db';
import type { Grader, GradedItemDTO } from '../stages';
import { gradeObjective } from '../answer-compare';
import { gradeDescriptive } from './descriptive-grader';

export const autoGrader: Grader = {
  mode: 'AUTO',
  async run({ worksheetId }): Promise<{ items: GradedItemDTO[] }> {
    const submission = await prisma.labSubmission.findUnique({
      where: { worksheetId },
      include: {
        items: { include: { problem: true } }, // 이미 채점된 결과(있으면)
        submittedAnswers: { include: { problem: { include: { concept: true } } } }, // 학생 raw 답 + 개념(AI 채점 맥락)
      },
    });
    if (!submission) return { items: [] };

    // 이미 채점됨 → 멱등 read (재실행 중복 생성 방지). manual 제출과도 호환.
    //   needsReview 항목(서술형 등 미채점 보류)은 진단(mastery)을 편향시키지 않도록 제외한다.
    //   — 영속된 LabGradedItem에는 needsReview=true로 남아 사람 검수 큐가 소비.
    if (submission.items.length > 0) {
      return {
        items: submission.items
          .filter((gi) => !gi.needsReview)
          .map((gi) => ({
            problemId: gi.problemId,
            conceptId: gi.problem.conceptId,
            correct: gi.correct,
            partialScore: gi.partialScore ?? undefined,
            errorType: gi.errorType,
          })),
      };
    }

    // 미채점 → 학생 답을 채점. 객관식·단답은 결정적 비교, 서술형은 AI(gradeDescriptive).
    const verdicts = await Promise.all(
      submission.submittedAnswers.map(async (sa) => {
        if (sa.problem.type === 'DESCRIPTIVE') {
          const v = await gradeDescriptive({
            rubric: sa.problem.answer,
            studentAnswer: sa.answer,
            conceptName: sa.problem.concept?.name,
          });
          return { sa, v };
        }
        return { sa, v: gradeObjective(sa.problem.type, sa.problem.answer, sa.answer) };
      }),
    );

    // 채점 결과 영속화 + 상태 전이(SUBMITTED → GRADED).
    if (verdicts.length > 0) {
      await prisma.$transaction([
        prisma.labGradedItem.createMany({
          data: verdicts.map(({ sa, v }) => ({
            submissionId: submission.id,
            problemId: sa.problemId,
            correct: v.correct,
            partialScore: v.partialScore ?? null,
            errorType: v.errorType,
            confidence: v.confidence,
            needsReview: v.needsReview,
          })),
        }),
        prisma.labSubmission.update({
          where: { id: submission.id },
          data: { gradedAt: new Date(), genMode: 'AUTO' },
        }),
        prisma.labWorksheet.update({
          where: { id: worksheetId },
          data: { status: 'GRADED' },
        }),
      ]);
    }

    // 진단으로는 자동채점이 확정된 항목만 흘려보낸다(needsReview는 영속만 하고 제외).
    const items: GradedItemDTO[] = verdicts
      .filter(({ v }) => !v.needsReview)
      .map(({ sa, v }) => ({
        problemId: sa.problemId,
        conceptId: sa.problem.conceptId,
        correct: v.correct,
        partialScore: v.partialScore,
        errorType: v.errorType,
      }));
    return { items };
  },
};
