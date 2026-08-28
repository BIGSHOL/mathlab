/**
 * 모듈식 총평 템플릿 — 블록/템플릿 타입 (순수 타입, JSX 없음 → 서버·클라이언트 공용).
 *
 * 배경: 총평은 오래 단일 레이아웃이었다. 블록 자체는 데이터 유무로 이미 조건부였지만
 * **순서가 JSX 하드코딩 · 톤이 CSS 하드코딩 · 블록당 표현이 1개** 라서 어떤 시험을 넣어도
 * 결과물이 똑같이 보였다. 이 타입들이 그 셋을 전부 데이터로 끌어낸다.
 *
 * ⚠️ 블록 = 블로그 이미지 캡처 단위.
 * `AnalysisDetail::handleCopyNaverImages` 가 `.v3` 의 **최상위 자식마다** PNG를 뜬다.
 * 따라서 블록 렌더러는 반드시 최상위 요소(또는 여러 최상위 요소를 담은 Fragment)를 반환해야 하며,
 * 여러 요소를 `<div>` 로 감싸면 캡처가 하나의 거대 이미지로 합쳐진다(= 블로그 가독성 붕괴).
 */

import type { ReactNode } from 'react';
import type { CommentaryResult } from '../agents/commentary-agent';
import type { AnalyzedQuestion } from '../types';
import type { CommentaryCopy } from '../commentary-copy';

/** 블록 렌더러가 받는 데이터 */
export interface BlockRenderProps {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  meta: BlockMeta;
  charts?: BlockChartImages;
  /** 이 블록에 배정된 섹션 번호 ('01', '02' …). 번호를 쓰지 않는 블록은 빈 문자열. */
  sectionNum: string;
  /** 문체 팩 — 섹션 제목·안내문 등 템플릿 소유 문구. AI 생성 텍스트는 여기 포함되지 않는다. */
  copy: CommentaryCopy;
}

export interface BlockMeta {
  examTitle: string;
  schoolName: string | null;
  grade: string;
  analyzedAt: string | null;
  totalQuestions: number;
  totalPoints: number;
  hasStudentData: boolean;
}

export interface BlockChartImages {
  difficulty?: string;
  abilityRadar?: string;
  topicBar?: string;
  discrimination?: string;
}

/** 한 블록의 표현 변형 — 같은 데이터를 다른 레이아웃으로 */
export interface BlockVariant {
  id: string;
  label: string;
  /** 편집 UI 설명 (선택) */
  hint?: string;
  render: (props: BlockRenderProps) => ReactNode;
}

/**
 * 블록 id 전수 — **런타임 값이 원본**이고 타입은 여기서 파생된다.
 *
 * 유니온 타입만 두면 저장된 Json 을 검증할 방법이 없어(타입은 런타임에 사라진다)
 * `parseTemplateConfig` 가 `as BlockId` 로 거짓 캐스팅할 수밖에 없었다 (CLAUDE.md #11 위반).
 * 배열을 원본으로 두면 타입과 화이트리스트가 구조적으로 어긋날 수 없다.
 */
export const BLOCK_IDS = [
  'header',
  'kpi',
  'feature',
  'infographic',
  'difficultyTable',
  'previousComparison',
  'qa',
  'mainAnalysis',
  'keyQuestions',
  'letterBody',
  'heatmapGrid',
  'storySlide',
  'pullQuote',
  'charts',
  'finalStrategy',
  'conclusion',
  'footer',
] as const;

export type BlockId = (typeof BLOCK_IDS)[number];

/** 저장된 Json 의 문자열이 실제 블록 id 인지 — 좁히기(narrowing)까지 수행 */
export function isBlockId(v: unknown): v is BlockId {
  return typeof v === 'string' && (BLOCK_IDS as readonly string[]).includes(v);
}

export interface CommentaryBlockDef {
  id: BlockId;
  label: string;
  /** 편집 UI 부가 설명 */
  description?: string;
  /** true면 사용자가 끄거나 순서를 바꿀 수 없다 (헤더/푸터) */
  locked?: boolean;
  /**
   * 저장된 템플릿에 이 블록이 **없을 때** 켤지 여부. `normalizeTemplate` 의 자동 추가 경로가 읽는다.
   *
   * ⚠️ 선택 필드(`optIn?`)로 두지 않는 이유: 새 블록을 추가하며 깜빡 빠뜨리면
   * 다시 "전부 자동 ON" 으로 돌아가 기존 분석본 전체에 그 블록이 튀어나온다.
   * 필수로 두어 컴파일러가 매번 판단을 강제한다.
   *
   * - `true`  — 기존 문서에도 소급 적용해야 하는 기본 구성 블록
   * - `false` — 특정 프리셋(손편지·히트맵 등)에서만 쓰는 블록. 프리셋이 명시적으로 켠다.
   */
  defaultEnabled: boolean;
  /** 렌더에 필요한 데이터가 있는지 — false면 편집 UI에서 "데이터 없음"으로 비활성 표시 */
  available: (commentary: CommentaryResult, questions: AnalyzedQuestion[]) => boolean;
  /**
   * 이 블록이 소비하는 섹션 번호 개수. 기본 0(번호 없음).
   * Q&A 처럼 반복 렌더되는 블록은 개수만큼 소비한다.
   */
  numberCount?: (commentary: CommentaryResult) => number;
  /**
   * 블로그 이미지 복사 시 이미지 아래에 붙는 **검색 노출용 요약**.
   * 반환값이 빈 문자열이면 캡처 경로가 DOM 휴리스틱(heading + 첫 문장)으로 폴백한다.
   */
  summary?: (props: BlockRenderProps) => string;
  variants: BlockVariant[];
}

/**
 * 사용자가 저장하는 템플릿 구성 — 직교하는 3개 축.
 *   themeId  = 팔레트 (색만)
 *   layoutId = 골격   (지면 기하 · 타입 스케일 · 밀도 · 섹션 크롬)
 *   blocks   = 내용   (표시 여부 · 순서 · 블록별 표현)
 */
export interface CommentaryTemplateConfig {
  themeId: string;
  layoutId: string;
  /** 문체 — 지면에 박히는 고정 문구 세트 (섹션 제목·안내문·작성자 표기) */
  copyId: string;
  blocks: TemplateBlockConfig[];
}

export interface TemplateBlockConfig {
  id: BlockId;
  variant: string;
  enabled: boolean;
}

/** 해석 결과 — 실제로 렌더할 블록 하나 */
export interface ResolvedBlock {
  def: CommentaryBlockDef;
  variant: BlockVariant;
  sectionNum: string;
}
