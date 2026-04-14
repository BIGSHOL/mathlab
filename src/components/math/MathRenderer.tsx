'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { parseBoxCols, resolveCols, DEFAULT_BOX_COLS } from '@/lib/utils/box-grid';

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

export function MathRenderer({ content, className = '', inline, diagramSvgs, onDiagramClick }: MathRendererProps) {
  // [그림] / [그림1] / [그림2] 플레이스홀더를 diagramSvgs의 인라인 SVG로 교체
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

  // LLM 출력에서 많이 쓰이는 \(\), \[\] 형태를 $와 $$로 교체
  svgReplacedContent = svgReplacedContent
    .replace(/\\\([\s\S]*?\\\)/g, (match, p1) => `$${p1}$`)
    .replace(/\\\[[\s\S]*?\\\]/g, (match, p1) => `$$$${p1}$$$$`);

  // 인접 인라인 수식 글루 복원: "$A$$B$" → "$A$ $B$"
  // DB에 공백 없이 붙은 두 inline이 저장된 경우, $$가 block 구분자로 오인되어 파싱 실패.
  // A, B 모두 단일 줄 / $ 미포함일 때만 분리. 여러 번 반복 적용하여 연쇄 케이스 대응.
  for (let i = 0; i < 5; i++) {
    const next = svgReplacedContent.replace(
      /\$([^$\n]+)\$\$([^$\n]+)\$/g,
      (_m, a, b) => `$${a}$ $${b}$`,
    );
    if (next === svgReplacedContent) break;
    svgReplacedContent = next;
  }

  // 인라인 $...$ 안에 multi-line 환경(\begin{cases|align|array|matrix|pmatrix|bmatrix|vmatrix|split|gather})이
  // 들어있으면 블록 수식 $$...$$로 자동 승격 (KaTeX가 인라인에서 제대로 렌더 못함)
  // ⚠️ 이미 $$...$$ 인 부분은 건드리지 않도록 앞/뒤에 $가 없어야 함 (negative lookbehind/ahead)
  const MULTILINE_ENV = /\\begin\{(cases|align|aligned|array|matrix|pmatrix|bmatrix|vmatrix|split|gather|gathered)\}/;
  svgReplacedContent = svgReplacedContent.replace(
    /(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+?)(?<!\$)\$(?!\$)/g,
    (match, inner) => (MULTILINE_ENV.test(inner) ? `$$${inner}$$` : match),
  );

  // 인라인 수식($...$) 내 \dfrac → \frac 변환 + KaTeX 미지원 유니코드 기호 치환
  // \dfrac은 displaystyle 강제로 분수가 거대해짐. \frac은 인라인에서 자연스러운 크기
  // ℃, ℉, Ω, Å 등 KaTeX Main-Regular에 없는 문자는 LaTeX 명령어로 변환
  const UNICODE_MATH_MAP: Array<[RegExp, string]> = [
    [/℃/g, '{}^\\circ\\mathrm{C}'],
    [/℉/g, '{}^\\circ\\mathrm{F}'],
    [/Ω/g, '\\Omega'],
    [/Å/g, '\\mathrm{\\AA}'],
    [/㎡/g, '\\mathrm{m}^2'],
    [/㎥/g, '\\mathrm{m}^3'],
    [/㎝/g, '\\mathrm{cm}'],
    [/㎜/g, '\\mathrm{mm}'],
    [/㎞/g, '\\mathrm{km}'],
    [/㎏/g, '\\mathrm{kg}'],
  ];
  svgReplacedContent = svgReplacedContent.replace(
    /\$(?!\$)((?:[^$\\]|\\.)*)\$/g,
    (match, inner) => {
      let fixed = inner.replace(/\\dfrac(?![a-zA-Z])/g, '\\frac');
      for (const [re, repl] of UNICODE_MATH_MAP) fixed = fixed.replace(re, repl);
      return `$${fixed}$`;
    }
  );
  // 블록 수식($$...$$)도 동일 처리
  svgReplacedContent = svgReplacedContent.replace(
    /\$\$([\s\S]*?)\$\$/g,
    (_m, inner) => {
      let fixed = inner;
      for (const [re, repl] of UNICODE_MATH_MAP) fixed = fixed.replace(re, repl);
      return `$$${fixed}$$`;
    }
  );

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
      className={inline ? className : `prose prose-slate max-w-none prose-p:my-2 prose-headings:my-3 ${className}`}
      onClick={onDiagramClick ? (e) => {
        const el = (e.target as HTMLElement).closest('[data-diagram-idx]');
        if (el) {
          e.stopPropagation();
          onDiagramClick(parseInt(el.getAttribute('data-diagram-idx')!));
        }
      } : undefined}
    >
      <style jsx global>{`
        /* 인라인 수식을 원자적 단위로 — 등호/답 부분이 줄 끝에서 분리되지 않도록 */
        .katex {
          display: inline-block;
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
        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
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
            const effectiveCols = resolveCols(parsedCols ?? DEFAULT_BOX_COLS, items.length);

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
          img: ({ src, alt, title }) => {
            // src가 비어있으면 렌더링하지 않음 (콘솔 에러 방지)
            if (!src) return <span className="text-slate-400 text-sm">[{alt || '이미지'}]</span>;
            const { width, align } = parseImageTitle(title ?? undefined);
            const style: React.CSSProperties = {};
            if (width) style.width = width;
            if (!width) style.maxWidth = '100%';

            if (align === 'left') {
              return (
                <img
                  src={src}
                  alt={alt || ''}
                  style={style}
                  className="float-left mr-4 mb-2 rounded-sm"
                />
              );
            }

            if (align === 'right') {
              return (
                <img
                  src={src}
                  alt={alt || ''}
                  style={style}
                  className="float-right ml-4 mb-2 rounded-sm"
                />
              );
            }

            // center (기본값)
            return (
              <span className="flex justify-center my-2">
                <img
                  src={src}
                  alt={alt || ''}
                  style={style}
                  className="rounded-sm"
                />
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
