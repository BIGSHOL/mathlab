import { A4PrintPage } from '@/components/print-preview';
import { PrintableHeader } from '@/components/print-preview/PrintableHeader';
import { QuestionBlock } from './QuestionBlock';
import { ConceptBlock } from './ConceptBlock';
import { estimateQuestionHeight, PAGE_CONTENT_HEIGHT } from '@/lib/utils/print-estimate';
import type { NormalizedItem } from '@/lib/services/workbook/sources';
import type { PrintOptionsInput } from '@/lib/schemas/workbook';

interface Props {
  workbookTitle: string;
  sectionTitle: string;
  /** 섹션 시작 페이지 (책 전체 기준) */
  startPageNumber: number;
  items: NormalizedItem[];
  preset: PrintOptionsInput;
  /** 첫 페이지인지 여부 — PrintableHeader variant에 따라 헤더 높이 다름 */
  isFirstPageOfBook?: boolean;
}

/**
 * 섹션의 NormalizedItem[]를 PAGE_CONTENT_HEIGHT 단위로 자동 분할하여 여러 A4 페이지로 렌더.
 *
 * 페이지 번호는 startPageNumber부터 시작.
 * 단순화: 1단(columns=1) 가정. 2단은 후속 PR.
 */
export function SectionContentPages({
  workbookTitle,
  sectionTitle,
  startPageNumber,
  items,
  preset,
  isFirstPageOfBook = false,
}: Props) {
  const pages = paginateItems(items, preset);
  const isLargeTemplate = preset.template === 'large';

  return (
    <>
      {pages.map((pageItems, pageIdx) => {
        const isFirst = isFirstPageOfBook && pageIdx === 0;
        return (
          <A4PrintPage key={pageIdx}>
            <PrintableHeader
              variant={preset.template}
              title={workbookTitle}
              subtitle={sectionTitle}
              accentColor={preset.color}
              isFirstPage={isFirst}
              showDate={preset.showDate}
            />
            <div className="py-2">
              {pageItems.map((item) => (
                <RenderItem key={item.itemId} item={item} large={isLargeTemplate} />
              ))}
            </div>
            <PageNumberFooter pageNumber={startPageNumber + pageIdx} />
          </A4PrintPage>
        );
      })}
    </>
  );
}

function RenderItem({ item, large }: { item: NormalizedItem; large: boolean }) {
  if (item.kind === 'CONCEPT_DOC') {
    return <ConceptBlock item={item} />;
  }
  return <QuestionBlock item={item} large={large} />;
}

function PageNumberFooter({ pageNumber }: { pageNumber: number }) {
  return (
    <div
      className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-400 tabular-nums"
      style={{ printColorAdjust: 'exact' }}
    >
      — {pageNumber} —
    </div>
  );
}

/**
 * 아이템 배열을 PAGE_CONTENT_HEIGHT 기준으로 페이지 단위로 분할.
 * 각 페이지에 누적 높이가 한계를 넘기 직전까지 채움.
 */
function paginateItems(items: NormalizedItem[], preset: PrintOptionsInput): NormalizedItem[][] {
  const pages: NormalizedItem[][] = [];
  let current: NormalizedItem[] = [];
  let currentHeight = 0;

  for (const item of items) {
    const itemHeight = estimateItemHeight(item, preset);

    if (current.length > 0 && currentHeight + itemHeight > PAGE_CONTENT_HEIGHT) {
      pages.push(current);
      current = [item];
      currentHeight = itemHeight;
    } else {
      current.push(item);
      currentHeight += itemHeight;
    }
  }

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

/**
 * 어댑터에서 estimatedHeightPx가 미리 계산되어 있으면 그것을 우선 사용.
 * 없으면 estimateQuestionHeight로 즉석 계산.
 */
export function estimateItemHeight(item: NormalizedItem, preset: PrintOptionsInput): number {
  if (item.estimatedHeightPx != null) return item.estimatedHeightPx;

  if (item.kind === 'CONCEPT_DOC') {
    // 개념 문서: 마크다운 길이 기반 단순 추정
    const len = item.documentMarkdown?.length ?? 0;
    return Math.max(200, Math.ceil(len / 40) * 24 + 80);
  }

  return estimateQuestionHeight({
    contentMarkdown: item.questionContent ?? '',
    choices: item.choices,
    choiceColumns: item.choiceColumns,
    template: preset.template,
    columns: preset.columns,
    spacing: preset.spacing,
    answerSpace: item.answerSpace,
  });
}
