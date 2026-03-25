'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

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
}

interface EditableMathRendererProps {
  content: string;
  onMathClick?: (latex: string, start: number, end: number) => void;
  onDiagramClick?: (idx: number) => void;
  onBlankClick?: (position: number) => void;
  className?: string;
  diagramSvgs?: DiagramSvgItem[];
}

function parseImageTitle(title: string | undefined): { width?: string; align?: string } {
  if (!title) return {};
  const parts = title.trim().split(/\s+/);
  let width: string | undefined;
  let align: string | undefined;
  for (const part of parts) {
    if (part.endsWith('%')) {
      const num = parseInt(part);
      if (num >= 10 && num <= 100) width = `${num}%`;
    } else if (['left', 'center', 'right'].includes(part)) {
      align = part;
    }
  }
  return { width, align };
}

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
  const segments = useMemo(() => {
    const result: Segment[] = [];
    // 이미지, 수식, 빈칸 마커를 모두 파싱
    const combinedRegex = /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)|\$([^$]+)\$|\{\{(\d+)\}\}/g;
    let lastEnd = 0;
    let match;

    while ((match = combinedRegex.exec(content)) !== null) {
      if (match.index > lastEnd) {
        result.push({
          type: 'text',
          text: content.slice(lastEnd, match.index),
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

    if (lastEnd < content.length) {
      result.push({
        type: 'text',
        text: content.slice(lastEnd),
        start: lastEnd,
        end: content.length,
      });
    }

    return result;
  }, [content]);

  // blockquote 범위 계산 (줄 단위)
  const bqRanges = useMemo(() => computeBlockquoteRanges(content), [content]);
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
          result.push({ type: 'text', text: content.slice(pos, boundary), start: pos, end: boundary });
        }
        pos = boundary;
      }
      if (pos < seg.end) {
        result.push({ type: 'text', text: content.slice(pos, seg.end), start: pos, end: seg.end });
      }
    }
    return result;
  }, [segments, bqRanges, content]);

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
          return (
            <span
              key={`${keyPrefix}-svg${i}`}
              className={`diagram-svg-inline inline-block align-middle rounded transition-all${onDiagramClick ? ' cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1' : ''}`}
              onClick={onDiagramClick ? (e) => { e.stopPropagation(); onDiagramClick(idx); } : undefined}
              title={onDiagramClick ? '클릭하여 도형 편집' : undefined}
              dangerouslySetInnerHTML={{ __html: diagramSvgs![idx].svg }}
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
      return <React.Fragment key={key}>{renderTextWithDiagrams(display, key)}</React.Fragment>;
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

  return (
    <div className={`leading-relaxed text-slate-800 ${className}`} style={{ whiteSpace: 'pre-line' }}>
      {blocks.map((block, bi) => {
        const inner = block.segs.map((seg, si) => renderSegment(seg, `${bi}-${si}`));
        if (block.inBq) {
          return (
            <div
              key={bi}
              className="border border-slate-300 px-6 py-3 my-2 rounded-md bg-slate-50 w-fit max-w-full"
            >
              {inner}
            </div>
          );
        }
        return <React.Fragment key={bi}>{inner}</React.Fragment>;
      })}
    </div>
  );
}
