/**
 * 내신대비 캠페인 P4 서비스
 *
 * 1. AI 예상 문제 생성 — Gemini로 출제 패턴(topChapters/killerTypes) 기반 예상 문제 N개 생성
 * 2. 모의 등급 예측 — 학생 진도/패턴 기반 단순 휴리스틱
 * 3. 결과 보고서 — Claude로 캠페인 학습 종료 보고서 생성
 *
 * 비용 정책:
 *   - AI 예상 문제: 캠페인당 1회 (선생님 명시 트리거), 5~10문제 권장
 *   - 결과 보고서: 학생 enrollment 종료 시 1회
 */

import { prisma } from '@/lib/db';
import { getGeminiClient, parseGeminiJson } from './gemini';
import { Type } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import type { Prisma, QuestionDifficulty, QuestionType } from '@prisma/client';
import type { ScheduleDay } from './exam-campaign-scheduler';
import type { PatternAnalysis } from './exam-campaign-curator';

// ── 1. AI 예상 문제 생성 ──

const PREDICTED_QUESTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          chapter: { type: Type.STRING, description: '대단원명' },
          content: { type: Type.STRING, description: '문제 본문 (Markdown + $...$ 수식)' },
          choices: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '5지선다 객관식 보기',
          },
          answer: { type: Type.STRING, description: '정답 (예: "③")' },
          explanation: { type: Type.STRING, description: '풀이 과정' },
          difficulty: { type: Type.STRING, description: '"3"|"4"|"5"' },
        },
        required: ['chapter', 'content', 'choices', 'answer', 'explanation', 'difficulty'],
      },
    },
  },
  required: ['questions'],
};

interface PredictedQuestionRaw {
  chapter: string;
  content: string;
  choices: string[];
  answer: string;
  explanation: string;
  difficulty: string;
}

const DIFFICULTY_MAP: Record<string, QuestionDifficulty> = {
  '1': 'BASIC',
  '2': 'BASIC',
  '3': 'MEDIUM',
  '4': 'HIGH',
  '5': 'HIGHEST',
};

/** "middle_2" → "2-1" 등 (semester 1 기본) */
function gradeToBookCode(grade: string, semester: number): string {
  if (grade.startsWith('middle_')) return `${grade.replace('middle_', '')}-${semester}`;
  if (grade.startsWith('elementary_')) return `E${grade.replace('elementary_', '')}-${semester}`;
  if (grade.startsWith('high_')) return `H${grade.replace('high_', '')}`;
  return '0-0';
}

/**
 * Gemini로 출제 패턴 기반 예상 문제 N개 생성 → DB Question으로 저장.
 * 생성된 문제 ID는 캠페인 curatedQuestionIds에 추가된다.
 */
