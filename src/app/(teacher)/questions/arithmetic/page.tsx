'use client';

import { useState } from 'react';
import { Calculator, Printer, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
} from '@/lib/services/arithmetic-generator';
import type {
  ArithmeticCategory,
  ArithmeticLevel,
  GeneratedProblem,
} from '@/lib/services/arithmetic-generator';

const CATEGORIES: ArithmeticCategory[] = [
  'addition', 'subtraction', 'multiplication', 'division', 'mixed',
  'fraction_add', 'fraction_sub', 'fraction_mul', 'fraction_div', 'decimal',
];
const LEVELS: ArithmeticLevel[] = ['easy', 'medium', 'hard'];

export default function ArithmeticGeneratorPage() {
  const [category, setCategory] = useState<ArithmeticCategory>('addition');
  const [level, setLevel] = useState<ArithmeticLevel>('easy');
  const [count, setCount] = useState(20);
  const [problems, setProblems] = useState<GeneratedProblem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/arithmetic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, level, count }),
      });
      if (res.ok) {
        const json = await res.json();
        setProblems(json.data);
        setShowAnswers(false);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2 mb-6">
        <Calculator className="w-6 h-6 text-primary" />
        연산 문제 생성기
      </h1>

      {/* Controls */}
      <Card className="p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">연산 유형</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ArithmeticCategory)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">난이도</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as ArithmeticLevel)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">문제 수</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {[10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>{n}문제</option>
              ))}
            </select>
          </div>
          <Button onClick={handleGenerate} loading={loading}>
            <RotateCcw className="w-4 h-4 mr-1" />
            생성하기
          </Button>
        </div>
      </Card>

      {/* Generated problems */}
      {problems.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4 print:hidden">
            <p className="text-sm text-text-secondary">
              {CATEGORY_LABELS[category]} · {LEVEL_LABELS[level]} · {problems.length}문제
            </p>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                정답 표시
              </label>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1" />
                인쇄
              </Button>
            </div>
          </div>

          <Card className="p-6 print:shadow-none print:border-none">
            {/* Print header */}
            <div className="hidden print:block text-center mb-6 pb-4 border-b border-slate-200">
              <h2 className="text-xl font-bold">연산 연습 문제</h2>
              <p className="text-sm text-slate-500 mt-1">
                {CATEGORY_LABELS[category]} · {LEVEL_LABELS[level]} · {problems.length}문제
              </p>
              <div className="mt-3 flex justify-center gap-8 text-sm">
                <span>이름: _______________</span>
                <span>날짜: _______________</span>
                <span>점수: ______ / {problems.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {problems.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 py-2 border-b border-slate-100"
                >
                  <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <div className="flex-1 text-sm text-text-primary">
                    <MathRenderer content={p.content} />
                  </div>
                  {showAnswers && (
                    <span className="text-sm font-bold text-primary shrink-0">
                      {p.answer}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Answer key for print */}
            {showAnswers && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-text-primary mb-2">정답</h3>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 text-xs">
                  {problems.map((p, idx) => (
                    <div key={idx} className="text-center">
                      <span className="text-slate-400">{idx + 1}.</span>{' '}
                      <span className="font-bold text-text-primary">{p.answer}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
