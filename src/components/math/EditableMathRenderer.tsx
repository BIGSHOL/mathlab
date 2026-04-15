'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import { parseBoxCols, resolveCols, DEFAULT_BOX_COLS } from '@/lib/utils/box-grid';
import {
  decodeHtmlEntities as sharedDecodeHtmlEntities,
  parseImageTitle as sharedParseImageTitle,
  preprocessMathText,
} from './shared/text-preprocess';

interface Segment {
  type: 'text' | 'math' | 'image' | 'blank';
  text: string;
  latex?: string;
  html?: string;
  start: number;
  end: number;
  src?: string;
  alt?: string;
  width?: string;
  align?: string;
  blankPosition?: number;
}

interface DiagramSvgItem {
  svg: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  size?: 'small' | 'medium' | 'large' | 'full';
}

interface EditableMathRendererProps {
  content: string;
  onMathClick?: (latex: string, start: number, end: number) => void;
  onDiagramClick?: (idx: number) => void;
  onBlankClick?: (position: number) => void;
  className?: string;
  diagramSvgs?: DiagramSvgItem[];
}

const decodeHtmlEntities = sharedDecodeHtmlEntities;
const parseImageTitle = sharedParseImageTitle;

/** 원본 content에서 blockquote (> 또는 >) 줄의 문자 범위 계산 */
function computeBlockquoteRanges(content: string): [number, number][] {
  const ranges: [number, number][] = [];
  let pos = 0;
  for (const line of content.split('\n')) {
    const nextPos = pos + line.length + 1;
    const trimmed = line.trimStart();
    // '> ...' 또는 빈 '>' (continuation)도 블록인용으로 인식
    if (trimmed.startsWith('> ') || trimmed === '>') {
      if (ranges.length > 0 && ranges[ranges.length - 1][1] >= pos) {
        ranges[ranges.length - 1][1] = nextPos;
      } else {
        ranges.push([pos, nextPos]);
      }
    }
    pos = nextPos;
  }
  return ranges;
}

/**
 * MathRenderer의 편집 모드 버전.
 * $...$ 수식을 클릭하면 onMathClick 콜백을 호출하여 수식 편집기를 열 수 있다.
 * > blockquote와 ![alt](src) 이미지도 지원.
 */
