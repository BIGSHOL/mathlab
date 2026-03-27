/**
 * 종합 코멘터리 에이전트
 * Python commentary_agent.py에서 이식
 *
 * 시험 분석 결과를 학부모/학생이 이해하기 쉬운
 * 자연어 종합 코멘트로 변환
 */

import { BaseAgent, type AgentInput } from './base-agent';
import type { AgentType } from '../constants';
import type { BasicAnalysisResult } from '../types';

// ── 코멘터리 출력 타입 ──

export interface NotableQuestion {
  question_number: number;
  comment: string;
}

export interface StudyPriority {
  topic: string;
  priority: number; // 1-5
  reason: string;
}

export interface CommentaryResult {
  overall_comment: string;
  strength_areas: string[];
  improvement_areas: string[];
  notable_questions: NotableQuestion[];
  study_priority: StudyPriority[];
  encouragement: string;
}

// ── 에이전트 구현 ──

export class CommentaryAgent extends BaseAgent<Record<string, unknown>> {
  readonly agentType: AgentType = 'commentary';
  readonly temperature = 0.5;

  // ── AI 프롬프트 ──

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;

    const systemInstruction =
      '당신은 수학 시험 분석 전문 코멘테이터입니다. 시험 분석 결과를 학부모와 학생이 이해하기 쉬운 종합 코멘트로 작성하세요.';

    const analysisData = JSON.stringify({
      exam_info: basicAnalysis.exam_info,
      summary: basicAnalysis.summary,
      questions: basicAnalysis.questions.map((q) => ({
        number: q.question_number,
        difficulty: q.difficulty,
        type: q.question_type,
        is_correct: q.is_correct,
        topic: q.topic,
        error_type: q.error_type,
        points: q.points,
        earned_points: q.earned_points,
        ai_comment: q.ai_comment,
      })),
    });