export async function generatePredictedQuestions(params: {
  campaignId: string;
  count?: number;
  /** 생성할 난이도 분포 목표 (없으면 자동 보완) — { BASIC: n, MEDIUM: n, HIGH: n, HIGHEST: n } */
  difficultyTarget?: Partial<Record<QuestionDifficulty, number>>;
}): Promise<{ generated: number; questionIds: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const count = params.count ?? 5;

  const campaign = await prisma.examCampaign.findUnique({
    where: { id: params.campaignId },
    select: {
      id: true,
      tenantId: true,
      grade: true,
      semester: true,
      schoolName: true,
      patternAnalysis: true,
      curatedQuestionIds: true,
      createdById: true,
      scopeChapters: true,
    },
  });
  if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');

  const pattern = campaign.patternAnalysis as unknown as PatternAnalysis | null;
  const scope = (campaign.scopeChapters as unknown as Array<{ chapter: string }>) ?? [];

  // 난이도 목표 문자열: AI 프롬프트에 명시적으로 지시
  const DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = {
    BASIC: '"2"(기본)',
    MEDIUM: '"3"(보통)',
    HIGH: '"4"(심화)',
    HIGHEST: '"5"(최고난도)',
  };
  const targetEntries = params.difficultyTarget
    ? Object.entries(params.difficultyTarget).filter(([, n]) => (n ?? 0) > 0)
    : [];
  const difficultyGuidance = targetEntries.length > 0
    ? `난이도 분포 (반드시 준수):\n${targetEntries.map(([lv, n]) => `- ${DIFFICULTY_LABEL[lv as QuestionDifficulty]} ${n}문제`).join('\n')}`
    : '난이도는 "3"(응용)~"5"(최고난도)에서 다양하게 분포';

  // 패턴 컨텍스트 구성
  const topChaptersText = pattern?.topChapters?.length
    ? pattern.topChapters.slice(0, 5).map((tc) => `- ${tc.chapter} (${tc.pct}%)`).join('\n')
    : scope.map((s) => `- ${s.chapter}`).join('\n');

  const killerText = pattern?.killerTypes?.length
    ? pattern.killerTypes.slice(0, 3).map((k) => `- ${k.topic} (난이도 ${k.difficulty})`).join('\n')
    : '없음';

  const prompt = `당신은 한국 ${campaign.grade.startsWith('middle_') ? '중학교' : '고등학교'} 수학 출제 전문가입니다.
${campaign.schoolName ?? '특정 학교'}의 출제 패턴을 분석한 결과를 바탕으로 ${count}개의 예상 문제를 만들어주세요.

<자주_출제되는_단원>
${topChaptersText}
</자주_출제되는_단원>

<킬러_유형>
${killerText}
</킬러_유형>

<요구사항>
1. ${count}개 문제 모두 5지선다 객관식
2. ${difficultyGuidance}
3. 수식은 LaTeX($...$)로 작성, \\dfrac 금지 → \\frac 사용
4. 각 문제는 자주_출제되는_단원 중 하나에 매핑
5. 풀이는 단계별로 친절하게 작성
6. 보기는 매력적인 오답(자주 하는 실수 반영)을 포함
</요구사항>

JSON 스키마에 맞춰 응답하세요.`;

  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: PREDICTED_QUESTIONS_SCHEMA,
    },
  });

  const text = response.text;
  const parsed = parseGeminiJson<{ questions: PredictedQuestionRaw[] }>(text);
  if (!parsed?.questions?.length) {
    return { generated: 0, questionIds: [] };
  }

  const bookCode = gradeToBookCode(campaign.grade, campaign.semester);
  const sourceTag = `예상문제`;
  const sourceLabel = `예상문제:${campaign.id}`;

  // 저장할 questionNum 시작값 — 같은 bookCode 내 max+1
  const lastQ = await prisma.question.findFirst({
    where: { bookCode },
    orderBy: { questionNum: 'desc' },
    select: { questionNum: true },
  });
  let nextNum = (lastQ?.questionNum ?? 0) + 1;

  const createdIds: string[] = [];
  for (const q of parsed.questions) {
    if (!q.content?.trim() || !q.answer?.trim()) continue;
    try {
      const created = await prisma.question.create({
        data: {
          bookCode,
          chapter: q.chapter || scope[0]?.chapter || '예상문제',
          questionNum: nextNum,
          difficulty: DIFFICULTY_MAP[q.difficulty] ?? 'HIGH',
          type: 'MULTIPLE_CHOICE' as QuestionType,
          content: q.content.trim(),
          choices: q.choices ?? [],
          answer: q.answer.trim(),
          explanation: q.explanation?.trim() ?? null,
          source: sourceLabel,
          sourceTag,
          tenantId: campaign.tenantId,
          createdById: campaign.createdById,
        },
        select: { id: true },
      });
      createdIds.push(created.id);
      nextNum += 1;
    } catch (err) {
      console.error('[predictor] question create failed:', err);
    }
  }

  // 캠페인 curatedQuestionIds에 병합
  if (createdIds.length > 0) {
    const existing = (campaign.curatedQuestionIds as unknown as string[]) ?? [];
    await prisma.examCampaign.update({
      where: { id: campaign.id },
      data: {
        curatedQuestionIds: [...existing, ...createdIds] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return { generated: createdIds.length, questionIds: createdIds };
}

// ── 2. 모의 등급 예측 ──

export interface GradePrediction {
  predictedGrade: string;       // "1등급" ~ "9등급"
  confidence: number;           // 0~100
  expectedScore: number;        // 0~100
  reasoning: string;
}

/**
 * 단순 휴리스틱 기반 등급 예측.
 * - 진도율 + 평균 난이도 가중치로 예상 점수 계산
 * - 등급 컷: 1등급(95+), 2(90+), 3(85+), 4(80+), 5(70+), 6(60+), 7(50+), 8(40+), 9
 *
 * 추후: 실제 응시 데이터(QuestionHomeworkAttempt 등)와 결합하여 정확도 향상 가능.
 */
export async function predictGrade(enrollmentId: string): Promise<GradePrediction | null> {
  const enrollment = await prisma.examCampaignEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      progressPct: true,
      schedule: true,
      campaign: { select: { patternAnalysis: true } },
    },
  });
  if (!enrollment) return null;

  const pattern = enrollment.campaign.patternAnalysis as unknown as PatternAnalysis | null;
  const avgDifficulty = pattern?.averageDifficulty ?? 3;

  const schedule = (enrollment.schedule as unknown as ScheduleDay[]) ?? [];
  const allActivities = schedule.flatMap((d) => d.activities.map((a) => ({ ...a, phase: d.phase })));

  // 실제 응시 기반 정답률 집계 (모든 Phase 통합)
  const graded = allActivities.filter(
    (a) => typeof a.correctCount === 'number' && typeof a.totalCount === 'number' && (a.totalCount ?? 0) > 0,
  );
  const totalAnswered = graded.reduce((s, a) => s + (a.totalCount ?? 0), 0);
  const totalCorrect = graded.reduce((s, a) => s + (a.correctCount ?? 0), 0);
  const actualAccuracy = totalAnswered > 0 ? totalCorrect / totalAnswered : null;

  // Phase 4(실전모의) 정답률 — 실전 성적이 가장 신뢰도 높음
  const phase4 = allActivities.filter((a) => a.phase === 4);
  const phase4Graded = phase4.filter((a) => typeof a.totalCount === 'number' && (a.totalCount ?? 0) > 0);
  const phase4Answered = phase4Graded.reduce((s, a) => s + (a.totalCount ?? 0), 0);
  const phase4Correct = phase4Graded.reduce((s, a) => s + (a.correctCount ?? 0), 0);
  const phase4Accuracy = phase4Answered > 0 ? phase4Correct / phase4Answered : null;
  const phase4Done = phase4.length > 0 ? phase4.filter((a) => a.completed).length / phase4.length : 0;

  // 난이도 보정: 난이도 5면 -10, 1이면 +10
  const difficultyAdjust = (3 - avgDifficulty) * 5;

  // 점수 산정 가중치
  // - 실제 응시 데이터 있으면: Phase 4 정답률 * 40 + 전체 정답률 * 40 + 진도 10 + 난이도 10
  // - 없으면: 기존 진도 기반 방식 (진도*0.8 + difficulty + mockBonus)
  let expectedScore: number;
  if (actualAccuracy !== null) {
    const base =
      (phase4Accuracy ?? actualAccuracy) * 40 + // 실전 모의 40점
      actualAccuracy * 40 +                       // 전체 정답률 40점
      (enrollment.progressPct / 100) * 10 +       // 진도 10점
      10;                                         // 기본 10점
    expectedScore = Math.max(0, Math.min(100, Math.round(base + difficultyAdjust)));
  } else {
    const baseFromProgress = enrollment.progressPct * 0.8;
    const mockBonus = phase4Done * 10;
    expectedScore = Math.max(0, Math.min(100, Math.round(baseFromProgress + difficultyAdjust + mockBonus)));
  }

  let predictedGrade: string;
  if (expectedScore >= 95) predictedGrade = '1등급';
  else if (expectedScore >= 90) predictedGrade = '2등급';
  else if (expectedScore >= 85) predictedGrade = '3등급';
  else if (expectedScore >= 80) predictedGrade = '4등급';
  else if (expectedScore >= 70) predictedGrade = '5등급';
  else if (expectedScore >= 60) predictedGrade = '6등급';
  else if (expectedScore >= 50) predictedGrade = '7등급';
  else if (expectedScore >= 40) predictedGrade = '8등급';
  else predictedGrade = '9등급';

  // 신뢰도: 응시 표본이 많을수록 + 진도 높을수록 높음
  const sampleBonus = Math.min(30, Math.floor(totalAnswered / 3));
  const confidence = Math.min(95, Math.round(enrollment.progressPct * 0.5 + sampleBonus + 10));

  const reasoning = actualAccuracy !== null
    ? `실제 정답률 ${Math.round(actualAccuracy * 100)}% (${totalCorrect}/${totalAnswered}) · ` +
      (phase4Accuracy !== null
        ? `모의고사 ${Math.round(phase4Accuracy * 100)}% · `
        : '') +
      `진도 ${enrollment.progressPct}% · 평균 난이도 ${avgDifficulty.toFixed(1)}`
    : `진도 ${enrollment.progressPct}% · 평균 난이도 ${avgDifficulty.toFixed(1)} · 아직 응시 데이터 부족`;

  // 캐시 업데이트
  await prisma.examCampaignEnrollment.update({
    where: { id: enrollmentId },
    data: { predictedGrade },
  });

  return {
    predictedGrade,
    confidence,
    expectedScore,
    reasoning,
  };
}

