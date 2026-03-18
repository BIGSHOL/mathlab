'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { DIFFICULTY_LABELS } from '@/types';

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

export default function PrintWorksheetPage() {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

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

  return (
    <>
      {/* Control bar (hidden in print) */}
      <div className="print:hidden p-4 border-b border-slate-200 bg-white sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/tests/${id}/results`} className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-bold text-text-primary">인쇄 미리보기</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={(e) => setShowAnswers(e.target.checked)}
              className="rounded border-slate-300"
            />
            정답 포함
          </label>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" />
            인쇄하기
          </Button>
        </div>
      </div>

      {/* Printable content */}
      <div className="max-w-[210mm] mx-auto bg-white p-8 print:p-6">
        {/* Header */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-2xl font-black text-text-primary print:text-xl">{test.title}</h1>
          <div className="flex justify-center items-center gap-4 mt-2 text-sm text-text-secondary print:text-xs">
            <span>{test.grade <= 6 ? `초등 ${test.grade}학년` : `중등 ${test.grade - 6}학년`}</span>
            <span>|</span>
            <span>{test.questionCount}문제</span>
            <span>|</span>
            <span>{new Date().toLocaleDateString('ko-KR')}</span>
          </div>
          <div className="mt-4 border-t border-b border-slate-300 py-3 flex gap-8 print:gap-4 print:mt-2 print:py-2">
            <div className="text-sm print:text-xs">
              <span className="text-text-secondary">이름: </span>
              <span className="inline-block w-32 border-b border-slate-300 print:w-24" />
            </div>
            <div className="text-sm print:text-xs">
              <span className="text-text-secondary">점수: </span>
              <span className="inline-block w-20 border-b border-slate-300 print:w-16" />
              <span className="text-text-secondary"> / {test.questionCount * 10}</span>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6 print:space-y-4">
          {test.questions.map((q, idx) => (
            <div key={q.id} className="break-inside-avoid">
              <div className="flex items-start gap-3">
                <span className="text-sm font-bold text-text-primary shrink-0 w-8 print:text-xs">
                  {idx + 1}.
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-text-secondary print:text-[8px]">
                      [{q.chapter}]
                    </span>
                    <span className={`text-xs font-bold px-1 py-0.5 rounded print:text-[7px] ${
                      q.difficulty === 'BASIC' ? 'bg-green-100 text-green-700' :
                      q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      q.difficulty === 'HIGH' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {DIFFICULTY_LABELS[q.difficulty as keyof typeof DIFFICULTY_LABELS]}
                    </span>
                  </div>
                  <div className="text-sm text-text-primary print:text-xs">
                    <MathRenderer content={q.content} />
                  </div>
                  {q.choices && q.choices.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm print:text-xs">
                      {(q.choices as string[]).map((choice, ci) => (
                        <div key={ci} className="flex items-start gap-1">
                          <span className="text-text-secondary shrink-0">{ci + 1})</span>
                          <MathRenderer content={choice} />
                        </div>
                      ))}
                    </div>
                  )}
                  {showAnswers && (
                    <div className="mt-1 text-xs text-emerald-600 font-semibold print:text-xs [&_p]:inline [&_p]:m-0">
                      정답: <MathRenderer content={q.answer} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Answer key at the bottom (if showing answers) */}
        {showAnswers && (
          <div className="mt-8 pt-4 border-t border-slate-300 break-inside-avoid print:mt-4">
            <h3 className="text-sm font-bold text-text-primary mb-2 print:text-xs">정답표</h3>
            <div className="flex flex-wrap gap-3 text-xs print:text-xs">
              {test.questions.map((q, idx) => (
                <span key={q.id} className="text-text-secondary">
                  {idx + 1}. <span className="font-bold text-text-primary [&_p]:inline [&_p]:m-0"><MathRenderer content={q.answer} /></span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
