/**
 * 수학 기출 분석 프롬프트 빌더 — 수학 전용.
 *
 * 2026-08 과목 분리: 옛 prompt-builder.ts 에서 수학 가지만 남기고 분기를 접었다.
 * **프롬프트 텍스트는 한 글자도 바꾸지 않았다.**
 *
 * 이 파일은 수학 만 책임진다. 다른 과목 키를 넣지 말 것.
 * 공통 하네스·조립 순서는 `../shared/prompt-frame` 에 있다.
 */

import {
  getTopicsForGrade,
  getMistakesForGrade,
  getMiddleStudyPoints,
  getPrerequisiteIfHighSchool,
  SUBJECT_MATCHING_RULES,
  MATH_DIFFICULTY_SYSTEM_4LEVEL,
  ESSAY_ANALYSIS_FULL_GUIDE,
} from '../prompt-config-math';
import {
  POINTS_VALIDATION_RULES,
  EXAM_SUBJECT_CLASSIFICATION,
  SCHOOL_LEVEL_RULES,
} from '../prompt-config-common';
import { combinePrompts, getPaperTypeInstructions } from '../shared/prompt-frame';
import type { ExamContext, BuildPromptResponse } from '../types';
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from '../data/curriculum';

/** H3~H6 — 수학 전용 하드 제약 (공통 프레임에 주입) */
const HARD_CONSTRAINTS = `H3. 수학 영역(question_type)은 **정확히** 다음 5개 중 하나: number | algebra | function | geometry | statistics. 그 외 값 금지.
H4. 능력(ability_domain)은 **정확히** 다음 4개 중 하나: CALCULATION | UNDERSTANDING | REASONING | PROBLEM_SOLVING. 소문자, 한글, 기타 값 금지.
H5. 모든 수식은 KaTeX 문법으로 작성.
   - 금지: \`\\dfrac{a}{b}\` → 반드시 \`\\frac{a}{b}\`
   - 금지: 한글을 \`$...$\` 안에 포함 (예: \`$정답$\`) → 수식 밖으로 분리
   - 금지: \`$A$$B$\` 인접 → \`$A$ $B$\` (공백 필수)
   - 숫자와 영문 변수는 \`$...$\` 래핑: \`25\` → \`$25$\`, \`x\` → \`$x$\`
   - 다단계 계산식은 \`\\begin{aligned} ... \\end{aligned}\` 사용
H6. 도형 기호는 LaTeX 명령 사용: □ → \`\\square\`, △ → \`\\triangle\`, ∠ → \`\\angle\`.`;

/** V3~V5 — 수학 전용 자기검증 (공통 프레임에 주입) */
const SELF_VERIFY = `V3. 모든 question_type 값이 5개 허용값 내인가? (number/algebra/function/geometry/statistics)
V4. 모든 ability_domain 값이 4개 허용값 내인가? (CALCULATION/UNDERSTANDING/REASONING/PROBLEM_SOLVING)
V5. 수식 내 \`\\dfrac\` 0건, \`$한글$\` 0건, 인접 \`$A$$B$\` 0건인가?`;

/** H11~H14 — 수학 난이도 절대 기준. 공용 프레임에서 분리(리뷰 1.3): 영어 루브릭과 충돌했다. */
const DIFFICULTY_RULES = `────────────────────────────────────────────────
📊 H11~H14. 난이도(difficulty) 절대 기준 — 모든 평가 강제 일치
────────────────────────────────────────────────
H11. **5단계 난이도는 다음 절대 기준(평균 학생 정답률)으로만 평가**:
   - "1" (기본): 교과서 예제 수준 / 1단계 풀이 / **예상 정답률 90%+**
   - "2" (표준): 교과서 응용 또는 유형 적용 / 1~2단계 풀이 / **예상 정답률 70~90%**
   - "3" (응용): 2개 개념 결합 또는 식 변형 필요 / 2~3단계 풀이 / **예상 정답률 50~70%**
   - "4" (심화): 3+ 단계 풀이 / 함정·검증 필요 / **예상 정답률 25~50%**
   - "5" (최고난도): 창의적 접근 / 다단계 변형 / **예상 정답률 25% 미만**

H12. **난이도 평가는 다음 6개 축을 종합 판단** — 한 가지 축만 보지 말 것:
   ① **개념 결합 수**: 1개 개념(쉬움) ↔ 2~3개 결합(어려움)
   ② **풀이 단계 수**: 1단계 ↔ 5단계+
   ③ **추상도**: 구체적 숫자/그림 ↔ 일반화 식/변수
   ④ **함정 요소**: 직관 그대로 풀림 ↔ 반직관/검증 필요
   ⑤ **시간 압박**: 1분 내 ↔ 5분+
   ⑥ **친숙도**: 자주 나오는 정형 유형 ↔ 비정형/창의

H13. **자연스러운 분포 강제** — 학교 내신 시험은 다음 분포가 일반적:
   - 1단계: 5~15% / 2단계: 20~35% / 3단계: 25~40% / 4단계: 15~30% / 5단계: 0~10%
   - ❌ **모든 문항을 3에 몰아넣지 말 것** — "확실하지 않으면 3"으로 분류는 금지
   - ❌ **모든 문항을 같은 난이도로 출력하지 말 것** — 5종류 중 최소 3종류는 사용해야 함 (10문항 이상 시험지 기준)
   - ✅ 변별 문항(번호 후반 + 응용 키워드)은 적극적으로 4를 부여

H14. **시험지 내 위치 휴리스틱 (참고용)** — 강제 아니지만 의심 신호:
   - 1~5번이 4~5단계? → 의심 (보통 기본 확인)
   - 16~18번이 1~2단계? → 의심 (보통 변별 영역)
   - 서술형이 1~2단계? → 의심 (보통 다단계 풀이)
   - ⚠️ 위 신호가 발생하면 다시 풀이 단계와 개념 결합 수를 점검할 것
`;

