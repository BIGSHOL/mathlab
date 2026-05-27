'use client';

/**
 * 문제은행 인쇄/PDF 출력 페이지
 *
 * 호출 경로: /questions → QuestionListMain의 [PDF 내보내기] 버튼 → 새 탭으로 열림
 * 데이터 전달: sessionStorage 키 'questionsPrintData' (JSON 직렬화된 QuestionItem[])
 *
 * - A4 portrait (210mm × 297mm)
 * - `break-inside: avoid`로 문항이 페이지 경계에서 잘리지 않음
 * - 정답/해설 토글 (UI 헤더에서 체크박스)
 * - window.print() 호출 → 브라우저 인쇄 대화상자 → PDF로 저장 가능
 *
 * 기존 패턴 참고: /tests/[id]/print, /exam-analysis/[id]/print
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Printer, ArrowLeft, FileQuestion } from 'lucide-react';
import { MathRenderer } from '@/components/math/MathRenderer';
import type { QuestionItem } from '@/components/teacher/questions/question-types';

const DIFFICULTY_LABEL: Record<string, string> = {
  BASIC: '기본',
  MEDIUM: '표준',
  HIGH: '심화',
  HIGHEST: '최고난도',
};

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: '객관식',
  SHORT_ANSWER: '단답형',
  ESSAY: '서술형',
};

export default function QuestionsPrintPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [showAnswers, setShowAnswers] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // sessionStorage에서 인쇄 대상 문항 불러오기
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('questionsPrintData');
      if (raw) {
        const parsed = JSON.parse(raw) as QuestionItem[];
        if (Array.isArray(parsed)) {
          setQuestions(parsed);
        }
      }
    } catch (e) {
      console.error('[questions/print] sessionStorage 파싱 실패:', e);
    } finally {
      setLoaded(true);
    }
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500 p-8">
        <FileQuestion className="w-12 h-12 text-slate-300" />
        <p className="text-base">인쇄할 문항이 없습니다.</p>
        <p className="text-sm">/questions 페이지에서 [PDF 내보내기]를 다시 클릭해 주세요.</p>
        <Button variant="secondary" size="sm" onClick={() => window.close()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 닫기
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* 화면 헤더 (인쇄 시 숨김) */}
      <div className="print:hidden bg-white border-b sticky top-0 z-10 px-6 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-base font-bold">
          문제은행 출력 <span className="text-sm font-normal text-slate-500 ml-1">({questions.length}문항)</span>
        </h1>
        <div className="flex-1" />
        <label className="text-sm flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showAnswers}
            onChange={(e) => setShowAnswers(e.target.checked)}
          />
          정답 표시
        </label>
        <label className="text-sm flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={showExplanation}
            onChange={(e) => setShowExplanation(e.target.checked)}
          />
          해설 표시
        </label>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> 인쇄 / PDF 저장
        </Button>
      </div>

      {/* A4 인쇄 영역 */}
      <div className="max-w-[210mm] mx-auto my-6 bg-white px-[15mm] py-[15mm] print:m-0 print:max-w-none print:shadow-none shadow rounded-sm">
        {/* 출력 메타 헤더 */}
        <div className="text-xs text-slate-500 mb-5 pb-2 border-b border-slate-200 flex justify-between">
          <span>MathLab 문제은행 · {questions.length}문항</span>
          <span>{new Date().toLocaleDateString('ko-KR')}</span>
        </div>

        {/* 문항 리스트 */}
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="mb-6 pb-4 border-b border-slate-100 last:border-0"
            style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
          >
            <div className="flex items-baseline gap-2 mb-2 flex-wrap">
              <span className="text-base font-bold text-slate-900">{idx + 1}.</span>
              <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200">
                {q.chapter}{q.section ? ` > ${q.section}` : ''}
              </span>
              <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200">
                {DIFFICULTY_LABEL[q.difficulty] || q.difficulty}
              </span>
              <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-sm border border-slate-200">
                {TYPE_LABEL[q.type] || q.type}
              </span>
              {q.domain && (
                <span className="text-[10px] text-violet-700 bg-violet-50 px-2 py-0.5 rounded-sm border border-violet-200">
                  {q.domain}
                </span>
              )}
            </div>

            {/* 문제 본문 */}
            <div className="ml-6 mb-3 text-sm text-slate-800">
              <MathRenderer content={q.content} />
            </div>

            {/* 객관식 보기 */}
            {q.choices && q.choices.length > 0 && (
              <div
                className={`ml-6 grid gap-x-4 gap-y-1 mb-3 ${
                  q.choiceColumns === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {q.choices.map((c, i) => (
                  <div
                    key={i}
                    className="text-sm text-slate-700 px-3 py-2 bg-slate-50 rounded-sm border border-slate-200"
                  >
                    <MathRenderer content={c} />
                  </div>
                ))}
              </div>
            )}

            {/* 정답 */}
            {showAnswers && q.answer && (
              <div className="ml-6 mt-2 text-sm">
                <span className="font-bold text-emerald-700">정답: </span>
                <span className="text-slate-800">
                  <MathRenderer content={q.answer} inline />
                </span>
              </div>
            )}

            {/* 해설 */}
            {showExplanation && q.explanation && (
              <div className="ml-6 mt-2 text-xs text-slate-700 p-3 bg-amber-50 border-l-2 border-amber-300 rounded-sm">
                <div className="font-bold text-amber-800 mb-1">해설</div>
                <MathRenderer content={q.explanation} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 인쇄 전용 CSS */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
