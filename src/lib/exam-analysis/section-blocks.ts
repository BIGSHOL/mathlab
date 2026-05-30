/**
 * V3 총평 "섹션 블록" 순수 로직 (클라이언트-세이프).
 *
 * 네이버 이미지 복사: [섹션 이미지][핵심 요약 텍스트]를 이 순서대로 쌓는다.
 * - 서버(section-image-generator.tsx)는 이 목록으로 PNG를 렌더.
 * - 클라이언트(클립보드 빌더)는 이 목록으로 <img 엔드포인트URL> + <p 요약> HTML을 만든다.
 *
 * ⚠️ satori/fs/resvg import 금지 — 클라이언트 번들에 들어가므로 순수 함수만.
 */

export const SECTION_IMAGE_VERSION = 'v1';

/** 현재 satori로 PNG 생성 가능한 섹션 key (나머지는 차트/추후 확장) */
export const RENDERABLE_SECTION_KEYS = ['intro'];

export interface SectionMeta {
  examTitle: string;
  grade: string;
  schoolName: string | null;
  totalQuestions: number;
  totalPoints: number;
}

export interface SectionBlock {
  kind: 'section' | 'chart'; // section=satori(/section-image/[key]), chart=기존(/chart/[key])
  key: string;
  summary: string;           // 이미지 아래 핵심 요약 (1~2문장, 검색 노출용)
}

/** 이미지용 수식 평문화 — satori는 KaTeX 불가. 간단 $...$ 만 처리(드묾). */
export function stripMathForImage(text: string): string {
  if (!text) return '';
  return text
    .replace(/\$\$?([^$]*)\$\$?/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\times/g, '×').replace(/\\div/g, '÷')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\^\{?2\}?/g, '²').replace(/\^\{?3\}?/g, '³')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 이미지/요약 텍스트 정규화: 수식 평문화 + 난이도 영문(Lv3) → 한글(3단계) */
export function koImg(text: string): string {
  return stripMathForImage(text)
    .replace(/\bLv\.?\s*([1-5])(?![\d.])/gi, '$1단계')
    .replace(/\bLevel\s+([1-5])(?![\d.])/gi, '$1단계');
}

function s(v: unknown): string { return typeof v === 'string' ? v : ''; }

/** 첫 1~2문장만 추출 (핵심 요약용) */
function firstSentences(text: string, max = 2): string {
  const clean = koImg(text);
  if (!clean) return '';
  const parts = clean.split(/(?<=[.?!。])\s+/).filter(Boolean);
  return parts.slice(0, max).join(' ');
}

/** 시험지의 섹션 블록 순서 + 핵심 요약 목록 (commentary 데이터 가용성에 따라 동적) */
export function buildSectionBlocks(c: Record<string, unknown>, meta: SectionMeta): SectionBlock[] {
  const blocks: SectionBlock[] = [];

  // 1) 인트로 (헤드라인 + KPI)
  blocks.push({
    kind: 'section',
    key: 'intro',
    summary: firstSentences(s(c.blog_dek)) || `${meta.grade} 수학 시험 총평 — 총 ${meta.totalQuestions}문항·${meta.totalPoints}점.`,
  });

  // 2) 분석 차트 4종 (기존 차트 엔드포인트 재사용)
  blocks.push({ kind: 'chart', key: 'difficulty', summary: '난이도 분포 — 문항별 난이도(1~5단계) 비중.' });
  blocks.push({ kind: 'chart', key: 'ability-radar', summary: '능력 영역 분포 — 계산력·이해력·문제해결력·추론력.' });
  blocks.push({ kind: 'chart', key: 'topic-bar', summary: '단원별 출제 현황 — 상위 단원 문항 수.' });
  blocks.push({ kind: 'chart', key: 'discrimination', summary: '변별력 분석 — 난이도·배점·형식 기반 지수.' });

  return blocks;
}

function escapeHtml(s2: string): string {
  return String(s2 ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** 블록의 이미지 URL (절대경로) — section/chart 엔드포인트 분기 */
export function sectionBlockImageUrl(block: SectionBlock, baseUrl: string, examPaperId: string): string {
  if (block.kind === 'chart') {
    return `${baseUrl}/api/exam-analysis/${examPaperId}/chart/${block.key}?v=v2`;
  }
  return `${baseUrl}/api/exam-analysis/${examPaperId}/section-image/${block.key}?v=${SECTION_IMAGE_VERSION}`;
}

/**
 * 네이버 블로그 본문 HTML — [중앙 이미지][아래 핵심 요약 텍스트] 반복.
 * 이미지는 매거진 시각 충실도, 요약은 검색 노출(이중첨부). 텍스트는 실제 본문이라 SEO 유리.
 */
export function buildNaverImageHtml(
  blocks: SectionBlock[],
  opts: { baseUrl: string; examPaperId: string },
): string {
  const parts = blocks.map((b) => {
    const url = sectionBlockImageUrl(b, opts.baseUrl, opts.examPaperId);
    const img = `<p style="text-align:center;margin:0 0 6px;"><img src="${url}" style="width:720px;max-width:100%;" /></p>`;
    const cap = b.summary
      ? `<p style="font-size:14px;color:#555;line-height:1.75;margin:0 0 30px;word-break:keep-all;">${escapeHtml(b.summary)}</p>`
      : '';
    return img + cap;
  });
  return `<div style="width:720px;max-width:100%;">${parts.join('')}</div>`;
}
