/**
 * 기출분석 → 문제은행 매핑 유틸
 *
 * 기출분석(AnalyzedQuestion)의 메타데이터와
 * PDF추출(ExtractedMathProblem)의 본문을 병합하여
 * 문제은행(Question) 생성용 데이터를 만든다.
 */

import type { AnalyzedQuestion } from './types';

// ── 난이도 매핑: 기출분석 5단계 → Question 4단계 ──

type QuestionDifficulty = 'BASIC' | 'MEDIUM' | 'HIGH' | 'HIGHEST';
type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY';

const EXAM_DIFF_TO_QUESTION: Record<string, QuestionDifficulty> = {
  '1': 'BASIC',
  '2': 'BASIC',
  '3': 'MEDIUM',
  '4': 'HIGH',
  '5': 'HIGHEST',
  concept: 'BASIC',
  pattern: 'BASIC',
  reasoning: 'HIGH',
  creative: 'HIGHEST',
};

// ── 문제 형식 매핑 ──

const EXAM_FORMAT_TO_TYPE: Record<string, QuestionType> = {
  objective: 'MULTIPLE_CHOICE',
  short_answer: 'SHORT_ANSWER',
  essay: 'ESSAY',
};

// ── 능력 영역 매핑 (4대 능력 → abilityDomain 필드) ──

const ABILITY_TO_ABILITY_DOMAIN: Record<string, string> = {
  calculation: 'CALCULATION',
  understanding: 'UNDERSTANDING',
  problem_solving: 'PROBLEM_SOLVING',
  reasoning: 'REASONING',
};

// ── 4대 교육과정 영역 매핑 (question_type → domain 필드, 2022 개정) ──

const QTYPE_TO_DOMAIN: Record<string, string> = {
  number: 'number',
  change_relation: 'change_relation',
  shape_measure: 'shape_measure',
  data_possibility: 'data_possibility',
  // 옛 키 호환 — 신 영역으로 흡수
  algebra: 'change_relation',
  function: 'change_relation',
  geometry: 'shape_measure',
  statistics: 'data_possibility',
};

// ── topic 파싱 ──

export function parseTopicToChapter(topic: string | null): {
  chapter: string;
  section?: string;
} {
  if (!topic) return { chapter: '미분류' };
  const parts = topic.split('>').map((s) => s.trim());
  // "수학 > 수와 연산 > 소인수분해" → chapter="수와 연산", section="소인수분해"
  if (parts.length >= 3) return { chapter: parts[1], section: parts.slice(2).join(' > ') };
  // "수와 연산 > 소인수분해" → chapter="수와 연산", section="소인수분해"
  if (parts.length === 2) return { chapter: parts[0], section: parts[1] };
  return { chapter: parts[0] };
}

// ── grade → bookCode ──

export function gradeToBookCode(grade: string, semester: string): string {
  // 한글 형식: "중3" → "3-1", "고1" → "H1-1", "초5" → "E5-2"
  const match = grade.match(/^(초|중|고)(\d)$/);
  if (match) {
    const [, level, num] = match;
    if (level === '초') return `E${num}-${semester}`;
    if (level === '고') return `H${num}-${semester}`;
    return `${num}-${semester}`;
  }
  // 영문 형식 폴백: "middle_3" → "3-1"
  const [level, num] = grade.split('_');
  if (level === 'elementary') return `E${num}-${semester}`;
  if (level === 'high') return `H${num}-${semester}`;
  return `${num || grade}-${semester}`;
}

// ── grade에서 학년 숫자와 레벨 라벨 추출 ──

export function parseGradeInfo(grade: string): { levelLabel: string; gradeNum: string } {
  const match = grade.match(/^(초|중|고)(\d)$/);
  if (match) return { levelLabel: match[1], gradeNum: match[2] };
  // 영문 폴백
  const [level, num] = grade.split('_');
  const labels: Record<string, string> = { elementary: '초', middle: '중', high: '고' };
  return { levelLabel: labels[level] || '', gradeNum: num || '' };
}

// ── 추출된 문제 타입 (pdf-extract에서 넘어오는 것) ──

export interface ExtractedProblemForMerge {
  questionNum: number;
  pageNum?: number;
  sectionHeader: string;
  content: string;
  choices: string[];
  answer: string;
  explanation?: string;
  sourceTag: string;
  difficulty: string; // BASIC/MEDIUM/HIGH/HIGHEST
  type: string;       // MULTIPLE_CHOICE/SHORT_ANSWER/ESSAY
  diagramParams?: unknown[];
  diagramSvgs?: Array<{ svg: string; label: string }>;
}

// ── 병합 결과 ──

export interface MergedQuestion {
  bookCode: string;
  chapter: string;
  section?: string;
  questionNum: number;
  pageNum?: number;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  content: string;
  choices?: string[];
  answer: string;
  explanation?: string;
  source?: string;
  sourceTag?: string;
  domain?: string;          // 5대 교육과정 영역
  abilityDomain?: string;   // 4대 능력 영역
  diagramSpec?: unknown;
  diagramSVG?: string;
  matched: boolean;
}

export interface MergeStats {
  total: number;
  matched: number;
  unmatchedExtracted: number[];
  unmatchedAnalyzed: (number | string)[];
}

