/**
 * V3 통합 뷰 — 모듈식 템플릿 렌더러.
 *
 * 이전에는 본문 구조(헤더 → KPI → 피처 → 섹션 01 → Q&A → …)가 이 파일에 JSX 로 고정돼 있었고,
 * 섹션 번호도 `nextSec++` 로 손수 계산했다. 지금은 **블록 레지스트리 + 템플릿 설정**이
 * 순서·on/off·표현(variant)·톤(테마)을 전부 데이터로 들고 있고, 이 컴포넌트는 그걸 순회만 한다.
 *
 *   블록 정의 : v3/blocks/registry.tsx
 *   해석/번호 : v3/blocks/resolve.ts
 *   테마 팔레트: lib/exam-analysis/commentary-themes.ts
 *
 * ⚠️ 최상위 자식 = 블로그 이미지 캡처 단위 (AnalysisDetail::handleCopyNaverImages 가
 *    `.v3` 의 children 을 하나씩 PNG 로 뜬다). 블록 렌더러 반환값을 여기서 감싸지 말 것.
 *
 * template 미전달 시 DEFAULT_TEMPLATE → 모듈화 이전과 동일한 결과.
 */

import { Fragment } from 'react';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type {
  BlockMeta,
  BlockChartImages,
  CommentaryTemplateConfig,
} from '@/lib/exam-analysis/blocks/types';
import { themeClassName } from '@/lib/exam-analysis/commentary-themes';
import { layoutClassName, layoutVizClassName } from '@/lib/exam-analysis/commentary-layouts';
import { getCommentaryCopy } from '@/lib/exam-analysis/commentary-copy';
import { resolveBlocks, normalizeTemplate } from './blocks/resolve';

/** @deprecated 이름 유지용 별칭 — 신규 코드는 BlockMeta 사용 */
export type V3Meta = BlockMeta;
/** @deprecated 이름 유지용 별칭 — 신규 코드는 BlockChartImages 사용 */
export type V3ChartImages = BlockChartImages;

interface V3CommentaryViewProps {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  meta: V3Meta;
  /** 분석 화면에서 별도 차트 컴포넌트가 이미 차트를 표시 중이면 미전달 → 차트 블록은 자동 생략 */
  charts?: V3ChartImages;
  /** 사용자가 고른 템플릿(테마 + 블록 구성). 미전달 시 기본 템플릿 */
  template?: CommentaryTemplateConfig | null;
}

export function V3CommentaryView({ commentary, questions, meta, charts, template }: V3CommentaryViewProps) {
  const blocks = resolveBlocks(template, { commentary, questions, meta, charts });
  const normalized = normalizeTemplate(template);
  // 테마(팔레트) · 레이아웃(골격)은 직교 — 루트에 둘 다 붙는다.
  // viz(계량 위젯 패밀리)는 골격이 결정 → 골격을 바꾸면 그래프 생김새도 함께 갈린다.
  const rootCls = [
    'v3',
    themeClassName(normalized.themeId),
    layoutClassName(normalized.layoutId),
    layoutVizClassName(normalized.layoutId),
  ]
    .filter(Boolean)
    .join(' ');
  const copy = getCommentaryCopy(normalized.copyId);
  // 캡처 캐시가 variant 전환을 놓치지 않게 — data-block-id 는 블록 id 만 담아서
  // 인터뷰(막대)→칩 같이 표현만 바꾸면 3일 캐시가 옛 이미지를 그대로 재사용했다.
  const templateSignature = [
    normalized.themeId,
    normalized.layoutId,
    normalized.copyId,
    normalized.blocks.map((b) => `${b.id}:${b.variant}:${b.enabled}`).join(','),
  ].join('|');

  return (
    <div className={rootCls} data-template-signature={templateSignature}>
      {blocks.map(({ def, variant, sectionNum }) => (
        <Fragment key={def.id}>
          {variant.render({ commentary, questions, meta, charts, sectionNum, copy })}
        </Fragment>
      ))}
    </div>
  );
}
