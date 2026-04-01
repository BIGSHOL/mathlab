/**
 * 동적 프롬프트 빌더
 * Python prompt_builder.py에서 1:1 이식
 *
 * 시험지 분석을 위한 최종 프롬프트를 조립하는 핵심 오케스트레이터.
 * 과목, 학년, 시험지 유형에 따라 적절한 프롬프트 부분을 동적으로 결합한다.
 */

import {
  getTopicsForGrade,
  getMistakesForGrade,
  getMiddleStudyPoints,
  getPrerequisiteIfHighSchool,
  SUBJECT_MATCHING_RULES,
  MATH_DIFFICULTY_SYSTEM_4LEVEL,
  ESSAY_ANALYSIS_FULL_GUIDE,
} from './prompt-config-math';
import {
  POINTS_VALIDATION_RULES,
  EXAM_SUBJECT_CLASSIFICATION,
  SCHOOL_LEVEL_RULES,
  DIFFICULTY_SYSTEM_FRAMEWORK,
} from './prompt-config-common';
import type { ExamContext, BuildPromptResponse } from './types';
import { MIDDLE_SCHOOL_CURRICULUM, HIGH_SCHOOL_CURRICULUM } from './data/curriculumStrategies';

// ── 영어 과목 프롬프트 (인라인, prompt-config-english 미생성 시 대비) ──
// 영어 관련 설정은 향후 prompt-config-english.ts로 분리 예정

const ENGLISH_TOPICS: Record<string, string> = {
  '중1': `[중1 영어]
- 문법: be동사, 일반동사 현재형, 인칭대명사, 명사의 복수형, 전치사
- 읽기: 짧은 대화문, 안내문, 일상 주제 지문
- 어휘: 기초 생활 어휘 500단어 수준`,

  '중2': `[중2 영어]
- 문법: 과거형, 진행형, 비교급/최상급, 접속사, to부정사, 동명사
- 읽기: 편지, 이메일, 설명문, 서사문
- 어휘: 중급 어휘 800단어 수준`,

  '중3': `[중3 영어]
- 문법: 현재완료, 수동태, 관계대명사, 분사, 간접의문문
- 읽기: 논설문, 과학 지문, 문화 비교
- 어휘: 고급 중학 어휘 1200단어 수준`,

  '고1': `[고1 영어]
- 문법: 관계부사, 가정법, 분사구문, 강조/도치
- 읽기: 수능형 독해 (빈칸, 순서, 삽입, 요약)
- 어휘: 수능 기초 어휘`,

  '고2': `[고2 영어]
- 문법: 복합관계사, 가정법 과거완료, 혼합가정법
- 읽기: 수능 유형 심화 (함축의미, 장문독해, 어법)
- 어휘: 수능 핵심 어휘`,

  '고3': `[고3 영어]
- 문법: 전 범위 통합
- 읽기: 수능/모의고사 실전 유형 전체
- 어휘: 수능 완성 어휘`,
};

const ENGLISH_COMMON_MISTAKES: Record<string, string> = {
  '중학': `**중학 영어 주요 실수:**
- 3인칭 단수 -s 누락 (He play → He plays)
- 시제 혼용 (과거/현재 혼동)
- 관계대명사 who/which/that 구분 실패
- to부정사/동명사 목적어 구분`,

  '고등': `**고등 영어 주요 실수:**
- 가정법 시제 오류 (If I was → If I were)
- 분사구문 주어 불일치
- 수능 빈칸추론에서 논리적 연결 실패
- 어법 문제에서 준동사(to-v/v-ing/p.p.) 구분 실패`,
};

const ENGLISH_DIFFICULTY_SYSTEM_4LEVEL = `🚨 **영어 난이도 5단계 시스템**:

**난이도 값은 반드시 문자열 "1", "2", "3", "4", "5" 중 하나를 사용하세요.**

### 1️⃣ "1" (기본) - 기본 문법/어휘 확인
- 단순 문법 규칙 적용, 기초 어휘 의미 파악
- 정답률 85% 이상 예상

### 2️⃣ "2" (표준) - 알려진 문제 유형 적용
- 수능 기출 유형 (빈칸, 순서, 삽입 등), 문법 복합 적용
- 정답률 60-85% 예상

### 3️⃣ "3" (응용) - 문맥 응용/변형
- 문맥 기반 응용, 복합 문법 적용, 환언 추론
- 정답률 45-65% 예상

### 4️⃣ "4" (심화) - 추론/분석 필요
- 함축 의미 파악, 장문 독해, 복합 문법 판단
- 정답률 25-45% 예상

### 5️⃣ "5" (최고난도) - 고난도 추론
- 빈칸추론 킬러, 복합 장문, 간접 쓰기
- 정답률 25% 이하`;

