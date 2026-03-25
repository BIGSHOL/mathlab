'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import katex from 'katex';

// ─── Public API ──────────────────────────────────────────────────
export interface HybridEditorHandle {
  /** 현재 커서 위치에 텍스트 삽입 */
  insertAtCursor: (text: string) => void;
  focus: () => void;
}

interface Props {
  content: string;
  onChange: (content: string) => void;
  onMathClick?: (latex: string, start: number, end: number) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 소스 마크다운 → contentEditable innerHTML */
function toHtml(src: string): string {
  if (!src) return '';
  const parts: string[] = [];
  // $$...$$ (블록 수식), $...$ (인라인 수식), **...** (볼드)
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\*\*[^*]+?\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src)) !== null) {
    if (m.index > last) {
      parts.push(esc(src.slice(last, m.index)).replace(/\n/g, '<br>'));
    }
    const tok = m[1];
    if (tok.startsWith('$$') && tok.endsWith('$$')) {
      const latex = tok.slice(2, -2);
      try {
        const html = katex.renderToString(latex, { throwOnError: false, displayMode: true, strict: false });
        parts.push(
          `<span contenteditable="false" data-latex="${escAttr(latex)}" data-display="1" ` +
          `class="inline-block my-1 cursor-pointer hover:bg-blue-50 rounded px-0.5 transition-colors align-middle">${html}</span>`
        );
      } catch { parts.push(esc(tok)); }
    } else if (tok.startsWith('$')) {
      const latex = tok.slice(1, -1);
      try {
        const html = katex.renderToString(latex, { throwOnError: false, output: 'html', strict: false });
        parts.push(
          `<span contenteditable="false" data-latex="${escAttr(latex)}" ` +
          `class="cursor-pointer hover:bg-blue-50 rounded px-0.5 transition-colors">${html}</span>`
        );
      } catch { parts.push(esc(tok)); }
    } else if (tok.startsWith('**')) {
      parts.push(`<strong>${esc(tok.slice(2, -2))}</strong>`);
    }
    last = m.index + m[0].length;
  }

  if (last < src.length) {
    parts.push(esc(src.slice(last)).replace(/\n/g, '<br>'));
  }
  return parts.join('');
}

/** contentEditable DOM → 소스 마크다운 */
function toSource(el: HTMLElement): string {
  let r = '';
  function walk(n: Node) {
    if (n.nodeType === Node.TEXT_NODE) {
      r += n.textContent ?? '';
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const e = n as HTMLElement;
      // 수식 span
      if (e.dataset.latex !== undefined) {
        const d = e.dataset.display === '1';
        r += d ? `$$${e.dataset.latex}$$` : `$${e.dataset.latex}$`;
        return;
      }
      // 볼드
      if (e.tagName === 'STRONG' || e.tagName === 'B') {
        r += '**';
        for (const c of Array.from(e.childNodes)) walk(c);
        r += '**';
        return;
      }
      // 줄바꿈
      if (e.tagName === 'BR') { r += '\n'; return; }
      // 블록 요소 (contentEditable이 Enter 시 div/p 생성)
      const isBlock = e.tagName === 'DIV' || e.tagName === 'P';
      if (isBlock && r.length > 0 && !r.endsWith('\n')) r += '\n';
      for (const c of Array.from(e.childNodes)) walk(c);
    }
  }
  for (const c of Array.from(el.childNodes)) walk(c);
  return r;
}

// ─── Component ───────────────────────────────────────────────────
export const HybridContentEditor = React.forwardRef<HybridEditorHandle, Props>(
  function HybridContentEditor(
    { content, onChange, onMathClick, className = '', disabled = false, placeholder = '' },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement>(null);
    const composing = useRef(false);
    const lastContent = useRef(content);
    const userEdit = useRef(false);

    // ── Imperative API ──
    React.useImperativeHandle(ref, () => ({
      insertAtCursor(text: string) {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        // execCommand은 deprecated이지만 contentEditable에서 커서 위치 삽입에 가장 안정적
        document.execCommand('insertText', false, text);
        sync();
      },
      focus() { editorRef.current?.focus(); },
    }));

    // ── innerHTML 설정 ──
    function setHtml(src: string) {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = toHtml(src) || '<br>';
    }

    // 마운트 시 초기 렌더링
    useEffect(() => { setHtml(content); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 외부에서 content가 변경될 때 (수식 편집 팝업 등)
    useEffect(() => {
      if (content !== lastContent.current && !userEdit.current) {
        setHtml(content);
        lastContent.current = content;
      }
      userEdit.current = false;
    }, [content]);

    // ── DOM → source 동기화 ──
    const sync = useCallback(() => {
      if (!editorRef.current) return;
      const s = toSource(editorRef.current);
      if (s !== lastContent.current) {
        lastContent.current = s;
        userEdit.current = true;
        onChange(s);
      }
    }, [onChange]);

    const handleInput = useCallback(() => {
      if (!composing.current) sync();
    }, [sync]);

    // ── 수식 클릭 ──
    const handleClick = useCallback((e: React.MouseEvent) => {
      if (!onMathClick || !editorRef.current) return;
      const target = (e.target as HTMLElement).closest('[data-latex]') as HTMLElement | null;
      if (!target) return;

      e.stopPropagation();
      const latex = target.dataset.latex!;
      const display = target.dataset.display === '1';
      const marker = display ? `$$${latex}$$` : `$${latex}$`;

      // DOM 순서로 몇 번째 수식인지 카운트
      const allMath = editorRef.current.querySelectorAll('[data-latex]');
      let idx = 0;
      for (const span of Array.from(allMath)) {
        if (span === target) break;
        idx++;
      }

      // source에서 해당 수식의 start/end 위치 찾기
      const src = lastContent.current;
      const mathRe = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;
      let mm: RegExpExecArray | null;
      let count = 0;
      while ((mm = mathRe.exec(src)) !== null) {
        if (count === idx) {
          onMathClick(latex, mm.index, mm.index + marker.length);
          return;
        }
        count++;
      }
    }, [onMathClick]);

    // ── 붙여넣기: HTML → 텍스트 변환 ──
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }, []);

    // ── 키보드: Tab 등 기본 동작 방지 ──
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      }
    }, []);

    return (
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          className={`outline-none flex-1 overflow-y-auto px-3 py-2 border border-slate-200 rounded-sm bg-white font-serif-kr scrollbar-thin focus:ring-2 focus:ring-primary/40 focus:border-primary ${className}`}
          style={{ lineHeight: '1.8', fontSize: '15px', minHeight: '200px' }}
          onInput={handleInput}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; handleInput(); }}
          onClick={handleClick}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning
          spellCheck={false}
        />
        {!content && (
          <div
            className="absolute top-2 left-3 text-slate-400 pointer-events-none font-serif-kr"
            style={{ fontSize: '15px' }}
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  },
);
