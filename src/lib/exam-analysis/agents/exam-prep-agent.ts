/**
 * 시험 대비 전략 에이전트
 * Python exam_prep_agent.py에서 1:1 이식
 */

import { BaseAgent, type AgentInput } from './base-agent';
import type { AgentType } from '../constants';
import type { WeaknessProfile } from '../types';

// ── 에이전트 입력 ──
export interface ExamPrepInput extends AgentInput {
  weaknessProfile: WeaknessProfile;
  examDate?: string; // ISO date string (e.g. "2026-04-15")
}

// ── 출력 타입 ──
export interface TimelinePeriod {
  period: string;
  focus: string;
  daily_plan: string;
  checkpoint: string;
}

export interface ExamPrepResult {
  timeline: TimelinePeriod[];
  exam_day_tips: string[];
  time_management: string;
  mental_preparation: string;
}

export class ExamPrepAgent extends BaseAgent<Record<string, unknown>> {
  readonly agentType: AgentType = 'exam-prep';
  readonly temperature = 0.3;

  buildPrompt(input: AgentInput): string {
    const { basicAnalysis } = input;
    const { weaknessProfile, examDate } = input as ExamPrepInput;

    const questionsJson = JSON.stringify(
      basicAnalysis.questions.map((q) => ({
        number: q.question_number,
        topic: q.topic,
        difficulty: q.difficulty,
        type: q.question_type,
        ability: q.ability_domain,
        is_correct: q.is_correct,
        error_type: q.error_type,
        points: q.points,
        earned_points: q.earned_points,
      })),
      null,
      2
    );

    const weaknessJson = JSON.stringify(
      {
        topic_weaknesses: weaknessProfile.topic_weaknesses,
        difficulty_weakness: weaknessProfile.difficulty_weakness,
        mistake_patterns: weaknessProfile.mistake_patterns,
      },
      null,
      2
    );

    const daysLeft = examDate ? this.calcDaysUntilExam(examDate) : 28;
    const dateInfo = examDate
      ? `시험일: ${examDate} (D-${daysLeft})`
      : '시험일: 약 4주 후 (D-28 가정)';

    return `════════════════════════════════════════════════
🔒 하드 제약 (HARD CONSTRAINTS) — 위반 시 출력 무효
════════════════════════════════════════════════
H1. JSON 객체 하나만 출력. 코드펜스(\`\`\`)·서술문 금지. { 로 시작, } 로 종료.
H2. 스키마에 정의된 키만 사용. 주차 수(weeks)는 입력 D-day와 일치. 기간 미지정 시 표준 4주 플랜 사용.
H3. 문자열 내 수식·숫자·변수는 \$...\$로 래핑. 한글은 \$...\$ 밖. \\text{한글} 금지. \\dfrac 금지 → \\frac.
H4. 인접 수식 \$A\$\$B\$ 금지 → \$A\$ \$B\$. □→\\square, ○→\\bigcirc.
H5. 입력 취약점에 없는 단원/유형을 주력 대상에 포함하지 말 것. 추측 금지.

════════════════════════════════════════════════
📤 출력 전 자기검증 (SELF-VERIFY)
════════════════════════════════════════════════
V1. 출력이 { 로 시작해 } 로 끝나는가?
V2. \\dfrac·\\text{한글}·백틱이 없는가?
V3. 주차별 계획의 합이 총 기간과 일치하는가?
V4. 모든 수치·변수가 \$...\$로 래핑되었는가?
════════════════════════════════════════════════

당신은 시험 대비 전략 전문가입니다. 학생의 취약점과 시험까지의 기간을 고려하여 최적의 시험 대비 계획을 수립하세요.

## 시험 정보
${dateInfo}
총 문항수: ${basicAnalysis.exam_info.total_questions}
총 배점: ${basicAnalysis.exam_info.total_points}

## 분석 데이터

### 문항 분석 결과
${questionsJson}

### 취약점 프로필
${weaknessJson}

## 출력 형식 (JSON)
{
  "timeline": [
    {"period": "D-28 ~ D-21", "focus": "기초 개념 재정리", "daily_plan": "개념 2시간 + 기본문제 1시간", "checkpoint": "기본 문제 90% 정답"},
    {"period": "D-21 ~ D-14", "focus": "유형별 문제 훈련", "daily_plan": "유형별 2시간 + 오답정리 1시간", "checkpoint": "유형별 정답률 80% 이상"},
    {"period": "D-14 ~ D-7", "focus": "심화/실전 문제", "daily_plan": "실전모의 2시간 + 취약점 보완 1시간", "checkpoint": "모의시험 목표점수 달성"},
    {"period": "D-7 ~ D-day", "focus": "최종 점검", "daily_plan": "오답 복습 1시간 + 핵심 정리 1시간", "checkpoint": "전범위 복습 완료"}
  ],
  "exam_day_tips": ["시험 당일 팁 목록"],
  "time_management": "시간 배분 전략",
  "mental_preparation": "심리적 준비 조언"
}

- timeline: 시험까지의 기간을 4단계로 나누어 학습 계획 수립
- exam_day_tips: 시험 당일 주의사항 (5개 이상)
- time_management: 시험 시간 배분 전략 (문항 유형별)
- mental_preparation: 시험 불안 관리 및 심리적 준비 조언

JSON만 반환하세요.`;
  }

