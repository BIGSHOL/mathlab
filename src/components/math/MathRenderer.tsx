'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { parseBoxCols, resolveCols } from '@/lib/utils/box-grid';
import { parseImageTitle as sharedParseImageTitle, preprocessMathText } from './shared/text-preprocess';

interface MathOccurrence {
  latex: string;
  start: number;
  end: number;
}

/** 원본 source에서 모든 $...$ / $$...$$ 위치/latex를 순서대로 수집 */
function collectMathOccurrences(source: string): MathOccurrence[] {
  const result: MathOccurrence[] = [];
  let i = 0;
  while (i < source.length) {
    if (source[i] === '$' && source[i + 1] === '$') {
      const end = source.indexOf('$$', i + 2);
      if (end !== -1) {
        result.push({ latex: source.slice(i + 2, end), start: i, end: end + 2 });
        i = end + 2;
        continue;
      }
    }
    if (source[i] === '$' && source[i + 1] !== '$' && (i === 0 || source[i - 1] !== '$')) {
      let j = i + 1;
      while (j < source.length && source[j] !== '\n' && !(source[j] === '$' && source[j - 1] !== '\\' && source[j + 1] !== '$')) {
        j++;
      }
      if (j < source.length && source[j] === '$') {
        result.push({ latex: source.slice(i + 1, j), start: i, end: j + 1 });
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return result;
}

/**
 * rehype 플러그인: KaTeX 출력 노드 (span.katex / span.katex-display)를 순서대로 찾아
 * 미리 수집한 math 위치/latex로 data-math-* 속성을 부여.
 * 클릭 위임용 (data-math-latex / data-math-start / data-math-end).
 */
function rehypeMathPositions(occurrences: MathOccurrence[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    let idx = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (node: any) => {
      if (!node) return;
      if (node.type === 'element' && node.tagName === 'span' && Array.isArray(node.properties?.className)) {
        const cls: string[] = node.properties.className;
        if (cls.includes('katex') || cls.includes('katex-display')) {
          const occ = occurrences[idx++];
          if (occ) {
            node.properties['data-math-latex'] = occ.latex;
            node.properties['data-math-start'] = String(occ.start);
            node.properties['data-math-end'] = String(occ.end);
            node.properties.className = [...cls, 'editable-math'];
          }
          return; // .katex 내부는 더 들어가지 않음 (중첩 .katex 없음)
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}

interface DiagramSvgItem {
  svg: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  size?: 'small' | 'medium' | 'large' | 'full';
}

interface MathRendererProps {
  content: string;
  className?: string;
  /** true이면 블록(<div>) 대신 인라인(<span>) 렌더링 — 빈칸 템플릿 등에서 사용 */
  inline?: boolean;
  diagramSvgs?: DiagramSvgItem[];
  onDiagramClick?: (idx: number) => void;
  /** 수식 클릭 시 호출. latex/start/end는 원본 content 기준 좌표 */
  onMathClick?: (latex: string, start: number, end: number) => void;
  /** 이미지 클릭 시 호출 — 편집용 */
  onImageClick?: (info: { src: string; alt: string; title: string; start: number; end: number }) => void;
}

const parseImageTitle = sharedParseImageTitle;

export function MathRenderer({ content, className = '', inline, diagramSvgs, onDiagramClick, onMathClick, onImageClick }: MathRendererProps) {
  // onMathClick 모드: 원본 content에서 math 위치 사전 수집 (rehype 플러그인이 사용)
  const mathOccurrences = React.useMemo(
    () => (onMathClick ? collectMathOccurrences(content) : []),
    [onMathClick, content],
  );
  const mathPositionsPlugin = React.useMemo(
    () => (onMathClick ? rehypeMathPositions(mathOccurrences) : null),
    [onMathClick, mathOccurrences],
  );
  let svgReplacedContent = content;
  if (diagramSvgs && diagramSvgs.length > 0) {
    // SVG 교체 헬퍼: blockquote(>) 안이면 인라인, 밖이면 블록
    let svgIdx = 0;
    const SIZE_STYLE: Record<string, string> = {
      small: 'max-width:160px',
      medium: 'max-width:280px',
      large: 'max-width:400px',
      full: 'width:100%',
    };
    const replaceSvg = (fullMatch: string, svg: string, input: string, offset: number, idx?: number) => {
      const dIdx = idx ?? svgIdx++;
      const item = diagramSvgs![dIdx];
      const clickAttr = onDiagramClick ? ` data-diagram-idx="${dIdx}" style="cursor:pointer"` : '';
      const align = item?.align;
      const alignClass = align === 'center' ? ' diagram-align-center' : align === 'right' ? ' diagram-align-right' : '';
      const sizeStyle = SIZE_STYLE[item?.size || 'full'] || SIZE_STYLE.full;
      // offset 이전의 마지막 줄이 '>'로 시작하면 blockquote 안
      const before = input.substring(0, offset);
      const lastNewline = before.lastIndexOf('\n');
      const currentLine = before.substring(lastNewline + 1);
      const inBlockquote = currentLine.trimStart().startsWith('>');
      if (inBlockquote) {
        const singleLineSvg = svg.replace(/\n\s*/g, '');
        return `<span class="diagram-svg-inline-bq${alignClass}"${clickAttr}>${singleLineSvg}</span>`;
      }
      return `\n\n<div class="diagram-svg-inline${alignClass}" style="${sizeStyle}"${clickAttr}>${svg}</div>\n\n`;
    };

    // [그림N] → N번째(0-indexed) SVG로 교체
    svgReplacedContent = svgReplacedContent.replace(
      /\[그림(\d+)\]/g,
      (match, numStr, offset, input) => {
        const idx = parseInt(numStr) - 1;
        if (idx >= 0 && idx < diagramSvgs!.length) {
          return replaceSvg(match, diagramSvgs![idx].svg, input, offset, idx);
        }
        return match;
      }
    );
    // [그림] (번호 없음) → 순서대로 교체
    let nextIdx = 0;
    svgReplacedContent = svgReplacedContent.replace(
      /\[그림\](?!\d)/g,
      (match, offset, input) => {
        if (nextIdx < diagramSvgs!.length) {
          const svg = diagramSvgs![nextIdx].svg;
          nextIdx++;
          return replaceSvg(match, svg, input, offset);
        }
        return match;
      }
    );
  }

  // onMathClick 미사용 시에만 preprocessMathText 적용 (좌표 보존이 우선이라 wrap 모드는 스킵)
  if (!onMathClick) {
    svgReplacedContent = preprocessMathText(svgReplacedContent);
  }

  // [한글 설명] 패턴을 스타일링된 HTML 플레이스홀더로 변환
  // 단, 마크다운 이미지 ![alt](url), 수학 구간 표기 [-2, 4], 보기 항목은 제외
  const processedContent = svgReplacedContent.replace(
    /(?<!!)\[([가-힣\s\d/,×÷+\-a-zA-Z]+)\](?!\()/g,
    (match, desc) => {
      // 보기 항목(ㄱ,ㄴ,ㄷ)이나 그림 번호는 제외
      if (/^[ㄱ-ㅎ]/.test(desc) || /^그림/.test(desc)) return match;
      // 수학 구간 표기 제외: 숫자/부호/공백/콤마만으로 이루어진 경우 (예: -2, 4 / 0, 5)
      if (/^[\s\d.,+\-−/]+$/.test(desc)) return match;
      return `<span class="diagram-placeholder">${desc}</span>`;
    }
  );

  const Tag = inline ? 'span' : 'div';

  return (
    <Tag
      className={`${inline ? className : `prose prose-slate max-w-none prose-p:my-2 prose-headings:my-3 ${className}`}${onMathClick ? ' math-clickable' : ''}`}
      onClick={(onDiagramClick || onMathClick) ? (e) => {
        const target = e.target as HTMLElement;
        if (onMathClick) {
          // KaTeX 출력은 .editable-math 안에 .katex 등으로 들어가므로 closest로 찾음
          const mathEl = target.closest('[data-math-latex]');
          if (mathEl) {
            e.stopPropagation();
            onMathClick(
              mathEl.getAttribute('data-math-latex') || '',
              Number(mathEl.getAttribute('data-math-start')),
              Number(mathEl.getAttribute('data-math-end')),
            );
            return;
          }
        }
        if (onDiagramClick) {
          const el = target.closest('[data-diagram-idx]');
          if (el) {
            e.stopPropagation();
            onDiagramClick(parseInt(el.getAttribute('data-diagram-idx')!));
          }
        }
      } : undefined}
    >
      <style jsx global>{`
        /* 인라인 수식을 원자적 단위로 — 등호/답 부분이 줄 끝에서 분리되지 않도록 */
        .katex {
          display: inline-block;
        }
        /* 편집 가능한 수식 — onMathClick 활성 시에만 cursor/hover 표시 */
        .math-clickable .editable-math {
          cursor: pointer;
          border-radius: 3px;
          transition: background-color 0.15s, box-shadow 0.15s;
        }
        .math-clickable .editable-math:hover {
          background-color: rgba(59, 130, 246, 0.1);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
        }
        /* SVG 다이어그램 인라인 렌더링 */
        .diagram-svg-inline {
          display: inline-block;
          vertical-align: middle;
        }
        .diagram-svg-inline svg {
          max-width: 100%;
          height: auto;
        }
        /* 도형 정렬 */
        .diagram-align-center {
          display: block;
          text-align: center;
        }
        .diagram-align-right {
          display: block;
          text-align: right;
        }
        /* blockquote 안 인라인 SVG */
        .diagram-svg-inline-bq {
          display: inline-block;
          vertical-align: middle;
          margin-left: 8px;
        }
        .diagram-svg-inline-bq svg {
          max-height: 80px;
          width: auto;
        }
        /* 도형 설명 플레이스홀더 박스 */
        .diagram-placeholder {
          display: inline-block;
          background: #F1F5F9;
          border: 1px dashed #94A3B8;
          border-radius: 6px;
          padding: 4px 10px;
          margin: 2px 4px;
          color: #64748B;
          font-size: 0.85em;
          vertical-align: middle;
        }
        .katex-display {
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0.5em 0;
        }
        /* 세로셈(세로 연산) 스타일 */
        .katex .arraycolsep {
          width: 0.2em !important;
        }
        .katex .vertical-separator {
          width: 0 !important;
        }
        .katex-display > .katex {
          text-align: left;
        }
        /* prose-invert 모드: 다크 배경에서 KaTeX 수식/텍스트를 밝게 */
        .prose-invert .katex {
          color: inherit;
        }
        .prose-invert p,
        .prose-invert span {
          color: inherit;
        }
        /* 마크다운 테이블 스타일 */
        .prose table {
          border-collapse: collapse;
          margin: 0.75rem 0;
          font-size: 0.9em;
        }
        .prose table th,
        .prose table td {
          border: 1px solid #CBD5E1;
          padding: 0.35rem 0.75rem;
          text-align: center;
        }
        .prose table th {
          background: #F1F5F9;
          font-weight: 600;
        }
        .prose table tr:nth-child(even) {
          background: #F8FAFC;
        }
        /* 인쇄 시 수식이 너무 길면 크기 축소 */
        @media print {
          .katex {
            font-size: 0.95em !important;
          }
          .katex-display {
            overflow: visible !important;
          }
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeKatex, { strict: false }],
          ...(mathPositionsPlugin ? [() => mathPositionsPlugin] : []),
        ]}
        components={{
          p: inline
            ? ({ children }) => <span>{children}</span>
            : ({ children, ...props }) => {
              // 자식이 img만인 경우 div로 감싸기 (블록 레이아웃)
              const childArray = React.Children.toArray(children);
              const hasOnlyImage = childArray.length === 1
                && React.isValidElement(childArray[0])
                && (childArray[0] as React.ReactElement<{ src?: string }>).props?.src;
              if (hasOnlyImage) {
                return <div className="my-2">{children}</div>;
              }
              return (
                <p className="text-inherit mb-2 last:mb-0" style={{ lineHeight: '1.8' }} {...props}>
                  {children}
                </p>
              );
            },
          blockquote: ({ children }) => {
            // React 엘리먼트에서 텍스트 재귀 추출
            const extractText = (node: React.ReactNode): string => {
              if (typeof node === 'string') return node;
              if (typeof node === 'number') return String(node);
              if (React.isValidElement(node)) {
                const props = node.props as Record<string, unknown>;
                if (props.children) return React.Children.toArray(props.children as React.ReactNode).map(extractText).join('');
              }
              return '';
            };

            // 모든 children을 flat하게 줄 단위로 분리
            const lines: { nodes: React.ReactNode[]; text: string }[] = [];
            const splitByBr = (inner: React.ReactNode): boolean => {
              // children 중 <br>이 있으면 분리, 없으면 false 반환
              let hasBr = false;
              let current: React.ReactNode[] = [];
              React.Children.forEach(inner, (c) => {
                if (React.isValidElement(c) && c.type === 'br') {
                  hasBr = true;
                  if (current.length > 0) {
                    const text = current.map(extractText).join('');
                    lines.push({ nodes: [...current], text });
                  }
                  current = [];
                } else {
                  current.push(c);
                }
              });
              if (hasBr && current.length > 0) {
                const text = current.map(extractText).join('');
                lines.push({ nodes: [...current], text });
              }
              return hasBr;
            };
            const flattenP = (child: React.ReactNode) => {
              if (!React.isValidElement(child)) {
                if (child != null) lines.push({ nodes: [child], text: String(child) });
                return;
              }
              const props = child.props as Record<string, unknown>;
              // 커스텀 컴포넌트든 기본 HTML이든 children에서 <br> 기준으로 분리 시도
              if (props.children) {
                if (!splitByBr(props.children as React.ReactNode)) {
                  // <br>이 없으면 통째로 한 줄
                  lines.push({ nodes: [child], text: extractText(child) });
                }
              } else {
                lines.push({ nodes: [child], text: extractText(child) });
              }
            };
            React.Children.forEach(children, flattenP);



            // <보기> 등 제목 줄과 항목 분리, cols 마커 파싱
            const header: React.ReactNode[][] = [];
            const items: React.ReactNode[][] = [];
            let parsedCols = parseBoxCols('');
            for (const line of lines) {
              const maybeCols = parseBoxCols(line.text);
              if (maybeCols !== null && parsedCols === null) parsedCols = maybeCols;
              if (items.length === 0 && (line.text.includes('보기') || line.text.trim() === '')) {
                // 마커가 있는 헤더는 마커를 제거한 "보기" 텍스트로 대체
                if (maybeCols !== null) {
                  header.push([<strong key="hdr">&lt;보기&gt;</strong>]);
                } else {
                  header.push(line.nodes);
                }
              } else {
                items.push(line.nodes);
              }
            }
            // <보기> 마커가 있을 때만 그리드 적용. 없으면 1열(계산식 등 일반 blockquote 보호)
            const effectiveCols = parsedCols !== null ? resolveCols(parsedCols, items.length) : 1;

            return (
              <div className="border border-slate-300 px-5 py-3 my-3 rounded-md bg-slate-50 text-slate-900 not-italic w-fit max-w-full">
                {header.map((h, i) => <div key={`h-${i}`}>{h}</div>)}
                {items.length > 0 && (() => {
                  const colsClass = effectiveCols === 3 ? 'grid-cols-3' : effectiveCols === 2 ? 'grid-cols-2' : 'grid-cols-1';
                  const gridClass = items.length >= 2 ? `grid ${colsClass} gap-x-6 gap-y-1` : '';
                  return (
                    <div className={gridClass}>
                      {items.map((item, i) => (
                        <div key={`i-${i}`}>{item}</div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          },
          img: ({ src: rawSrc, alt, title }) => {
            const src = typeof rawSrc === 'string' ? rawSrc : '';
            // src가 비어있으면 렌더링하지 않음 (콘솔 에러 방지)
            if (!src) return <span className="text-slate-400 text-sm">[{alt || '이미지'}]</span>;
            const { width, align } = parseImageTitle(title ?? undefined);
            const style: React.CSSProperties = {};
            if (width) style.width = width;
            if (!width) style.maxWidth = '100%';

            const clickable = !!onImageClick;
            const handleImgClick = (e: React.MouseEvent<HTMLImageElement>) => {
              if (!onImageClick) return;
              e.preventDefault();
              e.stopPropagation();
              // 원본 content에서 해당 이미지 마크다운 위치 찾기
              const imgRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
              let m: RegExpExecArray | null;
              while ((m = imgRegex.exec(content)) !== null) {
                if (m[2] === src && (m[1] || '') === (alt || '') && (m[3] || '') === (title || '')) {
                  onImageClick({ src, alt: alt || '', title: title || '', start: m.index, end: m.index + m[0].length });
                  return;
                }
              }
              // 못 찾으면 최소 정보만 전달 (첫 매치로 폴백)
              imgRegex.lastIndex = 0;
              const first = imgRegex.exec(content);
              if (first) {
                onImageClick({ src, alt: alt || '', title: title || '', start: first.index, end: first.index + first[0].length });
              }
            };
            const imgClass = (base: string) => `${base}${clickable ? ' cursor-pointer hover:ring-2 hover:ring-primary/40 transition-shadow' : ''}`;

            if (align === 'left') {
              return <img src={src} alt={alt || ''} style={style} onClick={handleImgClick} className={imgClass('float-left mr-4 mb-2 rounded-sm')} />;
            }
            if (align === 'right') {
              return <img src={src} alt={alt || ''} style={style} onClick={handleImgClick} className={imgClass('float-right ml-4 mb-2 rounded-sm')} />;
            }
            return (
              <span className="flex justify-center my-2">
                <img src={src} alt={alt || ''} style={style} onClick={handleImgClick} className={imgClass('rounded-sm')} />
              </span>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </Tag>
  );
}
