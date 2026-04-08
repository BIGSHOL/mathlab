'use client';

import Link from 'next/link';
import {
  Search,
  Plus,
  FileText,
  Download,
  Filter,
  Edit,
  Trash2,
  KeyRound,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DiagramRenderer } from '@/components/math/DiagramRenderer';
import { DIFFICULTY_LABELS, TYPE_LABELS, BOOK_LABELS } from '@/types';
import { QUESTION_DOMAIN_LABELS, QUESTION_DOMAIN_COLORS, ABILITY_DOMAIN_LABELS, ABILITY_DOMAIN_COLORS } from './question-types';
import {
  ITEMS_PER_PAGE,
  getDifficultyBadgeColor,
  getTopicBadgeColor,
  type QuestionItem,
  type Meta,
} from './question-types';

interface QuestionListMainProps {
  search: string;
  setSearch: (search: string) => void;
  bookFilter: string | null;
  difficultyFilter: string;
  meta: Meta;
  loading: boolean;
  questions: QuestionItem[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  expandedExplanation: string | null;
  setExpandedExplanation: (id: string | null) => void;
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  openQuestion: (q: QuestionItem) => void;
  startEditing: (q?: QuestionItem) => void;
  deleteQuestion: (id: string) => void;
  openCreateModal: () => void;
  isOwner?: boolean;
  canEdit?: boolean;
}

export function QuestionListMain({
  search,
  setSearch,
  bookFilter,
  difficultyFilter,
  meta,
  loading,
  questions,
  currentPage,
  setCurrentPage,
  expandedExplanation,
  setExpandedExplanation,
  deleteConfirm,
  setDeleteConfirm,
  openQuestion,
  startEditing,
  deleteQuestion,
  openCreateModal,
  isOwner,
  canEdit,
}: QuestionListMainProps) {
  return (
    <main className="flex-1 flex flex-col min-w-0 bg-white p-3 md:p-4 gap-3 overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-lg font-bold leading-tight text-text-primary">문제 은행</h1>
          <p className="text-text-secondary text-sm">
            초등·중등 수학 문제 검색 및 관리. 전체 {meta.total.toLocaleString()}개의 문제
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link href="/questions/generate">
              <Button variant="secondary" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                AI 문제 생성
              </Button>
            </Link>
            {isOwner && (
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-2" />
                PDF 내보내기
              </Button>
            )}
            <Button size="sm" onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              새 문제 추가
            </Button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-400"
          placeholder="검색어 입력 후 Enter (예: 소인수분해, 이차방정식)..."
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSearch(e.currentTarget.value);
          }}
        />
      </div>

