/**
 * 채점 마크 감지 모듈
 * Python Math Report ai_engine.py의 detect_grading_marks 메서드 1:1 이식
 * ai-engine.ts의 Gemini Vision 호출 인프라를 재사용
 */

import { GoogleGenAI } from '@google/genai';
import type { MarkDetectionResult, GradingMark } from './types';
import { CONFIDENCE_THRESHOLDS } from './constants';
import { parseJsonResponse, getMimeType } from './ai-engine';

// ── 싱글톤 클라이언트 (ai-engine.ts와 동일 인스턴스 공유를 위해 별도 관리) ──

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

const MODEL = 'gemini-2.5-flash';

// ── 채점 마크 감지 프롬프트 ──

const MARK_DETECTION_PROMPT = `당신은 시험지 채점 표시를 분석하는 전문가입니다.

시험지에서 채점 표시(빨간펜, 파란펜 등)를 찾아주세요.

⚠️ **중요 구분**
- **문제 번호(1. 2. 3.)** 옆의 표시 = 채점 표시 (감지 대상)
- **보기 번호(①②③④⑤)** 위의 표시 = 학생 답안 선택 (감지 대상 아님!)

**학생 자기 채점 특징:**
- 선생님 채점보다 표시가 덜 정돈될 수 있음
- 빨간펜/파란펜 혼용 가능
- O/X 대신 체크(✓), 슬래시(/) 등 다양한 표시

**감지 대상 (채점 표시):**
- O (동그라미) = 정답
- / (사선) = 오답
- X = 오답
- ✓ (체크) = 정답
- △ (세모) = 부분 정답

**감지하지 말아야 할 것:**
- 보기 번호 위의 동그라미 (답 선택 표시)
- 풀이 과정의 메모

**confidence 기준:**
- 0.85 이상: 확실한 채점 표시
- 0.75-0.85: 채점으로 추정
- 0.3 이하: 보기 선택일 가능성 높음 (감지 제외)

**JSON 형식:**
{
  "marks": [
    {
      "question_number": 1,
      "mark_type": "circle",
      "mark_symbol": "O",
      "position": "on_question_number",
      "color": "red",
      "indicates": "correct",
      "confidence": 0.95
    }
  ],
  "overall_grading_status": "partially_graded",
  "color_distinction_possible": true,
  "detection_notes": ["빨간펜 표시 감지"]
}`;

// ── 마크 심볼 → 정답 여부 매핑 ──

const MARK_INDICATES_MAP: Record<string, 'correct' | 'incorrect' | 'not_graded' | 'uncertain'> = {
  O: 'correct',
  '✓': 'correct',
  circle: 'correct',
  check: 'correct',
  '/': 'incorrect',
  X: 'incorrect',
  x: 'incorrect',
  slash: 'incorrect',
  '△': 'uncertain',
  triangle: 'uncertain',
};

// ── 유효한 마크 타입 ──

const _VALID_MARK_TYPES = new Set([
  'circle', 'slash', 'x', 'check', 'triangle',
  'O', 'X', '/', '✓', '△',
]);

const VALID_INDICATES = new Set(['correct', 'incorrect', 'not_graded', 'uncertain']);
const VALID_GRADING_STATUSES = new Set(['not_graded', 'partially_graded', 'fully_graded', 'uncertain']);

// ── 마크 검증 ──

/**
 * 개별 마크 데이터 검증 및 정규화
 */
