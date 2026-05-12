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
import type { GradeCurriculum } from '../data/curriculum';
import type { NearbyComparisonData, NearbyExamSummary } from '../nearby-school-data';

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
export interface ScoreStrategy {
  grade: string;    // "A등급" 등
  target: string;   // "90점 이상"
  strategy?: string; // 레거시 (기존 DB 호환)
  points?: string[]; // 목록형 포인트 (3~4개)
}

export interface CommentaryResult {
  overall_comment: string;
  exam_characteristics?: string[];
  score_strategy?: string;  // 레거시 (기존 DB 호환)
  score_strategies?: ScoreStrategy[];
  strength_areas: string[];
  improvement_areas: string[];
  notable_questions: NotableQuestion[];
  teaching_recommendations?: TeachingRecommendation[];
  nearby_comparison?: string; // 주변 학교 기출 비교 분석 (있을 때만)
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

    // 난이도별 배점 합계 (정확한 수치 → AI 추정 방지)
    const diffPoints = [0, 0, 0, 0, 0]; // Level 1~5
    for (const q of basicAnalysis.questions) {
      const d = String(q.difficulty);
      const lvl = d === 'concept' ? 0 : d === 'pattern' ? 1 : d === 'reasoning' ? 3 : d === 'creative' ? 4
        : (Number(d) >= 1 && Number(d) <= 5) ? Number(d) - 1 : 2;
      diffPoints[lvl] += q.points || 0;
    }

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

