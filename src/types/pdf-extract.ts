import type { QuestionDifficulty, QuestionType } from './index';

/** Gemini가 직접 생성한 SVG 다이어그램 */
export interface DiagramSvg {
  svg: string;   // 완전한 SVG 코드 (<svg>...</svg>)
  label: string; // 도형 설명
}

/** Gemini가 반환하는 이미지/도형 바운딩 박스 (정규화 좌표 0~1000) */
export interface ImageBoundingBox {
  /** [y_min, x_min, y_max, x_max] 정규화 좌표 (0~1000) */
  box: [number, number, number, number];
  /** 도형 설명 (예: "원", "삼각형", "좌표평면 그래프") */
  label: string;
}

/** 크롭 후 업로드 완료된 이미지 정보 */
export interface CroppedImage {
  url: string;
  label: string;
}

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

  // 이미지/도형 크롭
  imageBboxes?: ImageBoundingBox[];
  croppedImages?: CroppedImage[];

  // SVG 다이어그램 (Gemini 직접 생성 또는 diagramParams에서 렌더링)
  diagramSvgs?: DiagramSvg[];

  // 구조화된 다이어그램 파라미터 (서버에서 SVG로 렌더링됨)
  diagramParams?: DiagramParam[];
}

/** 구조화된 다이어그램 파라미터 (Gemini → 서버 렌더링) */
export interface DiagramParam {
  type: string;   // DiagramType (fraction_circle, number_line 등)
  label: string;  // 도형 설명
  params: Record<string, unknown>;  // 타입별 파라미터
  align?: 'left' | 'center' | 'right';  // 도형 정렬 (기본: inline/left)
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
  skipped?: number;
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
