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

export type BlockId =
  | 'header'
  | 'kpi'
  | 'feature'
  | 'infographic'
  | 'difficultyTable'
  | 'previousComparison'
  | 'qa'
  | 'mainAnalysis'
  | 'keyQuestions'
  | 'pullQuote'
  | 'charts'
  | 'finalStrategy'
  | 'conclusion'
  | 'footer';

export interface CommentaryBlockDef {
  id: BlockId;
  label: string;
  /** 편집 UI 부가 설명 */
  description?: string;
  /** true면 사용자가 끄거나 순서를 바꿀 수 없다 (헤더/푸터) */
  locked?: boolean;
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