const ENGLISH_QUESTION_STRATEGIES = `📝 **영어 문항 유형별 분석 전략:**

- **어법(grammar)**: 밑줄 친 부분의 문법 요소 파악, 준동사/시제/수일치 등
- **어휘(vocabulary)**: 문맥상 의미 파악, 동의어/반의어
- **독해(reading)**: 주제, 요지, 제목, 빈칸, 순서, 삽입, 요약
- **듣기(listening)**: 대화 상황 파악, 화자 의도
- **서술형(writing)**: 문장 완성, 영작, 조건 영작`;

const ENGLISH_EVALUATION_SYSTEM = `📊 **영어 평가 유형 분류:**

| 유형 | 설명 |
|------|------|
| grammar | 어법/문법 |
| vocabulary | 어휘 |
| reading | 독해 |
| listening | 듣기 |
| writing | 서술형/영작 |
| communication | 의사소통 |`;

function getEnglishTopicsForGrade(gradeLevel: string | null): string {
  if (!gradeLevel) {
    const middle = ['중1', '중2', '중3'].map(g => ENGLISH_TOPICS[g] ?? '').filter(Boolean).join('\n\n');
    const high = ['고1', '고2', '고3'].map(g => ENGLISH_TOPICS[g] ?? '').filter(Boolean).join('\n\n');
    return `### 【중학교 영어】\n\n${middle}\n\n### 【고등학교 영어】\n\n${high}`;
  }

  if (gradeLevel.startsWith('중')) {
    const topics = ['중1', '중2', '중3'].map(g => ENGLISH_TOPICS[g] ?? '').filter(Boolean).join('\n\n');
    return `### 【중학교 영어】\n\n${topics}`;
  }

  if (gradeLevel.startsWith('고')) {
    const topics = ['고1', '고2', '고3'].map(g => ENGLISH_TOPICS[g] ?? '').filter(Boolean).join('\n\n');
    return `### 【고등학교 영어】\n\n${topics}`;
  }

  const middle = ['중1', '중2', '중3'].map(g => ENGLISH_TOPICS[g] ?? '').filter(Boolean).join('\n\n');
  const high = ['고1', '고2', '고3'].map(g => ENGLISH_TOPICS[g] ?? '').filter(Boolean).join('\n\n');
  return `### 【중학교 영어】\n\n${middle}\n\n### 【고등학교 영어】\n\n${high}`;
}

function getEnglishMistakesForGrade(gradeLevel: string | null): string {
  if (!gradeLevel) {
    return Object.values(ENGLISH_COMMON_MISTAKES).join('\n\n');
  }
  if (gradeLevel.startsWith('중')) return ENGLISH_COMMON_MISTAKES['중학'] ?? '';
  if (gradeLevel.startsWith('고')) return ENGLISH_COMMON_MISTAKES['고등'] ?? '';
  return Object.values(ENGLISH_COMMON_MISTAKES).join('\n\n');
}

function getEnglishWritingGuideIfNeeded(hasEssay: boolean): string {
  if (!hasEssay) return '';
  return `📝 **영어 서술형 채점 가이드**

**채점 기준:**
- 문법 정확성: 30-40%
- 내용 적절성: 30-40%
- 표현의 자연스러움: 10-20%
- 조건 충족 여부: 10-20%

**흔한 감점 요인:**
1. 주어-동사 수일치 오류
2. 시제 불일치
3. 조건에서 요구한 문법 요소 미사용
4. 철자 오류 (기본 단어)
5. 문장 구조 불완전 (주어/동사 누락)`;
}

// ══════════════════════════════════════════
// ExamPromptBuilder 클래스
// ══════════════════════════════════════════

