/**
 * 기출 분석 AI 엔진
 * Python Math Report 프로젝트에서 1:1 이식
 * MathLab 기존 gemini.ts 서비스와 완전 독립적으로 동작
 */

import { GoogleGenAI } from '@google/genai';
import type { AnalyzedQuestion, BasicAnalysisResult, ExamPaperClassification } from './types';
import { CONFIDENCE_THRESHOLDS, TYPE_TO_DOMAIN, TYPE_TO_STANDARD } from './constants';
import { applyNumericField, applyCategoricalRemap, NUMERIC_FIELDS, CATEGORICAL_FIELDS, type CalibrationSet } from './calibration';

// ── 싱글톤 클라이언트 ──

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

const MODEL = 'gemini-3.1-pro-preview';

// ── 유틸 함수 ──

/**
 * MIME 타입 추론 (base64 데이터 또는 파일 확장자 기반)
 */
export function getMimeType(input: string): string {
  // data URI prefix 확인
  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);/);
    if (match) return match[1];
  }

  // 파일 확장자 기반
  const ext = input.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };

  return mimeMap[ext ?? ''] ?? 'image/png';
}

/**
 * base64 데이터에서 data URI prefix 제거
 */
function stripDataUriPrefix(base64: string): string {
  const commaIdx = base64.indexOf(',');
  if (commaIdx !== -1 && base64.startsWith('data:')) {
    return base64.slice(commaIdx + 1);
  }
  return base64;
}

/**
 * JSON 응답에서 코드 펜스(```json ... ```) 제거 후 파싱
 */
export function parseJsonResponse<T = unknown>(text: string): T {
  let cleaned = text.trim();

  // ```json ... ``` 또는 ``` ... ``` 제거
  const codeFenceRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;
  const match = cleaned.match(codeFenceRegex);
  if (match) {
    cleaned = match[1].trim();
  }

  // 여전히 ``` 로 시작하면 첫 줄과 마지막 줄 제거
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    lines.shift(); // 첫 줄 (```)
    if (lines[lines.length - 1]?.trim() === '```') {
      lines.pop();
    }
    cleaned = lines.join('\n').trim();
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // ── 1단계: 잘린 JSON 구조 복구 + trailing comma 제거 + undefined → null ──
    let fixed = cleaned;
    const openQuotes = (fixed.match(/"/g) || []).length;
    if (openQuotes % 2 !== 0) fixed += '"';
    const openBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    const openBraces = (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length;
    for (let i = 0; i < openBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces; i++) fixed += '}';
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    fixed = fixed.replace(/:\s*undefined\b/g, ': null');
    try {
      return JSON.parse(fixed) as T;
    } catch {
      // ── 2단계: invalid escape character 자동 정정 ──
      // Gemini가 ai_comment 등에 LaTeX(\dfrac, \frac, \(, \) 등)를 JSON 이스케이프 없이 출력하면
      // "Bad escaped character in JSON" 발생. JSON 표준 valid escape는
      //   \" \\ \/ \b \f \n \r \t \uXXXX 만 허용.
      // 그 외의 `\X` 는 `\\X` 로 변환하여 LaTeX 백슬래시를 보존.
      // 또한 string literal 내부 raw control character (raw newline 등)도 escape.
      let fixed2 = fixed.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      // string literal 안의 raw newline/tab/CR → 이스케이프 (대략적 — string 진입 후 닫히기 전까지)
      fixed2 = fixed2.replace(/"((?:[^"\\]|\\.)*)"/g, (_m, inner: string) => {
        const escaped = inner
          .replace(/\r\n/g, '\\n')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\n')
          .replace(/\t/g, '\\t');
        return `"${escaped}"`;
      });
      try {
        const parsed = JSON.parse(fixed2) as T;
        console.warn('[ai-engine] JSON 파싱: invalid escape 자동 정정 후 성공 (LaTeX 백슬래시 추정)');
        return parsed;
      } catch (e3) {
        throw new Error(
          `AI 응답 JSON 파싱 실패: ${e3 instanceof Error ? e3.message : String(e3)}\n원본: ${text.slice(0, 500)}`
        );
      }
    }
  }
}

/**
 * Node.js 환경에서 파일을 base64로 로드
 */
