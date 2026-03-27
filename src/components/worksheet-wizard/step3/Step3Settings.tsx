'use client';

import { useWizardStore } from '@/stores/wizardStore';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DIFFICULTY_LABELS } from '@/types';
import { FileText, Printer, Columns2, Tag, X, LayoutTemplate, Palette, Check, Calendar, BookOpen, Layers, CheckSquare, ZoomOut, ZoomIn } from 'lucide-react';
import { useState, memo } from 'react';
import { Button } from '@/components/ui/Button';
import { PrintableHeader } from '@/components/print-preview/PrintableHeader';
import { A4Page } from '@/components/print-preview';
import { usePreviewScale } from '@/hooks/usePreviewScale';

const MODE_LABELS = { test: '시험', level_test: '레벨테스트', worksheet: '학습지' } as const;
const COLORS = [
  { name: '파랑', value: '#135bec' },
  { name: '노랑', value: '#eab308' },
  { name: '주황', value: '#F97316' },
  { name: '핑크', value: '#ec4899' },
  { name: '보라', value: '#8b5cf6' },
  { name: '초록', value: '#10b981' },
];

const TEMPLATES = [
  { id: 'default', label: '기본형' },
  { id: 'exam', label: '모의고사' },
  { id: 'minimal', label: '미니멀' },
  { id: 'csat', label: '수능형' },
  { id: 'classic', label: '클래식' },
  { id: 'notebook', label: '노트형' },
  { id: 'formal', label: '공문서형' },
  { id: 'bubble', label: '버블형' },
  { id: 'large', label: '초등확대' },
] as const;

type PrintTemplate = typeof TEMPLATES[number]['id'];

function renderQuestionNumber(template: PrintTemplate, num: number, color: string) {
  switch (template) {
    case 'exam':
      return (
        <>
          <div className="w-8 h-8 flex items-center justify-center border-2 border-slate-800 rounded-none bg-white font-black text-sm">{num}</div>
          <div className="mt-1 h-3 w-px bg-slate-300" />
        </>
      );
    case 'large':
      return <div className="w-10 h-10 flex items-center justify-center rounded-full text-white font-black text-lg" style={{ backgroundColor: color }}>{num}</div>;
    case 'minimal':
      return <div className="text-lg font-light text-slate-300 tabular-nums w-6 text-right">{num}</div>;
    case 'csat':
      return <div className="w-7 h-7 flex items-center justify-center rounded-full border-2 font-black text-xs" style={{ borderColor: color, color }}>{num}</div>;
    case 'classic':
      return <div className="flex items-baseline gap-0.5"><span className="text-sm font-black" style={{ color }}>{num}</span><span className="text-[10px] font-bold text-slate-400">.</span></div>;
    case 'notebook':
      return <div className="w-7 h-7 flex items-center justify-center rounded-sm bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">{num}</div>;
    case 'formal':
      return <div className="flex items-baseline gap-0.5"><span className="text-xs font-bold text-slate-700">[{num}]</span></div>;
    case 'bubble':
      return <div className="w-8 h-8 flex items-center justify-center rounded-full text-white font-black text-xs" style={{ backgroundColor: color, opacity: 0.85 }}>{num}</div>;
    default:
      return <div className="text-xl font-black italic tracking-tighter" style={{ color }}>{String(num).padStart(2, '0')}</div>;
  }
}