export interface MergeResult {
  questions: MergedQuestion[];
  stats: MergeStats;
}

// ── 메인 병합 함수 ──

/** choices가 있으면 MULTIPLE_CHOICE 강제, choices 없는데 MULTIPLE_CHOICE면 보정 */
function resolveType(
  type: QuestionType,
  choices: string[] | undefined,
): QuestionType {
  if (choices && choices.length >= 2) return 'MULTIPLE_CHOICE';
  if (!choices || choices.length === 0) {
    if (type === 'MULTIPLE_CHOICE') return 'SHORT_ANSWER';
  }
  return type;
}

export function mergeExtractedWithAnalysis(
  extracted: ExtractedProblemForMerge[],
  analyzed: AnalyzedQuestion[],
  bookCode: string,
  examTitle: string,
): MergeResult {
  // analyzed를 question_number 기준 Map
  // "서술형1", "서답형2" 같은 비숫자 접두어가 있으면 별도 키로 분리
  const analyzerMap = new Map<number, AnalyzedQuestion>();
  const maxObjectiveNum = Math.max(
    0,
    ...analyzed
      .filter(q => q.question_format === 'objective' || q.question_format === 'short_answer')
      .map(q => {
        const n = typeof q.question_number === 'number'
          ? q.question_number
          : parseInt(String(q.question_number).replace(/\D/g, ''), 10);
        return isNaN(n) ? 0 : n;
      }),
  );

  for (const q of analyzed) {
    const raw = String(q.question_number);
    const hasTextPrefix = /[가-힣a-zA-Z]/.test(raw); // "서술형1", "서답형2" 등
    const numPart = parseInt(raw.replace(/\D/g, ''), 10);
    if (isNaN(numPart)) continue;

    // 서술형/서답형은 객관식 번호 뒤에 이어 붙이기 (충돌 방지)
    const key = hasTextPrefix ? maxObjectiveNum + numPart : numPart;
    analyzerMap.set(key, q);
  }

  const questions: MergedQuestion[] = [];
  const unmatchedExtracted: number[] = [];
  const matchedNums = new Set<number>();

  for (const ext of extracted) {
    const meta = analyzerMap.get(ext.questionNum);

    if (meta) {
      matchedNums.add(ext.questionNum);
      const { chapter, section } = parseTopicToChapter(meta.topic);
      const rawType = meta.question_format
        ? EXAM_FORMAT_TO_TYPE[meta.question_format] || (ext.type as QuestionType) || 'SHORT_ANSWER'
        : (ext.type as QuestionType) || 'SHORT_ANSWER';
      const finalChoices = ext.choices.length > 0 ? ext.choices : undefined;

      questions.push({
        bookCode,
        chapter,
        section,
        questionNum: ext.questionNum,
        pageNum: ext.pageNum,
        difficulty: EXAM_DIFF_TO_QUESTION[meta.difficulty ?? ''] || (ext.difficulty as QuestionDifficulty) || 'MEDIUM',
        type: resolveType(rawType, finalChoices),
        content: ext.content,
        choices: finalChoices,
        answer: ext.answer || '',
        explanation: ext.explanation,
        source: examTitle,
        sourceTag: ext.sourceTag || '기출',
        domain: meta.question_type ? QTYPE_TO_DOMAIN[meta.question_type] : undefined,
        abilityDomain: meta.ability_domain ? ABILITY_TO_ABILITY_DOMAIN[meta.ability_domain] : undefined,
        diagramSpec: ext.diagramParams?.length ? ext.diagramParams : undefined,
        diagramSVG: ext.diagramSvgs?.[0]?.svg,
        matched: true,
      });
    } else {
      // 매칭 실패: pdf-extract 자체 데이터만 사용
      unmatchedExtracted.push(ext.questionNum);
      const unmatchedChoices = ext.choices.length > 0 ? ext.choices : undefined;
      questions.push({
        bookCode,
        chapter: ext.sectionHeader || '미분류',
        questionNum: ext.questionNum,
        pageNum: ext.pageNum,
        difficulty: (ext.difficulty as QuestionDifficulty) || 'MEDIUM',
        type: resolveType((ext.type as QuestionType) || 'SHORT_ANSWER', unmatchedChoices),
        content: ext.content,
        choices: unmatchedChoices,
        answer: ext.answer || '',
        explanation: ext.explanation,
        source: examTitle,
        sourceTag: ext.sourceTag || '기출',
        diagramSpec: ext.diagramParams?.length ? ext.diagramParams : undefined,
        diagramSVG: ext.diagramSvgs?.[0]?.svg,
        matched: false,
      });
    }
  }

  // 분석에는 있지만 추출에서 못 찾은 문항
  const unmatchedAnalyzed = analyzed
    .filter((q) => {
      const num = typeof q.question_number === 'number'
        ? q.question_number
        : parseInt(String(q.question_number).replace(/\D/g, ''), 10);
      return !isNaN(num) && !matchedNums.has(num);
    })
    .map((q) => q.question_number);

  return {
    questions,
    stats: {
      total: extracted.length,
      matched: matchedNums.size,
      unmatchedExtracted,
      unmatchedAnalyzed,
    },
  };
}
