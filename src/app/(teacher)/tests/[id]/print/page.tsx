'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Calendar, BookOpen, Layers, CheckSquare, Printer, ZoomIn, ZoomOut, LayoutTemplate, Palette, Columns2, Square } from 'lucide-react';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DIFFICULTY_LABELS } from '@/types';
import { usePreviewScale } from '@/hooks/usePreviewScale';
import { A4Page, A4PrintPage } from '@/components/print-preview';
import { PrintableHeader } from '@/components/print-preview/PrintableHeader';

interface QuestionData {
  id: string;
  content: string;
  choices: string[] | null;
  choiceColumns: number | null;
  answer: string;
  explanation: string | null;
  difficulty: string;
  chapter: string;
  questionNum: number;
}

interface TestData {
  id: string;
  title: string;
  grade: number;
  questionCount: number;
  questions: QuestionData[];
}

// === 추가: 프린트 옵션 상태 ===
export type PrintTemplate = 'default' | 'exam' | 'large' | 'minimal' | 'csat' | 'classic' | 'notebook' | 'formal' | 'bubble';

export interface PrintOptions {
  template: PrintTemplate;
  color: string;
  columns: 1 | 2;
  spacing: number;
  showAnswers: boolean;
  quickAnswerOnly: boolean;
  showDate: boolean;
  showChapter: boolean;
  showDifficulty: boolean;
  showDivider: boolean;
}

