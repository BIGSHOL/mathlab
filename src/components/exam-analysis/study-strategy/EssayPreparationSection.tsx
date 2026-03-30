'use client';

import { useState, useMemo } from 'react';
import { FileText, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, ESSAY_CHECKLIST, ESSAY_DEDUCTION_CASES } from './constants';

interface EssayPreparationSectionProps {
  essayQuestions: AnalyzedQuestion[];
  isSectionExpanded: boolean;
  onToggleSection: () => void;
}

export function EssayPreparationSection({
  essayQuestions,
  isSectionExpanded,
  onToggleSection,
}: EssayPreparationSectionProps) {
  const [showGuide, setShowGuide] = useState(false);

  // 서술형 문항 총 배점
  const totalEssayPoints = useMemo(
    () => essayQuestions.reduce((s, q) => s + (q.points || 0), 0),
    [essayQuestions],
  );

  if (essayQuestions.length === 0) return null;

  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      {/* 섹션 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3.5 flex items-center gap-3 bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-sm bg-amber-500/15 flex items-center justify-center shrink-0">
          <FileText className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold text-slate-800">서술형 대비 전략</span>
          <span className="text-xs text-slate-400 ml-2">
            {essayQuestions.length}문항, 총 {totalEssayPoints}점
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isSectionExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 확장 내용 */}
      {isSectionExpanded && (
        <div className="px-4 pb-4 border-t space-y-4 pt-4">
          {/* 서술형 문항 카드 그리드 (2x2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {essayQuestions.map(q => {
              const topic = q.topic ? q.topic.split(' > ').pop() || q.topic : '미분류';
              return (
                <div
                  key={String(q.question_number)}
                  className="rounded-sm border border-slate-100 p-3 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-slate-800">
                      {q.question_number}번
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white"
                        style={{ backgroundColor: DIFFICULTY_COLORS[q.difficulty] || '#94A3B8' }}
                      >
                        {DIFFICULTY_LABELS[q.difficulty] || q.difficulty}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {q.points || 0}점
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 truncate">{topic}</p>
                </div>
              );
            })}
          </div>

          {/* 서술형 감점 방지 체크리스트 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h4 className="text-sm font-semibold text-slate-800">서술형 감점 방지 체크리스트</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ESSAY_CHECKLIST.map((cat, idx) => (
                <div key={idx} className="rounded-sm border border-slate-100 p-3 bg-slate-50/50">
                  <h5 className="text-xs font-semibold text-slate-800 mb-2">{cat.category}</h5>
                  {/* 체크 항목 */}
                  <ul className="space-y-1.5 mb-2.5">
                    {cat.checkPoints.map((cp, cpIdx) => (
                      <li
                        key={cpIdx}
                        className="flex items-start gap-2 text-xs text-slate-600"
                      >
                        <span className="w-3.5 h-3.5 rounded border border-slate-300 bg-white shrink-0 mt-0.5 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-sm bg-slate-200" />
                        </span>
                        {cp}
                      </li>
                    ))}
                  </ul>
                  {/* 주요 실수 */}
                  <div className="flex flex-wrap gap-1">
                    {cat.commonErrors.map((err, errIdx) => (
                      <span
                        key={errIdx}
                        className="px-1.5 py-0.5 rounded-sm text-[10px] bg-red-50 text-red-600 border border-red-100"
                      >
                        {err}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주요 감점 사례 */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h4 className="text-xs font-semibold text-slate-800">주요 감점 사례</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {ESSAY_DEDUCTION_CASES.map((dc, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-orange-50 border border-orange-100"
                >
                  <span className="text-xs font-semibold text-orange-700">{dc.type}</span>
                  <span className="text-[10px] text-orange-500">{dc.example}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 서술형 심화 가이드 토글 */}
          <div className="border rounded-sm overflow-hidden">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-3 py-2.5 flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="text-xs font-medium text-slate-700 flex-1 text-left">
                서술형 심화 가이드 보기
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  showGuide ? 'rotate-180' : ''
                }`}
              />
            </button>
            {showGuide && (
              <div className="px-4 py-3 border-t bg-white space-y-3">
                <GuideItem
                  title="서술형 답안 작성 공식"
                  items={[
                    '1단계: 주어진 조건 정리 (문제에서 알려준 것 / 구해야 할 것)',
                    '2단계: 풀이 전략 선택 (어떤 공식이나 정리를 사용할지)',
                    '3단계: 풀이 과정 전개 (계산 중간 과정을 모두 기재)',
                    '4단계: 최종 답 표기 (단위 포함, 박스 또는 밑줄)',
                  ]}
                />
                <GuideItem
                  title="배점별 서술 분량 가이드"
                  items={[
                    '3~4점: 핵심 풀이 2~3줄 + 답',
                    '5~6점: 조건 정리 1줄 + 풀이 3~4줄 + 답',
                    '7점 이상: 조건 정리 + 풀이 전략 + 상세 풀이 + 검증 + 답',
                  ]}
                />
                <GuideItem
                  title="감점을 피하는 수식 표기법"
                  items={[
                    '등호(=)를 연속으로 나열하지 말 것 (줄 바꿔서 단계별 전개)',
                    '곱셈 기호 생략 시 괄호로 명확히: 2(x+1) (O), 2x+1 (X)',
                    '분수는 가로줄을 명확히 그어서 분자/분모 구분',
                    '인수분해, 연립방정식 등 중간 변환 과정 명시',
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 심화 가이드 아이템 ──

function GuideItem({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h5 className="text-xs font-semibold text-slate-700 mb-1.5">{title}</h5>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
            <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