/** V10~V11 — 난이도 분포·위치 자기검증 (H13/H14 와 짝) */
const DIFFICULTY_SELF_VERIFY = `V10. **난이도 분포 검증** — 10문항 이상이면 5단계 중 최소 3종류 사용? 모두 같은 난이도면 H13 위반.
V11. **난이도 위치 검증** — 1~5번이 모두 4단계 이상? 또는 16~18번이 모두 1~2단계? H14 신호 점검 후 재평가했는가?`;

export class MathExamPromptBuilder {
  /** 전체 프롬프트를 조립하여 반환한다. */
  static build(context: ExamContext): BuildPromptResponse {
    const base = this.getBasePrompt(context);
    const { guidelines, paperType, schema } = this.collectParts(context);

    const combined = combinePrompts(
      { base, guidelines, paperType, schema },
      {
        hardConstraints: HARD_CONSTRAINTS,
        selfVerify: SELF_VERIFY,
        difficultyRules: DIFFICULTY_RULES,
        difficultySelfVerify: DIFFICULTY_SELF_VERIFY,
      },
    );

    return {
      base_prompt: base,
      analysis_guidelines: guidelines.join('\n\n'),
      error_patterns_prompt: null,
      examples_prompt: null,
      combined_prompt: combined,
      used_templates: this.collectUsedTemplates(context),
      matched_problem_types: this.collectMatchedProblemTypes(context),
    };
  }

