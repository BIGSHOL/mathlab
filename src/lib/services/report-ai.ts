/**
 * 레벨테스트 보고서 AI 멘트 생성
 * - Claude Sonnet 4.6 1회 호출로 모든 멘트 생성 (품질 최적화)
 * - Fallback: static 멘트 (API 실패 시)
 */

import Anthropic from '@anthropic-ai/sdk';
import { DIFFICULTY_LABELS, DOMAIN_LABELS } from '@/types';
import type { ParentAIContent } from '@/types/report';

interface ReportAIInput {
  studentName: string;
  grade: number | null;
  testTitle: string;
  overallAccuracy: number;
  recommendLevel: string;
  domainScores: Record<string, { accuracy: number; total: number; correct: number }>;
  weakAreas: { chapter: string; accuracy: number }[];
  strongAreas: { chapter: string; accuracy: number }[];
  difficultyStats: { difficulty: string; accuracy: number; total: number }[];
  chapterStats: { name: string; accuracy: number; total: number }[];
  prerequisiteCount: number;
}

export interface ReportAIOutput {
  totalReview: string;
  analysisGuide: string;
  overallFeedback: string;
  domainFeedbacks: Record<string, string>;
  difficultyComment: string;
  chapterComment: string;
  prerequisiteFeedback: string;
}

const DIFF_LABELS = DIFFICULTY_LABELS as Record<string, string>;

function getGradeLabel(grade: number | null): string {
  if (!grade) return '미정';
  if (grade <= 6) return `초등학교 ${grade}학년`;
  if (grade <= 9) return `중학교 ${grade - 6}학년`;
  return `고등학교 ${grade - 9}학년`;
}

