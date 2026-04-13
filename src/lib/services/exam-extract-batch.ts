/**
 * 기출 시험지 문제 추출 배치 서비스
 * extract-to-bank API의 Gemini 추출 로직 + /api/questions/bulk의 저장 로직을 단일 함수로 결합.
 * SUPER_ADMIN이 승인한 시험지를 서버에서 순차 처리할 때 사용.
 */

import path from 'path';
import { readFile } from 'fs/promises';
import { prisma } from '@/lib/db';
import { getGeminiClient } from '@/lib/services/gemini';
import {
  MATH_EXTRACT_SCHEMA,
  MATH_SYSTEM_PROMPT,
  mathTextbookPlugin,
} from '@/lib/pdf-extract-engine/presets/math-textbook';
import {
  mergeExtractedWithAnalysis,
  type ExtractedProblemForMerge,
} from '@/lib/exam-analysis/exam-to-question-mapper';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { autoTag } from '@/lib/services/question-tagger';

const EXAM_PROMPT_SUFFIX = `

[추가 지시 — 학교 시험지 (최우선)]
이 문서는 학교 시험지입니다. 일반 교재와 다른 규칙을 적용하세요:

1. **문제 번호(questionNum)를 반드시 정확히 식별하세요!**
2. **객관식 보기(①②③④⑤)를 반드시 choices 배열로 추출하세요!**
3. 시험지에 정답이 없으면 answer는 빈 문자열로 두세요.
4. 배점 표시(예: "[5점]", "(4점)")는 무시하세요.
5. 서술형/서답형 문항도 빠짐없이 추출하세요.
6. **[보기]/[조건] 표기 통일 (필수!)** — [보기], [조건] 로 통일
7. **도형/그림이 있는 문항은 반드시 diagramSvgs로 SVG 생성**
8. **sectionHeader는 교육과정 표준 소단원명** (교재 고유 분류 금지)
`;

function gradeToBookCode(grade: string): string {
  if (grade.startsWith('middle_')) return `${grade.replace('middle_', '')}-1`;
  if (grade.startsWith('elementary_')) return `E${grade.replace('elementary_', '')}-1`;
  if (grade.startsWith('high_')) return `H${grade.replace('high_', '')}`;
  return '0-0';
}