export class ExamPromptBuilder {
  /**
   * 전체 프롬프트를 조립하여 반환한다.
   * DB 템플릿이 있으면 우선 사용, 없으면 파일 기반 기본값 사용.
   */
  static build(context: ExamContext): BuildPromptResponse {
    const base = this.getBasePrompt(context);
    const guidelines = this.getAnalysisGuidelines(context);
    const paperType = this.getPaperTypeInstructions(context);
    const schema = this.getJsonSchema(
      context.paper_type,
      context.subject,
      context.grade_level,
      context.category
    );

    // 허용 소단원 목록 (DB 1:1 매칭용)
    if (context.subject === '수학' || context.subject.toUpperCase() === 'MATH') {
      const allowedTopics = this.getAllowedTopicNames(context.grade_level);
      if (allowedTopics) {
        guidelines.push(allowedTopics);
      }
    }

    // 출제범위가 있으면 가이드라인에 강제 추가
    if (context.exam_scope && context.exam_scope.length > 0) {
      guidelines.push(`🎯 **[필수] 출제범위 제한**

이 시험의 출제범위는 다음 단원으로 한정되어 있습니다. **아래 단원 목록에 없는 단원으로 분류하지 마세요!**

출제범위: ${context.exam_scope.join(', ')}

- 위 단원 목록에 포함되지 않는 주제로 분류하면 **confidence를 0.3 이하**로 설정
- 문제가 출제범위 밖의 개념을 사용하더라도, 핵심 학습 목표가 출제범위 내 단원이면 해당 단원으로 분류`);
    }

    const combined = this.combinePrompts({
      base,
      guidelines,
      paperType,
      schema,
      subject: context.subject,
      gradeLevel: context.grade_level,
      category: context.category,
    });

    const usedTemplates = this.collectUsedTemplates(context);
    const matchedProblemTypes = this.collectMatchedProblemTypes(context);

    return {
      base_prompt: base,
      analysis_guidelines: guidelines.join('\n\n'),
      error_patterns_prompt: null,
      examples_prompt: null,
      combined_prompt: combined,
      used_templates: usedTemplates,
      matched_problem_types: matchedProblemTypes,
    };
  }