// ── 3. Claude 결과 보고서 ──

export interface CampaignReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  generatedAt: string;
}

export async function generateCampaignReport(enrollmentId: string): Promise<CampaignReport | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[predictor] ANTHROPIC_API_KEY not set');
    return null;
  }

  const enrollment = await prisma.examCampaignEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      progressPct: true,
      schedule: true,
      student: { select: { name: true, grade: true } },
      campaign: {
        select: {
          title: true,
          schoolName: true,
          examType: true,
          examDate: true,
          scopeChapters: true,
          patternAnalysis: true,
        },
      },
    },
  });
  if (!enrollment) return null;

  const schedule = (enrollment.schedule as unknown as ScheduleDay[]) ?? [];
  const totalActivities = schedule.reduce((s, d) => s + d.activities.length, 0);
  const doneActivities = schedule.reduce(
    (s, d) => s + d.activities.filter((a) => a.completed).length,
    0,
  );
  const phaseStats = [1, 2, 3, 4, 5].map((p) => {
    const phaseActs = schedule.filter((d) => d.phase === p).flatMap((d) => d.activities);
    return {
      phase: p,
      total: phaseActs.length,
      done: phaseActs.filter((a) => a.completed).length,
    };
  });

  const pattern = enrollment.campaign.patternAnalysis as unknown as PatternAnalysis | null;
  const scope = (enrollment.campaign.scopeChapters as unknown as Array<{ chapter: string }>) ?? [];

  const phaseStatsText = phaseStats
    .filter((p) => p.total > 0)
    .map((p) => `- Phase ${p.phase}: ${p.done}/${p.total} (${Math.round((p.done / p.total) * 100)}%)`)
    .join('\n');

  const prompt = `당신은 한국 수학 학원의 학습 코치입니다. 학생의 내신대비 캠페인 학습 결과를 종합하여 보고서를 작성해주세요.

<학생>
이름: ${enrollment.student.name}
학년: ${enrollment.student.grade ?? '미지정'}
</학생>

<캠페인>
제목: ${enrollment.campaign.title}
학교: ${enrollment.campaign.schoolName ?? '미지정'}
시험: ${enrollment.campaign.examType}
시험일: ${enrollment.campaign.examDate.toISOString().slice(0, 10)}
시험 범위: ${scope.map((s) => s.chapter).join(', ')}
</캠페인>

<학습_진행_상황>
전체 진도: ${enrollment.progressPct}% (${doneActivities}/${totalActivities} 활동)
${phaseStatsText}
</학습_진행_상황>

<출제_패턴>
평균 난이도: ${pattern?.averageDifficulty?.toFixed(1) ?? '-'}
주요 출제 단원: ${pattern?.topChapters?.slice(0, 3).map((c) => c.chapter).join(', ') ?? '-'}
</출제_패턴>

다음 JSON 형식으로만 응답하세요:
{
  "summary": "종합 평가 (3~4문장. 학생 이름으로 시작. 학습 성취도와 캠페인 활용도를 균형 있게.)",
  "strengths": ["강점 1", "강점 2", "강점 3"],
  "weaknesses": ["약점 1", "약점 2", "약점 3"],
  "recommendation": "시험 직전 권장 사항 (2~3문장. 구체적이고 실천 가능한.)"
}`;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') return null;

    // JSON 추출
    const text = content.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Omit<CampaignReport, 'generatedAt'>;
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[predictor] report generation failed:', err);
    return null;
  }
}