    const FORMAT_LABELS: Record<string, string> = { objective: '객관식', short_answer: '단답형', essay: '서술형' };
    const questionsData = basicAnalysis.questions.map((q) => ({
      번호: q.question_number,
      형식: FORMAT_LABELS[q.question_format || ''] || '객관식',
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

    return `════════════════════════════════════════════════
🔒 하드 제약 (HARD CONSTRAINTS) — 위반 시 출력 무효
════════════════════════════════════════════════
H1. JSON 객체 하나만 출력. 코드펜스(\`\`\`)·서술문·인사말 금지. { 로 시작, } 로 종료.
H2. "## 출력 형식" 섹션에 정의된 키만 사용. 임의 키 추가 금지. 데이터 부족 시 해당 필드에 "데이터 부족" 명시.
H3. **\$...\$는 진짜 수식에만 사용** — 변수($x$, $a$, $k$), 식($x^2+1$, $\\sqrt{3}$, $\\frac{a}{b}$), LaTeX 명령(\\frac, \\sqrt, \\times 등)이 포함된 경우만. **단순 정수(1, 2, 3, 4, 5)·점수(48점)·문항수(9문항)·한글(기본, 표준, 응용)에는 \$ 사용 금지** — 평문 그대로. 예: "Level 2 (표준) 7문항 34점" (O), "Level $2$ ($표준$) $7$문항 $34$점" (X). \\text{한글}/\\textrm{한글} 금지. \\dfrac 금지 → \\frac.
H4. 인접 수식 \$A\$\$B\$ 금지 → \$A\$ \$B\$. □→\\square, ○→\\bigcirc.
H5. 입력 데이터에 없는 문항번호·학교명·배점·점수를 지어내지 말 것. 주변 학교 통계/토픽/배점 분포는 입력값 그대로 인용.

════════════════════════════════════════════════
📤 출력 전 자기검증 (SELF-VERIFY)
════════════════════════════════════════════════
V1. 출력이 { 로 시작해 } 로 끝나는가? 코드펜스/설명문 없는가?
V2. \\dfrac·\\text{한글}·백틱이 없는가?
V3. 언급한 문항번호·학교명이 모두 입력 데이터에 존재하는가?
V4. \$...\$가 **진짜 수식에만** 쓰였는가? 단순 정수("1", "2", "9문항", "48점")나 한글("기본", "표준")에 \$가 붙어 있지 않은가? (보기번호 ①②③④⑤, ㄱㄴㄷ 제외)
V5. 추측성 단정("반드시 나올 것", "100% 출제") 대신 입력 데이터 근거 표현을 썼는가?
════════════════════════════════════════════════

당신은 수학 교육 전문가이자 기출 시험 분석 컨설턴트입니다.
학원 원장/선생님이 학부모 상담 및 학생 지도에 바로 활용할 수 있는 전문 분석 리포트를 작성하세요.

이 총평은 기출 분석 시스템의 3개 탭(기본 분석, AI 코멘트, 학습 대책)을 종합하는 최상위 요약입니다.
아래 데이터를 바탕으로 시험 출제 경향·학생 현재 수준·구체적 지도 방향을 충분히 상세하게 분석하세요.
학부모에게 "이 시험이 어떤 시험이고, 아이가 어떤 상태이며, 앞으로 무엇을 해야 하는지" 설명할 수 있을 만큼 내용이 풍부해야 합니다.

## 시험 개요
- 총 문항수: ${totalQ}문항, 총 배점: ${totalPts}점
- 형식: 객관식 ${basicAnalysis.exam_info.format_distribution.objective}문항, 단답형 ${basicAnalysis.exam_info.format_distribution.short_answer}문항, 서술형 ${basicAnalysis.exam_info.format_distribution.essay}문항
- **종합 난이도: Level ${overallLevel} (${LEVEL_LABELS[overallLevel]})**
- 난이도별 분포 및 배점:
  - Level 1(기본): ${diffCounts[0]}문항, ${diffPoints[0]}점
  - Level 2(표준): ${diffCounts[1]}문항, ${diffPoints[1]}점
  - Level 3(응용): ${diffCounts[2]}문항, ${diffPoints[2]}점
  - Level 4(심화): ${diffCounts[3]}문항, ${diffPoints[3]}점
  - Level 5(최고난도): ${diffCounts[4]}문항, ${diffPoints[4]}점
  - Level 1~2 합계: ${diffPoints[0] + diffPoints[1]}점, Level 1~3 합계: ${diffPoints[0] + diffPoints[1] + diffPoints[2]}점, Level 1~4 합계: ${diffPoints[0] + diffPoints[1] + diffPoints[2] + diffPoints[3]}점
- 유형 분포: 수와연산 ${types.number || 0}, 문자와식 ${types.algebra || 0}, 함수 ${types.function || 0}, 기하 ${types.geometry || 0}, 확률통계 ${types.statistics || 0}
- 단원별 출제: ${topicSummary}
${studentStatsBlock}
${curriculumBlock}

## 문항 상세
${JSON.stringify(questionsData, null, 1)}

## 출력 형식 (반드시 아래 JSON 구조로 응답)

{
  "overall_comment": "줄바꿈(\\n)으로 구분된 5-8문장. 1~2문장씩 주제별로 묶어 \\n\\n으로 단락 구분.",
  "score_strategies": [
    {"grade": "A등급", "target": "90점 이상", "points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]},
    {"grade": "B등급", "target": "70~89점", "points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]},
    {"grade": "C등급", "target": "70점 미만", "points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"]}
  ],
  "strength_areas": ["string (잘 출제된 영역/학생 강점 2-3개)"],
  "improvement_areas": ["string (보완 필요 영역 2-3개)"],
  "notable_questions": [{"question_number": "서술형3", "comment": "string (출제 의도/변별력 관점 분석)"}],
  "teaching_recommendations": [{"topic": "단원명", "priority": 1, "reason": "지도 방향 설명"}],
  "nearby_comparison": "주변 학교 기출 비교 분석 2-4문장 (비교 데이터가 없으면 null)"
}

## 작성 지침

### 🚨 톤/표현 규칙 (전체 섹션 공통, 반드시 준수!)
- **종합 난이도가 Level ${overallLevel}(${LEVEL_LABELS[overallLevel]})입니다. 이 수준에 맞는 표현만 사용하세요!**
- Level 1~2: "기초 확인 시험", "개념 점검 중심", "기본기 평가" 등 → ❌ "변별력", "고난도", "킬러" 사용 금지
- Level 3: "응용력을 요구하는 시험", "개념 적용 중심" → ❌ "최상위 변별", "최고난도 시험" 사용 금지
- Level 4: "심화 문항이 다수 포함된 시험" → "최상위 변별"은 Level 5에서만 사용
- Level 5: "최고난도 변별력 시험" 표현 가능
- **과장 표현 금지!** "최고난도 변별형 시험"은 Level 5에서만 허용. Level 3 시험에 "최상위 변별" 등을 쓰면 학부모에게 오해를 줍니다.
- 퍼센트(%) 사용을 최소화하세요. 100점 만점이면 점수=퍼센트이므로 중복입니다. 점수만 쓰세요.

### overall_comment (시험 종합 분석)
- 5-8문장으로 시험 전체를 분석하세요. **줄바꿈(\\n\\n)으로 단락을 구분**하여 가독성을 높이세요.
- 단락 구성 예시:
  - 1단락: 시험 규모/형식/난이도 분포 개요
  - 2단락: 주요 출제 단원과 비중
  - 3단락: 출제 경향의 특징 (서술형 비중, 변별력 구조 등)
${hasStudentData ? '  - 4단락: 학생 정답률/수준 평가 + 향후 학습 방향' : ''}
- ❌ exam_characteristics는 별도로 작성하지 마세요! overall_comment에 모든 분석을 통합합니다.

### score_strategies (등급별 점수 확보 전략)
- **3개 등급, 각각 points 배열(3~4개 항목)로 핵심 포인트를 목록형으로 작성하세요.**
- 각 포인트는 1문장, 구체적 점수/문항수 포함. 길게 서술하지 말 것!
- A등급(90점+): 심화+최고난도 공략, 서술형 만점 전략
- B등급(70~89점): 기본~응용 확실 + 심화 일부
- C등급(70점 미만): 기본·표준 완벽 확보 + 실수 방지
- 예시 points: ["Level 1~2 전체 10문항 48점을 실수 없이 확보", "Level 3 응용 중 계산 위주 4문항 우선 공략", "서술형은 풀이 과정만이라도 적어 부분 점수 확보"]

### strength_areas / improvement_areas
${hasStudentData
    ? '- 학생의 답안 데이터를 기반으로 잘한 영역과 보완 영역을 각각 2-3개씩 분석하세요.'
    : '- 시험 출제 관점에서 잘 구성된 부분과 보완이 필요한 부분을 각각 2-3개씩 분석하세요.'}
- 각 항목은 1-2문장의 완결된 설명이어야 합니다 (단편적 키워드 나열 금지).
- 구체적 수치를 포함하세요 (예: "도형 영역 5문항 중 4문항 정답(정답률 80%)으로 해당 단원의 기본 개념이 안정적으로 형성되어 있습니다").
- **중요: 시험 범위 밖의 단원이나 유형이 0문항인 것은 당연한 것이므로 절대 지적하지 마세요!** 예를 들어 '실수와 그 연산' 시험에서 함수·확률통계가 0문항인 것은 시험 범위 특성이지 편중이 아닙니다. 시험 범위에 포함되지 않는 단원(이차방정식, 이차함수, 삼각비, 원의 성질, 통계 등)이 출제되지 않은 것도 마찬가지입니다. improvement_areas는 반드시 시험 범위 내에서 실제로 보완이 필요한 부분만 작성하세요.

### notable_questions (주목할 문항)
- 변별력이 높거나 출제 의도가 돋보이는 문항 3-5개를 선정하세요.
${hasStudentData ? '- 쉬운 문제를 틀렸거나 어려운 문제를 맞힌 경우를 우선 선정하세요.' : ''}
- **question_number 규칙 (필수!):**
  - 반드시 위 "문항 상세"의 "번호" 필드 값을 **그대로 복사**하세요.
  - "서답형3"이면 "서답형3", "서술형2"이면 "서술형2", 18이면 18 — 원본 그대로!
  - **절대 숫자만 추출하지 마세요!** "서답형3"→3, "서답형5"→5 변환은 금지입니다.
  - 같은 question_number가 중복 선정되면 안 됩니다.
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
- 각 항목은 완결된 문장으로 작성하세요 (중간에 잘리지 않도록).${this.buildNearbyComparisonBlock(input)}${this.buildExtendedDataBlock(input)}`;
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

  /** 주변 학교 기출 비교 데이터 블록 생성 */
  private buildNearbyComparisonBlock(input: AgentInput): string {
    const nearby = input.nearbyComparison as NearbyComparisonData | undefined;
    if (!nearby) return '';

    const hasSameSchool = nearby.sameSchoolExams.length > 0;
    const hasNearby = nearby.nearbyExams.length > 0;
    if (!hasSameSchool && !hasNearby) return '';

    const TYPE_LABELS: Record<string, string> = {
      number: '수와연산', algebra: '문자와식', function: '함수',
      geometry: '기하', statistics: '확률통계',
    };

    const formatExamLine = (exam: NearbyExamSummary): string => {
      const types = Object.entries(exam.typeDistribution)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${TYPE_LABELS[k] || k} ${v}문항`)
        .join(', ');
      const distanceNote = exam.distance > 0 ? ` (${exam.distance}km)` : '';
      const diff = Number.isInteger(exam.averageDifficulty) ? exam.averageDifficulty : Math.round(exam.averageDifficulty * 10) / 10;
      // 난이도 분포 상세
      const diffDist = Object.entries(exam.difficultyDistribution)
        .filter(([, v]) => v > 0)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([k, v]) => `Level${k}:${v}문항`)
        .join(', ');
      return `- [${exam.schoolName}]${distanceNote} "${exam.examTitle}": ${exam.totalQuestions}문항 ${exam.totalPoints}점\n  Level분포: ${diffDist || `Level${diff}`}\n  영역: ${types}\n  주요단원: ${exam.topicSummary}`;
    };

    const currentSchoolName = nearby.currentSchool?.name || '이 학교';
    const blocks: string[] = [`\n\n## 주변 학교 기출 비교 데이터\n현재 분석 중인 시험: **${currentSchoolName}**`];

    if (hasSameSchool) {
      blocks.push('\n### 같은 학교 이전 기출');
      for (const exam of nearby.sameSchoolExams) {
        blocks.push(formatExamLine(exam));
      }
    }

    if (hasNearby) {
      blocks.push(`\n### 인근 학교 기출 (같은 학년·학기·시험 유형)`);
      for (const exam of nearby.nearbyExams) {
        blocks.push(formatExamLine(exam));
      }
    }

    blocks.push(`
### 비교 분석 작성 지침 (중요!)

**핵심 원칙: "${currentSchoolName} vs 인근 학교"의 차이를 수치 기반으로 명확히 대비하세요.**
**"이 시험" 대신 반드시 "${currentSchoolName}"으로 표기하세요.**

"nearby_comparison" 필드에 항목별로 줄바꿈(\\n)하여 작성. 반드시 각 항목 사이에 \\n을 넣으세요:

1줄 — **Level 비교**: ${currentSchoolName}의 Level 분포와 인근 학교 Level 분포를 구체적으로 대비.
  - 예: "${currentSchoolName}은 Level 4~5 문항이 8개(38%)인 반면, 침산중은 3개(14%), 대구일중은 5개(24%)로 고난도 비율이 확연히 높습니다."
  - 단순히 "높다/낮다"가 아니라 문항 수와 비율을 명시

2줄 — **출제 단원 차이**: ${currentSchoolName}에서 집중 출제된 단원 vs 인근 학교에서 집중 출제된 단원을 구체적으로 비교.
  - 예: "${currentSchoolName}은 '인수분해의 활용'에서 5문항(24점)을 집중 출제했으나, 침산중은 2문항, 대구일중은 3문항으로 상대적으로 낮은 비중입니다."

3줄 — **서술형 비중**: 서술형 배점/문항수를 수치로 대비.
  - 예: "${currentSchoolName}의 서술형 배점이 35점(35%)으로 침산중(20점, 20%)·대구일중(25점, 25%) 대비 10~15점 높습니다."

4줄 — **이전 기출 변화** (데이터 있는 경우만): ${currentSchoolName}의 이전 시험 대비 Level 변화, 출제 영역 변화.

5줄 — **학생 대비 전략**: 인근 학교 시험도 함께 준비하는 학생을 위한 구체적 조언.
  - 공통 필수 학습 영역과 ${currentSchoolName}만의 차별 포인트를 분리해서 안내

**작성 규칙**:
- "평균 난이도", "반경 5km" 표현 금지. "Level"과 "인근 학교"로 표현.
- 계산 과정(예: "34점+10점=44점")을 노출하지 말고 결과값만 쓰세요(예: "44점").
- "배점 구조가 다르고" 같은 모호한 표현 금지. 구체적으로 어떻게 다른지 수치로 명시하세요.
- 서술형 배점 비교 시 각 학교별 실제 수치를 명시하세요(예: "침산중 20점, 대구일중 25점").
- ${currentSchoolName}이 인근 학교보다 적게 출제한 단원도 짚으세요(예: "사칙계산 2문항으로 침산중 4문항·대구일중 4문항 대비 적음").
- "이 시험", "이번 시험", "본 시험" 대신 반드시 "${currentSchoolName}"으로 표기하세요.
- 주변 학교 데이터가 없으면 "nearby_comparison"은 null.
- overall_comment에는 주변 학교 비교 내용을 넣지 마세요. 비교 분석은 nearby_comparison 필드에만 작성하세요.`);

    return blocks.join('\n');
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
      max_tokens: 8192,
      temperature: this.temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    if (!text) throw new Error('AI 응답이 비어있습니다');

    // JSON 추출
    const result = this.extractJson(text);
    return this.parseResponse(result, input.basicAnalysis.questions);
  }

  // ── JSON 추출 (다단계 복구) ──

  private extractJson(text: string): Record<string, unknown> {
    // 1차: 코드펜스 내 JSON 블록 추출
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

    // 2차: JSON 객체 범위만 추출 (앞뒤 설명 텍스트 제거)
    const jsonStart = candidate.indexOf('{');
    const jsonEnd = candidate.lastIndexOf('}');
    const jsonStr = jsonStart >= 0 && jsonEnd > jsonStart
      ? candidate.slice(jsonStart, jsonEnd + 1)
      : candidate;

    // 3차: 직접 파싱
    try {
      return JSON.parse(jsonStr);
    } catch {
      // 무시 — 아래에서 복구 시도
    }

    // 4차: 잘린 JSON 복구
    let fixed = jsonStr;
    // 잘린 문자열 값 닫기 (이스케이프된 따옴표 무시)
    const unescaped = fixed.replace(/\\"/g, '');
    if ((unescaped.match(/"/g) || []).length % 2 !== 0) fixed += '"';
    // trailing comma 제거
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    // 열린 배열/객체 닫기
    const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    const openBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    for (let i = 0; i < openBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces; i++) fixed += '}';

    try {
      return JSON.parse(fixed);
    } catch {
      // 무시 — 아래에서 최종 시도
    }

    // 5차: 잘린 마지막 키-값 쌍 제거 후 재시도
    const lastComma = fixed.lastIndexOf(',');
    if (lastComma > 0) {
      const trimmed = fixed.slice(0, lastComma) + fixed.slice(lastComma + 1).replace(/[^}\]]/g, '');
      // 닫는 괄호 보정
      let closing = trimmed;
      const ob = (closing.match(/\[/g) || []).length - (closing.match(/\]/g) || []).length;
      const oc = (closing.match(/\{/g) || []).length - (closing.match(/\}/g) || []).length;
      for (let i = 0; i < ob; i++) closing += ']';
      for (let i = 0; i < oc; i++) closing += '}';
      try {
        return JSON.parse(closing);
      } catch {
        // 무시
      }
    }

    throw new Error(`AI 총평 JSON 파싱 실패: ${jsonStr.slice(0, 200)}...`);
  }

  // ── AI 응답 파싱 ──

  parseResponse(raw: Record<string, unknown>, questions?: Array<{ question_number: number | string; question_format: string | null }>): Record<string, unknown> {
    const result: CommentaryResult = {
      overall_comment: String(raw.overall_comment ?? ''),
      exam_characteristics: this.parseStringArray(raw.exam_characteristics),
      score_strategy: raw.score_strategy ? String(raw.score_strategy) : undefined,
      score_strategies: Array.isArray(raw.score_strategies)
        ? (raw.score_strategies as Array<Record<string, unknown>>).map(s => ({
            grade: String(s.grade ?? ''),
            target: String(s.target ?? ''),
            strategy: s.strategy ? String(s.strategy) : undefined,
            points: Array.isArray(s.points) ? (s.points as string[]).map(String) : undefined,
          }))
        : undefined,
      strength_areas: this.parseStringArray(raw.strength_areas),
      improvement_areas: this.parseStringArray(raw.improvement_areas),
      notable_questions: this.parseNotableQuestions(raw.notable_questions, questions),
      teaching_recommendations: this.parseTeachingRecommendations(
        raw.teaching_recommendations ?? raw.study_priority,
      ),
      nearby_comparison: raw.nearby_comparison ? String(raw.nearby_comparison) : undefined,
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

  private parseNotableQuestions(
    value: unknown,
    questions?: Array<{ question_number: number | string; question_format: string | null }>,
  ): NotableQuestion[] {
    if (!Array.isArray(value)) return [];

    // 실제 문항번호 목록 (보정용)
    const validNumbers = questions?.map((q) => String(q.question_number)) || [];

    const seen = new Set<string>();
    return value
      .map((v) => {
        const item = v as Record<string, unknown>;
        let qNum = String(item.question_number ?? '');

        // AI가 숫자만 반환한 경우, 실제 문항 목록에서 매칭 시도
        if (validNumbers.length > 0 && !validNumbers.includes(qNum)) {
          const numOnly = qNum.replace(/\D/g, '');
          // "서답형N", "서술형N" 등 실제 번호에서 같은 숫자를 가진 비-순수숫자 번호 찾기
          const match = validNumbers.find(
            (vn) => String(vn) !== numOnly && String(vn).replace(/\D/g, '') === numOnly,
          );
          if (match) qNum = match;
        }

        return { question_number: qNum, comment: String(item.comment ?? '') };
      })
      .filter((nq) => {
        // 중복 제거
        const key = String(nq.question_number);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }) as NotableQuestion[];
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