export async function generateReportAI(input: ReportAIInput): Promise<ReportAIOutput | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[report-ai] ANTHROPIC_API_KEY not set, skipping AI generation');
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });

    const domainText = Object.entries(input.domainScores)
      .filter(([k]) => !k.startsWith('_'))
      .map(([domain, s]) => `- ${(DOMAIN_LABELS as Record<string, string>)[domain] ?? domain}: ${s.accuracy}% (${s.correct}/${s.total})`)
      .join('\n');

    const diffText = input.difficultyStats
      .map(d => `- ${DIFF_LABELS[d.difficulty] ?? d.difficulty}: ${d.accuracy}% (${d.total}문항)`)
      .join('\n');

    const chapterText = input.chapterStats
      .map(c => `- ${c.name}: ${c.accuracy}% (${c.total}문항)`)
      .join('\n');

    const domainKeys = Object.keys(input.domainScores).filter(k => !k.startsWith('_'));

    const prompt = `당신은 한국 수학 학원의 전문 교육 상담사입니다. 학부모에게 전달할 레벨테스트 보고서의 모든 멘트를 작성해주세요.

<student_info>
이름: ${input.studentName}
학년: ${getGradeLabel(input.grade)}
시험: ${input.testTitle}
진단 등급: ${input.recommendLevel}
전체 정답률: ${input.overallAccuracy}%
</student_info>

<domain_scores>
${domainText}
</domain_scores>

<difficulty_scores>
${diffText}
</difficulty_scores>

<chapter_scores>
${chapterText}
</chapter_scores>

<weak_areas>${input.weakAreas.length > 0 ? input.weakAreas.map(w => `${w.chapter}(${w.accuracy}%)`).join(', ') : '없음'}</weak_areas>
<strong_areas>${input.strongAreas.length > 0 ? input.strongAreas.map(s => `${s.chapter}(${s.accuracy}%)`).join(', ') : '없음'}</strong_areas>
<prerequisite_deficit>${input.prerequisiteCount}개</prerequisite_deficit>

다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

{
  "totalReview": "종합 총평 (4~5문장. '${input.studentName} 학생은...'으로 시작. 강점/약점 균형, 구체적 수치 인용, 격려 포함. 학부모가 읽을 수 있도록 정중하고 전문적인 어조.)",
  "analysisGuide": "분석 도움말 (3~4문장. 영역별 점수의 의미, 난이도별 분석 활용법, 단원별 성취도 해석 방법 안내.)",
  "overallFeedback": "전체 정답률 기반 종합 피드백 (2~3문장. 현재 수준 진단 + 학습 방향 제시.)",
  "domainFeedbacks": { ${domainKeys.map(d => `"${d}": "${(DOMAIN_LABELS as Record<string, string>)[d] ?? d} 영역 피드백 (1~2문장. 해당 영역 수치를 인용하여 구체적 조언.)"`).join(', ')} },
  "difficultyComment": "난이도별 분석 멘트 (3~4문장. '${input.studentName} 학생은...'으로 시작. 난이도별 정답률 패턴을 분석하고 학습 전략 제시.)",
  "chapterComment": "단원별 성취도 멘트 (3~4문장. '${input.studentName} 학생은...'으로 시작. 강한/약한 단원을 구체적으로 언급하고 보완 방법 제시.)",
  "prerequisiteFeedback": "선수학습 결손 안내 (1~2문장. 결손 ${input.prerequisiteCount}개에 맞는 안내. 0개면 '선수학습이 잘 갖춰져 있습니다.')"
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!text) return null;

    // JSON 파싱 (```json ... ``` 래핑 대응)
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonStr) as ReportAIOutput;
    if (!parsed.totalReview || !parsed.analysisGuide) return null;

    return parsed;
  } catch (error) {
    console.error('[report-ai] AI generation failed:', error);
    return null;
  }
}

// ============================================================
// 학부모용 보고서 AI 생성 (에이전트 패턴 통합)
// ============================================================

interface ParentReportAIInput extends ReportAIInput {
  answerStatuses: (string | null)[];  // statusClassification 배열
  correctCount: number;
  totalCount: number;
}

export async function generateParentReportAI(input: ParentReportAIInput): Promise<ParentAIContent | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });

    // 오답 유형 집계
    const statusCounts = { careless: 0, conceptGap: 0, partial: 0, correct: 0 };
    for (const s of input.answerStatuses) {
      if (s === 'correct') statusCounts.correct++;
      else if (s === 'calcError') statusCounts.careless++;
      else if (s === 'conceptWeak') statusCounts.conceptGap++;
      else statusCounts.partial++;
    }
    const wrongTotal = input.totalCount - input.correctCount;

    const domainText = Object.entries(input.domainScores)
      .filter(([k]) => !k.startsWith('_'))
      .map(([domain, s]) => `- ${(DOMAIN_LABELS as Record<string, string>)[domain] ?? domain}: ${s.accuracy}% (${s.correct}/${s.total})`)
      .join('\n');

    const chapterText = input.chapterStats
      .map(c => `- ${c.name}: ${c.accuracy}% (${c.total}문항)`)
      .join('\n');

    const prompt = `당신은 한국 수학 학원의 학부모 상담 전문가입니다.
레벨테스트 결과를 학부모가 쉽게 이해할 수 있도록 분석하고, 구체적이고 실천 가능한 조언을 제공하세요.
전문 용어를 피하고 일상 언어를 사용하세요.

<student_info>
이름: ${input.studentName}
학년: ${getGradeLabel(input.grade)}
시험: ${input.testTitle}
진단 등급: ${input.recommendLevel}
전체 정답률: ${input.overallAccuracy}% (${input.correctCount}/${input.totalCount})
</student_info>

<domain_scores>
${domainText}
</domain_scores>

<chapter_scores>
${chapterText}
</chapter_scores>

<mistake_analysis>
전체 오답: ${wrongTotal}개
- 계산 실수 (문제를 이해했지만 계산에서 틀림): ${statusCounts.careless}개
- 개념 부족 (문제의 개념을 이해하지 못함): ${statusCounts.conceptGap}개
- 풀이 미흡 (시도했으나 완성하지 못함): ${statusCounts.partial}개
</mistake_analysis>

