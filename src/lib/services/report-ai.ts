/**
 * 레벨테스트 보고서 AI 멘트 생성
 * - Claude Sonnet 4.6 1회 호출로 모든 멘트 생성 (품질 최적화)
 * - Fallback: static 멘트 (API 실패 시)
 */

import Anthropic from '@anthropic-ai/sdk';
import { DIFFICULTY_LABELS, DOMAIN_LABELS } from '@/types';

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
      model: 'claude-sonnet-4-6-20250514',
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