function normalizeGradingMark(raw: Record<string, unknown>): GradingMark | null {
  const questionNumber = raw.question_number;
  if (typeof questionNumber !== 'number' || questionNumber < 1) {
    return null;
  }

  const confidence = typeof raw.confidence === 'number' ? raw.confidence : 0;

  // 낮은 신뢰도 마크 필터링 (보기 선택일 가능성)
  if (confidence <= 0.3) {
    return null;
  }

  const markType = typeof raw.mark_type === 'string' ? raw.mark_type : 'unknown';
  const markSymbol = typeof raw.mark_symbol === 'string' ? raw.mark_symbol : '';
  const position = typeof raw.position === 'string' ? raw.position : 'unknown';
  const color = typeof raw.color === 'string' ? raw.color : 'unknown';

  // indicates 결정: AI 응답 우선, 없으면 심볼로 추론
  let indicates: 'correct' | 'incorrect' | 'not_graded' | 'uncertain' = 'uncertain';
  if (typeof raw.indicates === 'string' && VALID_INDICATES.has(raw.indicates)) {
    indicates = raw.indicates as typeof indicates;
  } else {
    // 심볼 또는 마크 타입으로 추론
    indicates = MARK_INDICATES_MAP[markSymbol]
      ?? MARK_INDICATES_MAP[markType]
      ?? 'uncertain';
  }

  return {
    question_number: questionNumber,
    mark_type: markType,
    mark_symbol: markSymbol,
    position,
    color,
    indicates,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * 중복 마크 제거 (같은 문제 번호에 여러 마크가 감지된 경우 가장 높은 신뢰도 유지)
 */
function deduplicateMarks(marks: GradingMark[]): GradingMark[] {
  const bestByQuestion = new Map<number, GradingMark>();

  for (const mark of marks) {
    const existing = bestByQuestion.get(mark.question_number);
    if (!existing || mark.confidence > existing.confidence) {
      bestByQuestion.set(mark.question_number, mark);
    }
  }

  return Array.from(bestByQuestion.values()).sort(
    (a, b) => a.question_number - b.question_number
  );
}

/**
 * 전체 채점 상태 추론
 */
function inferGradingStatus(
  marks: GradingMark[],
  aiStatus: string | undefined
): 'not_graded' | 'partially_graded' | 'fully_graded' | 'uncertain' {
  // AI가 판별한 값이 유효하면 우선 사용
  if (typeof aiStatus === 'string' && VALID_GRADING_STATUSES.has(aiStatus)) {
    return aiStatus as 'not_graded' | 'partially_graded' | 'fully_graded' | 'uncertain';
  }

  // 마크 기반 추론
  if (marks.length === 0) return 'not_graded';

  const highConfMarks = marks.filter((m) => m.confidence >= CONFIDENCE_THRESHOLDS.HIGH);
  if (highConfMarks.length === 0) return 'uncertain';

  return 'partially_graded';
}

// ── base64 data URI prefix 제거 ──

function stripDataUriPrefix(base64: string): string {
  const commaIdx = base64.indexOf(',');
  if (commaIdx !== -1 && base64.startsWith('data:')) {
    return base64.slice(commaIdx + 1);
  }
  return base64;
}

// ── 빈 결과 생성 ──

function createEmptyResult(notes: string[]): MarkDetectionResult {
  return {
    marks: [],
    overall_grading_status: 'not_graded',
    color_distinction_possible: false,
    detection_notes: notes,
  };
}

// ── 공개 API ──

/**
 * 시험지 이미지에서 채점 마크(O, X, /, ✓, △) 감지
 *
 * @param imageBase64 - base64 인코딩된 시험지 이미지 (data URI 또는 순수 base64)
 * @returns 감지된 채점 마크 및 채점 상태 정보
 */
export async function detectGradingMarks(
  imageBase64: string,
  _mimeTypeHint?: string
): Promise<MarkDetectionResult> {
  if (!imageBase64 || !imageBase64.trim()) {
    return createEmptyResult(['이미지 데이터가 비어있습니다']);
  }

  const client = getClient();
  const mimeType = getMimeType(imageBase64);
  const data = stripDataUriPrefix(imageBase64);

  try {
    const response = await client.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data,
              },
            },
            { text: MARK_DETECTION_PROMPT },
          ],
        },
      ],
      config: {
        temperature: 0.05,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return createEmptyResult(['Gemini 응답이 비어있습니다']);
    }

    const rawResult = parseJsonResponse<Record<string, unknown>>(responseText);

    // marks 배열 파싱 및 검증
    const rawMarks = Array.isArray(rawResult.marks) ? rawResult.marks : [];
    const validMarks: GradingMark[] = [];

    for (const rawMark of rawMarks) {
      if (rawMark && typeof rawMark === 'object') {
        const normalized = normalizeGradingMark(rawMark as Record<string, unknown>);
        if (normalized) {
          validMarks.push(normalized);
        }
      }
    }

    // 중복 제거
    const dedupedMarks = deduplicateMarks(validMarks);

    // 채점 상태 추론
    const gradingStatus = inferGradingStatus(
      dedupedMarks,
      rawResult.overall_grading_status as string | undefined
    );

    // 색상 구분 가능 여부
    const colors = new Set(dedupedMarks.map((m) => m.color).filter((c) => c !== 'unknown'));
    const colorDistinctionPossible =
      typeof rawResult.color_distinction_possible === 'boolean'
        ? rawResult.color_distinction_possible
        : colors.size > 1;

    // 감지 노트
    const detectionNotes: string[] = [];
    if (Array.isArray(rawResult.detection_notes)) {
      for (const note of rawResult.detection_notes) {
        if (typeof note === 'string') {
          detectionNotes.push(note);
        }
      }
    }

    // 결과 보강 노트
    if (dedupedMarks.length > 0) {
      const correctCount = dedupedMarks.filter((m) => m.indicates === 'correct').length;
      const incorrectCount = dedupedMarks.filter((m) => m.indicates === 'incorrect').length;
      detectionNotes.push(
        `총 ${dedupedMarks.length}개 채점 표시 감지 (정답: ${correctCount}, 오답: ${incorrectCount})`
      );
    }

    const lowConfCount = dedupedMarks.filter(
      (m) => m.confidence < CONFIDENCE_THRESHOLDS.MEDIUM
    ).length;
    if (lowConfCount > 0) {
      detectionNotes.push(
        `${lowConfCount}개 마크의 신뢰도가 낮습니다 (${CONFIDENCE_THRESHOLDS.MEDIUM} 미만)`
      );
    }

    return {
      marks: dedupedMarks,
      overall_grading_status: gradingStatus,
      color_distinction_possible: colorDistinctionPossible,
      detection_notes: detectionNotes,
    };
  } catch (error) {
    // JSON 파싱 실패 등의 경우 빈 결과 반환
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('JSON 파싱 실패')) {
      return createEmptyResult([
        '채점 마크 감지 결과 파싱 실패',
        `원인: ${errorMessage}`,
      ]);
    }

    // API 호출 자체 실패는 throw
    throw new Error(`채점 마크 감지 실패: ${errorMessage}`);
  }
}