export function Step3Settings() {
  const {
    mode, questions,
    title, setTitle,
    grade, setGrade,
    testType, setTestType,
    timeLimitMin, setTimeLimitMin,
    // Print Design Options
    template, setTemplate,
    color, setColor,
    columns, setColumns,
    spacing, setSpacing,
    showDate, setShowDate,
    showChapter, setShowChapter,
    showDifficulty, setShowDifficulty,
    showDivider, setShowDivider,
    showAnswerKey, setShowAnswerKey,
    quickAnswerOnly, setQuickAnswerOnly,
    // Tags
    tags, setTags,
  } = useWizardStore();

  const [tagInput, setTagInput] = useState('');

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const actualColumns = template === 'large' ? 1 : columns;

  return (
    <div className="flex h-full">
      {/* 왼쪽: 설정 패널 */}
      <div className="w-[420px] shrink-0 border-r border-slate-200 bg-white overflow-y-auto no-scrollbar">
        <div className="p-6 space-y-6">
          {/* 기본 시험 정보 */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              {MODE_LABELS[mode]} 텍스트 정보
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${MODE_LABELS[mode]} 제목 입력`}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary mb-3"
            />
            <div className="flex gap-2 mb-3">
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
              >
                {[3, 4, 5, 6].map((g) => (
                  <option key={g} value={g}>초등 {g}학년</option>
                ))}
                {[7, 8, 9].map((g) => (
                  <option key={g} value={g}>중등 {g - 6}학년</option>
                ))}
              </select>

              {mode !== 'worksheet' && (
                <input
                  type="number"
                  value={timeLimitMin ?? ''}
                  onChange={(e) => setTimeLimitMin(e.target.value ? Number(e.target.value) : null)}
                  placeholder="시간제한(분)"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-sm text-sm"
                />
              )}
            </div>

            {/* 시험 유형 */}
            {mode === 'test' && (
              <div className="flex gap-2">
                {[
                  { value: 'concept', label: '개념' },
                  { value: 'midterm', label: '중간' },
                  { value: 'final', label: '기말' },
                  { value: 'mock', label: '모의' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTestType(opt.value)}
                    className={`flex-1 py-1.5 rounded-sm text-xs font-medium transition-colors ${testType === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100" />

          {/* 인쇄 및 디자인 설정 */}
          <div>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center">
              <Printer className="w-3.5 h-3.5 inline mr-1 text-primary" />
              프리미엄 인쇄 디자인
            </h3>

            {/* 템플릿 */}
            <div className="mb-5">
              <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mb-2"><LayoutTemplate className="w-3.5 h-3.5" /> 템플릿 형판</h4>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTemplate(t.id as typeof template);
                      if (t.id === 'large') setColumns(1);
                    }}
                    className={`flex flex-col items-center justify-center p-2 border-2 rounded-lg transition-all ${template === t.id ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                      }`}
                  >
                    <span className="text-[11px]">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 테마 컬러상자 */}
            <div className="mb-5">
              <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mb-2"><Palette className="w-3.5 h-3.5" /> 테마 컬러</h4>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  >
                    {color === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 단 및 여백 */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2">단 분할 (Columns)</label>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-md">
                  <button
                    onClick={() => setColumns(1)}
                    className={`flex-1 flex justify-center py-1.5 rounded text-[11px] font-bold transition-all ${actualColumns === 1 ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    1단 (기본)
                  </button>
                  <button
                    onClick={() => setColumns(2)}
                    disabled={template === 'large'}
                    className={`flex-1 flex justify-center py-1.5 rounded text-[11px] font-bold transition-all ${actualColumns === 2 ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'
                      } ${template === 'large' ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    2단 분할
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-2">세로 여백 거리 ({spacing}px)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    min={0}
                    max={150}
                    step={2}
                    value={spacing}
                    onChange={(e) => setSpacing(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-[11px] font-bold text-slate-500 w-6 text-right shrink-0">{spacing}px</span>
                </div>
              </div>
            </div>

            {/* 추가 토글 옵션류 */}
            <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-lg">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2 text-xs text-slate-700"><Calendar className="w-3.5 h-3.5 text-slate-400" /> 헤더 오늘 날짜 표시</div>
                <input type="checkbox" className="sr-only peer" checked={showDate} onChange={(e) => setShowDate(e.target.checked)} />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary relative"></div>
              </label>
              <div className="h-px bg-slate-200" />
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2 text-xs text-slate-700"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> 문항 상단 출처 단원명</div>
                <input type="checkbox" className="sr-only peer" checked={showChapter} onChange={(e) => setShowChapter(e.target.checked)} />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary relative"></div>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2 text-xs text-slate-700"><Layers className="w-3.5 h-3.5 text-slate-400" /> 문항 난이도 뱃지 표시</div>
                <input type="checkbox" className="sr-only peer" checked={showDifficulty} onChange={(e) => setShowDifficulty(e.target.checked)} />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary relative"></div>
              </label>
              <div className="h-px bg-slate-200" />
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2 text-xs text-slate-700"><Columns2 className="w-3.5 h-3.5 text-slate-400" /> 2단 세로 구분선</div>
                <input type="checkbox" className="sr-only peer" checked={showDivider} onChange={(e) => setShowDivider(e.target.checked)} />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary relative"></div>
              </label>
              <div className="h-px bg-slate-200" />
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2 text-xs text-slate-700"><CheckSquare className="w-3.5 h-3.5 text-slate-400" /> 정답 및 해설 포함</div>
                <input type="checkbox" className="sr-only peer" checked={showAnswerKey} onChange={(e) => setShowAnswerKey(e.target.checked)} />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary relative"></div>
              </label>
              {showAnswerKey && (
                <label className="flex items-center justify-between cursor-pointer group ml-6">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">빠른 정답만 (해설 생략)</div>
                  <input type="checkbox" className="sr-only peer" checked={quickAnswerOnly} onChange={(e) => setQuickAnswerOnly(e.target.checked)} />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary relative"></div>
                </label>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* 태그 (검색분류용) */}
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              <Tag className="w-3.5 h-3.5 inline mr-1" /> 백오피스 분류 태그
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="태그 입력 후 Enter"
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-sm text-sm"
              />
              <Button variant="secondary" size="sm" onClick={handleAddTag}>추가</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {t}
                    <button onClick={() => handleRemoveTag(t)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 오른쪽: 인쇄 미리보기 */}
      <div className="flex-1 overflow-hidden relative">
        {/* Live Preview Gallery */}
        <PrintPreview
          title={title || `${MODE_LABELS[mode]} 템플릿(미리보기)`}
          grade={grade}
          questions={questions}
        />
      </div>
    </div>
  );
}

// === A4 분할 알고리즘 ===
type QItem = { id: string; content: string; choices: string[] | null; answer: string; explanation?: string | null; difficulty: string; chapter: string };
const PAGE_CONTENT_HEIGHT = 880;

/** 보기 내용 길이를 기준으로 1열/2열 자동 판별 */
function getChoiceColsAuto(choices: string[] | null): 1 | 2 {
  if (!choices || choices.length === 0) return 2;
  const maxLen = Math.max(...choices.map(c => c.replace(/^[①②③④⑤]\s*/, '').length));
  return maxLen > 25 ? 1 : 2;
}

/** KaTeX 수식을 짧은 플레이스홀더로 치환하여 렌더링 기준 글자수 추정 */
function estimateRenderedLength(text: string): number {
  return text.replace(/\$\$[^$]+\$\$/g, '@@@@').replace(/\$[^$]+\$/g, '@@').length;
}

function estimateQuestionHeight(q: QItem, cols: 1 | 2, template: string, spacingPx: number): number {
  let h = 45;
  const isLarge = template === 'large';
  const charsPerLine = cols === 1 ? (isLarge ? 35 : 60) : (isLarge ? 20 : 30);
  const lines = Math.ceil(estimateRenderedLength(q.content) / charsPerLine);
  h += lines * (isLarge ? 34 : 24);

  if (q.choices && q.choices.length > 0) {
    const choicesCount = q.choices.length;
    const choiceCols = getChoiceColsAuto(q.choices);
    const rows = Math.ceil(choicesCount / choiceCols);
    h += rows * (isLarge ? 36 : 28) + 10;
  }
  return h + Math.max(0, spacingPx);
}

function paginateQuestions(questions: QItem[], cols: 1 | 2, template: string, spacingPx: number): QItem[][][] {
  const pages: QItem[][][] = [];
  let currentPage: QItem[][] = Array(cols).fill(null).map(() => []);
  let currentColumnIdx = 0;
  let currentH = 0;

  for (const q of questions) {
    const qh = estimateQuestionHeight(q, cols, template, spacingPx);

    if (currentPage[currentColumnIdx].length > 0 && currentH + qh > PAGE_CONTENT_HEIGHT) {
      if (cols === 2 && currentColumnIdx === 0) {
        currentColumnIdx = 1;
        currentPage[1] = [q];
        currentH = qh;
      } else {
        pages.push(currentPage);
        currentPage = Array(cols).fill(null).map(() => []);
        currentColumnIdx = 0;
        currentPage[0].push(q);
        currentH = qh;
      }
    } else {
      currentPage[currentColumnIdx].push(q);
      currentH += qh;
    }
  }
  if (currentPage[0].length > 0) pages.push(currentPage);
  return pages;
}

// --- 고급 인쇄 미리보기 ---
interface PrintPreviewProps {
  title: string;
  grade: number;
  questions: { id: string; content: string; choices: string[] | null; answer: string; explanation?: string | null; difficulty: string; chapter: string }[];
}

const PrintPreview = memo(function PrintPreview({ title, grade, questions }: PrintPreviewProps) {
  const {
    template, color, columns, spacing, showDate, showChapter, showDifficulty, showDivider, showAnswerKey, quickAnswerOnly
  } = useWizardStore();
  const { scale, setScale, galleryRef } = usePreviewScale();
  const actualColumns = template === 'large' ? 1 : columns;
  const gradeLabel = grade <= 6 ? `초등 ${grade}학년` : `중등 ${grade - 6}학년`;
  const academyName = 'MathLAB Academy';

  const mathContentClass = template === 'large' ? 'text-[15px] leading-loose' : 'text-[13px] leading-relaxed';
  const choiceContentClass = template === 'large' ? 'text-[13px] mt-2' : 'text-[12px] mt-1.5';

  const pages = paginateQuestions(questions, actualColumns, template, spacing);

  // 정답/해설 페이지 분할
  const answerPages: number[][] = []; // page → indices
  if (showAnswerKey && questions.length > 0) {
    const ANS_PAGE_H = 880;
    const ANS_HEADER_H = 40;
    const totalSpan = questions.reduce((sum, q) => {
      const len = estimateRenderedLength(q.answer);
      return sum + (len <= 6 ? 2 : len <= 16 ? 3 : 4);
    }, 0);
    const QUICK_GRID_H = Math.ceil(totalSpan / 10) * 28 + 60;
    const estimateAnswerH = (i: number) => {
      let h = 44;
      if (showChapter || showDifficulty) h += 18;
      if (!quickAnswerOnly && questions[i].explanation) {
        const renderedLen = estimateRenderedLength(questions[i].explanation || '');
        h += Math.ceil(renderedLen / 24) * 17 + 22;
      }
      return h + Math.max(0, spacing);
    };
    let currentPage: number[] = [];
    let cumH = 0;
    for (let i = 0; i < questions.length; i++) {
      const entryH = estimateAnswerH(i);
      const isFirstPage = answerPages.length === 0;
      const pageAvail = (isFirstPage ? ANS_PAGE_H - ANS_HEADER_H - QUICK_GRID_H : ANS_PAGE_H - ANS_HEADER_H) * 2;
      if (currentPage.length > 0 && cumH + entryH > pageAvail) {
        answerPages.push(currentPage);
        currentPage = [i];
        cumH = entryH;
      } else {
        currentPage.push(i);
        cumH += entryH;
      }
    }
    if (currentPage.length > 0) answerPages.push(currentPage);
  }
  const totalPages = pages.length + answerPages.length;

  return (
    <div className="flex flex-col h-full absolute inset-0">
      {/* 미리보기 헤더바 & 줌 인/줌 아웃 */}
      <div className="shrink-0 h-14 border-b border-slate-200 bg-white/80 backdrop-blur shadow-sm flex items-center justify-between px-6 z-10">
        <div className="text-sm font-bold text-slate-800">미리보기 (총 {totalPages}장)</div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button className="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-500" onClick={() => setScale(scale - 0.1)}><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs font-bold w-12 text-center text-slate-700">{Math.round(scale * 100)}%</span>
          <button className="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-500" onClick={() => setScale(scale + 0.1)}><ZoomIn className="w-4 h-4" /></button>
        </div>
      </div>

      <div ref={galleryRef} className="flex-1 overflow-x-auto overflow-y-auto p-4 lg:p-10 bg-slate-200">
        {/* 수평(스크롤) 갤러리 레이아웃으로 변경 (연산 출제와 동일) */}
        <div className="flex w-max gap-10 pb-20 px-4 md:px-0">
          {pages.map((colLists, pageIdx) => (
            <A4Page key={pageIdx} scale={scale} paddingClass={template === 'large' ? 'px-14 py-14' : 'px-10 py-10'}>
              <div className="flex flex-col h-full">
              <PrintableHeader
                title={title}
                subtitle={template === 'exam' ? `${questions.length}문항 · 모의고사 형식` : template === 'large' ? '기초 탄탄 / 초등부 확대판' : template === 'csat' ? `${questions.length}문항` : template === 'classic' || template === 'formal' ? `총 ${questions.length}문항` : template === 'notebook' || template === 'bubble' ? `${questions.length}문항` : ''}
                gradeBadge={gradeLabel}
                isFirstPage={pageIdx === 0}
                totalScore={questions.length * 10}
                problemCount={questions.length}
                pageInfo={`${pageIdx + 1} / ${totalPages}`}
                variant={template}
                accentColor={color}
                academyName={academyName}
                showDate={showDate}
              />

              <div className="flex-1 min-h-0 flex w-full gap-10 mt-2 relative overflow-hidden">
                {actualColumns === 2 && showDivider && (
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed" style={{ borderColor: `${color}40` }} />
                )}
                {colLists.map((columnQuestions, colIdx) => (
                  <div key={colIdx} className={`${actualColumns === 2 ? 'flex-1 pl-5 first:pl-0' : 'w-full'}`}>
                    <div className="pb-4 block">
                      {columnQuestions.map((q, qIdx) => {
                        let globalIdx = 0;
                        for (let i = 0; i < pageIdx; i++) pages[i].forEach(col => globalIdx += col.length);
                        if (colIdx > 0) globalIdx += colLists[0].length;
                        const num = globalIdx + qIdx + 1;

                        return (
                          <div key={q.id} className="relative group/q break-inside-avoid" style={{ marginBottom: `${spacing}px` }}>
                            <div className="flex items-start gap-3">
                              {/* 문항 번호 뱃지 */}
                              <div className="flex flex-col items-center shrink-0">
                                {template === 'exam' ? (
                                  <>
                                    <div className="w-8 h-8 flex items-center justify-center border-2 border-slate-800 rounded-none bg-white font-black text-sm">{num}</div>
                                    <div className="mt-1 h-3 w-px bg-slate-300" />
                                  </>
                                ) : template === 'large' ? (
                                  <div className="w-10 h-10 flex items-center justify-center rounded-full text-white font-black text-lg" style={{ backgroundColor: color }}>
                                    {num}
                                  </div>
                                ) : template === 'minimal' ? (
                                  <div className="text-lg font-light text-slate-300 tabular-nums w-6 text-right">
                                    {num}
                                  </div>
                                ) : template === 'csat' ? (
                                  <div className="w-7 h-7 flex items-center justify-center rounded-full border-2 font-black text-xs" style={{ borderColor: color, color }}>
                                    {num}
                                  </div>
                                ) : template === 'classic' ? (
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="text-sm font-black" style={{ color }}>{num}</span>
                                    <span className="text-[10px] font-bold text-slate-400">.</span>
                                  </div>
                                ) : template === 'notebook' ? (
                                  <div className="w-7 h-7 flex items-center justify-center rounded-sm bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">
                                    {num}
                                  </div>
                                ) : template === 'formal' ? (
                                  <div className="flex items-baseline gap-0.5">
                                    <span className="text-xs font-bold text-slate-700">[{num}]</span>
                                  </div>
                                ) : template === 'bubble' ? (
                                  <div className="w-8 h-8 flex items-center justify-center rounded-full text-white font-black text-xs" style={{ backgroundColor: color, opacity: 0.85 }}>
                                    {num}
                                  </div>
                                ) : (
                                  <div className="text-xl font-black italic tracking-tighter" style={{ color: color }}>
                                    {String(num).padStart(2, '0')}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 pt-0.5">
                                {(showChapter || showDifficulty) && (
                                  <div className="flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-slate-400">
                                    {showChapter && <span className="border-r pr-2 border-slate-200">{q.chapter}</span>}
                                    {showDifficulty && (
                                      <span style={{ color: q.difficulty === 'HIGH' ? '#ef4444' : q.difficulty === 'BASIC' ? '#22c55e' : '#f59e0b' }}>
                                        {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS] || q.difficulty}
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className={`text-slate-900 font-medium ${mathContentClass}`}>
                                  <MathRenderer content={q.content} />
                                </div>

                                {q.choices && q.choices.length > 0 && (
                                  <div className={`grid gap-x-4 gap-y-3 text-slate-700 ${choiceContentClass} ${getChoiceColsAuto(q.choices) === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {(q.choices as string[]).map((choice, ci) => {
                                      // 원래 DB 문항에 포함된 '① ', '②' 등의 흑백 원문자를 제거
                                      const cleanChoice = choice.replace(/^[①②③④⑤]\s*/, '').trim();
                                      return (
                                        <div key={ci} className="flex items-start gap-1.5">
                                          <span className="shrink-0 font-medium text-slate-800 opacity-90 text-[1.1em] leading-none translate-y-px">
                                            {['①', '②', '③', '④', '⑤'][ci]}
                                          </span>
                                          <div className="flex-1">
                                            <MathRenderer content={cleanChoice} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </A4Page>
          ))}

          {/* 정답/해설 페이지 (다중) */}
          {answerPages.map((pageIndices, apIdx) => (
            <A4Page key={`ans-${apIdx}`} scale={scale} paddingClass="px-10 py-10">
              <div className="flex flex-col h-full relative">
                {showDivider && (
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed" style={{ borderColor: `${color}40` }} />
                )}
                <PrintableHeader
                  title={title}
                  subtitle={apIdx === 0 ? 'Answer Key' : ''}
                  isFirstPage={false}
                  variant={template}
                  accentColor={color}
                  pageInfo={`${pages.length + apIdx + 1} / ${totalPages}`}
                />

                {/* 첫 해설 페이지: 빠른 정답 그리드 */}
                {apIdx === 0 && (
                  <div className="mt-3 border rounded-sm p-3" style={{ borderColor: `${color}20` }}>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                      <CheckSquare className="w-3 h-3" style={{ color }} /> 빠른 정답
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {questions.map((q, idx) => {
                        const ansLen = estimateRenderedLength(q.answer);
                        const basis = ansLen <= 6 ? '16%' : ansLen <= 16 ? '26%' : '36%';
                        return (
                          <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[11px]" style={{ flex: `1 1 ${basis}`, minWidth: 0 }}>
                            <span className="font-black text-slate-400 w-5 shrink-0">{idx + 1}</span>
                            <span className="font-bold text-slate-800 truncate"><MathRenderer content={q.answer} /></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 상세 해설 (CSS columns — 해설이 단을 넘나들 수 있음) */}
                {!quickAnswerOnly && (
                  <div className="flex-1 min-h-0 mt-2 overflow-hidden" style={{ columns: 2, columnGap: '2.5rem', columnFill: 'auto' as const }}>
                    {pageIndices.map((i) => {
                      const q = questions[i];
                      const num = i + 1;
                      return (
                        <div key={i} style={{ marginBottom: `${spacing}px` }}>
                          {/* 번호+정답 헤더: 단 분리 방지 */}
                          <div className="flex items-start gap-3" style={{ breakInside: 'avoid' }}>
                            <div className="flex flex-col items-center shrink-0">
                              {renderQuestionNumber(template, num, color)}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              {(showChapter || showDifficulty) && (
                                <div className="flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-slate-400">
                                  {showChapter && <span className="border-r pr-2 border-slate-200">{q.chapter}</span>}
                                  {showDifficulty && (
                                    <span style={{ color: q.difficulty === 'HIGH' ? '#ef4444' : q.difficulty === 'BASIC' ? '#22c55e' : '#f59e0b' }}>
                                      {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS] || q.difficulty}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-black text-slate-500">정답:</span>
                                <span className={`font-bold text-slate-900 ${mathContentClass}`}><MathRenderer content={q.answer} /></span>
                              </div>
                            </div>
                          </div>
                          {/* 해설: 단을 넘나들 수 있음 */}
                          {q.explanation && (
                            <div className="ml-11 mt-1">
                              <span className="text-[10px] font-black text-slate-400 block mb-1">해설</span>
                              <div className={`text-slate-700 leading-relaxed ${mathContentClass}`}><MathRenderer content={q.explanation} /></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </A4Page>
          ))}
        </div>
      </div>
    </div>
  );
});