<weak_areas>${input.weakAreas.length > 0 ? input.weakAreas.map(w => `${w.chapter}(${w.accuracy}%)`).join(', ') : '없음'}</weak_areas>
<strong_areas>${input.strongAreas.length > 0 ? input.strongAreas.map(s => `${s.chapter}(${s.accuracy}%)`).join(', ') : '없음'}</strong_areas>
<prerequisite_deficit>${input.prerequisiteCount}개</prerequisite_deficit>

다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력하세요.

{
  "mistakePatterns": [
    {"type": "calculation_error|concept_gap|careless|time_pressure", "count": 숫자, "percentage": 0~100, "description": "학부모가 이해할 수 있는 설명 1문장"}
  ],
  "topicWeaknesses": [
    {"topic": "단원명", "severityScore": 0.0~1.0, "details": "학부모에게 이 단원이 왜 중요한지 + 보완 방법 1~2문장"}
  ],
  "cognitiveAssessment": {
    "knowledge": 0~100, "comprehension": 0~100, "application": 0~100, "analysis": 0~100
  },
  "learningPhases": [
    {"name": "기초 다지기", "duration": "2주", "topics": ["단원명1", "단원명2"], "checkpoint": "이 단계 완료 기준"},
    {"name": "심화 학습", "duration": "3주", "topics": [...], "checkpoint": "..."},
    {"name": "실전 연습", "duration": "2주", "topics": [...], "checkpoint": "..."}
  ],
  "expectedImprovement": "학습 계획을 따랐을 때 기대되는 향상 (1~2문장, 구체적 수치 포함)",
  "characteristics": {
    "levelName": "현재 수준 이름 (예: 중급, 기초 등)",
    "strengths": ["강점 1~3개 (학부모가 칭찬할 수 있는 구체적인 부분)"],
    "weaknesses": ["보완점 1~3개 (부정적이지 않은 표현으로)"]
  },
  "motivationalMessage": "학생을 격려하는 메시지 (2~3문장, 따뜻하고 구체적으로)",
  "simpleExplanation": "전체 결과를 학부모가 바로 이해할 수 있는 3~4문장 요약. '${input.studentName} 학생은...'으로 시작. 수치를 포함하되 쉬운 비유를 활용.",
  "mistakeSummary": {
    "carelessCount": ${statusCounts.careless + statusCounts.partial},
    "conceptGapCount": ${statusCounts.conceptGap},
    "carelessDescription": "단순 실수에 대한 학부모 설명 (1문장)",
    "conceptGapDescription": "개념 부족에 대한 학부모 설명 (1문장)"
  },
  "actionItems": [
    {"period": "today", "items": ["오늘 할 수 있는 구체적 행동 1~2개"]},
    {"period": "this_week", "items": ["이번 주 목표 2~3개"]},
    {"period": "next_week", "items": ["다음 주 계획 2~3개"]}
  ],
  "studyRecommendation": "self|short_course|academy",
  "studyRecommendationReason": "추천 이유 (1~2문장. 정답률, 오답 유형, 취약 영역 기반 판단)",
  "improvementOutlook": "향후 성적 전망 (2~3문장. 현실적이면서 희망적으로. 구체적 기간과 목표 포함)",
  "encouragement": "학부모와 학생 모두에게 전하는 응원 메시지 (2~3문장. 따뜻하고 진정성 있게)"
}

## 판단 기준
- studyRecommendation: 정답률 70%+ → "self", 50~69% → "short_course", 50% 미만 → "academy"
- cognitiveAssessment: 영역별 점수를 기반으로 knowledge(기본 지식), comprehension(이해력), application(응용력), analysis(분석력) 추정
- topicWeaknesses: 정답률 60% 미만 단원 → severityScore 높게, 내림차순 정렬
- learningPhases: 3단계 (기초→심화→실전), 취약 단원 우선`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!text) return null;

    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonStr) as ParentAIContent;
    if (!parsed.simpleExplanation || !parsed.actionItems) return null;

    return parsed;
  } catch (error) {
    console.error('[report-ai] Parent AI generation failed:', error);
    return null;
  }
}
