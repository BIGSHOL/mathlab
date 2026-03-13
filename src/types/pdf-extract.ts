import type { QuestionDifficulty, QuestionType } from './index';

/** Gemini AI가 추출한 개별 문제 */
export interface ExtractedProblem {
  // AI 추출 원본
  questionNum: number;
  pageNum: number;
  sectionHeader: string;
  difficultyTag: string; // 원본: 하, 중하, 중, 중상, 상
  problemType: string; // 원본: 객관식, 주관식, 서술형
  content: string; // 마크다운 + LaTeX
  choices: string[]; // ①②③④⑤
  boxItems: string[]; // ㄱ,ㄴ,ㄷ 항목
  answer: string;
  explanation: string;
  sourceTag: string; // 대표문제, 서술형 등

  // 매핑된 값
  difficulty: QuestionDifficulty;
  type: QuestionType;
}

/** PDF 페이지 정보 */
export interface PdfPageInfo {
  pageNum: number;
  thumbnail: string; // base64 data URL (저해상도)
}

/** AI 추출 진행 상태 */
export interface PdfExtractProgress {
  done: number;
  total: number;
  currentPage?: number;
}

/** AI 추출 API 요청 */
export interface PdfExtractRequest {
  pages: { pageNum: number; imageBase64: string }[];
  bookCode: string;
  chapter?: string;
}

/** AI 추출 개념 (유형 설명 박스) */
export interface ExtractedConcept {
  sectionHeader: string;
  title: string;
  content: string; // 마크다운 + LaTeX
}

/** AI 해설 추출 결과 */
export interface ExtractedSolution {
  questionNum: number;
  answer: string;
  explanation: string;
}

// --- 매핑 유틸 ---

const DIFFICULTY_MAP: Record<string, QuestionDifficulty> = {
  하: 'BASIC',
  중하: 'BASIC',
  중: 'MEDIUM',
  중상: 'HIGH',
  상: 'HIGHEST',
};

const TYPE_MAP: Record<string, QuestionType> = {
  객관식: 'MULTIPLE_CHOICE',
  주관식: 'SHORT_ANSWER',
  단답형: 'SHORT_ANSWER',
  서술형: 'ESSAY',
};

export function mapDifficulty(tag: string): QuestionDifficulty {
  return DIFFICULTY_MAP[tag.trim()] || 'MEDIUM';
}

export function mapType(tag: string): QuestionType {
  return TYPE_MAP[tag.trim()] || 'SHORT_ANSWER';
}

/** ㄱㄴㄷ 보기를 content에 마크다운 인용블록으로 포함 */
export function embedBoxItems(content: string, boxItems: string[]): string {
  if (boxItems.length === 0) return content;
  const boxBlock = [
    '',
    '> **\\<보기\\>**',
    '>',
    ...boxItems.map((item) => `> ${item}`),
  ].join('\n');
  return content + boxBlock;
}
