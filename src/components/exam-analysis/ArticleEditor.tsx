'use client';

/**
 * 기출 분석 블로그 글 TipTap 에디터
 * NaverSEO Pro TiptapEditor/TiptapToolbar 전체 기능 이식
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading2, Heading3, List, ListOrdered,
  Quote, Link2, Minus, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight,
  Highlighter, Palette,
} from 'lucide-react';

// ── 네이버 블로그 호환 색상 팔레트 (NaverSEO Pro) ──

const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999',
  '#E03131', '#E8590C', '#F59F00', '#2F9E44',
  '#1971C2', '#6741D9', '#C2255C', '#862E9C',
];

const HIGHLIGHT_COLORS = [
  '#FFF3BF', '#FFE8CC', '#FFD8D8', '#D8F5A2',
  '#BAE3FF', '#E8D5FF', '#FFD6E8', '#D5F4E6',
];

// ── 공용 컴포넌트 ──

function ToolbarBtn({ onClick, isActive, disabled, children, title }: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors
        ${isActive ? 'bg-slate-200 text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-0.5 h-5 w-px bg-slate-200" />;
}

function ColorPicker({ colors, onSelect, currentColor, icon: Icon, title }: {
  colors: string[];
  onSelect: (color: string) => void;
  currentColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (ref.current && !ref.current.contains(e.relatedTarget)) setOpen(false);
  }, []);

  return (
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={title}
        className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors
          ${currentColor ? 'ring-1 ring-inset ring-slate-300' : ''}
          text-slate-500 hover:bg-slate-100 hover:text-slate-700`}
      >
        <Icon className="w-4 h-4" />
        {currentColor && (
          <span
            className="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full"
            style={{ backgroundColor: currentColor }}
          />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-sm border bg-white p-2 shadow-md">
          <div className="grid grid-cols-4 gap-1">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`h-6 w-6 rounded-sm border border-slate-200 transition-transform hover:scale-110
                  ${currentColor === color ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => { onSelect(color); setOpen(false); }}
              />
            ))}
          </div>
          <button
            type="button"
            className="mt-1.5 w-full rounded-sm px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-50"
            onClick={() => { onSelect(''); setOpen(false); }}
          >
            초기화
          </button>
        </div>
      )}
    </div>
  );
}

// ── 에디터 컴포넌트 ──

interface ArticleEditorProps {
  htmlContent: string;
  onHtmlChange: (html: string) => void;
  placeholder?: string;
}

export function ArticleEditor({ htmlContent, onHtmlChange, placeholder }: ArticleEditorProps) {
  const isExternalUpdate = useRef(false);
  const lastHtml = useRef(htmlContent);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        underline: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline' },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: placeholder || '기출 분석 글이 여기에 생성됩니다...',
      }),
      UnderlineExtension,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: htmlContent,
    onUpdate: ({ editor: ed }) => {
      if (isExternalUpdate.current) return;
      const html = ed.getHTML();
      lastHtml.current = html;
      onHtmlChange(html);
    },
    editorProps: {
      attributes: {
        spellcheck: 'false',
        class: [
          'prose prose-base max-w-none',
          'focus:outline-none min-h-[200px] px-5 py-4',
          'prose-h2:text-[1.4rem] prose-h2:font-bold prose-h2:text-slate-900 prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200',
          'prose-h3:text-[1.1rem] prose-h3:font-semibold prose-h3:text-slate-800 prose-h3:mt-5 prose-h3:mb-2',
          'prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-3',
          'prose-strong:text-slate-900',
          'prose-li:text-slate-700 prose-li:leading-relaxed',
          'prose-blockquote:border-l-blue-400 prose-blockquote:bg-slate-50 prose-blockquote:text-slate-600 prose-blockquote:pl-4 prose-blockquote:py-2',
          'prose-img:rounded-sm prose-img:mx-auto prose-img:my-4',
          'prose-img:max-w-[480px] prose-img:w-full',
          'prose-hr:border-slate-200 prose-hr:my-6',
        ].join(' '),
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (htmlContent === lastHtml.current) return;
    isExternalUpdate.current = true;
    editor.commands.setContent(htmlContent);
    lastHtml.current = htmlContent;
    isExternalUpdate.current = false;
  }, [htmlContent, editor]);

  if (!editor) return null;

  const insertLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL을 입력하세요', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5 shrink-0">
        {/* 텍스트 서식 */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="굵게">
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="기울임">
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="밑줄">
          <Underline className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="취소선">
          <Strikethrough className="w-4 h-4" />
        </ToolbarBtn>

        <Sep />

        {/* 글씨 색상 */}
        <ColorPicker
          colors={TEXT_COLORS}
          currentColor={editor.getAttributes('textStyle').color}
          onSelect={(color) => {
            if (!color) editor.chain().focus().unsetColor().run();
            else editor.chain().focus().setColor(color).run();
          }}
          icon={Palette}
          title="글씨 색상"
        />
        {/* 형광펜 */}
        <ColorPicker
          colors={HIGHLIGHT_COLORS}
          currentColor={editor.getAttributes('highlight').color}
          onSelect={(color) => {
            if (!color) editor.chain().focus().unsetHighlight().run();
            else editor.chain().focus().toggleHighlight({ color }).run();
          }}
          icon={Highlighter}
          title="형광펜"
        />

        <Sep />

        {/* 헤딩 */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="소제목 (H2)">
          <Heading2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="소소제목 (H3)">
          <Heading3 className="w-4 h-4" />
        </ToolbarBtn>

        <Sep />

        {/* 리스트 */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="불릿 리스트">
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="번호 리스트">
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>

        <Sep />

        {/* 정렬 */}
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬">
          <AlignLeft className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="가운데 정렬">
          <AlignCenter className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬">
          <AlignRight className="w-4 h-4" />
        </ToolbarBtn>

        <Sep />

        {/* 블록 요소 */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="인용">
          <Quote className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
          <Minus className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={insertLink} isActive={editor.isActive('link')} title="링크">
          <Link2 className="w-4 h-4" />
        </ToolbarBtn>

        <Sep />

        {/* Undo/Redo */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="실행 취소">
          <Undo className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="다시 실행">
          <Redo className="w-4 h-4" />
        </ToolbarBtn>
      </div>

      {/* 에디터 영역 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
