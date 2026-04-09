'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { BOOK_LABELS } from '@/types';
import {
  MIDDLE_BOOK_CODES,
  ELEMENTARY_BOOK_CODES,
  DIFFICULTY_OPTIONS,
  TYPE_OPTIONS,
  DOMAIN_OPTIONS,
  type Meta,
} from './question-types';

interface QuestionListSidebarProps {
  leftPanelCollapsed: boolean;
  setLeftPanelCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  schoolLevel: 'middle' | 'elementary';
  setSchoolLevel: (level: 'middle' | 'elementary') => void;
  bookFilter: string | null;
  setBookFilter: (book: string | null) => void;
  chapterFilter: string | null;
  setChapterFilter: (chapter: string | null) => void;
  sectionFilter: string | null;
  setSectionFilter: (section: string | null) => void;
  difficultyFilter: string;
  setDifficultyFilter: (difficulty: string) => void;
  domainFilter: string;
  setDomainFilter: (domain: string) => void;
  sourceFilter: string;
  setSourceFilter: (source: string) => void;
  noExplanation: boolean;
  setNoExplanation: (v: boolean) => void;
  typeFilters: Set<string>;
  toggleTypeFilter: (type: string) => void;
  setCurrentPage: (page: number) => void;
  meta: Meta;
  bookCounts: Record<string, number>;
  schoolTotal: number;
  chaptersByBook: Record<string, { chapter: string; count: number }[]>;
  sectionsByBook: Record<string, { section: string; count: number }[]>;
  sectionsByChapter: Record<string, { section: string; count: number }[]>;
}

