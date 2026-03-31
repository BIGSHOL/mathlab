/**
 * 종합 코멘터리 에이전트
 *
 * 시험 분석 결과를 선생님용 전문 분석 리포트로 변환
 * - 출제 경향, 난이도 분석, 지도 방향 제시
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent, type AgentInput } from './base-agent';
import type { AgentType } from '../constants';
import { DIFFICULTY_LEGACY_MAP } from '../constants';
import type { BasicAnalysisResult, WeaknessProfile, LearningPlan } from '../types';
import { MIDDLE_SCHOOL_CURRICULUM } from '../data/curriculum';
import type { GradeCurriculum } from '../data/curriculumStrategies';

function normalizeDiff(key: string): string {
  return DIFFICULTY_LEGACY_MAP[key] || key;
}

/** 난이도 분포에서 5단계 합산 값 추출 */
function getDiffCounts(diff: Record<string, number>): { level1: number; level2: number; level3: number; level4: number; level5: number } {
  const get = (keys: string[]) => keys.reduce((s, k) => s + (diff[k] || 0), 0);
  return {
    level1: get(['1', 'concept']),
    level2: get(['2', 'pattern']),
    level3: get(['3']),
    level4: get(['4', 'reasoning']),
    level5: get(['5', 'creative']),
  };
}

// ── 코멘터리 출력 타입 ──

export interface NotableQuestion {
  question_number: number | string;
  comment: string;
}

export interface TeachingRecommendation {
  topic: string;
  priority: number; // 1-5
  reason: string;
}

// 하위 호환: 기존 DB 데이터에 study_priority/encouragement가 있을 수 있음
export interface CommentaryResult {
  overall_comment: string;
  exam_characteristics?: string[];
  score_strategy?: string;
  strength_areas: string[];
  improvement_areas: string[];
  notable_questions: NotableQuestion[];
  teaching_recommendations?: TeachingRecommendation[];
  // 레거시 (기존 DB 호환)
  study_priority?: TeachingRecommendation[];
  encouragement?: string;
}

// ── 에이전트 구현 ──

export class CommentaryAgent extends BaseAgent<Record<string, unknown>> {
  readonly agentType: AgentType = 'commentary';
  readonly temperature = 0.5;

  // ── AI 프롬프트 ──

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;

    const totalQ = basicAnalysis.questions.length;
    const totalPts = basicAnalysis.exam_info.total_points;
    const { difficulty_distribution: diff, type_distribution: types } = basicAnalysis.summary;

    // 단원 통계 사전 계산
    const topicStats: Record<string, { count: number; pts: number }> = {};
    for (const q of basicAnalysis.questions) {
      const topic = q.topic || '미분류';
      if (!topicStats[topic]) topicStats[topic] = { count: 0, pts: 0 };
      topicStats[topic].count++;
      topicStats[topic].pts += q.points || 0;
    }
    const topicSummary = Object.entries(topicStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([t, s]) => `${t}: ${s.count}문항(${s.pts}점)`)
      .join(', ');

    // 종합 난이도 Level 계산 (가중 평균)
    const diffCounts = [
      diff['1'] || diff.concept || 0,
      diff['2'] || diff.pattern || 0,
      diff['3'] || 0,
      diff['4'] || diff.reasoning || 0,
      diff['5'] || diff.creative || 0,
    ];
    const diffTotal = diffCounts.reduce((s, c) => s + c, 0);
    const overallLevel = diffTotal > 0
      ? Math.round(diffCounts.reduce((s, c, i) => s + c * (i + 1), 0) / diffTotal)
      : 3;
    const LEVEL_LABELS = ['', '기본', '표준', '응용', '심화', '최고난도'];

    // 학년 추출 + 교육과정 단원 참조 데이터
    const curriculumBlock = this.buildCurriculumReference(basicAnalysis);

    // 정답 통계 (학생 답안지인 경우)
    const hasStudentData = basicAnalysis.questions.some((q) => q.is_correct !== null);
    let studentStatsBlock = '';
    if (hasStudentData) {
      const correct = basicAnalysis.questions.filter((q) => q.is_correct === true).length;
      const wrong = basicAnalysis.questions.filter((q) => q.is_correct === false).length;
      const earned = basicAnalysis.questions.reduce((s, q) => s + (q.earned_points || 0), 0);
      studentStatsBlock = `
## 학생 답안 통계
- 정답: ${correct}문항 / 오답: ${wrong}문항
- 획득 점수: ${earned}점 / ${totalPts}점 (정답률 ${totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0}%)`;
    }

