/**
 * 레벨테스트 보고서 AI 멘트 생성
 * - 총평: Claude Haiku (비용 최적화, 고품질 한국어 서술)
 * - Fallback: static 멘트 (API 실패 시)
 */

import Anthropic from '@anthropic-ai/sdk';

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

interface ReportAIOutput {
  totalReview: string;
  analysisGuide: string;
}

const DIFF_LABELS: Record<string, string> = { BASIC: '하', MEDIUM: '중', HIGH: '상', HIGHEST: '최상' };
const DOMAIN_LABELS: Record<string, string> = {
  CALCULATION: '계산력', UNDERSTANDING: '이해력',
  PROBLEM_SOLVING: '문제해결력', REASONING: '추론력',
};

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
      .map(([domain, s]) => `- ${DOMAIN_LABELS[domain] ?? domain}: ${s.accuracy}% (${s.correct}/${s.total})`)
      .join('\n');

    const diffText = input.difficultyStats
      .map(d => `- ${DIFF_LABELS[d.difficulty] ?? d.difficulty}: ${d.accuracy}% (${d.total}문항)`)
      .join('\n');

    const chapterText = input.chapterStats
      .map(c => `- ${c.name}: ${c.accuracy}% (${c.total}문항)`)
      .join('\n');

    const prompt = `당신은 한국 수학 학원의 전문 교육 상담사입니다. 학부모에게 전달할 레벨테스트 보고서의 총평과 분석 도움말을 작성해주세요.

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
  "totalReview": "총평 텍스트 (4~5문장. '${input.studentName} 학생은...'으로 시작. 강점/약점 균형, 구체적 수치 인용, 격려 포함. 학부모가 읽을 수 있도록 정중하고 전문적인 어조로 작성.)",
  "analysisGuide": "분석 도움말 텍스트 (3~4문장. '${input.studentName} 학생은...'으로 시작. 영역별 점수의 의미, 난이도별 분석 활용법, 단원별 성취도 해석 방법을 안내. 보고서를 어떻게 읽으면 좋을지 구체적으로 설명.)"
}`;

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
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