  parseResponse(raw: Record<string, unknown>): Record<string, unknown> {
    const timeline = raw.timeline as Array<Record<string, unknown>> | undefined;
    const examDayTips = raw.exam_day_tips as string[] | undefined;
    const timeManagement = raw.time_management as string | undefined;
    const mentalPreparation = raw.mental_preparation as string | undefined;

    const parsedTimeline: TimelinePeriod[] = (timeline ?? []).map((t) => ({
      period: (t.period as string) ?? '',
      focus: (t.focus as string) ?? '',
      daily_plan: (t.daily_plan as string) ?? '',
      checkpoint: (t.checkpoint as string) ?? '',
    }));

    return {
      timeline: parsedTimeline,
      exam_day_tips: examDayTips ?? this.defaultExamDayTips(),
      time_management: timeManagement ?? '객관식 문항당 2분, 서술형 문항당 5분 배분. 어려운 문제는 표시 후 넘기고, 남은 시간에 재도전.',
      mental_preparation: mentalPreparation ?? '시험 전날 충분한 수면을 취하고, 당일 아침 가벼운 복습만 하세요. 모르는 문제가 나와도 당황하지 말고 아는 문제부터 풀어가세요.',
    };
  }

  ruleBased(input: AgentInput): Record<string, unknown> {
    const { basicAnalysis } = input;
    const { weaknessProfile, examDate } = input as ExamPrepInput;

    const daysLeft = examDate ? this.calcDaysUntilExam(examDate) : 28;

    // 취약 주제 추출
    const weakTopics = weaknessProfile.topic_weaknesses
      .filter((tw) => tw.severity_score >= 0.3)
      .map((tw) => tw.topic);

    const weakTopicsList = weakTopics.length > 0
      ? weakTopics.join(', ')
      : '전체 범위';

    // 점수 기반 난이도 결정
    const totalPoints = basicAnalysis.exam_info.total_points || 100;
    const earnedPoints = basicAnalysis.questions.reduce(
      (sum, q) => sum + (q.earned_points ?? 0), 0
    );
    const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 50;

    // 기간에 맞는 타임라인 생성
    const timeline = this.buildTimeline(daysLeft, scorePercentage, weakTopicsList);

    // 시험 정보 기반 시간 배분
    const formatDist = basicAnalysis.exam_info.format_distribution;
    const timeManagement = this.buildTimeManagement(
      basicAnalysis.exam_info.total_questions,
      formatDist
    );

    return {
      timeline,
      exam_day_tips: this.defaultExamDayTips(),
      time_management: timeManagement,
      mental_preparation: this.buildMentalPreparation(scorePercentage),
    };
  }

  // ── 내부 헬퍼 ──