  /**
   * DB 템플릿 + 에러 패턴을 포함한 확장 빌드 (async).
   */
  static async buildWithDbContext(context: ExamContext): Promise<BuildPromptResponse> {
    // 기본 빌드
    const result = this.build(context);

    try {
      const { prisma } = await import('@/lib/db');

      // DB 템플릿 조회 (활성, 최신 버전)
      const dbTemplate = await prisma.examPromptTemplate.findFirst({
        where: {
          subject: 'MATH',
          agentType: 'basic',
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      // DB 에러 패턴 조회
      const errorPatterns = await prisma.examErrorPattern.findMany({
        where: {
          subject: 'MATH',
          isActive: true,
        },
        orderBy: { frequency: 'desc' },
        take: 10,
      });

      // 에러 패턴 프롬프트 구성
      let errorPatternsPrompt: string | null = null;
      if (errorPatterns.length > 0) {
        const patternLines = errorPatterns.map(p =>
          `- **${p.name}** (${p.errorType}, 빈도: ${p.frequency}): ${p.feedbackMessage || p.description}`
        ).join('\n');
        errorPatternsPrompt = `⚠️ **알려진 오류 패턴 (분석 시 참고):**\n\n${patternLines}`;
      }

      // DB 템플릿이 있으면 base_prompt 교체
      if (dbTemplate) {
        const customBase = dbTemplate.template;
        result.base_prompt = customBase;
        // ⚠️ combined_prompt 도 **반드시** 다시 조립한다.
        //    실제 AI 호출은 combined_prompt 하나만 쓰는데(analyze/route.ts) 예전에는
        //    base_prompt·used_templates 만 바꿔서, 관리자는 템플릿이 적용됐다고 믿지만
        //    분석은 코드 기본값 그대로였다 (적대적 리뷰 1.9).
        result.combined_prompt = this.assembleCombined(context, customBase);
        result.used_templates.push(`DB:${dbTemplate.name}(v${dbTemplate.version})`);
      }

      if (errorPatternsPrompt) {
        result.error_patterns_prompt = errorPatternsPrompt;
        // combined_prompt에도 에러 패턴 추가
        result.combined_prompt = result.combined_prompt + '\n\n' + errorPatternsPrompt;
      }

      // 승인된 레퍼런스 조회 (같은 grade, 최대 5건)
      const approvedRefs = await prisma.examQuestionReference.findMany({
        where: {
          subject: 'MATH',
          reviewStatus: 'approved',
          ...(context.grade_level ? { grade: context.grade_level } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      if (approvedRefs.length > 0) {
        const refLines = approvedRefs.map(r =>
          `- 단원: ${r.topicHierarchy || r.grade}, 난이도: ${r.difficulty}, 유형: ${r.questionType}${r.confidence && r.confidence < 0.7 ? ' (주의: 분석 시 주의 필요)' : ''}`
        ).join('\n');
        result.combined_prompt += `\n\n📚 **[참고 레퍼런스 문제]:**\n\n${refLines}`;
      }

      // ⚠️ 범주형 혼동 few-shot 경고 주입 — 비활성(2026-06-02).
      // 자가진화 자동반영 전면 정지 방침에 따라 누적 교정→프롬프트 자동 주입 중단.
      // 누적 교정은 측정 벤치마크로만 사용(/admin/evolution). 복원 필요 시 git 이력 참조.
    } catch {
      // DB 접근 실패 시 기본 빌드 결과 그대로 반환
    }

    return result;
    return result;
  }

  /** 기본 시스템 프롬프트 (역할 정의) */
  private static getBasePrompt(context: ExamContext): string {
    const gradeInfo = context.grade_level ? ` (${context.grade_level})` : '';
    const categoryInfo = context.category ? ` — ${context.category}` : '';

    return `당신은 한국 중·고등학교 **수학 시험지 분석 전문가**입니다${gradeInfo}${categoryInfo}.

주어진 시험지 이미지를 분석하여 각 문항의 난이도, 유형, 단원, 배점을 정확히 판별합니다.
분석 결과는 반드시 지정된 JSON 형식으로만 출력하세요.

**핵심 원칙:**
1. 모든 문항을 빠짐없이 분석 (단, 하나의 문항 안의 소문항 (1)(2)는 분리하지 말고 통합!)
2. 난이도는 5단계 시스템("1"~"5")을 엄격히 적용
3. topic 형식: "과목명 > 대단원 > 소단원" (공백 포함 > 구분)
4. ai_comment: 정확히 2문장, 존댓말(~입니다/~합니다), 각 문장 20~40자
5. confidence: 0.0~1.0 (불확실하면 낮게)`;
  }

  /** 학년별 분석 가이드라인 조합 */
  private static getAnalysisGuidelines(context: ExamContext): string[] {
    const parts: string[] = [];

    // 공통 규칙
    parts.push(SCHOOL_LEVEL_RULES);
    parts.push(EXAM_SUBJECT_CLASSIFICATION);
    parts.push(POINTS_VALIDATION_RULES);

      // 수학 전용 가이드라인 — 2축 모델(MATH_DIFFICULTY_SYSTEM_4LEVEL)만 사용.
      // ⚠️ 공통 DIFFICULTY_SYSTEM_FRAMEWORK는 옛 개념-수 정의 + "애매하면 한 단계 낮게"
      //   하향 편향이 있어 2축 깊이-우선 모델과 충돌 → 수학에서는 제외 (2026-05-29).
      //   (충돌로 인해 난이도가 계속 2~3에 몰리고 상향이 안 되던 문제 해결)
      parts.push(MATH_DIFFICULTY_SYSTEM_4LEVEL);
      parts.push(SUBJECT_MATCHING_RULES);

      // 학년별 토픽 분류표
      const topics = getTopicsForGrade(context.grade_level);
      if (topics) {
        parts.push(`📖 **수학 단원 분류표:**\n\n${topics}`);
      }

      // 학년별 흔한 실수
      const mistakes = getMistakesForGrade(context.grade_level);
      if (mistakes) {
        parts.push(`⚠️ **흔한 실수 유형:**\n\n${mistakes}`);
      }

      // 서술형 가이드
      if (context.has_essay) {
        parts.push(ESSAY_ANALYSIS_FULL_GUIDE);
      }

      // 중학교 학습 포인트
      const studyPoints = getMiddleStudyPoints(context.grade_level);
      if (studyPoints) {
        parts.push(studyPoints);
      }

      // 고등학교 선수 개념 매핑
      const prerequisite = getPrerequisiteIfHighSchool(context.grade_level);
      if (prerequisite) {
        parts.push(prerequisite);
      }

    return parts.filter(p => p.trim() !== '');
  }

  /** 요구 JSON 스키마 출력 */
  static getJsonSchema(
    paperType: string,
    gradeLevel: string | null,
    category: string | null
  ): string {
    const isStudent = paperType === 'student';

    // 문항 유형 분류 키
    const typeKeys = '"number"(수와 연산), "change_relation"(변화와 관계), "shape_measure"(도형과 측정), "data_possibility"(자료와 가능성)';

    // 난이도 키
    const difficultyKeys = '"1", "2", "3", "4", "5"';

    // 문항 형식
    const formatKeys = '"objective", "short_answer", "essay"';

    // topic 예시
    const topicExample = this.getMathTopicExample(gradeLevel, category);

    const studentFields = isStudent
      ? `
      "is_correct": true,
      "student_answer": "②",
      "earned_points": 3,
      "error_type": null`
      : '';

    const studentFieldsWrong = isStudent
      ? `
      "is_correct": false,
      "student_answer": "③",
      "earned_points": 0,
      "error_type": "concept_gap"`
      : '';

    // 분포 키 (유형)
    const typeDistExample = `"number": 0, "change_relation": 0, "shape_measure": 0, "data_possibility": 0`;

    const dominantTypeExample = 'change_relation';
    const q1Type = 'change_relation';
    const q1Ability = 'calculation';
    const q2Type = 'number';
    const q2Ability = 'understanding';
    const q16Type = 'change_relation';
    const q16Ability = 'PROBLEM_SOLVING';
    const qEssayType = 'change_relation';
    const qEssayAbility = 'REASONING';
    const q1Comment = '핵심 개념을 직접 확인하는 문제입니다. 공식을 정확히 암기하면 쉽게 풀 수 있습니다.';
    const q2Comment = '전형적인 유형 적용 문제입니다. 풀이 순서를 익히면 안정적으로 정답할 수 있습니다.';
    const q16Comment = '여러 단계 식 변형이 필요한 응용 문제입니다. 함정 요소가 있으므로 검산이 필수입니다.';
    const qEssayComment = '두 개념을 연결하여 단계적으로 풀어야 하는 서술형입니다. 부분 점수가 가능합니다.';
    const typeFieldRule = `${typeKeys} 중 하나 — **문제의 수학적 형태/소재** 기준`;
    const abilityFieldRule = '"calculation"(계산력), "understanding"(이해력), "problem_solving"(문제해결력), "reasoning"(추론력) 중 하나 — **풀이에 요구되는 사고력** 기준';
    const typeVsAbility = `**⚠️ question_type vs ability_domain 구분 (매우 중요!):**

| | question_type (유형) | ability_domain (능력) |
|---|---|---|
| **기준** | 문제의 **수학적 소재/형태** | 풀이에 **요구되는 사고력** |
| **판단법** | "이 문제는 무엇에 대한 문제인가?" | "이 문제를 풀려면 어떤 능력이 필요한가?" |

- **calculation**(계산력): 공식 대입, 사칙연산, 방정식 풀이 등 **절차적 계산**이 핵심
- **understanding**(이해력): 개념 정의, 성질 파악, 그래프 해석 등 **개념 이해**가 핵심
- **problem_solving**(문제해결력): 조건 해석, 식 세우기, 전략 수립 등 **응용/문장제**가 핵심
- **reasoning**(추론력): 증명, 논리적 추론, 반례 찾기, 참/거짓 판별 등 **논리적 사고**가 핵심

예: "제곱근 계산" → question_type: **number**, ability_domain: **calculation**
예: "이차방정식 풀이" → question_type: **change_relation**, ability_domain: **calculation**
예: "이차함수 그래프 해석" → question_type: **change_relation**, ability_domain: **understanding**
예: "도형의 넓이 활용 문제" → question_type: **shape_measure**, ability_domain: **problem_solving**
예: "확률 추론 문제" → question_type: **data_possibility**, ability_domain: **reasoning**

⚠️ question_type과 ability_domain은 **서로 다른 관점**입니다. 기계적으로 같은 값을 넣지 말고 독립적으로 판단하세요.
- question_type = **교육과정 4대 영역(2022 개정)** (이 문제가 어떤 내용 영역에 해당하는가?)
- ability_domain = **4대 사고력** (이 문제를 풀려면 어떤 능력이 필요한가?)
- 같은 단원이라도 문제에 따라 필요한 능력이 다릅니다. (예: 도형과 측정 영역의 계산 문제 → shape_measure + calculation)`;

    return `🔧 **[필수] JSON 출력 형식**

반드시 아래 형식의 JSON만 출력하세요. 추가 텍스트 없이 JSON만!

**⚠️ JSON 안전 출력 — 절대 위반 금지:**
- **ai_comment 안에 LaTeX 수식($...$) 사용 금지!** 모두 한글로 풀어쓰기 (예: "이차방정식의 근의 공식을 적용합니다", "분수 형태의 식을 정리합니다")
- topic / difficulty_reason 등 다른 문자열에도 백슬래시(\\\\) 포함 금지. 모두 한글/한국어로만 표기
- 절대 금지: \`undefined\` (반드시 \`null\` 사용), trailing comma, \`//\` 주석, 문자열 안 raw 줄바꿈
- 큰따옴표(\\"")는 반드시 \\\\\\" 로 이스케이프

\`\`\`json
{
  "exam_info": {
    "total_questions": 21,
    "total_points": 100,
    "school_name": "시험지에 적힌 학교명 또는 null (예: 정화중학교, 영남고등학교)",
    "format_distribution": {
      "objective": 16,
      "short_answer": 0,
      "essay": 5
    }
  },
  "summary": {
    "difficulty_distribution": {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0
    },
    "type_distribution": {
      ${typeDistExample}
    },
    "average_difficulty": "2",
    "dominant_type": "${dominantTypeExample}"
  },
  "questions": [
    {
      "question_number": 1,
      "question_format": "objective",
      "difficulty": "1",
      "difficulty_reason": "1단계 풀이",
      "question_type": "${q1Type}",
      "ability_domain": "${q1Ability}",
      "points": 3,
      "topic": "${topicExample}",
      "ai_comment": "${q1Comment}",
      "confidence": 0.97,
      "confidence_reason": "문항 내용 명확"${studentFields ? ',' + studentFields : ''}
    },
    {
      "question_number": 2,
      "question_format": "objective",
      "difficulty": "2",
      "difficulty_reason": "유형 적용",
      "question_type": "${q2Type}",
      "ability_domain": "${q2Ability}",
      "points": 3,
      "topic": "${topicExample}",
      "ai_comment": "${q2Comment}",
      "confidence": 0.92,
      "confidence_reason": "문항 내용 명확"${studentFieldsWrong ? ',' + studentFieldsWrong : ''}
    },
    {
      "question_number": 16,
      "question_format": "objective",
      "difficulty": "4",
      "difficulty_reason": "3단계 + 함정",
      "question_type": "${q16Type}",
      "ability_domain": "${q16Ability}",
      "points": 5,
      "topic": "${topicExample}",
      "ai_comment": "${q16Comment}",
      "confidence": 0.82,
      "confidence_reason": "배점 추정"
    },
    {
      "question_number": "서술형1",
      "question_format": "essay",
      "difficulty": "3",
      "difficulty_reason": "2개 개념 결합",
      "question_type": "${qEssayType}",
      "ability_domain": "${qEssayAbility}",
      "points": 8,
      "topic": "${topicExample}",
      "ai_comment": "${qEssayComment}",
      "confidence": 0.78,
      "confidence_reason": "비정형 유형"
    }
  ]
}
\`\`\`

**필드 규칙:**

| 필드 | 규칙 |
|------|------|
| question_number | 시험지에 표기된 번호 (소문제: "1-1", "1-2" 등) |
| question_format | ${formatKeys} 중 하나 |
| difficulty | ${difficultyKeys} 중 하나. **H11 절대 기준 + H12 6축 + H13 분포 강제 + H14 위치 휴리스틱 엄수**. 모든 문항을 "3"으로 몰지 말 것. |
| difficulty_reason | 난이도 판정 이유, **최대 15자**. 어떤 축(개념결합/풀이단계/추상도/함정/시간/친숙도)으로 평가했는지 명시 권장 (예: "3단계 풀이", "함정 변형", "2개 개념 결합") |
| question_type | ${typeFieldRule} |
| ability_domain | ${abilityFieldRule} |
| points | 배점 (숫자), 불분명 시 null |
| topic | "과목명 > 대단원 > 소단원" (공백 포함 > 구분) |
| ai_comment | **정확히 2문장, 존댓말(~입니다/~합니다), 각 문장 20~40자. 1문장: 출제 의도/핵심 개념, 2문장: 풀이 포인트/주의점. 수식이 불명확하면 "글씨가 흐려 일부는 추정했습니다"로 표현. ❌ 출제 오류 지적 금지.** |
| confidence | 0.0~1.0. **H15 5단계 매핑 엄수 + H17 분포 강제**. 모든 문항을 0.95로 출력 금지 — 약 30%는 0.85 이하가 정상. |
| confidence_reason | 신뢰도 판정 근거 (최대 20자). **허용 사유만 사용**: "문항 내용 명확"(0.90+), "비정형 유형"(0.75~0.89), "배점 추정"(0.70~0.89), "출제범위 의심"(0.60~0.79), "스캔 품질 낮음"(0.50~0.74), "판독 실패 — 번호만 인식"(0.00~0.29). **H16 매핑 엄수**. ❌ "계산 결과가 선택지에 없음", "정답이 보기에 없음", "문제 오류 의심" 등 풀이 검산 기반 사유 금지 — 너는 메타데이터만 추출하며 풀이를 수행하지 않는다. |${isStudent ? `
| is_correct | true/false/null (정오 판별, 판단 불가 시 null) |
| student_answer | 학생 답안 문자열 (판독 불가 시 null) |
| earned_points | 획득 점수 (서술형 부분점수 가능, 판단 불가 시 null) |
| error_type | "calculation_error"/"concept_gap"/"careless"/"time_pressure"/"misread"/null |` : ''}

${typeVsAbility}

**summary 규칙:**
- difficulty_distribution: 각 난이도별 문항 수 (합계 = questions 배열 길이)
- type_distribution: 각 유형별 문항 수 (합계 = questions 배열 길이)
- average_difficulty: 가장 많은 난이도 (동률이면 낮은 쪽)
- dominant_type: 가장 많은 유형

**format_distribution 규칙:**
- objective + short_answer + essay = questions 배열 길이

**🚨 exam_info.total_questions / total_points — 시험지에서 "직접 읽은" 값 (최우선 규칙):**
이 두 값은 **네가 분석한 결과의 합계가 아니라, 시험지 자체에 있는 값**이다. 누락 검증의 유일한 기준이므로 절대 자기 출력에 맞추지 마라.
- **total_points**: 시험지에 인쇄된 **만점**(대개 100점). 시험지 머리말/안내문의 "100점 만점" 같은 표기를 그대로 읽어라. 네가 매긴 배점들의 합이 아니다.
  - 만점 표기가 없으면 시험지에 실제로 인쇄된 각 문항 배점의 총합을 세어라.
- **total_questions**: 시험지에 실제로 인쇄된 **전체 문항 수**. questions 배열의 길이가 아니다.
  - 객관식 + 단답형 + 서술형을 **모두** 세어라. 서술형이 뒤쪽 별지에 있어도 반드시 포함.
- 두 값이 네 questions 배열과 어긋나도 **그대로 신고하라.** 시스템이 그 차이로 누락을 감지해 재분석한다.
  억지로 맞추면 누락이 영원히 은폐된다.

**🚨 문항 누락 금지 — 마지막 문항까지:**
- 시험지의 **모든** 문항을 questions 배열에 담아라. 특히 **마지막 페이지의 서술형**이 빠지는 사고가 잦다.
- 출력 전 스스로 점검: ① questions 배열 길이 = total_questions 인가? ② 배점 합계 = total_points 인가?
  다르면 빠뜨린 문항이 있는 것이니 **시험지를 다시 훑어 채운 뒤** 출력하라.`;
  }

  // ── Private 헬퍼 ──

  /**
   * 수학 topic 예시 생성
   */
  private static getMathTopicExample(
    gradeLevel: string | null,
    category: string | null
  ): string {
    if (category) {
      // 과목 카테고리가 명시된 경우
      const categoryExamples: Record<string, string> = {
        '공통수학1': '공통수학1 > 다항식 > 다항식의 연산',
        '공통수학2': '공통수학2 > 도형의 방정식 > 원의 방정식',
        '대수': '대수 > 지수함수와 로그함수 > 지수함수',
        '미적분I': '미적분I > 미분 > 도함수의 활용',
        '미적분II': '미적분II > 여러 가지 미분법 > 합성함수의 미분',
        '확률과 통계': '확률과 통계 > 확률 > 조건부 확률',
        '기하': '기하 > 이차곡선 > 포물선',
      };
      return categoryExamples[category] ?? `${category} > 대단원 > 소단원`;
    }

    if (gradeLevel) {
      const gradeExamples: Record<string, string> = {
        // ⚠️ 이 예시는 curriculum.ts의 정확한 대단원명을 사용해야 함 (드롭다운과 일치)
        '중1': '중1 수학 > 소인수분해 > 소인수분해',
        '중2': '중2 수학 > 연립일차방정식 > 연립일차방정식의 풀이',
        '중3': '중3 수학 > 이차방정식 > 이차방정식의 풀이',
        '고1': '공통수학1 > 다항식 > 다항식의 연산',
        '고2': '대수 > 수열 > 등차수열과 등비수열',
        '고3': '미적분II > 수열의 극한 > 급수',
      };
      return gradeExamples[gradeLevel] ?? '공통수학1 > 다항식 > 다항식의 연산';
    }

    return '공통수학1 > 다항식 > 다항식의 연산';
  }

  /** 사용된 템플릿 목록 수집 */
  private static collectUsedTemplates(context: ExamContext): string[] {
    const templates: string[] = [
      'SCHOOL_LEVEL_RULES',
      'EXAM_SUBJECT_CLASSIFICATION',
      'POINTS_VALIDATION_RULES',
      'DIFFICULTY_SYSTEM_FRAMEWORK',
    ];

      templates.push('MATH_DIFFICULTY_SYSTEM_5LEVEL');
      templates.push('SUBJECT_MATCHING_RULES');
      templates.push('MATH_TOPICS');

      if (context.has_essay) {
        templates.push('ESSAY_ANALYSIS_FULL_GUIDE');
      }
      if (context.grade_level?.startsWith('중')) {
        templates.push('MATH_MIDDLE_STUDY_POINTS');
        templates.push('MATH_COMMON_MISTAKES');
      }
      if (context.grade_level?.startsWith('고')) {
        templates.push('PREREQUISITE_MAPPING');
        templates.push('MATH_COMMON_MISTAKES');
      }

    return templates;
  }

  /**
   * 학년 + 학기 + 시험종류 조합에서 일반적인 출제 단원 범위를 힌트로 생성.
   * 출제범위(examScope)가 명시되지 않았을 때도 최소한의 시기적 제약을 걸어
   * "원과 현"처럼 다른 학기 단원으로 잘못 분류되는 것을 예방한다.
   */
  private static buildPeriodHint(context: ExamContext): string | null {
    const year = context.exam_year;
    const semester = context.exam_semester;
    const category = context.exam_category;

    // 학년도 없고 학기/시험종류도 없으면 힌트 없음
    if (!context.grade_level && !semester && !category) return null;

    const gradeLabel = context.grade_level || '해당 학년';
    const semesterLabel = semester ? `${semester}학기` : '';
    const catMap: Record<string, string> = {
      MIDTERM: '중간고사',
      FINAL: '기말고사',
      MOCK: '모의고사',
      OTHER: '기타 시험',
    };
    const catLabel = category ? (catMap[category] ?? category) : '';

    // 중학교 학기별 일반 단원 범위 (22개정 기준 — 출판사 공통)
    const MIDDLE_PERIOD_HINTS: Record<string, { first_mid?: string; first_final?: string; second_mid?: string; second_final?: string }> = {
      '중1': {
        first_mid: '소인수분해, 최대공약수/최소공배수, 정수와 유리수',
        first_final: '정수와 유리수의 사칙연산, 문자와 식(문자의 사용, 일차식의 계산)',
        second_mid: '좌표평면과 그래프, 정비례/반비례, 기본도형',
        second_final: '작도와 합동, 평면도형의 성질, 입체도형',
      },
      '중2': {
        first_mid: '유리수와 순환소수, 단항식/다항식의 계산',
        first_final: '일차부등식, 연립일차방정식, 일차함수',
        second_mid: '일차함수와 일차방정식, 도형의 성질(삼각형/사각형)',
        second_final: '도형의 닮음, 피타고라스 정리, 확률',
      },
      '중3': {
        first_mid: '제곱근과 실수, 다항식의 곱셈/인수분해',
        first_final: '이차방정식, 이차함수',
        second_mid: '삼각비',
        second_final: '원의 성질(원과 현/접선, 원주각), 통계(대푯값/산포도/상관관계)',
      },
    };

    const gradeKey = gradeLabel.replace(/\s/g, '').slice(0, 2); // "중3"
    const periodMap = MIDDLE_PERIOD_HINTS[gradeKey];

    let likelyTopics: string | null = null;
    let excludedTopics: string | null = null;
    if (periodMap && semester && category) {
      const isFinal = category === 'FINAL';
      if (semester === 1 && !isFinal) {
        likelyTopics = periodMap.first_mid ?? null;
        excludedTopics = [periodMap.first_final, periodMap.second_mid, periodMap.second_final].filter(Boolean).join(' / ') || null;
      } else if (semester === 1 && isFinal) {
        likelyTopics = [periodMap.first_mid, periodMap.first_final].filter(Boolean).join(' + ') || null;
        excludedTopics = [periodMap.second_mid, periodMap.second_final].filter(Boolean).join(' / ') || null;
      } else if (semester === 2 && !isFinal) {
        likelyTopics = periodMap.second_mid ?? null;
        excludedTopics = [periodMap.second_final].filter(Boolean).join(' / ') || null;
      } else if (semester === 2 && isFinal) {
        likelyTopics = [periodMap.second_mid, periodMap.second_final].filter(Boolean).join(' + ') || null;
      }
    }

    // 학년 전체 단원 (학기 정보가 없을 때도 학년 밖은 배제하는 용도)
    const gradeAllTopics = periodMap
      ? [periodMap.first_mid, periodMap.first_final, periodMap.second_mid, periodMap.second_final].filter(Boolean).join(' / ')
      : null;

    const parts: string[] = [];
    parts.push(`📅 **[ABSOLUTE] 시험 시기/학년 제약 — 그림·시각 증거보다 우선**`);
    parts.push('');
    const headerPieces = [year ? `${year}년` : '', gradeLabel, semesterLabel, catLabel].filter(Boolean).join(' ');
    parts.push(`이 시험은 **${headerPieces || gradeLabel}**입니다.`);
    if (likelyTopics) {
      parts.push('');
      parts.push(`✅ **이 시기의 일반적 출제 단원 (이 범위 내에서만 chapter 선택)**: ${likelyTopics}`);
    } else if (gradeAllTopics) {
      parts.push('');
      parts.push(`✅ **${gradeLabel} 전 학년 단원 (이 밖의 학년 단원 선택 금지)**: ${gradeAllTopics}`);
    }
    if (excludedTopics) {
      parts.push('');
      parts.push(`❌ **이 시기 이후에 배우는 단원 (절대 분류 금지)**: ${excludedTopics}`);
      parts.push(`이 단원들은 해당 학기 이후에 다루므로 **그림이 비슷해 보여도 여기로 분류하지 말 것**.`);
    }
    parts.push('');
    parts.push(`🔒 **하드 제약 (위반 시 분석 무효 처리)**:`);
    parts.push(`1. 모든 문항의 chapter는 반드시 위에 나열된 "출제 단원" 또는 "전 학년 단원" 내에 있어야 한다.`);
    parts.push(`2. **확신 없으면 추측하지 말고 \`chapter: "UNKNOWN"\`, \`topic: "UNKNOWN"\`, \`confidence ≤ 0.4\`로 반환하라.** 사용자가 나중에 직접 편집한다. 틀린 단원을 배정하는 것보다 UNKNOWN이 **훨씬** 낫다.`);
    parts.push(`3. 금지 단원(이후 학기)으로 분류하고 싶다면 **반드시 UNKNOWN으로 대체**하고 \`confidence_reason\`에 "시기 외 단원 의심 — 사용자 확인 필요" 명시.`);
    parts.push(`4. 시각적 장식(원·삼각형·그래프 그림)만으로 단원을 유추하지 말 것. **실제 풀이에 사용되는 공식·개념**으로 판단하라.`);
    parts.push(`   - 예: 도넛 모양 원 그림이 있어도 풀이가 \`(a+b)(a-b)=a²-b²\` 인수분해라면 단원은 **다항식의 인수분해** (원의 성질 아님).`);
    parts.push(`   - 예: 좌표 그래프가 그려져 있어도 풀이가 이차방정식의 근이면 단원은 **이차방정식**.`);
    parts.push(`   - 풀이가 떠오르지 않으면 억지로 단원을 짜맞추지 말고 UNKNOWN으로.`);
    parts.push(`5. 자기 검증(V 체크): 반환 직전 모든 문항의 chapter를 위 목록과 대조하라. 벗어난 항목은 UNKNOWN으로 변경.`);

    return parts.join('\n');
  }

  /**
   * DB에서 허용 소단원명 목록을 추출하여 프롬프트 텍스트로 반환
   * Gemini가 이 목록에 있는 소단원명만 topic에 사용하도록 강제
   */
  private static getAllowedTopicNames(gradeLevel: string | null): string | null {
    const all = [...MIDDLE_SCHOOL_CURRICULUM, ...HIGH_SCHOOL_CURRICULUM];

    // 학년 필터
    let filtered = all;
    if (gradeLevel) {
      const prefix = gradeLevel.replace(/학년|학기/g, '').trim().slice(0, 2);
      filtered = all.filter(c => c.grade.includes(prefix));
    }
    if (!filtered.length) filtered = all;

    // 학년별 소단원명 목록 생성
    const lines: string[] = [];
    for (const curr of filtered) {
      for (const unit of curr.units) {
        const topicNames = unit.topics.map((t: { keywords: string[] }) => t.keywords[0]);
        lines.push(`- ${unit.name}: ${topicNames.join(', ')}`);
      }
    }

    if (!lines.length) return null;

    return `📋 **[필수] 소단원 분류 목록 (topic 필드에 반드시 아래 이름만 사용)**

topic 필드의 소단원(마지막 > 이후)은 **반드시 아래 목록에 있는 정확한 이름**을 사용하세요.
목록에 없는 이름을 사용하면 학습 전략·실수 유형·킬러 패턴 매칭이 모두 실패합니다.

${lines.join('\n')}

**규칙 (엄격):**
- topic 형식: "학년 수학 > 대단원 > 소단원" (예: "중3 수학 > 실수와 그 연산 > 제곱근의 뜻")
- 소단원은 위 목록의 **정확한 문자열**을 복사하여 사용 (변형/약어/축약/동의어 절대 금지)
- 위 목록에 없는 소단원명은 절대 만들지 마세요. 반드시 목록 중 하나를 선택해야 합니다.
- 하나의 문제가 여러 소단원에 걸칠 경우, 가장 핵심적인 소단원 하나만 선택하세요.`;
  }

  /** 매칭된 문제 유형 수집 */
  private static collectMatchedProblemTypes(context: ExamContext): string[] {
      const types = ['number', 'change_relation', 'shape_measure', 'data_possibility'];
      // category가 있으면 관련 유형 우선 (키=고등 과목명 유지, 값=4대 영역)
      if (context.category) {
        const categoryTypeMap: Record<string, string[]> = {
          '공통수학1': ['change_relation', 'data_possibility'],
          '공통수학2': ['shape_measure', 'change_relation'],
          '대수': ['change_relation'],
          '미적분I': ['change_relation'],
          '미적분II': ['change_relation'],
          '확률과 통계': ['data_possibility'],
          '기하': ['shape_measure'],
        };
        return categoryTypeMap[context.category] ?? types;
      }
      return types;
  }

  /**
   * 가이드라인·시험지유형·스키마를 모은다. `build()` 와 DB 템플릿 재조립이 **같은 것**을 써야
   * 커스텀 base 를 얹어도 나머지가 어긋나지 않는다 (적대적 리뷰 1.9).
   */
  private static collectParts(context: ExamContext): { guidelines: string[]; paperType: string; schema: string } {
    const guidelines = this.getAnalysisGuidelines(context);
    const paperType = getPaperTypeInstructions(context.paper_type);
    const schema = this.getJsonSchema(context.paper_type, context.grade_level, context.category);

    // 허용 소단원 목록 (DB 1:1 매칭용) — 드롭다운과 동일 함수
    const allowedTopics = this.getAllowedTopicNames(context.grade_level);
    if (allowedTopics) {
      guidelines.push(allowedTopics);
    }

    // 학기/시험종류 기반 기본 제약
    const periodHint = this.buildPeriodHint(context);
    if (periodHint) {
      guidelines.push(periodHint);
    }

    if (context.exam_scope && context.exam_scope.length > 0) {
      guidelines.push(`🎯 **[ABSOLUTE] 출제범위 제한 — 이 규칙은 그림/시각 증거보다 우선합니다**

이 시험의 출제범위는 다음 단원으로 **완전히 한정**되어 있습니다:

**출제범위**: ${context.exam_scope.join(' / ')}

**절대 규칙 (위반 시 분석 무효):**
1. ❌ **출제범위 밖 단원으로 chapter/section 을 배정하지 말 것.** 그림에 원·삼각형·그래프 등이 보여도, 실제 **풀이 과정에 필요한 개념**이 출제범위에 속하는지로 판단하라.
2. ❌ 시각적 장식(도형 그림)만으로 단원을 유추하는 것을 금지한다. 문제의 **요구하는 계산/추론/공식**을 기준으로 하라.
3. ✅ 문제의 풀이가 출제범위의 개념(인수분해·이차방정식·제곱근 등)을 사용한다면 그 단원을 선택하라. 설령 문제에 원이 등장해도 **원의 성질** 단원이 아니다.
4. ✅ 출제범위 밖으로 분류하고 싶다면 **반드시 \`chapter: "UNKNOWN"\`, \`topic: "UNKNOWN"\`, \`confidence ≤ 0.4\`로 반환**하라. 사용자가 나중에 직접 편집한다. 틀린 단원보다 UNKNOWN이 낫다.
5. 자기 검증(V 체크): 모든 문항의 chapter 가 출제범위 단원 내에 있는가? 아니면 UNKNOWN으로 교체하라.`);
    }

    return { guidelines, paperType, schema };
  }

  /** DB 템플릿이 base 를 교체했을 때 실제 호출용 프롬프트를 다시 조립한다. */
  private static assembleCombined(context: ExamContext, base: string): string {
    return combinePrompts(
      { base, ...this.collectParts(context) },
      {
        hardConstraints: HARD_CONSTRAINTS,
        selfVerify: SELF_VERIFY,
        difficultyRules: DIFFICULTY_RULES,
        difficultySelfVerify: DIFFICULTY_SELF_VERIFY,
      },
    );
  }
}