export function EditableMathRenderer({
  content,
  onMathClick,
  onDiagramClick,
  onBlankClick,
  className = '',
  diagramSvgs,
}: EditableMathRendererProps) {
  // 공유 수식 전처리 (\(\)→$, \dfrac→\frac, $A$$B$ 글루 등) — MathRenderer와 동일 입력 보장
  const preprocessed = useMemo(() => preprocessMathText(content), [content]);

  const segments = useMemo(() => {
    const result: Segment[] = [];
    // 이미지, 수식, 빈칸 마커를 모두 파싱
    const combinedRegex = /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)|\$([^$]+)\$|\{\{(\d+)\}\}/g;
    let lastEnd = 0;
    let match;

    while ((match = combinedRegex.exec(preprocessed)) !== null) {
      if (match.index > lastEnd) {
        result.push({
          type: 'text',
          text: preprocessed.slice(lastEnd, match.index),
          start: lastEnd,
          end: match.index,
        });
      }

      if (match[5] !== undefined) {
        // {{N}} 빈칸 마커
        result.push({
          type: 'blank',
          text: match[0],
          blankPosition: parseInt(match[5], 10),
          start: match.index,
          end: match.index + match[0].length,
        });
      } else if (match[4] !== undefined) {
        let html: string;
        try {
          html = katex.renderToString(match[4], {
            throwOnError: false,
            output: 'html',
            strict: false,
          });
        } catch {
          html = `<span>${match[0]}</span>`;
        }
        result.push({
          type: 'math',
          text: match[0],
          latex: match[4],
          html,
          start: match.index,
          end: match.index + match[0].length,
        });
      } else {
        const { width, align } = parseImageTitle(match[3]);
        result.push({
          type: 'image',
          text: match[0],
          alt: match[1],
          src: match[2],
          width,
          align,
          start: match.index,
          end: match.index + match[0].length,
        });
      }

      lastEnd = match.index + match[0].length;
    }

    if (lastEnd < preprocessed.length) {
      result.push({
        type: 'text',
        text: preprocessed.slice(lastEnd),
        start: lastEnd,
        end: preprocessed.length,
      });
    }

    return result;
  }, [preprocessed]);

  // blockquote 범위 계산 (줄 단위)
  const bqRanges = useMemo(() => computeBlockquoteRanges(preprocessed), [preprocessed]);
  const isInBq = (pos: number) => bqRanges.some(([s, e]) => pos >= s && pos < e);

  // 텍스트 세그먼트가 blockquote 경계를 넘으면 분할
  const splitSegments = useMemo(() => {
    const result: Segment[] = [];
    for (const seg of segments) {
      if (seg.type !== 'text') { result.push(seg); continue; }
      // 이 세그먼트 범위 안에 있는 BQ 경계 수집
      const boundaries: number[] = [];
      for (const [bqStart, bqEnd] of bqRanges) {
        if (bqStart > seg.start && bqStart < seg.end) boundaries.push(bqStart);
        if (bqEnd > seg.start && bqEnd < seg.end) boundaries.push(bqEnd);
      }
      if (boundaries.length === 0) { result.push(seg); continue; }
      const sorted = [...new Set(boundaries)].sort((a, b) => a - b);
      let pos = seg.start;
      for (const boundary of sorted) {
        if (boundary > pos) {
          result.push({ type: 'text', text: preprocessed.slice(pos, boundary), start: pos, end: boundary });
        }
        pos = boundary;
      }
      if (pos < seg.end) {
        result.push({ type: 'text', text: preprocessed.slice(pos, seg.end), start: pos, end: seg.end });
      }
    }
    return result;
  }, [segments, bqRanges, preprocessed]);

  // 세그먼트를 blockquote/normal 블록으로 그룹화
  const blocks = useMemo(() => {
    const result: { inBq: boolean; segs: Segment[] }[] = [];
    for (const seg of splitSegments) {
      const bq = isInBq(seg.start);
      const last = result[result.length - 1];
      if (last && last.inBq === bq) {
        last.segs.push(seg);
      } else {
        result.push({ inBq: bq, segs: [seg] });
      }
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitSegments, bqRanges]);

  /** 텍스트 내 **bold** 마크다운을 <strong>으로 변환 */
  const renderTextWithBold = (text: string, keyPrefix: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
      }
      return <React.Fragment key={`${keyPrefix}-t${i}`}>{part}</React.Fragment>;
    });
  };

  // [그림] / [그림N] 플레이스홀더를 SVG로 교체하는 헬퍼
  const diagramIdxRef = React.useRef(0);
  // 렌더 시작 시 인덱스 리셋
  diagramIdxRef.current = 0;

  const renderTextWithDiagrams = (text: string, keyPrefix: string) => {
    if (!diagramSvgs || diagramSvgs.length === 0) {
      return renderTextWithBold(text, keyPrefix);
    }
    // [그림] 또는 [그림N] 패턴 분리
    const parts = text.split(/(\[그림\d*\])/g);
    return parts.map((part, i) => {
      const numMatch = part.match(/^\[그림(\d*)\]$/);
      if (numMatch) {
        let idx: number;
        if (numMatch[1]) {
          idx = parseInt(numMatch[1]) - 1;
        } else {
          idx = diagramIdxRef.current++;
        }
        if (idx >= 0 && idx < diagramSvgs!.length) {
          const item = diagramSvgs![idx];
          const sizeMap: Record<string, string> = { small: '160px', medium: '280px', large: '400px' };
          const maxW = sizeMap[item.size || ''] || undefined;
          return (
            <span
              key={`${keyPrefix}-svg${i}`}
              className={`diagram-svg-inline inline-block align-middle rounded transition-all${onDiagramClick ? ' cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1' : ''}`}
              style={maxW ? { maxWidth: maxW } : undefined}
              onClick={onDiagramClick ? (e) => { e.stopPropagation(); onDiagramClick(idx); } : undefined}
              title={onDiagramClick ? '클릭하여 도형 편집' : undefined}
              dangerouslySetInnerHTML={{ __html: item.svg }}
            />
          );
        }
      }
      return <React.Fragment key={`${keyPrefix}-d${i}`}>{renderTextWithBold(part, `${keyPrefix}-d${i}`)}</React.Fragment>;
    });
  };

  const renderSegment = (seg: Segment, key: string) => {
    if (seg.type === 'blank') {
      return (
        <span
          key={key}
          className={`inline-flex items-center mx-0.5 px-1.5 py-0.5 bg-amber-200/80 text-amber-900 rounded-sm text-xs font-bold${onBlankClick ? ' cursor-pointer hover:bg-amber-300/80 transition-colors' : ''}`}
          onClick={onBlankClick ? () => onBlankClick(seg.blankPosition!) : undefined}
          title={onBlankClick ? `빈칸 ${seg.blankPosition} 편집` : undefined}
        >
          {`{{${seg.blankPosition}}}`}
        </span>
      );
    }

    if (seg.type === 'text') {
      // blockquote 마커 제거하되 줄바꿈은 보존 (white-space: pre-line이 렌더링)
      const display = seg.text
        .split('\n')
        .map((line) => {
          const trimmed = line.trimStart();
          if (trimmed === '>') return '';
          if (trimmed.startsWith('> ')) return trimmed.slice(2);
          return line;
        })
        .join('\n')
        // 마크다운 백슬래시 이스케이프 해제 (\< → <, \> → > 등)
        .replace(/\\([<>\\*_`~\[\](){}#.!|+\-])/g, '$1');
      const decoded = decodeHtmlEntities(display);
      return <React.Fragment key={key}>{renderTextWithDiagrams(decoded, key)}</React.Fragment>;
    }

    if (seg.type === 'image') {
      const style: React.CSSProperties = {};
      if (seg.width) style.width = seg.width;
      if (!seg.width) style.maxWidth = '100%';
      const imgEl = (
        <img
          src={seg.src}
          alt={seg.alt || ''}
          style={style}
          className="rounded-sm inline-block"
        />
      );
      if (seg.align === 'center' || !seg.align) {
        return (
          <span key={key} className="flex justify-center my-2">
            {imgEl}
          </span>
        );
      }
      return <span key={key} className="my-1 inline-block">{imgEl}</span>;
    }

    // Math segment
    if (onMathClick && seg.latex !== undefined) {
      return (
        <span
          key={key}
          className="cursor-pointer hover:bg-blue-100 rounded-sm px-0.5 -mx-0.5 transition-colors"
          onClick={() => onMathClick(seg.latex!, seg.start, seg.end)}
          title="클릭하여 수식 편집"
          dangerouslySetInnerHTML={{ __html: seg.html! }}
        />
      );
    }

    return (
      <span
        key={key}
        dangerouslySetInnerHTML={{ __html: seg.html! }}
      />
    );
  };

  // non-blockquote 블록을 \n 기준으로 단락 분리 — MathRenderer의 <p> 간격과 일치시킴
  const renderNormalBlock = (segs: Segment[], blockKey: number) => {
    const paragraphs: Segment[][] = [[]];
    for (const seg of segs) {
      if (seg.type !== 'text') {
        paragraphs[paragraphs.length - 1].push(seg);
        continue;
      }
      // 텍스트 세그먼트 안에서 \n 으로 단락 분리
      const parts = seg.text.split('\n');
      parts.forEach((part, pi) => {
        if (pi > 0) paragraphs.push([]); // 새 단락
        if (part) {
          paragraphs[paragraphs.length - 1].push({
            ...seg,
            text: part,
          });
        }
      });
    }
    // 빈 단락 제거
    const filtered = paragraphs.filter((p) => p.length > 0);
    if (filtered.length <= 1) {
      return <React.Fragment key={blockKey}>{segs.map((seg, si) => renderSegment(seg, `${blockKey}-${si}`))}</React.Fragment>;
    }
    return filtered.map((pSegs, pi) => (
      <p key={`${blockKey}-p${pi}`} className="mb-2 last:mb-0" style={{ lineHeight: '1.8' }}>
        {pSegs.map((seg, si) => renderSegment(seg, `${blockKey}-p${pi}-${si}`))}
      </p>
    ));
  };

  return (
    <div className={`text-slate-800 ${className}`}>
      {blocks.map((block, bi) => {
        if (block.inBq) {
          // 세그먼트를 줄 단위로 분할 — 텍스트 내 \n 기준
          const lines: React.ReactNode[][] = [[]];
          const lineTexts: string[] = [''];
          block.segs.forEach((seg, si) => {
            if (seg.type === 'text') {
              const display = decodeHtmlEntities(seg.text.replace(/^>\s?/gm, ''));
              const parts = display.split('\n');
              parts.forEach((part, pi) => {
                if (pi > 0) {
                  lines.push([]);
                  lineTexts.push('');
                }
                if (part) {
                  // 텍스트 세그먼트를 해당 줄로 추가 (bold/diagram 처리는 renderSegment 경유)
                  const fakeSeg: typeof seg = { ...seg, text: part };
                  lines[lines.length - 1].push(renderSegment(fakeSeg, `${bi}-${si}-${pi}`));
                  lineTexts[lineTexts.length - 1] += part;
                }
              });
            } else {
              lines[lines.length - 1].push(renderSegment(seg, `${bi}-${si}`));
              // 수식/빈칸은 텍스트 길이 추정 어려우니 자리 표시만
              lineTexts[lineTexts.length - 1] += '$';
            }
          });

          // 빈 줄 제거 (헤더 줄 "<보기>" 등은 보존)
          const nonEmpty = lines
            .map((line, i) => ({ line, text: lineTexts[i].trim() }))
            .filter(({ line, text }) => line.length > 0 || text.length > 0);

          // 헤더(보기 등) / 항목(ㄱ. ㄴ. ㄷ. ...) 분리 + cols 마커 파싱
          const itemPrefixRe = /^\s*[ㄱ-ㅎ①-⑮0-9]+[.)]/;
          const header: typeof nonEmpty = [];
          const items: typeof nonEmpty = [];
          let parsedCols = null as ReturnType<typeof parseBoxCols>;
          let itemMode = false;
          for (const row of nonEmpty) {
            const maybeCols = parseBoxCols(row.text);
            if (maybeCols !== null && parsedCols === null) parsedCols = maybeCols;
            if (!itemMode && !itemPrefixRe.test(row.text)) {
              header.push(row);
            } else {
              itemMode = true;
              items.push(row);
            }
          }

          const effectiveCols = resolveCols(parsedCols ?? DEFAULT_BOX_COLS, items.length);
          const colsClass = effectiveCols === 3 ? 'grid-cols-3' : effectiveCols === 2 ? 'grid-cols-2' : 'grid-cols-1';
          const gridClass = items.length >= 2
            ? `grid ${colsClass} gap-x-6 gap-y-1`
            : '';

          return (
            <div
              key={bi}
              className="border border-slate-300 px-6 py-3 my-2 rounded-md bg-slate-50 w-fit max-w-full"
            >
              {header.map(({ line, text }, i) => {
                // cols 마커가 포함된 헤더 줄은 "<보기>" 라벨로 대체
                if (/\\?<보기(?::cols=(?:auto|1|2|3))?\\?>/.test(text)) {
                  return <div key={`h-${i}`}><strong>&lt;보기&gt;</strong></div>;
                }
                return <div key={`h-${i}`}>{line}</div>;
              })}
              {items.length > 0 && (
                <div className={gridClass || undefined}>
                  {items.map(({ line }, i) => <div key={`i-${i}`}>{line}</div>)}
                </div>
              )}
            </div>
          );
        }
        return renderNormalBlock(block.segs, bi);
      })}
    </div>
  );
}