async function loadFileAsBase64(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`파일 다운로드 실패: ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf).toString('base64');
  }
  const filePath = path.join(process.cwd(), 'public', fileUrl);
  const buffer = await readFile(filePath);
  return buffer.toString('base64');
}

export interface ExtractOneResult {
  examPaperId: string;
  success: boolean;
  created?: number;
  replaced?: number;
  error?: string;
}

/**
 * 단일 시험지 Gemini 추출 + Question 저장 (idempotent)
 * 이미 추출된 시험지는 기존 Question 삭제 후 재생성.
 */
export async function extractAndSaveExamPaper(
  examPaperId: string,
  triggeredBy: string,
): Promise<ExtractOneResult> {
  try {
    const examPaper = await prisma.examPaper.findUnique({
      where: { id: examPaperId },
      include: {
        analyses: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!examPaper) return { examPaperId, success: false, error: '시험지 없음' };
    if (examPaper.status !== 'COMPLETED') return { examPaperId, success: false, error: '분석 미완료' };

    const latestAnalysis = examPaper.analyses[0];
    if (!latestAnalysis) return { examPaperId, success: false, error: '분석 결과 없음' };

    const bookCode = gradeToBookCode(examPaper.grade);

    // 1. 파일 로드
    const fileUrls = examPaper.fileUrls.split(',');
    const imageDataList: string[] = [];
    for (const fileUrl of fileUrls) {
      imageDataList.push(await loadFileAsBase64(fileUrl));
    }

    // 2. Gemini 호출
    const client = getGeminiClient();
    const mimeType = examPaper.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg';
    const prompt = MATH_SYSTEM_PROMPT + EXAM_PROMPT_SUFFIX;

    const imageParts = imageDataList.map((data) => ({ inlineData: { mimeType, data } }));

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [...imageParts, { text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: MATH_EXTRACT_SCHEMA,
      },
    });

    const text = response.text || '';
    if (!text) throw new Error('AI 응답이 비어있습니다');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const extractedRaw = mathTextbookPlugin.postProcess(parsed, 1);
    const extracted: ExtractedProblemForMerge[] = extractedRaw.map((p) => ({
      questionNum: p.questionNum,
      pageNum: p.pageNum,
      sectionHeader: p.sectionHeader,
      content: p.content,
      choices: p.choices,
      answer: p.answer,
      explanation: p.explanation || '',
      sourceTag: p.sourceTag,
      difficulty: p.difficulty,
      type: p.type,
      diagramParams: p.diagramParams,
      diagramSvgs: p.diagramSvgs,
    }));

    // 3. 기출분석 메타와 병합
    const analyzed = latestAnalysis.questions as unknown as AnalyzedQuestion[];
    const merged = mergeExtractedWithAnalysis(extracted, analyzed, bookCode, examPaper.title);

    if (!merged.questions || merged.questions.length === 0) {
      throw new Error('추출된 문제 없음');
    }

    // 4. autoTag + DB 저장 (idempotent: 기존 Question 삭제 후 재생성)
    const taggedQuestions = await Promise.all(
      merged.questions.map(async (q) => {
        const tag = await autoTag({
          chapter: q.chapter,
          section: q.section ?? undefined,
          difficulty: q.difficulty,
          bookCode: q.bookCode,
        });
        return {
          ...q,
          domain: q.domain || tag.domain,
          abilityDomain: tag.abilityDomain,
          conceptId: tag.conceptId,
        };
      }),
    );

    const result = await prisma.$transaction(async (tx) => {
      const del = await tx.question.deleteMany({
        where: { examPaperId: examPaper.id, isDraft: false },
      });

      const created = await tx.question.createMany({
        data: taggedQuestions.map((q) => ({
          bookCode: q.bookCode,
          chapter: q.chapter,
          section: q.section || null,
          questionNum: q.questionNum,
          pageNum: q.pageNum || null,
          difficulty: q.difficulty,
          type: q.type,
          content: q.content,
          choices: q.choices || undefined,
          answer: q.answer,
          explanation: q.explanation || null,
          source: q.source || null,
          sourceTag: q.sourceTag || null,
          domain: q.domain || null,
          abilityDomain: q.abilityDomain || null,
          conceptId: q.conceptId || null,
          diagramSpec: q.diagramSpec || undefined,
          diagramSVG: q.diagramSVG || null,
          tenantId: examPaper.tenantId,
          createdById: triggeredBy,
          examPaperId: examPaper.id,
        })),
        skipDuplicates: true,
      });

      await tx.examPaper.update({
        where: { id: examPaper.id },
        data: {
          extractedToBankAt: new Date(),
          extractedQuestionCount: created.count,
          lastExtractError: null,
        },
      });

      return { created: created.count, deleted: del.count };
    });

    return {
      examPaperId,
      success: true,
      created: result.created,
      replaced: result.deleted,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    await prisma.examPaper.update({
      where: { id: examPaperId },
      data: {
        extractAttempts: { increment: 1 },
        lastExtractError: message.slice(0, 500),
      },
    }).catch(() => { /* 무시 */ });
    return { examPaperId, success: false, error: message };
  }
}

/**
 * 예약된 스케줄을 처리하는 틱 함수.
 * Cron에서 주기적으로 호출 (5분 간격 권장).
 */
export async function processPendingSchedules(): Promise<{ processed: number; results: ExtractOneResult[] }> {
  const now = new Date();
  const due = await prisma.examExtractSchedule.findMany({
    where: { status: 'PENDING', scheduledAt: { lte: now } },
    orderBy: { scheduledAt: 'asc' },
    take: 5, // 틱당 최대 5개 스케줄
  });

  const allResults: ExtractOneResult[] = [];
  let processedCount = 0;

  for (const schedule of due) {
    // 상태를 RUNNING으로 전환 (동시 틱 방지)
    const claimed = await prisma.examExtractSchedule.updateMany({
      where: { id: schedule.id, status: 'PENDING' },
      data: { status: 'RUNNING', startedAt: new Date() },
    });
    if (claimed.count === 0) continue; // 다른 틱이 가져감

    const scheduleResults: ExtractOneResult[] = [];
    let success = 0;
    let failed = 0;

    // Vercel 함수 시간 제한을 고려해 틱당 최대 N건만 처리
    const MAX_PER_TICK = 5;
    const batch = schedule.examPaperIds.slice(0, MAX_PER_TICK);
    const remaining = schedule.examPaperIds.slice(MAX_PER_TICK);

    for (const paperId of batch) {
      const res = await extractAndSaveExamPaper(paperId, schedule.createdBy);
      scheduleResults.push(res);
      if (res.success) success++;
      else failed++;
    }

    // 남은 항목이 있으면 스케줄을 PENDING으로 복귀 + 나머지 ID만 유지
    if (remaining.length > 0) {
      await prisma.examExtractSchedule.update({
        where: { id: schedule.id },
        data: {
          status: 'PENDING',
          examPaperIds: remaining,
          startedAt: null,
          result: { partial: true, processedSoFar: batch.length, details: scheduleResults as unknown as object } as object,
        },
      });
      allResults.push(...scheduleResults);
      processedCount++;
      continue;
    }

    await prisma.examExtractSchedule.update({
      where: { id: schedule.id },
      data: {
        status: failed === 0 ? 'DONE' : failed === schedule.examPaperIds.length ? 'FAILED' : 'DONE',
        finishedAt: new Date(),
        result: { success, failed, total: schedule.examPaperIds.length, details: scheduleResults as unknown as object } as object,
      },
    });

    allResults.push(...scheduleResults);
    processedCount++;
  }

  return { processed: processedCount, results: allResults };
}