  /**
   * DB 템플릿 + 에러 패턴을 포함한 확장 빌드 (async).
   * DB 접근이 필요할 때 사용. 기본 build()의 상위 호환.
   */
  static async buildWithDbContext(context: ExamContext): Promise<BuildPromptResponse> {
    // 기본 빌드
    const result = this.build(context);

    try {
      const { prisma } = await import('@/lib/db');

      // DB 템플릿 조회 (활성, 최신 버전)
      const dbTemplate = await prisma.examPromptTemplate.findFirst({
        where: {
          subject: context.subject === '수학' ? 'MATH' : 'ENGLISH',
          agentType: 'basic',
          isActive: true,
        },
        orderBy: { version: 'desc' },
      });

      // DB 에러 패턴 조회
      const errorPatterns = await prisma.examErrorPattern.findMany({
        where: {
          subject: context.subject === '수학' ? 'MATH' : 'ENGLISH',
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
          subject: context.subject === '수학' ? 'MATH' : 'ENGLISH',
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

      // 학습된 패턴 조회 (confidence >= 0.7, 활성 + 자동적용)
      const learnedPatterns = await prisma.learnedPattern.findMany({
        where: {
          subject: context.subject === '수학' ? 'MATH' : 'ENGLISH',
          isActive: true,
          isAutoApplied: true,
          confidence: { gte: 0.7 },
        },
        orderBy: { confidence: 'desc' },
        take: 5,
      });

      if (learnedPatterns.length > 0) {
        const patternLines = learnedPatterns.map(p =>
          `- **${p.patternType}** (신뢰도: ${Math.round(p.confidence * 100)}%): ${p.description}`
        ).join('\n');
        result.combined_prompt += `\n\n📝 **[학습된 분석 패턴]:**\n\n${patternLines}`;
      }
    } catch {
      // DB 접근 실패 시 기본 빌드 결과 그대로 반환
    }

    return result;
  }

  /**
   * 기본 시스템 프롬프트 (역할 정의)
   */
  private static getBasePrompt(context: ExamContext): string {
    const isMath = context.subject.toUpperCase() === 'MATH';

    const gradeInfo = context.grade_level ? ` (${context.grade_level})` : '';
    const categoryInfo = context.category ? ` — ${context.category}` : '';

    if (isMath) {
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

    return `당신은 한국 중·고등학교 **영어 시험지 분석 전문가**입니다${gradeInfo}${categoryInfo}.

주어진 시험지 이미지를 분석하여 각 문항의 난이도, 유형, 단원, 배점을 정확히 판별합니다.
분석 결과는 반드시 지정된 JSON 형식으로만 출력하세요.

**핵심 원칙:**
1. 모든 문항을 빠짐없이 분석 (단, 하나의 문항 안의 소문항 (1)(2)는 분리하지 말고 통합!)
2. 난이도는 5단계 시스템("1"~"5")을 엄격히 적용
3. topic 형식: "과목명 > 대단원 > 소단원" (공백 포함 > 구분)
4. ai_comment: 정확히 2문장, 존댓말(~입니다/~합니다), 각 문장 20~40자
5. confidence: 0.0~1.0 (불확실하면 낮게)`;
  }

  /**
   * 과목/학년별 분석 가이드라인 조합
   */
  private static getAnalysisGuidelines(context: ExamContext): string[] {
    const isMath = context.subject.toUpperCase() === 'MATH';
    const parts: string[] = [];

    // 공통 규칙
    parts.push(SCHOOL_LEVEL_RULES);
    parts.push(EXAM_SUBJECT_CLASSIFICATION);
    parts.push(POINTS_VALIDATION_RULES);
    parts.push(DIFFICULTY_SYSTEM_FRAMEWORK);

    if (isMath) {
      // 수학 전용 가이드라인
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
    } else {
      // 영어 전용 가이드라인
      parts.push(ENGLISH_DIFFICULTY_SYSTEM_4LEVEL);
      parts.push(ENGLISH_EVALUATION_SYSTEM);
      parts.push(ENGLISH_QUESTION_STRATEGIES);

      // 학년별 토픽
      const topics = getEnglishTopicsForGrade(context.grade_level);
      if (topics) {
        parts.push(`📖 **영어 단원 분류표:**\n\n${topics}`);
      }

      // 학년별 흔한 실수
      const mistakes = getEnglishMistakesForGrade(context.grade_level);
      if (mistakes) {
        parts.push(`⚠️ **흔한 실수 유형:**\n\n${mistakes}`);
      }

      // 영어 서술형 가이드
      const writingGuide = getEnglishWritingGuideIfNeeded(context.has_essay);
      if (writingGuide) {
        parts.push(writingGuide);
      }
    }

    return parts.filter(p => p.trim() !== '');
  }

  /**
   * 시험지 유형별 지시사항
   * - "blank": 빈 시험지 — 문항만 추출
   * - "student": 학생 답안지 — 답안 분석 + 오류 패턴
   */
  private static getPaperTypeInstructions(context: ExamContext): string {
    if (context.paper_type === 'blank') {
      return `📋 **[시험지 유형: 빈 시험지 (blank)]**

이 시험지는 **학생 답안이 없는 원본 시험지**입니다.

**분석 범위:**
- 각 문항의 번호, 형식(객관식/주관식/서술형), 배점 추출
- 난이도, 유형, 단원 분류
- ai_comment 작성 (출제 의도 및 풀이 포인트)

**주의사항:**
- is_correct, student_answer, earned_points, error_type 필드는 포함하지 마세요
- 배점이 보이지 않으면 confidence를 0.5 이하로 설정하고 일반적 배점 추정`;
    }

    return `📋 **[시험지 유형: 학생 답안지 (student)]**

이 시험지는 **학생이 작성한 답안이 포함된 시험지**입니다.

**분석 범위:**
- 각 문항의 번호, 형식, 배점 추출
- 난이도, 유형, 단원 분류
- **학생 답안 판독 및 정오 판별**
- **오류 유형 분석**

**필수 필드:**
- is_correct: 정답 여부 (true/false, 판단 불가 시 null)
- student_answer: 학생이 작성한 답 (판독 불가 시 null)
- earned_points: 획득 점수 (서술형은 부분 점수 추정)
- error_type: 오류 유형 (정답이면 null)
  - "calculation_error": 계산 실수
  - "concept_gap": 개념 미이해
  - "careless": 단순 실수 (부호, 단위 등)
  - "time_pressure": 시간 부족 (미작성/미완성)
  - "misread": 문제 오독

**채점 마크 해석:**
- ○ (동그라미): 정답
- × (엑스), / (슬래시): 오답
- △ (삼각형): 부분 점수
- 빨간/파란 펜 마크: 채점 결과

**주의사항:**
- 글씨가 불분명하면 student_answer를 null로, confidence를 낮게
- 채점 마크가 있으면 마크를 우선 (AI 판단보다 선생님 채점이 정확)`;
  }

  /**
   * 요구 JSON 스키마 출력
   */
  static getJsonSchema(
    paperType: string,
    subject: string,
    gradeLevel: string | null,
    category: string | null
  ): string {
    const isMath = subject.toUpperCase() === 'MATH';
    const isStudent = paperType === 'student';

    // 문항 유형 분류 키
    const typeKeys = isMath
      ? '"number"(수와 연산), "algebra"(문자와 식), "function"(함수), "geometry"(기하), "statistics"(확률과 통계)'
      : '"grammar", "vocabulary", "reading", "listening", "writing", "communication"';

    // 난이도 키
    const difficultyKeys = '"1", "2", "3", "4", "5"';

    // 문항 형식
    const formatKeys = '"objective", "short_answer", "essay"';

    // topic 예시
    const topicExample = isMath
      ? this.getMathTopicExample(gradeLevel, category)
      : this.getEnglishTopicExample(gradeLevel);

    // 학생 답안지 전용 필드
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
    const typeDistExample = isMath
      ? `"number": 0, "algebra": 0, "function": 0, "geometry": 0, "statistics": 0`
      : `"grammar": 0, "vocabulary": 0, "reading": 0, "listening": 0, "writing": 0, "communication": 0`;

    return `🔧 **[필수] JSON 출력 형식**

반드시 아래 형식의 JSON만 출력하세요. 추가 텍스트 없이 JSON만!

\`\`\`json
{
  "exam_info": {
    "total_questions": 21,
    "total_points": 100,
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
    "dominant_type": "algebra"
  },
  "questions": [
    {
      "question_number": 1,
      "question_format": "objective",
      "difficulty": "1",
      "difficulty_reason": "기본 개념 확인",
      "question_type": "algebra",
      "ability_domain": "calculation",
      "points": 3,
      "topic": "${topicExample}",
      "ai_comment": "핵심 개념을 직접 확인하는 문제입니다. 공식을 정확히 암기하면 쉽게 풀 수 있습니다.",
      "confidence": 0.95,
      "confidence_reason": "문항 내용 명확"${studentFields ? ',' + studentFields : ''}
    },
    {
      "question_number": 2,
      "question_format": "objective",
      "difficulty": "2",
      "difficulty_reason": "유형 적용 문제",
      "question_type": "number",
      "ability_domain": "understanding",
      "points": 3,
      "topic": "${topicExample}",
      "ai_comment": "전형적인 유형 적용 문제입니다. 풀이 순서를 익히면 안정적으로 정답할 수 있습니다.",
      "confidence": 0.90,
      "confidence_reason": "배점 추정"${studentFieldsWrong ? ',' + studentFieldsWrong : ''}
    }
  ]
}
\`\`\`

**필드 규칙:**

| 필드 | 규칙 |
|------|------|
| question_number | 시험지에 표기된 번호 (소문제: "1-1", "1-2" 등) |
| question_format | ${formatKeys} 중 하나 |
| difficulty | ${difficultyKeys} 중 하나 (소문자) |
| difficulty_reason | 난이도 판정 이유, **최대 15자** |
| question_type | ${typeKeys} 중 하나 — **문제의 수학적 형태/소재** 기준 |
| ability_domain | "calculation"(계산력), "understanding"(이해력), "problem_solving"(문제해결력), "reasoning"(추론력) 중 하나 — **풀이에 요구되는 사고력** 기준 |
| points | 배점 (숫자), 불분명 시 null |
| topic | "과목명 > 대단원 > 소단원" (공백 포함 > 구분) |
| ai_comment | **정확히 2문장, 존댓말(~입니다/~합니다), 각 문장 20~40자. 1문장: 출제 의도/핵심 개념, 2문장: 풀이 포인트/주의점. 수식이 불명확하면 "스캔 품질로 인해 일부 수식 판독이 어렵습니다"로 표현. ❌ "문제가 잘못되었다", "조건이 모순이다" 등 출제 오류를 지적하는 표현 금지 — 시험지는 검증된 출제물임!** |
| confidence | 0.0~1.0 (분석 신뢰도) |
| confidence_reason | 신뢰도 판정 근거 (최대 20자, 예: "문항 내용 명확", "배점 추정", "스캔 품질 낮음") |${isStudent ? `
| is_correct | true/false/null (정오 판별, 판단 불가 시 null) |
| student_answer | 학생 답안 문자열 (판독 불가 시 null) |
| earned_points | 획득 점수 (서술형 부분점수 가능, 판단 불가 시 null) |
| error_type | "calculation_error"/"concept_gap"/"careless"/"time_pressure"/"misread"/null |` : ''}

**⚠️ question_type vs ability_domain 구분 (매우 중요!):**

| | question_type (유형) | ability_domain (능력) |
|---|---|---|
| **기준** | 문제의 **수학적 소재/형태** | 풀이에 **요구되는 사고력** |
| **판단법** | "이 문제는 무엇에 대한 문제인가?" | "이 문제를 풀려면 어떤 능력이 필요한가?" |

- **calculation**(계산력): 공식 대입, 사칙연산, 방정식 풀이 등 **절차적 계산**이 핵심
- **understanding**(이해력): 개념 정의, 성질 파악, 그래프 해석 등 **개념 이해**가 핵심
- **problem_solving**(문제해결력): 조건 해석, 식 세우기, 전략 수립 등 **응용/문장제**가 핵심
- **reasoning**(추론력): 증명, 논리적 추론, 반례 찾기, 참/거짓 판별 등 **논리적 사고**가 핵심

예: "제곱근 계산" → question_type: **number**, ability_domain: **calculation**
예: "이차방정식 풀이" → question_type: **algebra**, ability_domain: **calculation**
예: "이차함수 그래프 해석" → question_type: **function**, ability_domain: **understanding**
예: "도형의 넓이 활용 문제" → question_type: **geometry**, ability_domain: **problem_solving**
예: "확률 추론 문제" → question_type: **statistics**, ability_domain: **reasoning**

⚠️ question_type과 ability_domain은 **서로 다른 관점**입니다. 기계적으로 같은 값을 넣지 말고 독립적으로 판단하세요.
- question_type = **교육과정 5대 영역** (이 문제가 어떤 수학 단원에 해당하는가?)
- ability_domain = **4대 사고력** (이 문제를 풀려면 어떤 능력이 필요한가?)
- 같은 단원이라도 문제에 따라 필요한 능력이 다릅니다. (예: 기하 단원의 계산 문제 → geometry + calculation)

**summary 규칙:**
- difficulty_distribution: 각 난이도별 문항 수 (합계 = total_questions)
- type_distribution: 각 유형별 문항 수 (합계 = total_questions)
- average_difficulty: 가장 많은 난이도 (동률이면 낮은 쪽)
- dominant_type: 가장 많은 유형

**format_distribution 규칙:**
- objective + short_answer + essay = total_questions`;
  }

  /**
   * 모든 프롬프트 파트를 결합
   */
  private static combinePrompts(parts: {
    base: string;
    guidelines: string[];
    paperType: string;
    schema: string;
    subject: string;
    gradeLevel: string | null;
    category: string | null;
  }): string {
    const sections: string[] = [];

    // 1. 역할 정의
    sections.push('═══════════════════════════════════════');
    sections.push('📌 ROLE (역할 정의)');
    sections.push('═══════════════════════════════════════');
    sections.push(parts.base);

    // 2. 시험지 유형 지시
    sections.push('');
    sections.push('═══════════════════════════════════════');
    sections.push('📋 PAPER TYPE (시험지 유형)');
    sections.push('═══════════════════════════════════════');
    sections.push(parts.paperType);

    // 3. 분석 가이드라인
    sections.push('');
    sections.push('═══════════════════════════════════════');
    sections.push('📚 ANALYSIS GUIDELINES (분석 가이드라인)');
    sections.push('═══════════════════════════════════════');
    for (const guideline of parts.guidelines) {
      sections.push('');
      sections.push(guideline);
    }

    // 4. JSON 스키마
    sections.push('');
    sections.push('═══════════════════════════════════════');
    sections.push('🔧 OUTPUT FORMAT (출력 형식)');
    sections.push('═══════════════════════════════════════');
    sections.push(parts.schema);

    // 5. 최종 지시
    sections.push('');
    sections.push('═══════════════════════════════════════');
    sections.push('⚡ FINAL INSTRUCTIONS (최종 지시)');
    sections.push('═══════════════════════════════════════');
    sections.push(`**반드시 위 JSON 형식만 출력하세요.**
- 추가 설명, 마크다운, 코드 블록 태그 없이 순수 JSON만 반환
- 모든 문항을 빠짐없이 분석
- 배점 합계가 100점에 근접하는지 확인
- 불확실한 부분은 confidence를 낮추되, 최선의 판단은 유지

🚨 **[최우선] 서술형 소문항 통합 규칙:**
- 서술형 문제 하나가 (1), (2) 등 소문항을 포함하는 경우, **절대 분리하지 말고 하나의 문항으로 통합 분석**하세요!
- 예: "서술형 2번: (1) ~을 구하시오. (2) ~을 구하시오." → question_number: "서술형2" (하나의 행)
- 배점은 소문항 배점의 **합계**를 사용 (예: (1) 3점 + (2) 3점 = 6점)
- **분리 기준**: 시험지에 독립적인 문항 번호가 부여된 경우만 별도 문항 (서술형1, 서술형2, 서술형3 등)
- **통합 기준**: 하나의 문항 번호 안에 (1), (2), ①, ② 등 하위 번호가 있는 경우 → 하나의 문항
- ai_comment에서 소문항 전체를 아우르는 분석을 작성하세요`);

    return sections.join('\n');
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
        '중1': '중1 수학 > 수와 연산 > 소인수분해',
        '중2': '중2 수학 > 부등식과 연립방정식 > 연립일차방정식',
        '중3': '중3 수학 > 이차방정식 > 이차방정식의 풀이',
        '고1': '공통수학1 > 다항식 > 다항식의 연산',
        '고2': '대수 > 수열 > 등차수열과 등비수열',
        '고3': '미적분II > 수열의 극한 > 급수',
      };
      return gradeExamples[gradeLevel] ?? '공통수학1 > 다항식 > 다항식의 연산';
    }

    return '공통수학1 > 다항식 > 다항식의 연산';
  }

  /**
   * 영어 topic 예시 생성
   */
  private static getEnglishTopicExample(gradeLevel: string | null): string {
    if (gradeLevel) {
      const gradeExamples: Record<string, string> = {
        '중1': '중1 영어 > 문법 > be동사',
        '중2': '중2 영어 > 문법 > 비교급과 최상급',
        '중3': '중3 영어 > 문법 > 현재완료',
        '고1': '고1 영어 > 독해 > 빈칸추론',
        '고2': '고2 영어 > 독해 > 장문독해',
        '고3': '고3 영어 > 독해 > 빈칸추론',
      };
      return gradeExamples[gradeLevel] ?? '고1 영어 > 독해 > 빈칸추론';
    }
    return '고1 영어 > 독해 > 빈칸추론';
  }

  /**
   * 사용된 템플릿 목록 수집
   */
  private static collectUsedTemplates(context: ExamContext): string[] {
    const isMath = context.subject.toUpperCase() === 'MATH';
    const templates: string[] = [
      'SCHOOL_LEVEL_RULES',
      'EXAM_SUBJECT_CLASSIFICATION',
      'POINTS_VALIDATION_RULES',
      'DIFFICULTY_SYSTEM_FRAMEWORK',
    ];

    if (isMath) {
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
    } else {
      templates.push('ENGLISH_DIFFICULTY_SYSTEM_5LEVEL');
      templates.push('ENGLISH_EVALUATION_SYSTEM');
      templates.push('ENGLISH_QUESTION_STRATEGIES');
      templates.push('ENGLISH_TOPICS');

      if (context.has_essay) {
        templates.push('ENGLISH_WRITING_GUIDE');
      }
    }

    return templates;
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

  /**
   * 매칭된 문제 유형 수집
   */
  private static collectMatchedProblemTypes(context: ExamContext): string[] {
    const isMath = context.subject.toUpperCase() === 'MATH';

    if (isMath) {
      const types = ['number', 'algebra', 'function', 'geometry', 'statistics'];
      // category가 있으면 관련 유형 우선
      if (context.category) {
        const categoryTypeMap: Record<string, string[]> = {
          '공통수학1': ['algebra', 'number'],
          '공통수학2': ['geometry', 'function'],
          '대수': ['function', 'algebra'],
          '미적분I': ['function', 'algebra'],
          '미적분II': ['function'],
          '확률과 통계': ['statistics'],
          '기하': ['geometry'],
        };
        return categoryTypeMap[context.category] ?? types;
      }
      return types;
    }

    return ['grammar', 'vocabulary', 'reading', 'listening', 'writing', 'communication'];
  }
}
