'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DIFFICULTY_LABELS } from '@/types';
import { usePreviewScale } from '@/hooks/usePreviewScale';
import { A4Page, A4PrintPage, ZoomToolbar } from '@/components/print-preview';
import { PrintableHeader } from '@/components/print-preview/PrintableHeader';

interface QuestionData {
  id: string;
  content: string;
  choices: string[] | null;
  answer: string;
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

/* ── 페이지당 문제 분배 (높이 추정) ── */
const PAGE_CONTENT_HEIGHT = 920; // A4 297mm - 헤더/패딩 여유 (px 환산 근사값)

function estimateQuestionHeight(q: QuestionData): number {
  let h = 40; // 문제 번호 + 단원/난이도 줄
  const lines = Math.ceil(q.content.length / 40);
  h += lines * 22;
  if (q.choices && q.choices.length > 0) {
    const rows = Math.ceil(q.choices.length / 2);
    h += rows * 28 + 12;
  }
  return h;
}

function paginateQuestions(questions: QuestionData[]): QuestionData[][] {
  const pages: QuestionData[][] = [];
  let currentPage: QuestionData[] = [];
  let currentH = 0;

  for (const q of questions) {
    const qh = estimateQuestionHeight(q);
    if (currentPage.length > 0 && currentH + qh > PAGE_CONTENT_HEIGHT) {
      pages.push(currentPage);
      currentPage = [q];
      currentH = qh;
    } else {
      currentPage.push(q);
      currentH += qh;
    }
  }
  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
}

export default function PrintWorksheetPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const { scale, setScale, scalePercent, galleryRef, fitToContainer, setScaleFromSlider } = usePreviewScale();