    return `${systemInstruction}

## 분석 데이터
${analysisData}

## 출력 형식

반드시 아래 JSON 형식으로 응답하세요:

{
  "overall_comment": "전체 평가 (2-3문장)",
  "strength_areas": ["강점 영역 설명"],
  "improvement_areas": ["개선 필요 영역"],
  "notable_questions": [{"question_number": 1, "comment": "주목할 점"}],
  "study_priority": [{"topic": "단원명", "priority": 1, "reason": "이유"}],
  "encouragement": "격려 메시지 (1문장)"
}

작성 지침:
- overall_comment: 학부모가 한눈에 이해할 수 있는 전체 평가 (2-3문장)
- strength_areas: 잘한 점 1-3개 (구체적으로)
- improvement_areas: 보완할 점 1-3개 (구체적으로)
- notable_questions: 특히 주목할 문항 1-3개 (틀렸거나 어려운 문제 위주)
- study_priority: 학습 우선순위 (priority 1이 가장 높음, 최대 5개)
- encouragement: 학생에게 전하는 따뜻한 격려 1문장`;
  }

  // ── AI 응답 파싱 ──

  parseResponse(raw: Record<string, unknown>): Record<string, unknown> {
    const result: CommentaryResult = {
      overall_comment: String(raw.overall_comment ?? ''),
      strength_areas: this.parseStringArray(raw.strength_areas),
      improvement_areas: this.parseStringArray(raw.improvement_areas),
      notable_questions: this.parseNotableQuestions(raw.notable_questions),
      study_priority: this.parseStudyPriorities(raw.study_priority),
      encouragement: String(raw.encouragement ?? ''),
    };

    return result as unknown as Record<string, unknown>;
  }

  // ── 규칙 기반 폴백 ──

  ruleBased(input: AgentInput): Record<string, unknown> {
    const { basicAnalysis } = input;

    const overallComment = this.generateOverallComment(basicAnalysis);
    const strengthAreas = this.findStrengthAreas(basicAnalysis);
    const improvementAreas = this.findImprovementAreas(basicAnalysis);
    const notableQuestions = this.findNotableQuestions(basicAnalysis);
    const studyPriority = this.generateStudyPriority(basicAnalysis);
    const encouragement = this.generateEncouragement(basicAnalysis);

    const result: CommentaryResult = {
      overall_comment: overallComment,
      strength_areas: strengthAreas,
      improvement_areas: improvementAreas,
      notable_questions: notableQuestions,
      study_priority: studyPriority,
      encouragement: encouragement,
    };

    return result as unknown as Record<string, unknown>;
  }

  // ── 규칙 기반: 전체 코멘트 ──

  private generateOverallComment(analysis: BasicAnalysisResult): string {
    const totalQ = analysis.questions.length;
    const correctQ = analysis.questions.filter((q) => q.is_correct === true).length;
    const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

    const { difficulty_distribution: diff } = analysis.summary;
    const { type_distribution: _types } = analysis.summary;

    // 난이도 분포 요약
    const conceptCount = diff.concept || 0;
    const reasoningCount = diff.reasoning + diff.creative || 0;
    const difficultyNote =
      reasoningCount > conceptCount
        ? '추론/창의 문항 비중이 높은 도전적인 시험'
        : conceptCount > reasoningCount
          ? '개념 문항 중심의 기본기 확인 시험'
          : '난이도가 균형 잡힌 시험';

    // 유형 분포에서 가장 많은 유형
    const dominantType = analysis.summary.dominant_type || '계산';

    if (accuracy >= 80) {
      return `전체 정답률 ${accuracy}%로 우수한 성적입니다. ${difficultyNote}에서 대부분의 문항을 정확히 풀어냈으며, ${dominantType} 유형에 대한 이해가 탄탄합니다.`;
    } else if (accuracy >= 60) {
      return `전체 정답률 ${accuracy}%로 기본기는 갖추고 있으나 보완이 필요한 영역이 있습니다. ${difficultyNote}이었으며, 특히 ${dominantType} 유형에서의 추가 연습이 도움이 될 것입니다.`;
    } else if (accuracy >= 40) {
      return `전체 정답률 ${accuracy}%로 기초 개념부터 체계적인 복습이 필요합니다. ${difficultyNote}이었으며, 개념 문항에서의 정답률을 먼저 높이는 것이 중요합니다.`;
    } else {
      return `전체 정답률 ${accuracy}%로 기초부터 차근차근 다시 시작할 필요가 있습니다. ${difficultyNote}이었으며, 기본 개념 이해에 집중하는 학습 계획을 권장합니다.`;
    }
  }

  // ── 규칙 기반: 강점 영역 ──

  private findStrengthAreas(analysis: BasicAnalysisResult): string[] {
    const strengths: string[] = [];

    // 난이도별 정답률 분석
    const diffGroups = this.groupByField(analysis, 'difficulty');
    for (const [diff, { correct, total }] of Object.entries(diffGroups)) {
      if (total >= 2 && correct / total >= 0.7) {
        const label = this.difficultyLabel(diff);
        strengths.push(`${label} 난이도 문항에서 ${Math.round((correct / total) * 100)}% 정답률로 안정적`);
      }
    }

    // 유형별 정답률 분석
    const typeGroups = this.groupByField(analysis, 'question_type');
    for (const [type, { correct, total }] of Object.entries(typeGroups)) {
      if (total >= 2 && correct / total >= 0.7) {
        const label = this.typeLabel(type);
        strengths.push(`${label} 유형을 정확하게 풀어냄`);
      }
    }

    if (strengths.length === 0) {
      // 최소 1개 강점 보장
      const correctQ = analysis.questions.filter((q) => q.is_correct === true);
      if (correctQ.length > 0) {
        strengths.push(`${correctQ.length}개 문항을 정확히 풀어냄`);
      } else {
        strengths.push('시험에 끝까지 응시한 성실함');
      }
    }

    return strengths.slice(0, 3);
  }

  // ── 규칙 기반: 개선 영역 ──

  private findImprovementAreas(analysis: BasicAnalysisResult): string[] {
    const improvements: string[] = [];

    // 난이도별 약점
    const diffGroups = this.groupByField(analysis, 'difficulty');
    for (const [diff, { correct, total }] of Object.entries(diffGroups)) {
      if (total >= 2 && correct / total < 0.5) {
        const label = this.difficultyLabel(diff);
        improvements.push(`${label} 난이도 문항 정답률 ${Math.round((correct / total) * 100)}% — 추가 연습 필요`);
      }
    }

    // 유형별 약점
    const typeGroups = this.groupByField(analysis, 'question_type');
    for (const [type, { correct, total }] of Object.entries(typeGroups)) {
      if (total >= 2 && correct / total < 0.5) {
        const label = this.typeLabel(type);
        improvements.push(`${label} 유형 보완 필요 (정답률 ${Math.round((correct / total) * 100)}%)`);
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
        improvements.push(`${this.errorTypeLabel(errType)} 실수 반복 (${count}건)`);
      }
    }

    if (improvements.length === 0) {
      improvements.push('전반적으로 안정적이나 고난도 문항에 도전해볼 것을 권장');
    }

    return improvements.slice(0, 3);
  }

  // ── 규칙 기반: 주목할 문항 ──

  private findNotableQuestions(analysis: BasicAnalysisResult): NotableQuestion[] {
    const notable: NotableQuestion[] = [];

    // 틀린 문항 중 난이도가 낮은 것 (쉬운 문제를 틀림)
    const wrongEasy = analysis.questions.filter(
      (q) => q.is_correct === false && (q.difficulty === 'concept' || q.difficulty === 'pattern'),
    );
    for (const q of wrongEasy.slice(0, 2)) {
      notable.push({
        question_number: Number(q.question_number),
        comment: `${this.difficultyLabel(q.difficulty)} 문항이지만 오답 — 기본 개념 점검 필요`,
      });
    }

    // 맞힌 문항 중 난이도가 높은 것 (어려운 문제를 맞힘)
    const correctHard = analysis.questions.filter(
      (q) => q.is_correct === true && (q.difficulty === 'reasoning' || q.difficulty === 'creative'),
    );
    for (const q of correctHard.slice(0, 1)) {
      notable.push({
        question_number: Number(q.question_number),
        comment: `${this.difficultyLabel(q.difficulty)} 난이도를 정확히 풀어낸 점이 인상적`,
      });
    }

    // 최소 보장
    if (notable.length === 0 && analysis.questions.length > 0) {
      const first = analysis.questions[0];
      notable.push({
        question_number: Number(first.question_number),
        comment: first.is_correct ? '첫 문항을 정확히 풀어 좋은 출발' : '첫 문항부터 실수 — 시험 초반 집중력 점검',
      });
    }

    return notable.slice(0, 3);
  }

  // ── 규칙 기반: 학습 우선순위 ──

  private generateStudyPriority(analysis: BasicAnalysisResult): StudyPriority[] {
    const topicStats: Record<string, { correct: number; total: number }> = {};

    for (const q of analysis.questions) {
      const topic = q.topic || '기타';
      if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
      topicStats[topic].total++;
      if (q.is_correct === true) topicStats[topic].correct++;
    }

    // 정답률 낮은 순으로 정렬
    const sorted = Object.entries(topicStats)
      .map(([topic, { correct, total }]) => ({
        topic,
        accuracy: total > 0 ? correct / total : 0,
        total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const priorities: StudyPriority[] = [];
    let priority = 1;

    for (const item of sorted.slice(0, 5)) {
      const accuracyPct = Math.round(item.accuracy * 100);
      let reason: string;
      if (accuracyPct < 30) {
        reason = `정답률 ${accuracyPct}%로 기초부터 재학습 필요`;
      } else if (accuracyPct < 60) {
        reason = `정답률 ${accuracyPct}%로 집중 보완 필요`;
      } else {
        reason = `정답률 ${accuracyPct}%로 심화 학습 권장`;
      }

      priorities.push({
        topic: item.topic,
        priority,
        reason,
      });
      priority++;
    }

    return priorities;
  }

  // ── 규칙 기반: 격려 메시지 ──

  private generateEncouragement(analysis: BasicAnalysisResult): string {
    const totalQ = analysis.questions.length;
    const correctQ = analysis.questions.filter((q) => q.is_correct === true).length;
    const accuracy = totalQ > 0 ? correctQ / totalQ : 0;

    if (accuracy >= 0.8) {
      return '훌륭한 성적입니다! 이 실력을 유지하면서 더 높은 목표에 도전해보세요.';
    } else if (accuracy >= 0.6) {
      return '기본기가 탄탄합니다. 조금만 더 노력하면 큰 성장을 이룰 수 있어요!';
    } else if (accuracy >= 0.4) {
      return '꾸준한 연습이 실력 향상의 열쇠입니다. 포기하지 말고 한 단계씩 나아가 봅시다!';
    } else {
      return '지금의 점수가 전부가 아닙니다. 기초부터 차근차근 다지면 반드시 좋은 결과가 올 거예요!';
    }
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

  private parseStudyPriorities(value: unknown): StudyPriority[] {
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
    const map: Record<string, string> = {
      concept: '개념',
      pattern: '유형',
      reasoning: '추론',
      creative: '창의',
    };
    return map[diff] || diff;
  }

  private typeLabel(type: string): string {
    const map: Record<string, string> = {
      calculation: '계산',
      geometry: '도형',
      application: '응용',
      proof: '증명',
      graph: '그래프',
      statistics: '통계',
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
