'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import type { CommentaryResult } from '@/lib/exam-analysis/agents/commentary-agent';
import { highlightText } from './helpers';
import { FORMAT_BADGE } from './constants';

interface CommentarySectionProps {
  commentary: CommentaryResult;
  questions: AnalyzedQuestion[];
  onRegenerate: () => void;
  isRegenerating: boolean;
  elapsedSeconds?: number;
  includeNearby: boolean;
  onIncludeNearbyChange: (v: boolean) => void;
  nearbyCount: number | null;
  includeYearCompare: boolean;
  onIncludeYearCompareChange: (v: boolean) => void;
  yearCount: number | null;
  hasSchool: boolean;
}

export function CommentarySection({
  commentary,
  questions: allQuestions,
  onRegenerate,
  isRegenerating,
  elapsedSeconds = 0,
  includeNearby,
  onIncludeNearbyChange,
  nearbyCount,
  includeYearCompare,
  onIncludeYearCompareChange,
  yearCount,
  hasSchool,
}: CommentarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 폴백 감지: 규칙 기반 결과는 overall_comment가 "총 N문항"으로 시작
  const isFallback = commentary.overall_comment?.startsWith('총 ') && !commentary.overall_comment?.includes('이번 시험');

  return (
    <div className={`bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-sm mb-5 ${isExpanded ? 'p-5' : 'px-4 py-2.5'}`}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between ${isExpanded ? 'mb-4' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className={`${isExpanded ? 'w-9 h-9' : 'w-7 h-7'} bg-violet-600 rounded-sm flex items-center justify-center shrink-0`}>
            <Sparkles className={`${isExpanded ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-white`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI 시험 총평</h3>
            {isExpanded && <p className="text-[11px] text-slate-500">전문가 수준의 종합 평가 및 인사이트</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isRegenerating && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRegenerate}
              className={`text-xs ${isFallback ? 'text-amber-600 hover:text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {isFallback ? 'AI 재분석' : '재분석'}
            </Button>
          )}
          {hasSchool && !isRegenerating && (
            <div className="flex items-center gap-3">
              <label className={`flex items-center gap-1 text-[11px] cursor-pointer ${nearbyCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                <input
                  type="checkbox"
                  checked={includeNearby && (nearbyCount ?? 0) > 0}
                  onChange={e => onIncludeNearbyChange(e.target.checked)}
                  disabled={nearbyCount === 0}
                  className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                />
                주변 {nearbyCount != null && <span className={nearbyCount > 0 ? 'text-violet-500 font-medium' : ''}>({nearbyCount}교)</span>}
              </label>
              <label className={`flex items-center gap-1 text-[11px] cursor-pointer ${yearCount === 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                <input
                  type="checkbox"
                  checked={includeYearCompare && (yearCount ?? 0) > 0}
                  onChange={e => onIncludeYearCompareChange(e.target.checked)}
                  disabled={yearCount === 0}
                  className="w-3 h-3 rounded-sm border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                />
                연도 {yearCount != null && <span className={yearCount > 0 ? 'text-violet-500 font-medium' : ''}>({yearCount}건)</span>}
              </label>
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && isFallback && !isRegenerating && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-3 py-2 mb-3 flex items-center gap-2">
          <span className="text-amber-500 text-xs">&#9888;</span>
          <p className="text-xs text-amber-700">AI 총평 생성에 실패하여 규칙 기반 요약으로 대체되었습니다. &quot;AI 재분석&quot; 버튼으로 다시 시도할 수 있습니다.</p>
        </div>
      )}

      {isRegenerating && (
        <div className="mt-3 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-violet-700">AI 재분석 중...</span>
            <span className="text-[11px] text-violet-500 tabular-nums">{elapsedSeconds}초</span>
          </div>
          <div className="h-1.5 bg-violet-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(elapsedSeconds / 60 * 100, 95)}%` }}
            />
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3">
          {/* 종합 분석 */}
          {commentary.overall_comment && (
            <div className="bg-white/70 rounded-sm p-4 border border-violet-200">
              <h4 className="text-xs font-semibold text-violet-800 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-violet-500 rounded-full" />
                종합 분석
              </h4>
              <div className="space-y-2">
                {commentary.overall_comment.split('\n').filter(Boolean).map((para, i) => (
                  <p key={i} className="text-sm text-slate-700 leading-relaxed">{highlightText(para.trim())}</p>
                ))}
              </div>
            </div>
          )}

          {/* 주변 학교 비교 + 연도별 비교 (분리 표시) */}
          {commentary.nearby_comparison && (() => {
            const paras = commentary.nearby_comparison!.split('\n').filter(Boolean);
            const yearParas = paras.filter(p => /이전\s*기출|연도|전년|작년|20\d{2}년.*비교/.test(p));
            const nearbyParas = paras.filter(p => !yearParas.includes(p));
            return (
              <>
                {includeNearby && nearbyParas.length > 0 && (
                  <div className="bg-white/70 rounded-sm p-4 border border-cyan-200">
                    <h4 className="text-xs font-semibold text-cyan-800 mb-2 flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-cyan-500 rounded-full" />
                      주변 학교 비교
                    </h4>
                    <div className="space-y-2">
                      {nearbyParas.map((para: string, i: number) => (
                        <p key={i} className="text-sm text-slate-700 leading-relaxed">{highlightText(para.trim())}</p>
                      ))}
                    </div>
                  </div>
                )}
                {includeYearCompare && yearParas.length > 0 && (
                  <div className="bg-white/70 rounded-sm p-4 border border-amber-200">
                    <h4 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                      <span className="w-1 h-3.5 bg-amber-500 rounded-full" />
                      연도별 비교
                    </h4>
                    <div className="space-y-2">
                      {yearParas.map((para: string, i: number) => (
                        <p key={i} className="text-sm text-slate-700 leading-relaxed">{highlightText(para.trim())}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* 등급별 점수 확보 전략 */}
          {commentary.score_strategies && commentary.score_strategies.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-indigo-800 mb-2 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                등급별 점수 확보 전략
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {commentary.score_strategies.map((s, i) => {
                  const colors = [
                    { border: 'border-amber-300', bg: 'bg-amber-50', badge: 'bg-amber-500', label: 'text-amber-800' },
                    { border: 'border-blue-300', bg: 'bg-blue-50', badge: 'bg-blue-500', label: 'text-blue-800' },
                    { border: 'border-slate-300', bg: 'bg-slate-50', badge: 'bg-slate-500', label: 'text-slate-700' },
                  ];
                  const c = colors[i] || colors[2];
                  return (
                    <div key={i} className={`rounded-sm border ${c.border} ${c.bg} p-3`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold text-white ${c.badge}`}>
                          {s.grade.split(' ')[0] || `${i + 1}등급`}
                        </span>
                        <span className={`text-xs font-semibold ${c.label}`}>{s.target}</span>
                      </div>
                      {s.points && s.points.length > 0 ? (
                        <ul className="space-y-1">
                          {s.points.map((p, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-xs text-slate-700">
                              <span className="text-slate-400 mt-0.5 shrink-0">•</span>
                              <span>{highlightText(p)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : s.strategy ? (
                        <p className="text-xs text-slate-700 leading-relaxed">{highlightText(s.strategy)}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : commentary.score_strategy ? (
            <div className="bg-white/70 rounded-sm p-4 border border-indigo-200">
              <h4 className="text-xs font-semibold text-indigo-800 mb-1.5 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                점수 확보 전략
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">{highlightText(commentary.score_strategy)}</p>
            </div>
          ) : null}

          {/* 강점 & 보완점 (2열) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commentary.strength_areas?.length > 0 && (
              <div className="bg-white/70 rounded-sm p-4 border border-green-200">
                <h4 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-green-500 rounded-full" />
                  강점 영역
                </h4>
                <ul className="space-y-1.5">
                  {commentary.strength_areas.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span className="text-green-500 mt-0.5 shrink-0">+</span>
                      <span>{highlightText(s)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {commentary.improvement_areas?.length > 0 && (
              <div className="bg-white/70 rounded-sm p-4 border border-amber-200">
                <h4 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-amber-500 rounded-full" />
                  주의 영역
                </h4>
                <ul className="space-y-1.5">
                  {commentary.improvement_areas.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <span className="text-amber-500 mt-0.5 shrink-0">!</span>
                      <span>{highlightText(s)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 주목할 문항 */}
          {commentary.notable_questions?.length > 0 && (
            <div className="bg-white/70 rounded-sm p-4 border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                <span className="w-1 h-3.5 bg-slate-500 rounded-full" />
                주목할 문항
              </h4>
              <div className="space-y-2.5">
                {[...commentary.notable_questions].sort((a, b) => {
                  const aStr = String(a.question_number);
                  const bStr = String(b.question_number);
                  const aIsEssay = /[^\d]/.test(aStr);
                  const bIsEssay = /[^\d]/.test(bStr);
                  // 객관식(숫자만) 먼저, 서술형(문자포함) 나중
                  if (aIsEssay !== bIsEssay) return aIsEssay ? 1 : -1;
                  // 같은 그룹 내에서는 숫자 추출 후 정렬
                  const aNum = parseInt(aStr.replace(/\D/g, '')) || 999;
                  const bNum = parseInt(bStr.replace(/\D/g, '')) || 999;
                  return aNum - bNum;
                }).map((q, i) => {
                  const qRaw = String(q.question_number || i + 1);
                  const qNumOnly = qRaw.replace(/\D/g, '') || qRaw;
                  // 실제 문항 매칭: 정확 → 숫자 부분 일치
                  const matched = allQuestions.find(aq => String(aq.question_number) === qRaw)
                    || allQuestions.find(aq => String(aq.question_number).replace(/\D/g, '') === qNumOnly);
                  const format = matched?.question_format || null;
                  const fmt = format ? FORMAT_BADGE[format] : null;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="shrink-0 flex flex-col items-center gap-1">
                        <span className="w-8 h-8 rounded-sm bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                          {qNumOnly}
                        </span>
                        {fmt && (
                          <span className={`text-[9px] font-medium px-1 py-0.5 rounded-sm ${fmt.cls}`}>
                            {fmt.label}
                          </span>
                        )}
                      </div>
                      <p className="flex-1 text-xs text-slate-700 leading-relaxed pt-1">{highlightText(q.comment)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 지도 추천 (teaching_recommendations 우선, 레거시 study_priority 폴백) */}
          {(() => {
            const recs = commentary.teaching_recommendations ?? commentary.study_priority ?? [];
            if (recs.length === 0) return null;
            return (
              <div className="bg-white/70 rounded-sm p-4 border border-blue-200">
                <h4 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                  <span className="w-1 h-3.5 bg-blue-500 rounded-full" />
                  지도 추천
                </h4>
                <div className="space-y-1.5">
                  {recs.map((sp, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        i === 0 ? 'bg-blue-600 text-white' : i === 1 ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {sp.priority}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800">{sp.topic}</p>
                        <p className="text-slate-500 mt-0.5">{highlightText(sp.reason)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
