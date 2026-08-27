'use client';

import { useState, useMemo } from 'react';
import { FileText, ChevronDown, CheckCircle2, AlertTriangle, BookOpen, ClipboardList, BarChart3 } from 'lucide-react';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import { sumPoints } from '@/lib/exam-analysis/points';
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, ESSAY_CHECKLIST, ESSAY_DEDUCTION_CASES } from './constants';
import { ESSAY_ADVANCED_GUIDES } from '@/lib/exam-analysis/data/curriculum-strategies';

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
  const [activeGuideTab, setActiveGuideTab] = useState(ESSAY_ADVANCED_GUIDES[0]?.category || 'reasoning');

  // 서술형 문항 총 배점
  const totalEssayPoints = useMemo(
    () => sumPoints(essayQuestions.map((q) => q.points)),
    [essayQuestions],
  );

  const activeGuide = ESSAY_ADVANCED_GUIDES.find(g => g.category === activeGuideTab) || ESSAY_ADVANCED_GUIDES[0];

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
                  className="rounded-sm shadow-sm p-3 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-slate-800">
                      {q.question_number}번
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white"
                        style={{ backgroundColor: DIFFICULTY_COLORS[q.difficulty ?? ''] || '#94A3B8' }}
                      >
                        {DIFFICULTY_LABELS[q.difficulty ?? ''] || q.difficulty || '미정'}
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
                <div key={idx} className="rounded-sm shadow-sm p-3 bg-slate-50/50">
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
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-orange-50 shadow-sm"
                >
                  <span className="text-xs font-semibold text-orange-700">{dc.type}</span>
                  <span className="text-[10px] text-orange-500">{dc.example}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 서술형 답안 작성 공식 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-semibold text-slate-800">서술형 답안 작성 공식</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  step: '1단계',
                  title: '주어진 조건 정리',
                  description: '문제에서 알려준 것 / 구해야 할 것',
                  color: 'bg-blue-50',
                  textColor: 'text-blue-700',
                  borderColor: 'border-blue-200',
                },
                {
                  step: '2단계',
                  title: '풀이 전략 선택',
                  description: '어떤 공식이나 정리를 사용할지',
                  color: 'bg-purple-50',
                  textColor: 'text-purple-700',
                  borderColor: 'border-purple-200',
                },
                {
                  step: '3단계',
                  title: '풀이 과정 전개',
                  description: '계산 중간 과정을 모두 기재',
                  color: 'bg-amber-50',
                  textColor: 'text-amber-700',
                  borderColor: 'border-amber-200',
                },
                {
                  step: '4단계',
                  title: '최종 답 표기',
                  description: '단위 포함, 박스 또는 밑줄',
                  color: 'bg-emerald-50',
                  textColor: 'text-emerald-700',
                  borderColor: 'border-emerald-200',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-sm shadow-sm p-3 ${item.color} border-l-2 ${item.borderColor}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold ${item.textColor} px-1.5 py-0.5 rounded-sm bg-white/60`}>
                      {item.step}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 배점별 서술 분량 가이드 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <h4 className="text-sm font-semibold text-slate-800">배점별 서술 분량 가이드</h4>
            </div>
            <div className="space-y-2">
              {[
                {
                  points: '3~4점',
                  guide: '핵심 풀이 2~3줄 + 답',
                  detail: '간결하게 핵심만 서술. 공식 적용 1줄 + 계산 1~2줄 + 최종 답',
                  barWidth: '40%',
                  color: 'bg-emerald-500',
                },
                {
                  points: '5~6점',
                  guide: '조건 정리 1줄 + 풀이 3~4줄 + 답',
                  detail: '주어진 조건을 먼저 정리하고, 풀이 과정을 단계별로 전개',
                  barWidth: '65%',
                  color: 'bg-amber-500',
                },
                {
                  points: '7점 이상',
                  guide: '조건 정리 + 풀이 전략 + 상세 풀이 + 검증 + 답',
                  detail: '완전한 논술형 답안. 조건 정리, 사용할 정리 명시, 상세 풀이, 답 검증까지',
                  barWidth: '100%',
                  color: 'bg-red-500',
                },
              ].map((item, idx) => (
                <div key={idx} className="rounded-sm shadow-sm p-3 bg-slate-50/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold text-white ${item.color}`}>
                      {item.points}
                    </span>
                    <span className="text-xs font-medium text-slate-800">{item.guide}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">{item.detail}</p>
                  <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: item.barWidth }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 서술형 심화 가이드 (탭형 4카테고리) */}
          <div className="shadow-sm rounded-sm overflow-hidden">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-3 py-2.5 flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
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
              <div className="border-t bg-white">
                {/* 탭 버튼 */}
                <div className="flex border-b overflow-x-auto">
                  {ESSAY_ADVANCED_GUIDES.map(guide => (
                    <button
                      key={guide.category}
                      onClick={() => setActiveGuideTab(guide.category)}
                      className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                        activeGuideTab === guide.category
                          ? 'text-primary border-b-2 border-primary bg-primary/5'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {guide.title}
                    </button>
                  ))}
                </div>

                {/* 탭 내용 */}
                {activeGuide && (
                  <div className="px-4 py-3 space-y-3">
                    {/* 아이템 리스트 */}
                    <div className="space-y-2.5">
                      {activeGuide.templates.map((item: { situation: string; template: string; example: string }, idx: number) => (
                        <div key={idx} className="rounded-sm bg-slate-50/70 p-3">
                          <div className="flex items-start gap-2 mb-1.5">
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-slate-200 text-slate-700 shrink-0">
                              상황
                            </span>
                            <span className="text-xs font-medium text-slate-800">{item.situation}</span>
                          </div>
                          <div className="pl-0.5 space-y-1.5">
                            <div className="flex items-start gap-2">
                              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-indigo-100 text-indigo-700 shrink-0">
                                템플릿
                              </span>
                              <span className="text-xs text-slate-700">{item.template}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-emerald-100 text-emerald-700 shrink-0">
                                예시
                              </span>
                              <span className="text-xs text-slate-600 whitespace-pre-line">{item.example}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 채점 팁 */}
                    <div className="rounded-sm bg-amber-50/70 p-3">
                      <h6 className="text-[11px] font-semibold text-amber-800 mb-1.5">채점 포인트</h6>
                      <ul className="space-y-1">
                        {activeGuide.scoringTips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[11px] text-amber-700">
                            <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