/**
 * 여러 페이지의 채점 마크를 감지하고 병합
 *
 * @param images - base64 인코딩된 이미지 배열
 * @returns 모든 페이지에서 감지된 마크를 병합한 결과
 */
export async function detectGradingMarksMultiPage(
  images: string[]
): Promise<MarkDetectionResult> {
  if (!images.length) {
    return createEmptyResult(['이미지가 없습니다']);
  }

  // 각 페이지 병렬 분석
  const results = await Promise.allSettled(
    images.map((img) => detectGradingMarks(img))
  );

  const allMarks: GradingMark[] = [];
  const allNotes: string[] = [];
  let hasColor = false;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      allMarks.push(...result.value.marks);
      allNotes.push(...result.value.detection_notes.map((n) => `[p${i + 1}] ${n}`));
      if (result.value.color_distinction_possible) hasColor = true;
    } else {
      allNotes.push(`[p${i + 1}] 분석 실패: ${result.reason}`);
    }
  }

  // 전체 페이지 마크 중복 제거
  const dedupedMarks = deduplicateMarks(allMarks);
  const gradingStatus = inferGradingStatus(dedupedMarks, undefined);

  return {
    marks: dedupedMarks,
    overall_grading_status: gradingStatus,
    color_distinction_possible: hasColor,
    detection_notes: allNotes,
  };
}