  private calcDaysUntilExam(examDate: string): number {
    const now = new Date();
    const exam = new Date(examDate);
    const diff = exam.getTime() - now.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private buildTimeline(
    daysLeft: number,
    scorePercentage: number,
    weakTopics: string
  ): TimelinePeriod[] {
    // 4단계로 기간 분할
    const q = Math.max(1, Math.floor(daysLeft / 4));
    const d4 = daysLeft;
    const d3 = daysLeft - q;
    const d2 = daysLeft - q * 2;
    const d1 = daysLeft - q * 3;

    const isLow = scorePercentage < 50;
    const isMid = scorePercentage < 80;

    return [
      {
        period: `D-${d4} ~ D-${d3 + 1}`,
        focus: '기초 개념 재정리',
        daily_plan: isLow
          ? `취약 단원(${weakTopics}) 개념 재학습 2시간 + 기본 문제 1시간`
          : `핵심 개념 정리 1시간 + 기본/중급 문제 2시간`,
        checkpoint: isLow
          ? '기본 문제 정답률 80% 이상'
          : '기본 문제 정답률 95% 이상',
      },
      {
        period: `D-${d3} ~ D-${d2 + 1}`,
        focus: '유형별 문제 훈련',
        daily_plan: isMid
          ? `유형별 문제 풀이 2시간 + 오답 분석 1시간 (${weakTopics} 집중)`
          : `중급/고난도 유형 2시간 + 서술형 연습 1시간`,
        checkpoint: isMid
          ? '유형별 정답률 75% 이상'
          : '고난도 문제 정답률 70% 이상',
      },
      {
        period: `D-${d2} ~ D-${d1 + 1}`,
        focus: '심화/실전 문제',
        daily_plan: isLow
          ? '기출문제 모의시험 1회 + 오답 복습 2시간'
          : '실전 모의시험 1회(시간 제한) + 취약점 보완 1시간',
        checkpoint: '모의시험에서 목표 점수 달성',
      },
      {
        period: `D-${d1} ~ D-day`,
        focus: '최종 점검',
        daily_plan: '오답 노트 전체 복습 1시간 + 핵심 공식/개념 정리 30분',
        checkpoint: '전범위 핵심 정리 완료, 자주 틀리는 유형 재확인',
      },
    ];
  }

  private buildTimeManagement(
    totalQuestions: number,
    formatDist: { objective: number; short_answer: number; essay: number }
  ): string {
    // 총 시험시간 50분 기준 (일반적 중등 시험)
    const totalMinutes = 50;
    const parts: string[] = [];

    if (formatDist.objective > 0) {
      const perQ = Math.floor((totalMinutes * 0.4) / formatDist.objective);
      parts.push(`객관식 ${formatDist.objective}문항: 문항당 약 ${perQ}분`);
    }
    if (formatDist.short_answer > 0) {
      const perQ = Math.floor((totalMinutes * 0.25) / formatDist.short_answer);
      parts.push(`단답형 ${formatDist.short_answer}문항: 문항당 약 ${perQ}분`);
    }
    if (formatDist.essay > 0) {
      const perQ = Math.floor((totalMinutes * 0.35) / formatDist.essay);
      parts.push(`서술형 ${formatDist.essay}문항: 문항당 약 ${perQ}분`);
    }

    if (parts.length === 0) {
      const perQ = Math.max(1, Math.floor(totalMinutes / (totalQuestions || 1)));
      return `총 ${totalQuestions}문항, 문항당 약 ${perQ}분 배분. 어려운 문제는 표시 후 넘기고 남은 시간에 재도전.`;
    }

    return parts.join('. ') + '. 마지막 5분은 검토 시간으로 확보. 어려운 문제는 표시 후 넘기기.';
  }

  private buildMentalPreparation(scorePercentage: number): string {
    if (scorePercentage < 50) {
      return '기초부터 차근차근 준비하고 있으니 자신감을 가지세요. 아는 문제를 확실히 맞추는 것이 목표입니다. 시험 전날 충분히 쉬고, 긴장되면 심호흡으로 마음을 가라앉히세요.';
    }
    if (scorePercentage < 80) {
      return '실력이 있으니 실수만 줄이면 큰 폭의 점수 상승이 가능합니다. 시험 중 모르는 문제가 나오면 당황하지 말고 표시 후 넘기세요. 충분한 수면과 가벼운 아침식사로 컨디션을 최상으로 유지하세요.';
    }
    return '이미 높은 실력을 갖추고 있습니다. 완벽을 추구하기보다 실수 없이 풀어내는 것에 집중하세요. 시험 전날 새로운 것을 공부하지 말고 기존 정리 내용만 가볍게 훑어보세요.';
  }

  private defaultExamDayTips(): string[] {
    return [
      '시험 30분 전까지 도착하여 마음의 여유를 가지세요.',
      '시험지를 받으면 전체를 먼저 훑어보고 쉬운 문제부터 풀기 시작하세요.',
      '어려운 문제에 시간을 너무 많이 쏟지 마세요 — 표시하고 넘긴 후 남은 시간에 도전.',
      '계산 실수를 줄이기 위해 중간 과정을 꼭 적으세요.',
      '서술형은 풀이 과정을 빠짐없이 기술하세요 — 부분 점수를 받을 수 있습니다.',
      '답안 작성 후 최소 5분은 검토 시간을 확보하세요.',
      '긴장되면 심호흡 3회로 마음을 가라앉힌 후 다시 집중하세요.',
    ];
  }
}