export function QuestionListSidebar({
  leftPanelCollapsed,
  setLeftPanelCollapsed,
  schoolLevel,
  setSchoolLevel,
  bookFilter,
  setBookFilter,
  chapterFilter,
  setChapterFilter,
  sectionFilter,
  setSectionFilter,
  difficultyFilter,
  setDifficultyFilter,
  domainFilter,
  setDomainFilter,
  sourceFilter,
  setSourceFilter,
  noExplanation,
  setNoExplanation,
  typeFilters,
  toggleTypeFilter,
  setCurrentPage,
  meta,
  bookCounts,
  schoolTotal,
  chaptersByBook,
  sectionsByBook,
  sectionsByChapter,
}: QuestionListSidebarProps) {
  const [chapterOpen, setChapterOpen] = useState(true);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [typeOpen, setTypeOpen] = useState(true);
  const [difficultyOpen, setDifficultyOpen] = useState(true);
  const [domainOpen, setDomainOpen] = useState(true);

  return (
    <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex-col transition-all duration-200 ${leftPanelCollapsed ? 'w-12 hidden md:flex' : 'w-full md:w-72'} hidden md:flex`}>
      {/* Panel Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          {!leftPanelCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <h1 className="text-base font-bold text-text-primary truncate">문제 은행</h1>
              <span className="text-xs text-text-secondary bg-slate-100 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                {meta.total.toLocaleString()}
              </span>
            </div>
          )}
          <button
            onClick={() => setLeftPanelCollapsed((p) => !p)}
            className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
            title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
          >
            {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!leftPanelCollapsed && (
        <div className="flex-1 flex flex-col gap-2 p-3 md:p-4 overflow-y-auto">
          {/* School Level Tabs */}
          <Card padding="sm" className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <div className="bg-primary/10 rounded-sm p-2 text-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold leading-normal">학년 / 학기</h3>
                <p className="text-text-secondary text-xs">교재별 문제 분류</p>
              </div>
            </div>

            {/* School Level Toggle */}
            <div className="flex rounded-sm bg-slate-100 p-1">
              <button
                onClick={() => { setSchoolLevel('elementary'); setBookFilter(null); setChapterFilter(null); setSectionFilter(null); setCurrentPage(1); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-colors ${
                  schoolLevel === 'elementary' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                초등 (3~6학년)
              </button>
              <button
                onClick={() => { setSchoolLevel('middle'); setBookFilter(null); setChapterFilter(null); setSectionFilter(null); setCurrentPage(1); }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-colors ${
                  schoolLevel === 'middle' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                중등 (1~3학년)
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setBookFilter(null);
                  setChapterFilter(null);
                  setSectionFilter(null);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-sm font-medium text-sm transition-colors text-left ${
                  bookFilter === null
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
                }`}
              >
                <FolderOpen className="w-5 h-5" />
                <span>전체 보기</span>
                <span
                  className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                    bookFilter === null ? 'bg-primary/20' : 'bg-slate-100'
                  }`}
                >
                  {schoolTotal || meta.total}
                </span>
              </button>
              {(schoolLevel === 'middle' ? MIDDLE_BOOK_CODES : ELEMENTARY_BOOK_CODES).map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    setBookFilter(code);
                    setChapterFilter(null);
                    setSectionFilter(null);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-sm font-medium text-sm transition-colors text-left ${
                    bookFilter === code
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{BOOK_LABELS[code]}</span>
                  {bookCounts[code] != null && (
                    <span
                      className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                        bookFilter === code ? 'bg-primary/20' : 'bg-slate-100'
                      }`}
                    >
                      {bookCounts[code]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </Card>

          {/* Chapter Filter - 특정 학기 선택 시에만 표시 */}
          {bookFilter && chaptersByBook[bookFilter]?.length > 0 && (
            <Card padding="sm" className="flex flex-col gap-2">
              <button onClick={() => setChapterOpen((p) => !p)} className="flex items-center justify-between w-full">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">단원 필터</h3>
                <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${chapterOpen ? '' : '-rotate-90'}`} />
              </button>
              {chapterOpen && (
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setChapterFilter(null); setSectionFilter(null); setCurrentPage(1); }}
                    className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left ${
                      chapterFilter === null
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                    }`}
                  >
                    전체
                  </button>
                  {chaptersByBook[bookFilter].map((ch) => (
                    <button
                      key={ch.chapter}
                      onClick={() => { setChapterFilter(ch.chapter); setSectionFilter(null); setCurrentPage(1); }}
                      className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left flex justify-between items-center ${
                        chapterFilter === ch.chapter
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                      }`}
                    >
                      <span>{ch.chapter}</span>
                      <span className={`text-xs ${chapterFilter === ch.chapter ? 'text-white/70' : 'text-text-tertiary'}`}>{ch.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Section Filter - 특정 학기 선택 시에만 표시 */}
          {bookFilter && (() => {
            // chapter 선택 시 해당 chapter의 section만, 미선택 시 book 전체 section
            const sectionKey = chapterFilter ? `${bookFilter}::${chapterFilter}` : null;
            const sections = sectionKey ? sectionsByChapter[sectionKey] : sectionsByBook[bookFilter];
            return sections;
          })()?.length > 0 && (
            <Card padding="sm" className="flex flex-col gap-2">
              <button onClick={() => setSectionOpen((p) => !p)} className="flex items-center justify-between w-full">
                <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">유형/코너 필터</h3>
                <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${sectionOpen ? '' : '-rotate-90'}`} />
              </button>
              {sectionOpen && (
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => { setSectionFilter(null); setCurrentPage(1); }}
                    className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left ${
                      sectionFilter === null
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                    }`}
                  >
                    전체
                  </button>
                  {(chapterFilter ? sectionsByChapter[`${bookFilter}::${chapterFilter}`] : sectionsByBook[bookFilter])?.map((s) => (
                    <button
                      key={s.section}
                      onClick={() => { setSectionFilter(s.section); setCurrentPage(1); }}
                      className={`px-3 py-2 rounded-sm text-xs font-medium transition-colors text-left flex justify-between items-center ${
                        sectionFilter === s.section
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                      }`}
                    >
                      <span>{s.section}</span>
                      <span className={`text-xs ${sectionFilter === s.section ? 'text-white/70' : 'text-text-tertiary'}`}>{s.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Type Filter */}
          <Card padding="sm" className="flex flex-col gap-2">
            <button onClick={() => setTypeOpen((p) => !p)} className="flex items-center justify-between w-full">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">유형 필터</h3>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${typeOpen ? '' : '-rotate-90'}`} />
            </button>
            {typeOpen && (
              <div className="flex flex-col gap-2">
                {TYPE_OPTIONS.map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={typeFilters.has(type)}
                      onChange={() => toggleTypeFilter(type)}
                      className="form-checkbox text-primary rounded-sm border-slate-300 focus:ring-primary focus:ring-offset-0"
                    />
                    <span className="text-sm font-medium">{type}</span>
                  </label>
                ))}
              </div>
            )}
          </Card>

          {/* Difficulty Filter */}
          <Card padding="sm" className="flex flex-col gap-2">
            <button onClick={() => setDifficultyOpen((p) => !p)} className="flex items-center justify-between w-full">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">난이도</h3>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${difficultyOpen ? '' : '-rotate-90'}`} />
            </button>
            {difficultyOpen && (
              <div className="flex gap-1.5">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDifficultyFilter(d);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      difficultyFilter === d
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Domain Filter */}
          <Card padding="sm" className="flex flex-col gap-2">
            <button onClick={() => setDomainOpen((p) => !p)} className="flex items-center justify-between w-full">
              <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">영역</h3>
              <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${domainOpen ? '' : '-rotate-90'}`} />
            </button>
            {domainOpen && (
              <div className="flex flex-wrap gap-1.5">
                {DOMAIN_OPTIONS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => {
                      setDomainFilter(d.key);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      domainFilter === d.key
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* 출처 필터 */}
          <Card className="p-3">
            <h3 className="text-sm font-bold text-text-secondary mb-2">출처</h3>
            <div className="flex flex-wrap gap-1.5">
              {['전체', '교과서', '기출', 'AI 생성'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setSourceFilter(s); setCurrentPage(1); }}
                  className={`px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                    sourceFilter === s
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-text-secondary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>

          {/* 해설 없음 토글 */}
          <Card className="p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noExplanation}
                onChange={(e) => { setNoExplanation(e.target.checked); setCurrentPage(1); }}
                className="w-4 h-4 rounded-sm border-slate-300 text-primary focus:ring-primary/40"
              />
              <span className="text-sm font-medium text-text-secondary">해설 없는 문제만</span>
            </label>
          </Card>
        </div>
      )}

      {/* Collapsed state: just the BookOpen icon as a button to expand */}
      {leftPanelCollapsed && (
        <div className="flex-1 flex flex-col items-center pt-3 gap-2">
          <button
            onClick={() => setLeftPanelCollapsed(() => false)}
            className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors"
            title="문제 목록 열기"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>
      )}
    </aside>
  );
}