const COLORS = [
  { name: '파랑', value: '#135bec' },
  { name: '노랑', value: '#eab308' },
  { name: '주황', value: '#F97316' },
  { name: '핑크', value: '#ec4899' },
  { name: '보라', value: '#8b5cf6' },
  { name: '초록', value: '#10b981' },
  { name: '민트', value: '#14b8a6' },
  { name: '회색', value: '#64748b' },
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

/** 보기 열 수 결정: DB choiceColumns 우선, null이면 보기 길이로 자동 판단 */
function getChoiceCols(q: QuestionData): 1 | 2 {
  if (q.choiceColumns === 1) return 1;
  if (q.choiceColumns === 2) return 2;
  const maxLen = Math.max(...(q.choices || []).map(c => c.replace(/^[①②③④⑤]\s*/, '').length));
  return maxLen > 25 ? 1 : 2;
}

// 헤더 공간에 따라 가용 높이가 바뀔 수 있지만 단순화를 위해 여유 있게 계산
const PAGE_CONTENT_HEIGHT = 880;

/** KaTeX 수식을 짧은 플레이스홀더로 치환하여 렌더링 기준 글자수 추정 */
function estimateRenderedLength(text: string): number {
  return text.replace(/\$\$[^$]+\$\$/g, '@@@@').replace(/\$[^$]+\$/g, '@@').length;
}

function estimateQuestionHeight(q: QuestionData, cols: 1 | 2, template: string, spacingPx: number): number {
  let h = 45; // 번호+메타 정보

  // 초등확대(large) 템플릿일 땐 글씨가 크므로 줄당 글자수를 적게 잡고 높이를 크게 늘림
  const isLarge = template === 'large';
  const charsPerLine = cols === 1 ? (isLarge ? 35 : 60) : (isLarge ? 20 : 30);
  const lines = Math.ceil(estimateRenderedLength(q.content) / charsPerLine);

  h += lines * (isLarge ? 34 : 24);

  if (q.choices && q.choices.length > 0) {
    const choicesCount = q.choices.length;
    const choiceCols = getChoiceCols(q);
    const rows = Math.ceil(choicesCount / choiceCols);
    h += rows * (isLarge ? 36 : 28) + 10;
  }
  return h + Math.max(0, spacingPx); // 문항 간 여백
}

function paginateQuestions(questions: QuestionData[], cols: 1 | 2, template: string, spacingPx: number): QuestionData[][][] {
  const pages: QuestionData[][][] = [];
  let currentPage: QuestionData[][] = Array(cols).fill(null).map(() => []);
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

function getTemplateSubtitle(template: PrintTemplate, questionCount: number): string {
  switch (template) {
    case 'exam': return `${questionCount}문항 · 모의고사 형식`;
    case 'large': return '기초 탄탄 / 초등부 확대판';
    case 'csat': return `${questionCount}문항`;
    case 'classic': return `총 ${questionCount}문항`;
    case 'formal': return `총 ${questionCount}문항`;
    case 'notebook': return `${questionCount}문항`;
    case 'bubble': return `${questionCount}문항`;
    default: return '';
  }
}

function renderQuestionNumber(template: PrintTemplate, num: number, color: string, forPrint = false) {
  const printStyle = forPrint ? { WebkitPrintColorAdjust: 'exact' as const } : {};

  switch (template) {
    case 'exam':
      return (
        <>
          <div className="w-8 h-8 flex items-center justify-center border-2 border-slate-800 rounded-none bg-white font-black text-sm">{num}</div>
          <div className="mt-1 h-3 w-px bg-slate-300" />
        </>
      );
    case 'large':
      return (
        <div className="w-10 h-10 flex items-center justify-center rounded-full text-white font-black text-lg" style={{ backgroundColor: color, ...printStyle }}>
          {num}
        </div>
      );
    case 'minimal':
      return (
        <div className="text-lg font-light text-slate-300 tabular-nums w-6 text-right" style={printStyle}>
          {num}
        </div>
      );
    case 'csat':
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 flex items-center justify-center rounded-full border-2 font-black text-xs" style={{ borderColor: color, color, ...printStyle }}>
            {num}
          </div>
        </div>
      );
    case 'classic':
      return (
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-black" style={{ color, ...printStyle }}>{num}</span>
          <span className="text-[10px] font-bold text-slate-400">.</span>
        </div>
      );
    case 'notebook':
      return (
        <div className="w-7 h-7 flex items-center justify-center rounded-sm bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200" style={printStyle}>
          {num}
        </div>
      );
    case 'formal':
      return (
        <div className="flex items-baseline gap-0.5">
          <span className="text-xs font-bold text-slate-700" style={printStyle}>[{num}]</span>
        </div>
      );
    case 'bubble':
      return (
        <div className="w-8 h-8 flex items-center justify-center rounded-full text-white font-black text-xs" style={{ backgroundColor: color, ...printStyle, opacity: 0.85 }}>
          {num}
        </div>
      );
    default: // 'default'
      return (
        <div className="text-xl font-black italic tracking-tighter" style={{ color, ...printStyle }}>
          {String(num).padStart(2, '0')}
        </div>
      );
  }
}

export default function PrintWorksheetPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);

  // 상태 모음
  const [options, setOptions] = useState<PrintOptions>({
    template: 'exam',
    color: '#135bec',
    columns: 2,
    spacing: 40,
    showAnswers: false,
    quickAnswerOnly: false,
    showDate: true,
    showChapter: true,
    showDifficulty: true,
    showDivider: true,
  });

  // 컴포넌트 마운트 시 저장된 로컬스토리지 프리셋(학습지 설정창/기타인쇄에서 고른 옵션) 복원
  useEffect(() => {
    const savedPreset = localStorage.getItem('mathlab_print_preset');
    if (savedPreset) {
      try {
        const parsed = JSON.parse(savedPreset);
        setOptions(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse print preset', e);
      }
    }
  }, []);

  // 옵션이 변경될 때마다 언제든지 로컬스토리지 프리셋 최신화 (경쟁사와 동일한 템플릿 재활용)
  useEffect(() => {
    localStorage.setItem('mathlab_print_preset', JSON.stringify(options));
  }, [options]);

  const { scale, setScale, galleryRef } = usePreviewScale();
  const academyName = 'MathLAB Academy';

  useEffect(() => {
    fetch(`/api/tests/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setTest(json.data);
      })
      .catch((err) => console.error('시험 데이터 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 font-bold">로딩 중...</div>;
  if (!test) return <div className="p-10">시험을 찾을 수 없습니다</div>;

  const gradeBadge = test.grade <= 6 ? `초등 ${test.grade}` : `중등 ${test.grade - 6}`;
  // 템플릿에 따른 강제 컬럼 제한 (초등확대는 1단 고정)
  const actualColumns = options.template === 'large' ? 1 : options.columns;
  const pages = paginateQuestions(test.questions, actualColumns, options.template, options.spacing);


  // 정답/해설 페이지 분할 (CSS columns로 자동 단 분리 — 해설이 단을 넘나들 수 있음)
  const answerPages: number[][] = []; // page → indices
  if (options.showAnswers && test.questions.length > 0) {
    const ANS_PAGE_H = 880;
    const ANS_HEADER_H = 40;
    const totalSpan = test.questions.reduce((sum, q) => {
      const len = estimateRenderedLength(q.answer);
      return sum + (len <= 6 ? 2 : len <= 16 ? 3 : 4);
    }, 0);
    const QUICK_GRID_H = Math.ceil(totalSpan / 10) * 28 + 60;

    const estimateAnswerH = (i: number) => {
      let h = 40;
      if (options.showChapter || options.showDifficulty) h += 16;
      if (!options.quickAnswerOnly && test.questions[i].explanation) {
        const renderedLen = estimateRenderedLength(test.questions[i].explanation || '');
        h += Math.ceil(renderedLen / 22) * 16 + 20;
      }
      return h + Math.max(0, options.spacing);
    };

    let currentPage: number[] = [];
    let cumH = 0;

    for (let i = 0; i < test.questions.length; i++) {
      const entryH = estimateAnswerH(i);
      const isFirstPage = answerPages.length === 0;
      // 2단이므로 가용 높이 x2
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

  // Partial 렌더러 - 문제 본문 (초등확대 시 크기 대응)
  const mathContentClass = options.template === 'large' ? 'text-[16px] leading-loose printable-math-large' : 'text-[13px] leading-relaxed printable-math-content';
  const choiceContentClass = options.template === 'large' ? 'text-[14px] mt-2' : 'text-[12px] mt-1.5';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">

      {/* =====================
          좌측: 인쇄 옵션 사이드바
          ===================== */}
      <aside className="w-80 shrink-0 bg-white border-r border-slate-200 shadow-sm z-10 flex flex-col print:hidden">
        <div className="h-16 flex items-center px-4 border-b border-slate-200">
          <Link href={`/tests/${id}`} className="p-2 hover:bg-slate-100 rounded-full mr-2 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h2 className="font-black text-slate-800 tracking-tight">학습지 출력 설정</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pb-20 space-y-8 no-scrollbar">

          {/* Section: 템플릿 선택 */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3"><LayoutTemplate className="w-4 h-4 text-primary" /> 템플릿 디자인</h3>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setOptions({ ...options, template: t.id as PrintTemplate, columns: t.id === 'large' ? 1 : options.columns })}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 border-2 rounded-lg transition-all ${options.template === t.id ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                >
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Section: 색상 선택 */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3"><Palette className="w-4 h-4 text-primary" /> 포인트 테마 컬러</h3>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setOptions({ ...options, color: c.value })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {options.color === c.value && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                </button>
              ))}
            </div>
          </section>

          {/* Section: 분할(단) 선택 */}
          <section className={`${options.template === 'large' ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3"><Columns2 className="w-4 h-4 text-primary" /> 문항 분할 (단)</h3>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setOptions({ ...options, columns: 1 })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-xs font-bold ${actualColumns === 1 ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Square className="w-4 h-4" /> 1단 (기본)
              </button>
              <button
                onClick={() => setOptions({ ...options, columns: 2 })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all text-xs font-bold ${actualColumns === 2 ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Columns2 className="w-4 h-4" /> 2단 분할
              </button>
            </div>
            {options.template === 'large' && <p className="text-[10px] text-pink-500 mt-2 ml-1">※ 초등확대 템플릿은 1단으로만 사용 가능합니다.</p>}
          </section>

          <div className="h-px bg-slate-200 my-2" />

          {/* Section: 여백 조절 */}
          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">세로 여백 거리 ({options.spacing}px)</h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={150}
                step={2}
                value={options.spacing}
                onChange={(e) => setOptions({ ...options, spacing: Number(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-bold text-slate-500 w-8 text-right shrink-0">{options.spacing}px</span>
            </div>
          </section>

          <div className="h-px bg-slate-200 my-2" />

          {/* Section: 헤더/문항 옵션 토글 */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3">헤더 / 문항 표시 옵션</h3>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-700"><Calendar className="w-4 h-4 text-slate-400" /> 오늘 날짜 표시</div>
              <input type="checkbox" className="sr-only peer" checked={options.showDate} onChange={(e) => setOptions({ ...options, showDate: e.target.checked })} />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-700"><BookOpen className="w-4 h-4 text-slate-400" /> 문항별 단원명</div>
              <input type="checkbox" className="sr-only peer" checked={options.showChapter} onChange={(e) => setOptions({ ...options, showChapter: e.target.checked })} />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-700"><Layers className="w-4 h-4 text-slate-400" /> 문항별 난이도 라벨</div>
              <input type="checkbox" className="sr-only peer" checked={options.showDifficulty} onChange={(e) => setOptions({ ...options, showDifficulty: e.target.checked })} />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-700"><Columns2 className="w-4 h-4 text-slate-400" /> 2단 세로 구분선</div>
              <input type="checkbox" className="sr-only peer" checked={options.showDivider} onChange={(e) => setOptions({ ...options, showDivider: e.target.checked })} />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
            </label>

            <div className="h-px bg-slate-200" />

            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-700"><CheckSquare className="w-4 h-4 text-slate-400" /> 정답 및 해설 포함</div>
              <input type="checkbox" className="sr-only peer" checked={options.showAnswers} onChange={(e) => setOptions({ ...options, showAnswers: e.target.checked })} />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
            </label>

            {options.showAnswers && (
              <label className="flex items-center justify-between cursor-pointer group ml-6">
                <div className="flex items-center gap-2 text-xs text-slate-500">빠른 정답만 (해설 생략)</div>
                <input type="checkbox" className="sr-only peer" checked={options.quickAnswerOnly} onChange={(e) => setOptions({ ...options, quickAnswerOnly: e.target.checked })} />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
              </label>
            )}
          </section>
        </div>

        {/* 인쇄 버튼 고정 영역 */}
        <div className="mt-auto p-4 border-t border-slate-200 bg-white">
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-md transition-transform active:scale-95"
          >
            <Printer className="w-5 h-5" />
            학습지 인쇄하기
          </button>
        </div>
      </aside>

      {/* =====================
          우측: 문항 미리보기 갤러리
          ===================== */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <div className="print:hidden shrink-0 h-16 px-6 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between z-10">
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-800 leading-none">{test.title}</span>
            <span className="text-[11px] text-slate-400 mt-1">{totalPages}페이지 출력 예정 ({actualColumns}단)</span>
          </div>

          {/* Zoom Controls (Simplified) */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button className="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-500" onClick={() => setScale(scale - 0.1)}><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs font-bold w-12 text-center text-slate-700">{Math.round(scale * 100)}%</span>
            <button className="p-1.5 rounded hover:bg-white hover:shadow-sm text-slate-500" onClick={() => setScale(scale + 0.1)}><ZoomIn className="w-4 h-4" /></button>
          </div>
        </div>

        <div ref={galleryRef} className="flex-1 overflow-x-auto overflow-y-auto p-8 bg-slate-100">
          <div className="flex flex-col items-center gap-10">
            {pages.map((columns, pageIdx) => (
              <A4Page key={pageIdx} scale={scale} paddingClass={options.template === 'large' ? 'px-14 py-14' : 'px-10 py-10'}>
              <div className="flex flex-col h-full">
                {/* 템플릿에 따른 Header Props 주입 */}
                <PrintableHeader
                  title={test.title}
                  subtitle={getTemplateSubtitle(options.template, test.questionCount)}
                  gradeBadge={gradeBadge}
                  isFirstPage={pageIdx === 0}
                  totalScore={test.questionCount * 10}
                  problemCount={test.questionCount}
                  pageInfo={`${pageIdx + 1} / ${totalPages}`}
                  variant={options.template}
                  accentColor={options.color}
                  academyName={academyName}
                  showDate={options.showDate}
                />

                <div className="flex-1 min-h-0 flex w-full gap-10 mt-2 relative overflow-hidden">
                  {actualColumns === 2 && options.showDivider && (
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed" style={{ borderColor: `${options.color}40` }} />
                  )}
                  {columns.map((columnQuestions, colIdx) => (
                    <div key={colIdx} className={`${actualColumns === 2 ? 'flex-1 pl-5 first:pl-0' : 'w-full'}`}>
                      <div className="space-y-8 pb-4">
                        {columnQuestions.map((q, qIdx) => {
                          let globalIdx = 0;
                          for (let i = 0; i < pageIdx; i++) pages[i].forEach(col => globalIdx += col.length);
                          if (colIdx > 0) globalIdx += columns[0].length;
                          const num = globalIdx + qIdx + 1;

                          return (
                            <div key={q.id} className="relative group/q break-inside-avoid" style={{ marginBottom: `${options.spacing}px` }}>
                              <div className="flex items-start gap-3">
                                {/* 문항 번호 표현 (템플릿별 다름) */}
                                <div className="flex flex-col items-center shrink-0">
                                  {renderQuestionNumber(options.template, num, options.color)}
                                </div>

                                <div className="flex-1 min-w-0 pt-0.5">
                                  {/* 문항 메타 (옵션 반영) */}
                                  {(options.showChapter || options.showDifficulty) && (
                                    <div className="flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-slate-400">
                                      {options.showChapter && <span className="border-r pr-2 border-slate-200">{q.chapter}</span>}
                                      {options.showDifficulty && (
                                        <span className={
                                          q.difficulty === 'BASIC' ? 'text-green-600' :
                                            q.difficulty === 'MEDIUM' ? 'text-amber-500' :
                                              q.difficulty === 'HIGH' ? 'text-red-500' : 'text-purple-600'
                                        }>
                                          {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS] || q.difficulty}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* 본문 */}
                                  <div className={`text-slate-900 ${mathContentClass}`}>
                                    <MathRenderer content={q.content} />
                                  </div>

                                  {/* 선지 */}
                                  {q.choices && q.choices.length > 0 && (
                                    <div className={`grid gap-x-4 gap-y-2 text-slate-700 ${choiceContentClass} ${getChoiceCols(q) === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                      {(q.choices as string[]).map((choice, ci) => {
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

                              {/* 채점/여백 (exam 템플릿일 때만 강조) */}
                              {options.template === 'exam' && (
                                <div className="absolute top-0 -right-2 w-4 h-full flex flex-col items-center opacity-10">
                                  <div className="w-px h-full bg-slate-800" />
                                </div>
                              )}
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

            {/* 정답/해설 페이지 (CSS columns — 해설이 단을 자연스럽게 넘나듦) */}
            {answerPages.map((pageIndices, apIdx) => (
              <A4Page key={`ans-${apIdx}`} scale={scale} paddingClass="px-10 py-10">
                <div className="flex flex-col h-full relative">
                {options.showDivider && (
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed" style={{ borderColor: `${options.color}40` }} />
                )}
                <PrintableHeader
                  title={test.title}
                  subtitle={apIdx === 0 ? 'Answer Key' : ''}
                  isFirstPage={false}
                  variant={options.template}
                  accentColor={options.color}
                  pageInfo={`${pages.length + apIdx + 1} / ${totalPages}`}
                />

                {apIdx === 0 && (
                  <div className="mt-3 border rounded-sm p-3" style={{ borderColor: `${options.color}20` }}>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                      <CheckSquare className="w-3 h-3" style={{ color: options.color }} /> 빠른 정답
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {test.questions.map((q, idx) => {
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

                {!options.quickAnswerOnly && (
                  <div className="flex-1 min-h-0 mt-2 overflow-hidden" style={{ columns: 2, columnGap: '2.5rem', columnFill: 'auto' }}>
                    {pageIndices.map((i) => {
                      const q = test.questions[i];
                      return (
                        <div key={i} style={{ marginBottom: `${options.spacing}px` }}>
                          {/* 번호+정답 헤더: 단 분리 방지 */}
                          <div className="flex items-start gap-3" style={{ breakInside: 'avoid' }}>
                            <div className="flex flex-col items-center shrink-0">
                              {renderQuestionNumber(options.template, i + 1, options.color)}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              {(options.showChapter || options.showDifficulty) && (
                                <div className="flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-slate-400">
                                  {options.showChapter && <span className="border-r pr-2 border-slate-200">{q.chapter}</span>}
                                  {options.showDifficulty && (
                                    <span className={
                                      q.difficulty === 'BASIC' ? 'text-green-600' :
                                        q.difficulty === 'MEDIUM' ? 'text-amber-500' :
                                          q.difficulty === 'HIGH' ? 'text-red-500' : 'text-purple-600'
                                    }>
                                      {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS] || q.difficulty}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[10px] font-black text-slate-500">정답:</span>
                                <span className={`font-bold text-slate-900 ${mathContentClass}`}>
                                  <MathRenderer content={q.answer} />
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* 해설: 단을 넘나들 수 있음 */}
                          {q.explanation && (
                            <div className="ml-11 mt-1">
                              <span className="text-[10px] font-black text-slate-400 block mb-1">해설</span>
                              <div className={`text-slate-700 leading-relaxed ${mathContentClass}`}>
                                <MathRenderer content={q.explanation} />
                              </div>
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

        {/* 인쇄용 분리 DOM (print:block) */}
        <div className="hidden print:flex print:flex-col printable-exam">
          {pages.map((columns, pageIdx) => (
            <A4PrintPage key={pageIdx} pageBreak={pageIdx < totalPages - 1} paddingClass={options.template === 'large' ? 'px-14 py-14 flex flex-col' : 'px-10 py-10 flex flex-col'}>
              <PrintableHeader
                title={test.title}
                subtitle={getTemplateSubtitle(options.template, test.questionCount)}
                gradeBadge={gradeBadge}
                isFirstPage={pageIdx === 0}
                totalScore={test.questionCount * 10}
                problemCount={test.questionCount}
                pageInfo={`${pageIdx + 1} / ${totalPages}`}
                variant={options.template}
                accentColor={options.color}
                academyName={academyName}
                showDate={options.showDate}
              />
              <div className="flex-1 min-h-0 flex w-full gap-10 mt-2 relative overflow-hidden">
                {actualColumns === 2 && options.showDivider && (
                  <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed" style={{ borderColor: `${options.color}40` }} />
                )}
                {/* 인쇄용 반복 렌더링 (갤러리와 거의 동일하지만 MathRenderer 안정성 위한 분리) */}
                {columns.map((columnQuestions, colIdx) => (
                  <div key={colIdx} className={`${actualColumns === 2 ? 'flex-1 pl-5 first:pl-0' : 'w-full'} h-full`}>
                    <div className="space-y-8 pb-6 block">
                      {columnQuestions.map((q, qIdx) => {
                        let globalIdx = 0;
                        for (let i = 0; i < pageIdx; i++) pages[i].forEach(col => globalIdx += col.length);
                        if (colIdx > 0) globalIdx += columns[0].length;
                        const num = globalIdx + qIdx + 1;

                        return (
                          <div key={q.id} className="break-inside-avoid relative" style={{ marginBottom: `${options.spacing}px` }}>
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col items-center shrink-0">
                                {renderQuestionNumber(options.template, num, options.color, true)}
                              </div>

                              <div className="flex-1 min-w-0 pt-0.5">
                                {(options.showChapter || options.showDifficulty) && (
                                  <div className="flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-slate-400">
                                    {options.showChapter && <span className="border-r pr-2">{q.chapter}</span>}
                                    {options.showDifficulty && <span className="text-slate-500">{DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS]}</span>}
                                  </div>
                                )}
                                <div className={`text-slate-900 ${mathContentClass} font-medium`}>
                                  <MathRenderer content={q.content} />
                                </div>
                                {q.choices && q.choices.length > 0 && (
                                  <div className={`grid gap-x-4 gap-y-2 text-slate-800 ${choiceContentClass} ${getChoiceCols(q) === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                    {(q.choices as string[]).map((choice, ci) => {
                                      const cleanChoice = choice.replace(/^[①②③④⑤]\s*/, '').trim();
                                      return (
                                        <div key={ci} className="flex items-start gap-1.5">
                                          <span className="shrink-0 font-medium text-slate-800 opacity-90 text-[1.1em] leading-none translate-y-px" style={{ WebkitPrintColorAdjust: 'exact' }}>
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

              <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-300 tracking-widest uppercase" style={{ WebkitPrintColorAdjust: 'exact' }}>
                <div className="flex items-center gap-2">
                  MathLAB Printing System
                </div>
                <div>{academyName} Digital Campus</div>
              </div>
            </A4PrintPage>
          ))}

          {/* 인쇄용 정답/해설 페이지 (CSS columns) */}
          {answerPages.map((pageIndices, apIdx) => (
            <A4PrintPage key={`ans-print-${apIdx}`} pageBreak={true} paddingClass="px-10 py-10 flex flex-col relative">
              {options.showDivider && (
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed" style={{ borderColor: `${options.color}40` }} />
              )}
              <PrintableHeader
                title={test.title}
                subtitle={apIdx === 0 ? 'Answer Key' : ''}
                isFirstPage={false}
                variant={options.template}
                accentColor={options.color}
                pageInfo={`${pages.length + apIdx + 1} / ${totalPages}`}
              />

              {apIdx === 0 && (
                <div className="mt-3 border rounded-sm p-3" style={{ borderColor: `${options.color}20`, WebkitPrintColorAdjust: 'exact' as const }}>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3 h-3" style={{ color: options.color }} /> 빠른 정답
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {test.questions.map((q, idx) => {
                      const ansLen = estimateRenderedLength(q.answer);
                      const basis = ansLen <= 6 ? '16%' : ansLen <= 16 ? '26%' : '36%';
                      return (
                        <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[11px]" style={{ flex: `1 1 ${basis}`, minWidth: 0, WebkitPrintColorAdjust: 'exact' as const }}>
                          <span className="font-black text-slate-400 w-5 shrink-0">{idx + 1}</span>
                          <span className="font-bold text-slate-800 truncate"><MathRenderer content={q.answer} /></span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!options.quickAnswerOnly && (
                <div className="flex-1 min-h-0 mt-2 overflow-hidden" style={{ columns: 2, columnGap: '2.5rem', columnFill: 'auto' }}>
                  {pageIndices.map((i) => {
                    const q = test.questions[i];
                    return (
                      <div key={i} style={{ marginBottom: `${options.spacing}px` }}>
                        <div className="flex items-start gap-3" style={{ breakInside: 'avoid' }}>
                          <div className="flex flex-col items-center shrink-0">
                            {renderQuestionNumber(options.template, i + 1, options.color, true)}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            {(options.showChapter || options.showDifficulty) && (
                              <div className="flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-slate-400">
                                {options.showChapter && <span className="border-r pr-2">{q.chapter}</span>}
                                {options.showDifficulty && <span className="text-slate-500">{DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS]}</span>}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-black text-slate-500">정답:</span>
                              <span className={`font-bold text-slate-900 ${mathContentClass}`}><MathRenderer content={q.answer} /></span>
                            </div>
                          </div>
                        </div>
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

              <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-300 tracking-widest uppercase" style={{ WebkitPrintColorAdjust: 'exact' as const }}>
                <div>MathLAB Printing System</div>
                <div>{academyName} Digital Campus</div>
              </div>
            </A4PrintPage>
          ))}
        </div>
      </main>

      <style jsx global>{`
        @media print {
          @page { margin: 0; size: A4; }
          body { background: white !important; }
        }
        .printable-math-content .katex { font-size: 1.05em !important; }
        .printable-math-large .katex { font-size: 1.25em !important; }
      `}</style>
    </div>
  );
}