  useEffect(() => {
    fetch(`/api/tests/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setTest(json.data);
      })
      .catch((err) => console.error('시험 데이터 조회 실패:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-6 text-center text-text-secondary">
        시험을 찾을 수 없습니다
      </div>
    );
  }

  const gradeBadge = test.grade <= 6 ? `초${test.grade}` : `중${test.grade - 6}`;
  const pages = paginateQuestions(test.questions);
  const answerPageNeeded = showAnswers;
  const totalPages = pages.length + (answerPageNeeded ? 1 : 0);

  // 문제의 글로벌 인덱스 계산
  let globalIdx = 0;

  return (
    <div className="flex flex-col h-full">
      {/* 툴바 */}
      <ZoomToolbar
        scale={scale}
        scalePercent={scalePercent}
        onScaleFromSlider={setScaleFromSlider}
        onSetScale={setScale}
        onFitToContainer={fitToContainer}
        onPrint={() => window.print()}
        leftContent={
          <div className="flex items-center gap-3">
            <Link href={`/tests/${id}/results`} className="text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-bold text-text-primary">{test.title}</span>
            <span className="text-[10px] text-text-secondary">{totalPages}페이지</span>
          </div>
        }
        extraControls={
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={(e) => setShowAnswers(e.target.checked)}
              className="rounded border-slate-300"
            />
            정답 포함
          </label>
        }
      />

      {/* 미리보기 갤러리 */}
      <div ref={galleryRef} className="flex-1 overflow-auto bg-slate-100 p-6">
        <div className="flex flex-col items-center gap-6">
          {pages.map((pageQuestions, pageIdx) => {
            const startIdx = globalIdx;
            globalIdx += pageQuestions.length;
            return (
              <A4Page key={pageIdx} scale={scale}>
                <PrintableHeader
                  title={test.title}
                  subtitle={`${test.questionCount}문제`}
                  gradeBadge={gradeBadge}
                  isFirstPage={pageIdx === 0}
                  totalScore={test.questionCount * 10}
                  problemCount={test.questionCount}
                  pageInfo={totalPages > 1 ? `${pageIdx + 1} / ${totalPages}` : undefined}
                />
                <div className="space-y-3 mt-2">
                  {pageQuestions.map((q, qi) => {
                    const num = startIdx + qi + 1;
                    return (
                      <div key={q.id} className="break-inside-avoid">
                        <div className="flex items-start gap-2">
                          <span className="text-[11px] font-bold text-text-primary shrink-0 w-6 text-right">
                            {num}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] text-text-secondary">[{q.chapter}]</span>
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded leading-none ${
                                q.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                                q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS]}
                              </span>
                            </div>
                            <div className="text-[11px] text-text-primary leading-relaxed">
                              <MathRenderer content={q.content} />
                            </div>
                            {q.choices && q.choices.length > 0 && (
                              <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                {(q.choices as string[]).map((choice, ci) => (
                                  <div key={ci} className="flex items-start gap-1">
                                    <span className="text-text-secondary shrink-0">{ci + 1})</span>
                                    <MathRenderer content={choice} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="absolute bottom-4 right-6 text-[9px] text-slate-400">
                    {pageIdx + 1} / {totalPages}
                  </div>
                )}
              </A4Page>
            );
          })}

          {/* 정답 페이지 */}
          {answerPageNeeded && (
            <A4Page scale={scale}>
              <PrintableHeader
                title={test.title}
                subtitle="정답표"
                gradeBadge={gradeBadge}
                isFirstPage={false}
                pageInfo={`${totalPages} / ${totalPages}`}
              />
              <div className="mt-4">
                <h3 className="text-xs font-bold text-text-primary mb-3">정답표</h3>
                <div className="grid grid-cols-5 gap-2 text-[11px]">
                  {test.questions.map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded border border-slate-100">
                      <span className="font-bold text-text-secondary w-5">{idx + 1}.</span>
                      <span className="font-bold text-text-primary flex-1 [&_p]:inline [&_p]:m-0">
                        <MathRenderer content={q.answer} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </A4Page>
          )}
        </div>
      </div>

      {/* 인쇄 전용 (화면에서는 숨김) */}
      <div className="hidden print:block">
        {pages.map((pageQuestions, pageIdx) => {
          let printStartIdx = 0;
          for (let i = 0; i < pageIdx; i++) printStartIdx += pages[i].length;
          return (
            <A4PrintPage key={pageIdx} pageBreak={pageIdx < totalPages - 1}>
              <PrintableHeader
                title={test.title}
                subtitle={`${test.questionCount}문제`}
                gradeBadge={gradeBadge}
                isFirstPage={pageIdx === 0}
                totalScore={test.questionCount * 10}
                problemCount={test.questionCount}
                pageInfo={totalPages > 1 ? `${pageIdx + 1} / ${totalPages}` : undefined}
              />
              <div className="space-y-3 mt-2">
                {pageQuestions.map((q, qi) => {
                  const num = printStartIdx + qi + 1;
                  return (
                    <div key={q.id} className="break-inside-avoid">
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] font-bold text-text-primary shrink-0 w-6 text-right">
                          {num}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] text-text-secondary">[{q.chapter}]</span>
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded leading-none ${
                              q.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                              q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS]}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-primary leading-relaxed">
                            <MathRenderer content={q.content} />
                          </div>
                          {q.choices && q.choices.length > 0 && (
                            <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                              {(q.choices as string[]).map((choice, ci) => (
                                <div key={ci} className="flex items-start gap-1">
                                  <span className="text-text-secondary shrink-0">{ci + 1})</span>
                                  <MathRenderer content={choice} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="absolute bottom-4 right-6 text-[9px] text-slate-400">
                  {pageIdx + 1} / {totalPages}
                </div>
              )}
            </A4PrintPage>
          );
        })}
        {answerPageNeeded && (
          <A4PrintPage pageBreak={false}>
            <PrintableHeader
              title={test.title}
              subtitle="정답표"
              gradeBadge={gradeBadge}
              isFirstPage={false}
              pageInfo={`${totalPages} / ${totalPages}`}
            />
            <div className="mt-4">
              <h3 className="text-xs font-bold text-text-primary mb-3">정답표</h3>
              <div className="grid grid-cols-5 gap-2 text-[11px]">
                {test.questions.map((q, idx) => (
                  <div key={q.id} className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded border border-slate-100">
                    <span className="font-bold text-text-secondary w-5">{idx + 1}.</span>
                    <span className="font-bold text-text-primary flex-1 [&_p]:inline [&_p]:m-0">
                      <MathRenderer content={q.answer} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </A4PrintPage>
        )}
      </div>
    </div>
  );
}