      {/* Mobile filter info */}
      <div className="flex lg:hidden items-center gap-2 text-sm text-text-secondary">
        <Filter className="w-4 h-4" />
        <span>
          {bookFilter ? BOOK_LABELS[bookFilter] : '전체'} &bull;{' '}
          {difficultyFilter === '전체' ? '모든 난이도' : difficultyFilter} &bull;{' '}
          {meta.total}개 결과
        </span>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-text-secondary">문제를 불러오는 중...</span>
        </div>
      ) : (
        <>
          {/* Questions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {questions.length === 0 ? (
              <div className="col-span-full text-center py-8 text-text-secondary">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">조건에 맞는 문제가 없습니다.</p>
                <p className="text-sm mt-1">필터를 조정하거나 PDF 파싱을 실행해주세요.</p>
              </div>
            ) : (
              questions.map((q) => (
                <Card
                  key={q.id}
                  className="p-3 flex flex-col gap-2 hover:shadow-hover transition-shadow cursor-pointer"
                  onClick={() => openQuestion(q)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-sm">
                        {BOOK_LABELS[q.bookCode] || q.bookCode} #{q.questionNum}
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold rounded-sm ${getDifficultyBadgeColor(DIFFICULTY_LABELS[q.difficulty])}`}>
                        {DIFFICULTY_LABELS[q.difficulty]}
                      </span>
                      <span className="px-2 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
                        {TYPE_LABELS[q.type]}
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold rounded-sm ${getTopicBadgeColor(q.chapter)}`}>
                        {q.chapter}
                      </span>
                      {q.section && q.section !== q.chapter && (
                        <span className="px-2 py-1 border border-slate-200 text-text-secondary text-xs font-bold rounded-sm">
                          {q.section}
                        </span>
                      )}
                      {q.domain && QUESTION_DOMAIN_LABELS[q.domain] && (
                        <span className={`px-2 py-1 text-xs font-bold rounded-sm ${QUESTION_DOMAIN_COLORS[q.domain]?.bg || 'bg-slate-100'} ${QUESTION_DOMAIN_COLORS[q.domain]?.text || 'text-slate-700'}`}>
                          {QUESTION_DOMAIN_LABELS[q.domain]}
                        </span>
                      )}
                      {(q as QuestionItem).abilityDomain && ABILITY_DOMAIN_LABELS[(q as QuestionItem).abilityDomain!] && (
                        <span className={`px-2 py-1 text-xs font-bold rounded-sm $${ABILITY_DOMAIN_COLORS[(q as QuestionItem).abilityDomain!]?.border || ''} ${ABILITY_DOMAIN_COLORS[(q as QuestionItem).abilityDomain!]?.bg || 'bg-slate-100'} ${ABILITY_DOMAIN_COLORS[(q as QuestionItem).abilityDomain!]?.text || 'text-slate-700'}`}>
                          {ABILITY_DOMAIN_LABELS[(q as QuestionItem).abilityDomain!]}
                        </span>
                      )}
                      {(q.sourceTag || q.source) && (
                        <span
                          className="px-2 py-1 text-xs font-bold rounded-sm bg-amber-50 text-amber-700 border border-amber-200 cursor-default"
                          title={q.source || ''}
                        >
                          {q.sourceTag || '출처'}{q.source ? ` · ${q.source.length > 20 ? q.source.substring(0, 20) + '…' : q.source}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 text-text-secondary shrink-0">
                      {canEdit && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); startEditing(q); }}
                            className="p-1 hover:text-primary transition-colors rounded-sm hover:bg-slate-100"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {deleteConfirm === q.id ? (
                            <div className="flex items-center gap-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => deleteQuestion(q.id)}
                                className="px-2 py-1 text-red-500 hover:bg-red-50 rounded-sm text-xs font-bold"
                              >
                                삭제
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 hover:bg-slate-100 rounded-sm text-xs"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(q.id); }}
                              className="p-1 hover:text-red-500 transition-colors rounded-sm hover:bg-red-50"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-sm leading-relaxed font-medium text-text-primary">
                    <MathRenderer content={q.content} />
                    {(q.diagramSVG || (q.diagramSpec && Array.isArray(q.diagramSpec) && q.diagramSpec.length > 0)) && (
                      <div className="my-2 flex justify-center">
                        {q.diagramSVG ? (
                          <div
                            className="max-w-md overflow-hidden rounded-sm border border-slate-100 bg-white p-3 [&_svg]:w-full [&_svg]:h-auto"
                            style={{ fontFamily: "'Pretendard', system-ui, sans-serif" }}
                            dangerouslySetInnerHTML={{ __html: q.diagramSVG }}
                          />
                        ) : q.diagramSpec ? (
                          <DiagramRenderer
                            spec={q.diagramSpec}
                            className="max-w-md rounded-sm border border-slate-100 bg-white p-3 [&_svg]:w-full [&_svg]:h-auto"
                          />
                        ) : null}
                      </div>
                    )}
                    {q.choices && Array.isArray(q.choices) && (() => {
                      const choices = q.choices as string[];
                      const maxLen = Math.max(...choices.map(c => c.length));
                      const autoCols = maxLen > 25 ? 1 : 2;
                      const finalCols = (q as QuestionItem).choiceColumns ?? autoCols;
                      return (
                        <div className={`grid ${finalCols === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-2 text-sm`}>
                          {choices.map((c, i) => (
                            <div key={i} className="px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                              <MathRenderer content={c} />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-auto pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
                    <div className={`text-xs text-text-secondary flex items-center gap-1 min-w-0 flex-1 ${expandedExplanation === q.id ? '' : 'max-h-[1.5em] overflow-hidden'}`}>
                      <KeyRound className="w-3.5 h-3.5 shrink-0" />
                      <span className="shrink-0">정답:</span>
                      <MathRenderer content={q.answer} className="inline" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-sm ${q.explanation ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                        {q.explanation ? '해설 있음' : '해설 없음'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedExplanation(expandedExplanation === q.id ? null : q.id);
                        }}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        {expandedExplanation === q.id ? '해설 닫기' : '해설 보기'}
                      </button>
                    </div>
                  </div>
                  {expandedExplanation === q.id && (
                    <div className="space-y-2">
                      <div className="text-xs text-text-secondary bg-slate-50 rounded-sm p-2.5 border border-slate-100">
                        {q.explanation ? (
                          <MathRenderer content={q.explanation} />
                        ) : (
                          '해설이 아직 등록되지 않았습니다.'
                        )}
                      </div>
                      {q.scoringCriteria && (
                        <div className="text-xs bg-amber-50 rounded-sm p-2.5 border border-amber-100">
                          <span className="font-bold text-amber-700 block mb-1">채점 요소</span>
                          <MathRenderer content={q.scoringCriteria} />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {meta.total > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 mt-2">
              <p className="text-sm text-text-secondary">
                {meta.total.toLocaleString()}개 중{' '}
                {((currentPage - 1) * ITEMS_PER_PAGE + 1).toLocaleString()}-
                {Math.min(currentPage * ITEMS_PER_PAGE, meta.total).toLocaleString()} 표시
              </p>
              <Pagination
                currentPage={currentPage}
                totalPages={meta.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