    const questionsData = basicAnalysis.questions.map((q) => ({
      번호: q.question_number,
      난이도: q.difficulty,
      유형: q.question_type,
      능력영역: q.ability_domain,
      단원: q.topic,
      배점: q.points,
      ...(hasStudentData ? {
        정답여부: q.is_correct === true ? 'O' : q.is_correct === false ? 'X' : '-',
        오답유형: q.error_type || null,
        획득점수: q.earned_points,
      } : {}),
      AI코멘트: q.ai_comment,
    }));

    return `당신은 수학 교육 전문가이자 기출 시험 분석 컨설턴트입니다.
학원 원장/선생님이 학부모 상담 및 학생 지도에 바로 활용할 수 있는 전문 분석 리포트를 작성하세요.

이 총평은 기출 분석 시스템의 3개 탭(기본 분석, AI 코멘트, 학습 대책)을 종합하는 최상위 요약입니다.
아래 데이터를 바탕으로 시험 출제 경향·학생 현재 수준·구체적 지도 방향을 충분히 상세하게 분석하세요.
학부모에게 "이 시험이 어떤 시험이고, 아이가 어떤 상태이며, 앞으로 무엇을 해야 하는지" 설명할 수 있을 만큼 내용이 풍부해야 합니다.

## 시험 개요
- 총 문항수: ${totalQ}문항, 총 배점: ${totalPts}점
- 형식: 객관식 ${basicAnalysis.exam_info.format_distribution.objective}문항, 단답형 ${basicAnalysis.exam_info.format_distribution.short_answer}문항, 서술형 ${basicAnalysis.exam_info.format_distribution.essay}문항
- **종합 난이도: Level ${overallLevel} (${LEVEL_LABELS[overallLevel]})**
- 난이도 분포: 1(기본) ${diff['1'] || diff.concept || 0}문항, 2(표준) ${diff['2'] || diff.pattern || 0}문항, 3(응용) ${diff['3'] || 0}문항, 4(심화) ${diff['4'] || diff.reasoning || 0}문항, 5(최고난도) ${diff['5'] || diff.creative || 0}문항
- 유형 분포: 수와연산 ${types.number || 0}, 문자와식 ${types.algebra || 0}, 함수 ${types.function || 0}, 기하 ${types.geometry || 0}, 확률통계 ${types.statistics || 0}
- 단원별 출제: ${topicSummary}
${studentStatsBlock}
${curriculumBlock}

## 문항 상세
${JSON.stringify(questionsData, null, 1)}

## 출력 형식 (반드시 아래 JSON 구조로 응답)

{
  "overall_comment": "string (5-8문장의 시험 종합 분석)",
  "exam_characteristics": ["string (시험 특성 2-4개)"],
  "score_strategy": "string (난이도별 점수 확보 전략 2-3문장)",
  "strength_areas": ["string (잘 출제된 영역/학생 강점 2-3개)"],
  "improvement_areas": ["string (보완 필요 영역 2-3개)"],
  "notable_questions": [{"question_number": "서술형3", "comment": "string (출제 의도/변별력 관점 분석)"}],
  "teaching_recommendations": [{"topic": "단원명", "priority": 1, "reason": "지도 방향 설명"}]
}

## 작성 지침

### overall_comment (시험 종합 분석)
- 5-8문장으로 시험 전체를 충분히 분석하세요. 학부모 상담에 활용하므로 내용이 풍부해야 합니다.
- 반드시 포함할 내용: ① 시험 규모와 형식 ② 난이도 분포와 적정성 평가 ③ 주요 출제 단원과 비중 ④ 출제 경향의 특징
${hasStudentData ? '- 학생 분석 추가 포함: ⑤ 전체 정답률과 수준 평가 ⑥ 강약점 패턴 요약 ⑦ 향후 학습 방향 한 줄 제언' : ''}
- 학부모가 "이 시험이 어떤 시험인지", "아이 성적이 어떤 의미인지" 한눈에 이해할 수 있어야 합니다.

### exam_characteristics (시험 특성)
- 시험의 핵심 특징을 2-4개 간결한 문장으로 작성하세요.
- 예시: "개념 문항 비중이 높아 기본기 점검에 적합", "서술형 3문항이 총 배점의 30%를 차지하여 변별력이 높음"

### score_strategy (점수 확보 전략)
- 난이도별 배점 합계를 기반으로 단계별 점수 확보 전략을 2-3문장으로 작성하세요.
- 반드시 구체적 점수를 포함하세요. 예시: "난이도 1~2 문항을 모두 맞히면 52점(52%)을 확보할 수 있으며, 3단계까지 포함하면 78점(78%)까지 도달 가능합니다. 90점 이상을 목표로 한다면 4단계 심화 문항 중 최소 2문항은 정답해야 합니다."
- 학부모 상담 시 "우리 아이가 몇 점을 목표로 하려면 어디까지 공부해야 하는지" 설명하는 데 활용됩니다.

### strength_areas / improvement_areas
${hasStudentData
    ? '- 학생의 답안 데이터를 기반으로 잘한 영역과 보완 영역을 각각 2-3개씩 분석하세요.'
    : '- 시험 출제 관점에서 잘 구성된 부분과 보완이 필요한 부분을 각각 2-3개씩 분석하세요.'}
- 각 항목은 1-2문장의 완결된 설명이어야 합니다 (단편적 키워드 나열 금지).
- 구체적 수치를 포함하세요 (예: "도형 영역 5문항 중 4문항 정답(정답률 80%)으로 해당 단원의 기본 개념이 안정적으로 형성되어 있습니다").

### notable_questions (주목할 문항)
- 변별력이 높거나 출제 의도가 돋보이는 문항 3-5개를 선정하세요.
${hasStudentData ? '- 쉬운 문제를 틀렸거나 어려운 문제를 맞힌 경우를 우선 선정하세요.' : ''}
- **question_number는 반드시 위 "문항 상세"의 "번호" 필드 값을 그대로 사용하세요!** (예: "서술형3"이면 "서술형3", 18이면 18)
- 숫자만 추출하지 마세요. "서술형3"을 3으로 바꾸면 안 됩니다.
- 해당 문항이 왜 주목할 만한지 구체적으로 설명하세요.

### teaching_recommendations (지도 추천)
- 학부모 상담 시 "앞으로 이렇게 지도하겠습니다"라고 설명할 수 있는 구체적 추천 사항을 작성하세요.
- priority 1(최우선)~5 순으로, topic은 교육과정 단원명을 사용하세요.
- reason은 "왜 이 단원이 중요한지 + 어떻게 지도할 것인지"를 1-2문장으로 설명하세요.
- 최대 5개까지 작성하세요.

## 톤 & 스타일
- 전문적이고 객관적인 분석 톤을 사용하세요.
- "~입니다", "~됩니다" 체를 사용하세요.
- 학생에게 말하는 대화체("잘했어요", "화이팅" 등)를 절대 사용하지 마세요.
- 수치와 데이터를 근거로 제시하세요.
- 각 항목은 완결된 문장으로 작성하세요 (중간에 잘리지 않도록).${this.buildExtendedDataBlock(input)}`;
  }

  /** 학습 대책 탭 데이터 (weaknessProfile + learningPlan)를 프롬프트에 주입 */
  private buildExtendedDataBlock(input: AgentInput): string {
    const blocks: string[] = [];

    const wp = input.weaknessProfile as WeaknessProfile | undefined;
    if (wp) {
      const topicWeaknesses = wp.topic_weaknesses?.slice(0, 5).map(
        (t) => `- ${t.topic}: 오답 ${t.wrong_count}/${t.total_count}문항, ${t.recommendation || ''}`,
      ).join('\n') || '없음';

      const mistakes = wp.mistake_patterns?.slice(0, 3).map(
        (m) => `- ${m.description || m.pattern_type} (${m.frequency}건)`,
      ).join('\n') || '없음';

      blocks.push(`
## 취약점 분석 (학습 대책 탭 데이터)
### 단원별 취약점
${topicWeaknesses}

### 오답 패턴
${mistakes}`);
    }

    const lp = input.learningPlan as LearningPlan | undefined;
    if (lp && lp.phases?.length > 0) {
      const phases = lp.phases.slice(0, 3).map(
        (p) => `- ${p.title} (${p.duration}): ${p.topics.map((t) => t.topic).join(', ')}`,
      ).join('\n');

      blocks.push(`
### 학습 계획 요약
- 총 기간: ${lp.duration}, 주당 ${lp.weekly_hours}시간
${phases}
- 예상 향상: ${lp.expected_improvement?.current_estimated_score ?? '?'}점 → ${lp.expected_improvement?.target_score ?? '?'}점`);
    }

    if (blocks.length > 0) {
      return '\n\n위 학습 대책 데이터도 종합하여, 지도 추천과 종합 분석에 반영하세요.' + blocks.join('');
    }
    return '';
  }

  // ── Claude Sonnet으로 AI 분석 오버라이드 ──

  protected async aiAnalysis(input: AgentInput): Promise<Record<string, unknown>> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
    }

    const client = new Anthropic({ apiKey });
    const prompt = this.buildPrompt(input);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: this.temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    if (!text) throw new Error('AI 응답이 비어있습니다');

    // JSON 추출 (코드펜스 제거)
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
    let result: Record<string, unknown>;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // 잘린 JSON 복구 시도: 열린 괄호/따옴표 닫기
      let fixed = cleaned;
      // 잘린 문자열 닫기
      const openQuotes = (fixed.match(/"/g) || []).length;
      if (openQuotes % 2 !== 0) fixed += '"';
      // 열린 배열/객체 닫기
      const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
      const openBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
      for (let i = 0; i < openBrackets; i++) fixed += ']';
      for (let i = 0; i < openBraces; i++) fixed += '}';
      // 마지막 콤마 제거
      fixed = fixed.replace(/,\s*([}\]])/g, '$1');
      try {
        result = JSON.parse(fixed);
      } catch {
        throw new Error(`AI 총평 JSON 파싱 실패: ${cleaned.slice(0, 200)}...`);
      }
    }
    return this.parseResponse(result);
  }

  // ── AI 응답 파싱 ──

  parseResponse(raw: Record<string, unknown>): Record<string, unknown> {
    const result: CommentaryResult = {
      overall_comment: String(raw.overall_comment ?? ''),
      exam_characteristics: this.parseStringArray(raw.exam_characteristics),
      score_strategy: raw.score_strategy ? String(raw.score_strategy) : undefined,
      strength_areas: this.parseStringArray(raw.strength_areas),
      improvement_areas: this.parseStringArray(raw.improvement_areas),
      notable_questions: this.parseNotableQuestions(raw.notable_questions),
      teaching_recommendations: this.parseTeachingRecommendations(
        raw.teaching_recommendations ?? raw.study_priority,
      ),
    };

    return result as unknown as Record<string, unknown>;
  }

  // ── 규칙 기반 폴백 ──

  ruleBased(input: AgentInput): Record<string, unknown> {
    const { basicAnalysis } = input;

    const result: CommentaryResult = {
      overall_comment: this.generateOverallComment(basicAnalysis),
      exam_characteristics: this.generateExamCharacteristics(basicAnalysis),
      score_strategy: this.generateScoreStrategy(basicAnalysis),
      strength_areas: this.findStrengthAreas(basicAnalysis),
      improvement_areas: this.findImprovementAreas(basicAnalysis),
      notable_questions: this.findNotableQuestions(basicAnalysis),
      teaching_recommendations: this.generateTeachingRecommendations(basicAnalysis),
    };

    return result as unknown as Record<string, unknown>;
  }

  // ── 규칙 기반: 전체 코멘트 ──

  private generateOverallComment(analysis: BasicAnalysisResult): string {
    const totalQ = analysis.questions.length;
    const totalPts = analysis.exam_info.total_points;
    const { difficulty_distribution: diff } = analysis.summary;

    const dc = getDiffCounts(diff as unknown as Record<string, number>);
    const easyCount = dc.level1 + dc.level2;
    const hardCount = dc.level4 + dc.level5;

    // 난이도 구성 평가
    let diffNote: string;
    if (hardCount > easyCount) {
      diffNote = '심화·최고난도 문항 비중이 높아 상위권 변별에 초점을 둔 시험입니다.';
    } else if (easyCount > hardCount * 2) {
      diffNote = '기본·표준 문항 비중이 높아 기본기 점검에 적합한 시험입니다.';
    } else {
      diffNote = '난이도가 고르게 분포되어 전 범위의 실력을 평가하는 시험입니다.';
    }

    // 서술형 비중
    const essayCount = analysis.exam_info.format_distribution.essay || 0;
    const essayNote = essayCount > 0
      ? ` 서술형 ${essayCount}문항이 포함되어 논리적 서술 능력도 함께 평가하고 있습니다.`
      : '';

    // 학생 데이터 유무에 따라 분기
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);
    let studentNote = '';
    if (hasStudentData) {
      const correct = analysis.questions.filter((q) => q.is_correct === true).length;
      const accuracy = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
      studentNote = ` 학생의 정답률은 ${accuracy}%이며, ${accuracy >= 70 ? '전반적으로 안정적인 수준' : accuracy >= 50 ? '기본기는 갖추었으나 보완이 필요한 수준' : '기초 개념 재학습이 필요한 수준'}입니다.`;
    }

    return `총 ${totalQ}문항 ${totalPts}점 만점 시험으로, 기본·표준 ${easyCount}문항·응용 ${dc.level3}문항·심화·최고난도 ${hardCount}문항으로 구성되어 있습니다. ${diffNote}${essayNote}${studentNote}`;
  }

  // ── 규칙 기반: 점수 확보 전략 ──

  private generateScoreStrategy(analysis: BasicAnalysisResult): string {
    const totalPts = analysis.exam_info.total_points;
    // 난이도별 배점 합계
    const diffPts: Record<string, number> = {};
    for (const q of analysis.questions) {
      const nd = q.difficulty || '1';
      diffPts[nd] = (diffPts[nd] || 0) + (q.points || 0);
    }

    // 누적 점수 계산 (쉬운 난이도부터)
    const levels = ['1', '2', '3', '4', '5'];
    let cumulative = 0;
    const steps: string[] = [];
    for (const lv of levels) {
      const pts = diffPts[lv] || 0;
      if (pts > 0) {
        cumulative += pts;
        const pct = totalPts > 0 ? Math.round((cumulative / totalPts) * 100) : 0;
        steps.push(`${lv}단계까지 ${cumulative}점(${pct}%)`);
      }
    }

    if (steps.length <= 1) {
      return `전 문항 배점이 ${totalPts}점이며, 난이도 구분 없이 균일한 배점 구조입니다.`;
    }

    return `난이도별 누적 도달 점수: ${steps.join(', ')}. 기본~표준(1~2단계)까지 확실히 확보하는 것이 점수 안정화의 핵심입니다.`;
  }

  // ── 규칙 기반: 시험 특성 ──

  private generateExamCharacteristics(analysis: BasicAnalysisResult): string[] {
    const chars: string[] = [];
    const { difficulty_distribution: diff } = analysis.summary;
    const totalQ = analysis.questions.length;

    // 난이도 비중
    const dc2 = getDiffCounts(diff as unknown as Record<string, number>);
    const easyPct = totalQ > 0 ? Math.round(((dc2.level1 + dc2.level2) / totalQ) * 100) : 0;
    const hardPct = totalQ > 0 ? Math.round(((dc2.level4 + dc2.level5) / totalQ) * 100) : 0;

    if (easyPct >= 40) chars.push(`기본·표준 문항이 ${easyPct}%로 기본기 확인 비중이 높음`);
    if (hardPct >= 30) chars.push(`심화·최고난도 문항이 ${hardPct}%로 상위권 변별력 확보`);

    // 서술형 비중
    const essayCount = analysis.exam_info.format_distribution.essay || 0;
    if (essayCount > 0) {
      const essayPts = analysis.questions
        .filter((q) => q.question_format === 'essay')
        .reduce((s, q) => s + (q.points || 0), 0);
      const totalPts = analysis.exam_info.total_points;
      const essayPtsPct = totalPts > 0 ? Math.round((essayPts / totalPts) * 100) : 0;
      chars.push(`서술형 ${essayCount}문항이 총 배점의 ${essayPtsPct}%를 차지`);
    }

    // 출제 단원 수
    const topics = new Set(analysis.questions.map((q) => q.topic).filter(Boolean));
    chars.push(`총 ${topics.size}개 단원에서 출제`);

    return chars.slice(0, 4);
  }

  // ── 규칙 기반: 강점 영역 ──

  private findStrengthAreas(analysis: BasicAnalysisResult): string[] {
    const strengths: string[] = [];
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);

    if (hasStudentData) {
      // 난이도별 정답률 분석
      const diffGroups = this.groupByField(analysis, 'difficulty');
      for (const [diff, { correct, total }] of Object.entries(diffGroups)) {
        if (total >= 2 && correct / total >= 0.7) {
          const label = this.difficultyLabel(diff);
          strengths.push(`${label} 난이도 문항에서 정답률 ${Math.round((correct / total) * 100)}%로 안정적`);
        }
      }

      // 유형별 정답률 분석
      const typeGroups = this.groupByField(analysis, 'question_type');
      for (const [type, { correct, total }] of Object.entries(typeGroups)) {
        if (total >= 2 && correct / total >= 0.7) {
          const label = this.typeLabel(type);
          strengths.push(`${label} 유형 ${total}문항 중 ${correct}문항 정답으로 해당 유형에 대한 이해가 탄탄함`);
        }
      }
    } else {
      // 출제 관점 분석
      const { difficulty_distribution: diffDist } = analysis.summary;
      const dc4 = getDiffCounts(diffDist as unknown as Record<string, number>);
      if ((dc4.level1 + dc4.level2) > 0 && (dc4.level4 + dc4.level5) > 0) {
        strengths.push('기본~심화까지 난이도가 골고루 분포되어 전 범위 평가 가능');
      }
      const topics = new Set(analysis.questions.map((q) => q.topic).filter(Boolean));
      if (topics.size >= 3) {
        strengths.push(`${topics.size}개 단원에서 출제되어 교육과정 전반을 커버`);
      }
    }

    if (strengths.length === 0) {
      strengths.push('출제 범위가 교육과정에 부합');
    }

    return strengths.slice(0, 3);
  }

  // ── 규칙 기반: 개선 영역 ──

  private findImprovementAreas(analysis: BasicAnalysisResult): string[] {
    const improvements: string[] = [];
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);

    if (hasStudentData) {
      // 난이도별 약점
      const diffGroups = this.groupByField(analysis, 'difficulty');
      for (const [diff, { correct, total }] of Object.entries(diffGroups)) {
        if (total >= 2 && correct / total < 0.5) {
          const label = this.difficultyLabel(diff);
          improvements.push(`${label} 난이도 문항 정답률 ${Math.round((correct / total) * 100)}%로 집중 보완 필요`);
        }
      }

      // 오답 유형 패턴
      const errorTypes = analysis.questions
        .filter((q) => q.is_correct === false && q.error_type)
        .map((q) => q.error_type!);

      const errorCounts: Record<string, number> = {};
      for (const err of errorTypes) {
        errorCounts[err] = (errorCounts[err] || 0) + 1;
      }

      for (const [errType, count] of Object.entries(errorCounts)) {
        if (count >= 2) {
          improvements.push(`${this.errorTypeLabel(errType)} 유형 실수가 ${count}건 반복되어 해당 부분 훈련 필요`);
        }
      }
    } else {
      // 출제 관점
      const { difficulty_distribution: diffDist2 } = analysis.summary;
      const dc5 = getDiffCounts(diffDist2 as unknown as Record<string, number>);
      if (dc5.level4 + dc5.level5 === 0) {
        improvements.push('심화·최고난도 문항이 없어 상위권 변별이 어려울 수 있음');
      }
      if (analysis.exam_info.format_distribution.essay === 0) {
        improvements.push('서술형 문항이 없어 과정 평가가 누락됨');
      }
    }

    if (improvements.length === 0) {
      improvements.push('전반적으로 균형 잡힌 구성이나 고난도 문항의 추가 검토 권장');
    }

    return improvements.slice(0, 3);
  }

  // ── 규칙 기반: 주목할 문항 ──

  private findNotableQuestions(analysis: BasicAnalysisResult): NotableQuestion[] {
    const notable: NotableQuestion[] = [];
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);

    if (hasStudentData) {
      // 쉬운 문제를 틀림
      const wrongEasy = analysis.questions.filter(
        (q) => q.is_correct === false && (['1', '2'].includes(normalizeDiff(q.difficulty))),
      );
      for (const q of wrongEasy.slice(0, 2)) {
        notable.push({
          question_number: Number(q.question_number),
          comment: `${this.difficultyLabel(q.difficulty)} 난이도임에도 오답 — 해당 개념의 기초 이해도를 재점검할 필요가 있습니다.`,
        });
      }

      // 어려운 문제를 맞힘
      const correctHard = analysis.questions.filter(
        (q) => q.is_correct === true && (['4', '5'].includes(normalizeDiff(q.difficulty))),
      );
      for (const q of correctHard.slice(0, 1)) {
        notable.push({
          question_number: Number(q.question_number),
          comment: `${this.difficultyLabel(q.difficulty)} 난이도 문항을 정확히 해결하여 해당 영역의 심화 학습 역량이 확인됩니다.`,
        });
      }
    } else {
      // 출제 관점: 고배점 문항
      const highPoints = [...analysis.questions].sort((a, b) => (b.points || 0) - (a.points || 0));
      for (const q of highPoints.slice(0, 2)) {
        if (q.points && q.points >= 5) {
          notable.push({
            question_number: Number(q.question_number),
            comment: `${q.points}점 고배점 문항으로 ${this.difficultyLabel(q.difficulty)} 난이도의 ${this.typeLabel(q.question_type)} 유형입니다.`,
          });
        }
      }
    }

    if (notable.length === 0 && analysis.questions.length > 0) {
      const first = analysis.questions[0];
      notable.push({
        question_number: Number(first.question_number),
        comment: `${this.difficultyLabel(first.difficulty)} 난이도의 ${this.typeLabel(first.question_type)} 유형 문항입니다.`,
      });
    }

    return notable.slice(0, 3);
  }

  // ── 규칙 기반: 지도 추천 ──

  private generateTeachingRecommendations(analysis: BasicAnalysisResult): TeachingRecommendation[] {
    const hasStudentData = analysis.questions.some((q) => q.is_correct !== null);
    const topicStats: Record<string, { correct: number; total: number; pts: number }> = {};

    for (const q of analysis.questions) {
      const topic = q.topic || '기타';
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0, pts: 0 };
      topicStats[topic].total++;
      topicStats[topic].pts += q.points || 0;
      if (q.is_correct === true) topicStats[topic].correct++;
    }

    let sorted: { topic: string; accuracy: number; total: number; pts: number }[];

    if (hasStudentData) {
      // 정답률 낮은 순
      sorted = Object.entries(topicStats)
        .map(([topic, { correct, total, pts }]) => ({
          topic,
          accuracy: total > 0 ? correct / total : 0,
          total,
          pts,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
    } else {
      // 출제 비중 높은 순
      sorted = Object.entries(topicStats)
        .map(([topic, { correct, total, pts }]) => ({
          topic,
          accuracy: total > 0 ? correct / total : 0,
          total,
          pts,
        }))
        .sort((a, b) => b.pts - a.pts);
    }

    const recommendations: TeachingRecommendation[] = [];
    let priority = 1;

    for (const item of sorted.slice(0, 5)) {
      let reason: string;
      if (hasStudentData) {
        const accuracyPct = Math.round(item.accuracy * 100);
        if (accuracyPct < 30) {
          reason = `정답률 ${accuracyPct}%로 기초 개념부터 재학습이 필요합니다.`;
        } else if (accuracyPct < 60) {
          reason = `정답률 ${accuracyPct}%로 유형별 반복 훈련이 필요합니다.`;
        } else {
          reason = `정답률 ${accuracyPct}%로 심화 문제 도전을 권장합니다.`;
        }
      } else {
        reason = `${item.total}문항 ${item.pts}점 배점으로 출제 비중이 높아 집중 대비가 필요합니다.`;
      }

      recommendations.push({ topic: item.topic, priority, reason });
      priority++;
    }

    return recommendations;
  }

  // ── 파싱 헬퍼 ──

  private parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => String(v));
  }

  private parseNotableQuestions(value: unknown): NotableQuestion[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => {
      const item = v as Record<string, unknown>;
      return {
        question_number: Number(item.question_number ?? 0),
        comment: String(item.comment ?? ''),
      };
    });
  }

  private parseTeachingRecommendations(value: unknown): TeachingRecommendation[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => {
      const item = v as Record<string, unknown>;
      return {
        topic: String(item.topic ?? ''),
        priority: Math.min(5, Math.max(1, Number(item.priority ?? 3))),
        reason: String(item.reason ?? ''),
      };
    });
  }

  // ── 공통 유틸 ──

  // ── 교육과정 참조 블록 생성 ──

  private buildCurriculumReference(analysis: BasicAnalysisResult): string {
    // topic에서 학년 추론 (예: "수학 > 소인수분해 > ..." → 중1 추정)
    const topics = analysis.questions.map((q) => q.topic).filter(Boolean) as string[];
    const gradeHint = this.inferGradeFromTopics(topics);
    if (!gradeHint) return '';

    // 해당 학년의 교육과정 단원 추출
    const matched = MIDDLE_SCHOOL_CURRICULUM.filter(
      (c: GradeCurriculum) => c.grade === gradeHint || `${c.grade} ${c.semester}` === gradeHint,
    );

    if (matched.length === 0) return '';

    const unitList = matched
      .map((c: GradeCurriculum) =>
        `[${c.grade} ${c.semester}] ${c.units.map((u) => {
          const topicNames = u.topics.map((t) => t.keywords[0]).join(', ');
          return `${u.name}(${topicNames})`;
        }).join(' / ')}`,
      )
      .join('\n');

    return `
## 교육과정 참조 (${gradeHint})
아래는 해당 학년의 교육과정 단원 구조입니다. 단원명을 정확히 사용하고, 출제 범위를 교육과정과 대조하세요.
${unitList}`;
  }

  private inferGradeFromTopics(topics: string[]): string | null {
    // topic 문자열에서 학년 키워드 추출
    const gradeKeywords: Record<string, string> = {
      '소인수분해': '중1', '정수와 유리수': '중1', '일차방정식': '중1',
      '좌표평면': '중1', '정비례': '중1', '반비례': '중1',
      '유리수': '중2', '순환소수': '중2', '일차함수': '중2',
      '연립방정식': '중2', '일차부등식': '중2', '확률': '중2',
      '제곱근': '중3', '인수분해': '중3', '이차방정식': '중3',
      '이차함수': '중3', '피타고라스': '중3', '삼각비': '중3', '대푯값': '중3',
    };

    const counts: Record<string, number> = {};
    for (const topic of topics) {
      for (const [kw, grade] of Object.entries(gradeKeywords)) {
        if (topic.includes(kw)) {
          counts[grade] = (counts[grade] || 0) + 1;
        }
      }
    }

    if (Object.keys(counts).length === 0) return null;
    return Object.entries(counts).sort(([, a], [, b]) => b - a)[0][0];
  }

  private groupByField(
    analysis: BasicAnalysisResult,
    field: 'difficulty' | 'question_type',
  ): Record<string, { correct: number; total: number }> {
    const groups: Record<string, { correct: number; total: number }> = {};

    for (const q of analysis.questions) {
      const key = q[field] || 'unknown';
      if (!groups[key]) groups[key] = { correct: 0, total: 0 };
      groups[key].total++;
      if (q.is_correct === true) groups[key].correct++;
    }

    return groups;
  }

  private difficultyLabel(diff: string): string {
    const nd = normalizeDiff(diff);
    const map: Record<string, string> = {
      '1': '기본(1)',
      '2': '표준(2)',
      '3': '응용(3)',
      '4': '심화(4)',
      '5': '최고난도(5)',
      concept: '기본(1)',
      pattern: '표준(2)',
      reasoning: '심화(4)',
      creative: '최고난도(5)',
    };
    return map[nd] || map[diff] || diff;
  }

  private typeLabel(type: string): string {
    const map: Record<string, string> = {
      number: '수와 연산',
      algebra: '문자와 식',
      function: '함수',
      geometry: '기하',
      statistics: '확률과 통계',
    };
    return map[type] || type;
  }

  private errorTypeLabel(errType: string): string {
    const map: Record<string, string> = {
      calculation_error: '계산 실수',
      concept_gap: '개념 이해 부족',
      careless: '부주의',
      time_pressure: '시간 부족',
    };
    return map[errType] || errType;
  }
}
