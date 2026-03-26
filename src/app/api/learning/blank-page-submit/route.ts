import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuthViewAs, isResponse, validateBody, requireResource, requireLicense } from '@/lib/api';
import { blankPageSubmitSchema } from '@/lib/schemas/learning';
import { XP_REWARDS } from '@/lib/utils/xp';
import { isFeatureEnabled } from '@/lib/utils/features';
import { getGeminiClient, parseGeminiJson } from '@/lib/services/gemini';
import { Type } from '@google/genai';

// --- Gemini 구조화 출력 스키마 ---
const AI_GRADING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      description: '0~100 사이의 점수. 핵심 개념 이해도 기준.',
    },
    feedback: {
      type: Type.STRING,
      description: '학생에게 보여줄 한국어 피드백 (2~3문장, 격려 포함)',
    },
    missingConcepts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '학생이 빠뜨린 핵심 개념 목록 (한국어)',
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '학생이 잘 기억한 부분 목록 (한국어)',
    },
  },
  required: ['score', 'feedback', 'missingConcepts', 'strengths'],
};

interface AiGradingResult {
  score: number;
  feedback: string;
  missingConcepts: string[];
  strengths: string[];
}

/** 기존 키워드 매칭 채점 (폴백용) */
function keywordGrading(fullContent: string, studentContent: string) {
  const keywords = fullContent
    .replace(/[#*\n\r]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const contentWords = studentContent.split(/\s+/);
  const matchCount = contentWords.filter((w) =>
    keywords.some((k) => k.includes(w) || w.includes(k))
  ).length;
  const score = Math.min(100, Math.round((matchCount / Math.max(keywords.length * 0.3, 1)) * 100));
  return { score, passed: score >= 70 };
}

/** Gemini AI 채점 시도 */
async function aiGrading(fullContent: string, studentContent: string): Promise<AiGradingResult | null> {
  try {
    const ai = getGeminiClient();
    const prompt = `당신은 한국 수학 교육 전문가입니다.

[원본 개념 내용]
${fullContent}

[학생이 기억해서 작성한 내용]
${studentContent}

학생이 백지 상태에서 기억해서 작성한 내용을 원본과 비교하여 채점해주세요.

채점 기준:
1. 핵심 수학 개념과 원리를 올바르게 이해하고 있는지가 가장 중요합니다
2. 맞춤법이나 문법 오류는 감점하지 마세요
3. 표현이 다르더라도 같은 의미를 전달하면 정답으로 인정하세요
4. 수학 공식이나 기호가 정확한지 확인하세요
5. 70점 이상이면 통과입니다`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: AI_GRADING_SCHEMA,
      },
    });

    return parseGeminiJson<AiGradingResult>(response.text);
  } catch (err) {
    console.error('[AI Grading] Gemini 호출 실패, 키워드 폴백 사용:', err);
    return null;
  }
}

// POST /api/learning/blank-page-submit
export async function POST(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;

  const licenseCheck = await requireLicense(user, 'concept');
  if (licenseCheck) return licenseCheck;

  const parsed = await validateBody(request, blankPageSubmitSchema);
  if (isResponse(parsed)) return parsed;

  const concept = await requireResource(
    () => prisma.concept.findUnique({ where: { id: parsed.conceptId } }),
    '개념을 찾을 수 없습니다'
  );
  if (isResponse(concept)) return concept;

  // --- 채점 ---
  let score: number;
  let passed: boolean;
  let feedback: string;
  let missingConcepts: string[] | undefined;
  let strengths: string[] | undefined;

  const useAi = await isFeatureEnabled('ai_blank_grading', user.tenantId);

  if (useAi) {
    const aiResult = await aiGrading(concept.fullContent, parsed.content);
    if (aiResult) {
      score = Math.max(0, Math.min(100, Math.round(aiResult.score)));
      passed = score >= 70;
      feedback = aiResult.feedback;
      missingConcepts = aiResult.missingConcepts;
      strengths = aiResult.strengths;
    } else {
      // AI 실패 → 키워드 폴백
      const kw = keywordGrading(concept.fullContent, parsed.content);
      score = kw.score;
      passed = kw.passed;
      feedback = passed
        ? '훌륭합니다! 핵심 개념을 잘 이해하고 있습니다.'
        : '일부 핵심 내용이 빠져있습니다. 다시 복습해보세요.';
    }
  } else {
    // 피처플래그 비활성 → 기존 키워드 채점
    const kw = keywordGrading(concept.fullContent, parsed.content);
    score = kw.score;
    passed = kw.passed;
    feedback = passed
      ? '훌륭합니다! 핵심 개념을 잘 이해하고 있습니다.'
      : '일부 핵심 내용이 빠져있습니다. 다시 복습해보세요.';
  }

  // --- DB 저장 ---
  await prisma.learningProgress.upsert({
    where: {
      userId_conceptId_stage: { userId: user.id, conceptId: parsed.conceptId, stage: 'BLANK_PAGE' },
    },
    update: {
      score,
      completed: passed,
      completedAt: passed ? new Date() : null,
      attempts: { increment: 1 },
      submittedText: parsed.content,
    },
    create: {
      userId: user.id,
      conceptId: parsed.conceptId,
      stage: 'BLANK_PAGE',
      score,
      completed: passed,
      completedAt: passed ? new Date() : null,
      attempts: 1,
      submittedText: parsed.content,
    },
  });

  const xpAwarded = passed ? XP_REWARDS.BLANK_PAGE : 0;

  return NextResponse.json({
    data: {
      score,
      passed,
      feedback,
      xpAwarded,
      ...(missingConcepts && { missingConcepts }),
      ...(strengths && { strengths }),
    },
  });
}