export async function loadFileAsBase64(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

// ── Gemini Vision 호출 ──

interface GeminiVisionCallOptions {
  images: string[];          // base64 이미지 데이터 (data URI 또는 순수 base64)
  prompt: string;
  jsonMode?: boolean;        // responseMimeType: 'application/json' 사용 여부
  temperature?: number;
  mimeTypeHint?: string;     // 파일 형식 힌트 (image/jpeg, application/pdf 등)
  modelOverride?: string;    // 모델 ID override (기본: MODEL 상수 = gemini-3.1-pro-preview)
}

/**
 * Gemini Vision API 호출 (이미지 + 텍스트 프롬프트)
 */
async function callGeminiVision<T = unknown>({
  images,
  prompt,
  jsonMode = true,
  temperature = 0.1,
  mimeTypeHint,
  modelOverride,
}: GeminiVisionCallOptions): Promise<T> {
  const client = getClient();

  // 이미지 파트 구성
  const imageParts = images.map((img) => {
    const mimeType = mimeTypeHint || getMimeType(img);
    const data = stripDataUriPrefix(img);
    return {
      inlineData: {
        mimeType,
        data,
      },
    };
  });

  // 텍스트 파트
  const textPart = { text: prompt };

  const config: Record<string, unknown> = {
    temperature,
  };

  if (jsonMode) {
    config.responseMimeType = 'application/json';
  }

  const response = await client.models.generateContent({
    model: modelOverride || MODEL,
    contents: [
      {
        role: 'user',
        parts: [...imageParts, textPart],
      },
    ],
    config,
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error('Gemini 응답이 비어있습니다');
  }

  if (jsonMode) {
    return parseJsonResponse<T>(responseText);
  }

  return responseText as unknown as T;
}

// ── 배점 검증 및 신뢰도 페널티 ──

/**
 * 배점 신뢰도 판정 결과
 * - reliable: 배점 합계가 기준 범위 내 (±15%)
 * - unreliable: 배점 합계가 기준 범위 밖 (>±15%) 또는 null 배점이 과반
 */
export interface PointsReliability {
  reliable: boolean;
  pointsSum: number;
  expectedTotal: number;
  deviationPct: number;  // 편차 % (양수)
  nullCount: number;     // 배점 null인 문항 수
  reason: string;        // 사유 (한국어)
}

/**
 * 배점 신뢰도 계산
 * ±15% 이내이면 reliable, 아니면 unreliable
 */
export function calcPointsReliability(
  questions: BasicAnalysisResult['questions'],
  expectedTotal: number
): PointsReliability {
  const nullCount = questions.filter((q) => q.points === null || q.points === 0).length;
  const pointsSum = questions.reduce((sum, q) => sum + (q.points ?? 0), 0);
  const total = expectedTotal > 0 ? expectedTotal : 100;
  const deviationPct = total > 0 ? Math.round(Math.abs(pointsSum - total) / total * 100) : 0;

  // null 배점이 전체의 50% 이상
  if (nullCount > questions.length * 0.5) {
    return {
      reliable: false,
      pointsSum,
      expectedTotal: total,
      deviationPct,
      nullCount,
      reason: `${nullCount}개 문항의 배점을 인식하지 못했습니다`,
    };
  }

  // 합계가 ±15% 이상 벗어남
  if (deviationPct > 15) {
    return {
      reliable: false,
      pointsSum,
      expectedTotal: total,
      deviationPct,
      nullCount,
      reason: `배점 합계 ${pointsSum}점 (기준 ${total}점, ${deviationPct}% 차이)`,
    };
  }

  return {
    reliable: true,
    pointsSum,
    expectedTotal: total,
    deviationPct,
    nullCount,
    reason: '',
  };
}

/**
 * 분석 결과의 배점 합계 검증 및 신뢰도 페널티 적용
 */
function validateAndPenalize(result: BasicAnalysisResult): BasicAnalysisResult {
  const { exam_info, questions } = result;

  // 배점이 있는 문항만 합산
  const questionsWithPoints = questions.filter((q) => q.points !== null && q.points > 0);
  const pointsSum = questionsWithPoints.reduce((sum, q) => sum + (q.points ?? 0), 0);

  // 총점과 합산이 다른 경우 신뢰도 페널티
  if (exam_info.total_points > 0 && pointsSum > 0 && pointsSum !== exam_info.total_points) {
    const ratio = Math.abs(pointsSum - exam_info.total_points) / exam_info.total_points;
    const penalty = Math.min(ratio * 0.3, 0.2); // 최대 20% 페널티

    result.questions = questions.map((q) => ({
      ...q,
      confidence: Math.max(0, Number((q.confidence - penalty).toFixed(3))),
    }));
  }

  // 문항 수 불일치 페널티
  if (exam_info.total_questions > 0 && questions.length !== exam_info.total_questions) {
    const penalty = 0.1;
    result.questions = result.questions.map((q) => ({
      ...q,
      confidence: Math.max(0, Number((q.confidence - penalty).toFixed(3))),
    }));
  }

  return result;
}

/**
 * 문항 번호 갭 자동 보정 (v1.0.5)
 *
 * AI가 일부 문항을 판독하지 못해 question_number 시퀀스에 갭이 생긴 경우,
 * 누락 번호 자리에 placeholder 문항을 삽입한다.
 *
 * 점수 분배 전략:
 *  - 판단 가능한 객관식 문항들의 평균 점수를 기준으로 합리적 범위 계산
 *  - 점수차(총점 - 합계)가 평균 × 갭수의 ±50% 범위 안이면 → 자동 분배 (정밀 추측)
 *  - 그 외엔 points = null (UI에서 "?" 표시) — 사용자가 직접 입력해야 함
 *
 * 모든 placeholder는:
 *  - difficulty / question_type / ability_domain / topic = null
 *  - confidence = 0
 *  - ai_comment = "⚠️ 자동 분석 실패 — 수동 확인 필요"
 *
 * 주의: 서술형 문항은 question_number가 "서술형1" 같은 문자열이라 갭 감지 대상에서 제외.
 */
function fillNumberGaps(result: BasicAnalysisResult): BasicAnalysisResult {
  const { exam_info, questions } = result;

  // 객관식/단답형(숫자 번호) 문항만 갭 감지 대상
  const numericQuestions = questions.filter((q) => {
    if (q.question_format === 'essay') return false;
    const n = typeof q.question_number === 'string'
      ? parseInt(q.question_number, 10)
      : q.question_number;
    return !isNaN(n);
  });

  if (numericQuestions.length < 2) return result;

  // 번호 시퀀스 정렬
  const nums = numericQuestions
    .map((q) => Number(q.question_number))
    .sort((a, b) => a - b);

  const min = nums[0];
  const max = nums[nums.length - 1];

  // 갭 찾기
  const existing = new Set(nums);
  const missing: number[] = [];
  for (let n = min; n <= max; n++) {
    if (!existing.has(n)) missing.push(n);
  }

  if (missing.length === 0) return result;

  // 판단 가능한 객관식 평균 (points가 있는 것만)
  const objWithPoints = numericQuestions.filter((q) => q.points !== null && q.points > 0);
  const objAvg = objWithPoints.length > 0
    ? objWithPoints.reduce((s, q) => s + (q.points ?? 0), 0) / objWithPoints.length
    : 0;

  // 현재 합계와 점수차
  const currentSum = questions.reduce((s, q) => s + (q.points ?? 0), 0);
  const totalPoints = exam_info.total_points || 100;
  const diff = totalPoints - currentSum;

  // 정밀 추측 가능 조건: 평균 × 갭수의 ±50% 범위 안
  let perGap: number | null = null;
  let reason = '판독 실패 — 점수 수동 입력 필요';

  if (objAvg > 0 && missing.length > 0 && diff > 0) {
    const expected = objAvg * missing.length;
    const tolerance = expected * 0.5;
    const lower = expected - tolerance;
    const upper = expected + tolerance;

    if (diff >= lower && diff <= upper) {
      perGap = Math.round(diff / missing.length);
      reason = `갭 자동 보정 (객관식 평균 ${objAvg.toFixed(1)}점 기준)`;
    }
  }

  // placeholder 생성
  const placeholders: AnalyzedQuestion[] = missing.map((n) => ({
    question_number: n,
    question_format: 'objective',
    difficulty: '1',
    difficulty_reason: null,
    question_type: 'algebra' as AnalyzedQuestion['question_type'],
    ability_domain: null,
    points: perGap,
    topic: null,
    ai_comment: perGap !== null
      ? '⚠️ 이 문항은 자동 분석에 실패했습니다. 시험지를 확인하고 정보를 직접 입력해 주세요. (점수는 객관식 평균을 기준으로 자동 추정)'
      : '⚠️ 이 문항은 자동 분석에 실패했습니다. 시험지를 확인하고 점수와 정보를 직접 입력해 주세요.',
    confidence: 0,
    confidence_reason: reason,
    is_correct: null,
    student_answer: null,
    earned_points: null,
    error_type: null,
  }));

  // 번호 순으로 정렬 (서술형은 뒤에)
  const merged = [...questions, ...placeholders];
  const sorted = merged.sort((a, b) => {
    const aIsEssay = a.question_format === 'essay';
    const bIsEssay = b.question_format === 'essay';
    if (aIsEssay && !bIsEssay) return 1;
    if (!aIsEssay && bIsEssay) return -1;

    const aNum = typeof a.question_number === 'string'
      ? parseInt(a.question_number, 10) || 0
      : a.question_number;
    const bNum = typeof b.question_number === 'string'
      ? parseInt(b.question_number, 10) || 0
      : b.question_number;
    return aNum - bNum;
  });

  return {
    ...result,
    exam_info: {
      ...exam_info,
      total_questions: sorted.length,
    },
    questions: sorted,
  };
}

/**
 * 분석 결과 기본 구조 검증
 */
function validateBasicResult(result: unknown): result is BasicAnalysisResult {
  if (!result || typeof result !== 'object') return false;

  const r = result as Record<string, unknown>;

  if (!r.exam_info || typeof r.exam_info !== 'object') return false;
  if (!r.summary || typeof r.summary !== 'object') return false;
  if (!Array.isArray(r.questions)) return false;

  const examInfo = r.exam_info as Record<string, unknown>;
  if (typeof examInfo.total_questions !== 'number') return false;

  return true;
}

// ── 공개 API ──

/**
 * 시험지 이미지 분석 (기본 분석)
 *
 * @param images - base64 인코딩된 시험지 이미지 배열
 * @param combinedPrompt - 프롬프트 빌더에서 생성한 통합 프롬프트
 * @returns 구조화된 분석 결과
 */
export async function analyzeExam(
  images: string[],
  mimeTypeHint: string,
  combinedPrompt: string,
  modelOverride?: string,
  calibrationSet?: CalibrationSet | null,
): Promise<BasicAnalysisResult> {
  if (!images.length) {
    throw new Error('분석할 이미지가 없습니다');
  }

  if (!combinedPrompt.trim()) {
    throw new Error('분석 프롬프트가 비어있습니다');
  }

  try {
    const rawResult = await callGeminiVision<unknown>({
      images,
      prompt: combinedPrompt,
      jsonMode: true,
      temperature: 0.1,
      mimeTypeHint: mimeTypeHint,
      modelOverride,
    });

    // 구조 검증
    if (!validateBasicResult(rawResult)) {
      throw new Error(
        'AI 분석 결과가 올바른 구조가 아닙니다. exam_info, summary, questions 필드가 필요합니다.'
      );
    }

    // 기본값 보정 + question_type 표준화 + ability_domain 매핑
    const rawQuestions = rawResult.questions.map((q, idx) => {
      const rawType = q.question_type ?? 'calculation';
      const standardType = (TYPE_TO_STANDARD[rawType] || 'algebra') as AnalyzedQuestion['question_type'];
      const abilityDomain = (q.ability_domain || TYPE_TO_DOMAIN[rawType] || TYPE_TO_DOMAIN[standardType] || 'calculation') as NonNullable<AnalyzedQuestion['ability_domain']>;
      return {
        question_number: q.question_number ?? idx + 1,
        question_format: q.question_format ?? null,
        difficulty: q.difficulty ?? '1',
        difficulty_reason: q.difficulty_reason ?? null,
        question_type: standardType,
        ability_domain: abilityDomain,
        points: q.points ?? null,
        topic: q.topic ?? null,
        ai_comment: q.ai_comment ?? null,
        confidence: typeof q.confidence === 'number' ? q.confidence : CONFIDENCE_THRESHOLDS.MEDIUM,
        confidence_reason: q.confidence_reason ?? null,
        is_correct: q.is_correct ?? null,
        student_answer: q.student_answer ?? null,
        earned_points: q.earned_points ?? null,
        error_type: q.error_type ?? null,
      };
    });

    // ── 통합 보정 플라이휠 적용 (⚠️ 현재 비활성) ──
    // 호출부(analyze/route.ts)가 calibrationSet 미전달 → 항상 rawQuestions(원본 AI값) 반환.
    // 자동보정은 교차검증서 per-문항 악화 입증으로 비활성화(2026-06-02). 코드는 가역성 위해 보존.
    // (calibrationSet 전달 시: 수치형 Δ가산 + 범주형 remap, 원본은 ai_<field> 에 보존.)
    const questions = calibrationSet
      ? rawQuestions.map((q) => {
          const m = { ...q } as Record<string, unknown>;
          for (const cfg of NUMERIC_FIELDS) {
            const applied = applyNumericField(m, cfg, calibrationSet.numeric[cfg.field] ?? null);
            if (applied != null) { m[cfg.aiKey] = m[cfg.valueKey]; m[cfg.valueKey] = applied; }
          }
          for (const cfg of CATEGORICAL_FIELDS) {
            const remap = applyCategoricalRemap(String(m[cfg.valueKey] ?? ''), calibrationSet.categorical[cfg.field] ?? null);
            if (remap && remap !== String(m[cfg.valueKey])) { m[cfg.aiKey] = m[cfg.valueKey]; m[cfg.valueKey] = remap; }
          }
          return m as unknown as typeof q;
        })
      : rawQuestions;

    // summary 분포를 questions 배열에서 직접 재계산 (AI summary 부정확 방지)
    const recomputedDiffDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const recomputedTypeDist: Record<string, number> = { number: 0, algebra: 0, function: 0, geometry: 0, statistics: 0 };
    const recomputedFormatDist: Record<string, number> = { objective: 0, short_answer: 0, essay: 0 };

    for (const q of questions) {
      // 난이도 분포
      const diff = String(q.difficulty);
      if (recomputedDiffDist[diff] !== undefined) {
        recomputedDiffDist[diff]++;
      }
      // 유형 분포
      const qType = q.question_type || 'algebra';
      if (recomputedTypeDist[qType] !== undefined) {
        recomputedTypeDist[qType]++;
      }
      // 형식 분포
      const qFormat = q.question_format || 'objective';
      if (recomputedFormatDist[qFormat] !== undefined) {
        recomputedFormatDist[qFormat]++;
      }
    }

    // 가장 많은 난이도/유형 찾기
    const dominantDiff = Object.entries(recomputedDiffDist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '3';
    const dominantType = Object.entries(recomputedTypeDist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'algebra';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawSchoolName = (rawResult.exam_info as any)?.school_name;

    const result: BasicAnalysisResult = {
      exam_info: {
        total_questions: questions.length,
        total_points: rawResult.exam_info.total_points ?? 100,
        school_name: typeof rawSchoolName === 'string' ? rawSchoolName : null,
        format_distribution: {
          objective: recomputedFormatDist['objective'] || 0,
          short_answer: recomputedFormatDist['short_answer'] || 0,
          essay: recomputedFormatDist['essay'] || 0,
        },
      },
      summary: {
        difficulty_distribution: recomputedDiffDist as unknown as BasicAnalysisResult['summary']['difficulty_distribution'],
        type_distribution: recomputedTypeDist as unknown as BasicAnalysisResult['summary']['type_distribution'],
        average_difficulty: dominantDiff,
        dominant_type: dominantType,
      },
      questions,
    };

    // 배점 검증 및 페널티 적용
    const validated = validateAndPenalize(result);
    // 문항 번호 갭 자동 보정 (v1.0.5)
    return fillNumberGaps(validated);
  } catch (error) {
    if (error instanceof Error && error.message.includes('AI 분석 결과')) {
      throw error;
    }
    throw new Error(
      `시험지 분석 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 시험지 유형 분류 (빈 시험지 / 학생 답안지 / 혼합)
 *
 * @param images - base64 인코딩된 시험지 이미지 배열 (보통 첫 페이지만)
 * @returns 시험지 분류 결과
 */
export async function classifyExamPaper(
  images: string[]
): Promise<ExamPaperClassification> {
  if (!images.length) {
    throw new Error('분류할 이미지가 없습니다');
  }

  const classificationPrompt = `당신은 시험지를 분류하는 전문가입니다.

주어진 시험지 이미지를 분석하여 다음을 판별하세요:

1. **시험지 유형 (paper_type)**:
   - "blank": 빈 시험지 (학생 답안이 없음)
   - "answered": 학생이 답을 작성한 시험지
   - "mixed": 일부만 답안이 작성됨

2. **채점 상태 (grading_status)**:
   - "not_graded": 채점 표시 없음
   - "partially_graded": 일부 문항만 채점됨
   - "fully_graded": 전체 문항 채점 완료
   - "uncertain": 판별 불가

3. **메타데이터 추출**: 학교명, 시험 제목, 학년, 날짜, 과목 등

**JSON 응답 형식:**
{
  "paper_type": "blank" | "answered" | "mixed",
  "paper_type_confidence": 0.0-1.0,
  "grading_status": "not_graded" | "partially_graded" | "fully_graded" | "uncertain",
  "grading_confidence": 0.0-1.0,
  "extracted_metadata": {
    "school_name": "학교명 또는 null",
    "exam_title": "시험 제목 또는 null",
    "grade": "학년 또는 null",
    "date": "날짜 또는 null",
    "subject": "과목 또는 null",
    "suggested_title": "추천 제목 (학교명 + 학년 + 시험명 조합)"
  }
}`;

  try {
    const rawResult = await callGeminiVision<unknown>({
      images,
      prompt: classificationPrompt,
      jsonMode: true,
      temperature: 0.05,
    });

    // 구조 검증 및 기본값 적용
    const r = rawResult as Record<string, unknown>;
    const metadata = (r.extracted_metadata ?? {}) as Record<string, unknown>;

    const classification: ExamPaperClassification = {
      paper_type: validatePaperType(r.paper_type) ?? 'blank',
      paper_type_confidence: typeof r.paper_type_confidence === 'number'
        ? r.paper_type_confidence
        : CONFIDENCE_THRESHOLDS.MEDIUM,
      grading_status: validateGradingStatus(r.grading_status) ?? 'uncertain',
      grading_confidence: typeof r.grading_confidence === 'number'
        ? r.grading_confidence
        : CONFIDENCE_THRESHOLDS.LOW,
      extracted_metadata: {
        school_name: typeof metadata.school_name === 'string' ? metadata.school_name : null,
        exam_title: typeof metadata.exam_title === 'string' ? metadata.exam_title : null,
        grade: typeof metadata.grade === 'string' ? metadata.grade : null,
        date: typeof metadata.date === 'string' ? metadata.date : null,
        subject: typeof metadata.subject === 'string' ? metadata.subject : null,
        suggested_title: typeof metadata.suggested_title === 'string'
          ? metadata.suggested_title
          : null,
      },
    };

    return classification;
  } catch (error) {
    throw new Error(
      `시험지 분류 실패: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ── 내부 검증 헬퍼 ──

const VALID_PAPER_TYPES = new Set(['blank', 'answered', 'mixed']);
const VALID_GRADING_STATUSES = new Set(['not_graded', 'partially_graded', 'fully_graded', 'uncertain']);

function validatePaperType(value: unknown): 'blank' | 'answered' | 'mixed' | null {
  if (typeof value === 'string' && VALID_PAPER_TYPES.has(value)) {
    return value as 'blank' | 'answered' | 'mixed';
  }
  return null;
}

function validateGradingStatus(
  value: unknown
): 'not_graded' | 'partially_graded' | 'fully_graded' | 'uncertain' | null {
  if (typeof value === 'string' && VALID_GRADING_STATUSES.has(value)) {
    return value as 'not_graded' | 'partially_graded' | 'fully_graded' | 'uncertain';
  }
  return null;
}
