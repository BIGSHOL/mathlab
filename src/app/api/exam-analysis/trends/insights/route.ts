import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, isResponse, badRequest } from '@/lib/api';
import { getGeminiClient, stripCodeFence } from '@/lib/services/gemini';

interface InsightInput {
  totalExams: number;
  totalQuestions: number;
  avgConfidence: number;
  difficulty: Array<{ difficulty: string; count: number; pct: number }>;
  questionType: Array<{ questionType: string; count: number; pct: number }>;
  questionFormat: Array<{ format: string; count: number; pct: number }>;
  topicFrequency: Array<{ topic: string; count: number; pct: number }>;
  textbookTrends: Array<{ textbook: string; count: number; pct: number }>;
}

interface TrendInsight {
  overallTrend: string;
  keyPatterns: string[];
  difficultyAnalysis: string;
  topicFocus: string;
  preparationTips: string[];
}

const DIFF_LABELS: Record<string, string> = {
  '1': '기본', '2': '표준', '3': '응용', '4': '심화', '5': '최고난도',
};

const TYPE_LABELS: Record<string, string> = {
  calculation: '계산', geometry: '도형', application: '응용',
  proof: '증명', graph: '그래프', statistics: '통계',
};

const FORMAT_LABELS: Record<string, string> = {
  objective: '객관식', short_answer: '단답형', essay: '서술형',
};

/** POST /api/exam-analysis/trends/insights — AI 트렌드 인사이트 생성 */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const body = await request.json() as InsightInput;
  if (!body.totalExams || body.totalExams < 1) {
    return badRequest('분석된 시험지가 1개 이상 필요합니다');
  }

  try {
    const insight = await generateInsight(body);
    return NextResponse.json({ data: insight });
  } catch {
    // AI 실패 시 룰 기반 폴백
    const fallback = generateRuleBasedInsight(body);
    return NextResponse.json({ data: fallback });
  }
}

async function generateInsight(input: InsightInput): Promise<TrendInsight> {
  const gemini = getGeminiClient();

  const diffSummary = input.difficulty
    .filter(d => d.count > 0)
    .map(d => `${DIFF_LABELS[d.difficulty] || d.difficulty}: ${d.count}문항(${d.pct}%)`)
    .join(', ');

  const typeSummary = input.questionType
    .filter(t => t.count > 0)
    .map(t => `${TYPE_LABELS[t.questionType] || t.questionType}: ${t.count}문항(${t.pct}%)`)
    .join(', ');

  const formatSummary = input.questionFormat
    .filter(f => f.count > 0)
    .map(f => `${FORMAT_LABELS[f.format] || f.format}: ${f.count}문항(${f.pct}%)`)
    .join(', ');

  const topTopics = input.topicFrequency
    .slice(0, 5)
    .map(t => `${t.topic}: ${t.count}문항(${t.pct}%)`)
    .join(', ');

  const prompt = `당신은 한국 수학 시험 분석 전문가입니다.

다음 출제 경향 데이터를 분석하여 JSON으로 인사이트를 생성하세요.

## 데이터
- 총 시험지: ${input.totalExams}개, 총 문항: ${input.totalQuestions}개
- 평균 신뢰도: ${input.avgConfidence}%
- 난이도 분포: ${diffSummary}
- 유형 분포: ${typeSummary}
- 형식 분포: ${formatSummary}
- 주요 단원: ${topTopics}
- 교과서: ${input.textbookTrends.map(t => t.textbook).join(', ')}

## JSON 형식
{
  "overallTrend": "전반적인 출제 경향 요약 (2-3문장)",
  "keyPatterns": ["핵심 패턴 1", "핵심 패턴 2", "핵심 패턴 3"],
  "difficultyAnalysis": "난이도 분석 (1-2문장)",
  "topicFocus": "집중 출제 단원 분석 (1-2문장)",
  "preparationTips": ["대비 팁 1", "대비 팁 2", "대비 팁 3"]
}`;

  const response = await gemini.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseMimeType: 'application/json', temperature: 0.3 },
  });

  const text = response.text;
  if (!text) throw new Error('Empty response');

  return JSON.parse(stripCodeFence(text)) as TrendInsight;
}

function generateRuleBasedInsight(input: InsightInput): TrendInsight {
  const topType = input.questionType[0];
  const topTopic = input.topicFrequency[0];
  const highDiff = input.difficulty.filter(d => d.difficulty === '4' || d.difficulty === '5');
  const highPct = highDiff.reduce((s, d) => s + d.pct, 0);
  const essayFmt = input.questionFormat.find(f => f.format === 'essay');
  const essayPct = essayFmt?.pct || 0;

  const overallTrend = `${input.totalExams}개 시험지, ${input.totalQuestions}개 문항을 분석한 결과, ` +
    (input.textbookTrends.length > 1
      ? `복수 교과서(${input.textbookTrends.length}종)의 내용이 통합 출제되고 있습니다.`
      : `단일 교과서 범위에서 출제되고 있습니다.`) +
    (highPct > 30 ? ` 심화·최고난도 문항이 ${Math.round(highPct)}%로 상위권 변별력이 높습니다.` : '');

  const keyPatterns: string[] = [];
  if (topType) keyPatterns.push(`${TYPE_LABELS[topType.questionType] || topType.questionType} 유형이 ${topType.pct}%로 가장 높은 비중`);
  if (topTopic) keyPatterns.push(`${topTopic.topic} 단원이 ${topTopic.pct}%로 최다 출제`);
  if (essayPct >= 15) keyPatterns.push(`서술형 ${Math.round(essayPct)}%로 논리적 서술 능력 요구`);

  const difficultyAnalysis = highPct > 40
    ? '심화·최고난도 비중이 높아 사고력과 문제 해결력이 핵심입니다.'
    : highPct > 20
      ? '중간 난이도 중심이지만 심화 문항도 적절히 포함되어 있습니다.'
      : '기본~표준 난이도 중심으로 기본기 확인에 초점을 맞추고 있습니다.';

  const topicFocus = topTopic
    ? `${topTopic.topic}이 ${topTopic.pct}%로 가장 집중 출제되고 있어 최우선 학습 대상입니다.`
    : '특정 단원 편중 없이 고르게 출제되고 있습니다.';

  const preparationTips = [
    topTopic ? `${topTopic.topic} 단원 집중 복습` : '전 단원 균형 학습',
    highPct > 30 ? '고난도 문항 풀이 연습 필수' : '기본 개념 완벽 숙지 우선',
    essayPct >= 15 ? '서술형 답안 작성 연습 필수' : '객관식 실수 방지 훈련',
  ];

  return { overallTrend, keyPatterns, difficultyAnalysis, topicFocus, preparationTips };
}
