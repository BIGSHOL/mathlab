'use client';

import { X, Trophy, Star, ArrowRight, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useManualGradingStore } from '@/stores/manualGradingStore';

interface CompletionModalProps {
  onClose: () => void;
  onNewGrading: () => void;
}

export function CompletionModal({ onClose, onNewGrading }: CompletionModalProps) {
  const { completionResult, selectedTest, selectedStudent } = useManualGradingStore();

  if (!completionResult) return null;

  const { score, maxScore, correctCount, totalCount, xpEarned, isLevelTest } = completionResult;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-sm shadow-xl w-[420px] max-w-[90vw]">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-bold text-text-primary">채점 완료</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-sm">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-5 space-y-4">
          {/* 학생/시험 정보 */}
          <div className="text-center">
            <p className="text-xs text-slate-500">
              {selectedStudent?.name} · {selectedTest?.title}
            </p>
          </div>

          {/* 점수 카드 */}
          <div className="text-center py-4 bg-slate-50 rounded-sm">
            <div className="text-3xl font-black text-primary tabular-nums">
              {score}<span className="text-lg text-slate-400">/{maxScore}</span>
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {correctCount}/{totalCount} 정답 · 정답률 {accuracy}%
            </div>
          </div>

          {/* 통계 카드들 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-50 rounded-sm p-3 text-center">
              <Trophy className="w-4 h-4 text-emerald-500 mx-auto" />
              <div className="mt-1 text-lg font-bold text-emerald-700">{accuracy}%</div>
              <div className="text-[10px] text-emerald-600">정답률</div>
            </div>
            <div className="bg-amber-50 rounded-sm p-3 text-center">
              <Star className="w-4 h-4 text-amber-500 mx-auto" />
              <div className="mt-1 text-lg font-bold text-amber-700">{xpEarned}</div>
              <div className="text-[10px] text-amber-600">XP 획득</div>
            </div>
          </div>

          {/* 레벨테스트 안내 */}
          {isLevelTest && (
            <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-sm">
              <GraduationCap className="w-4 h-4 text-violet-500 shrink-0" />
              <div>
                <p className="text-xs font-bold text-violet-700">레벨테스트 분석 완료</p>
                <p className="text-[10px] text-violet-600">결과 페이지에서 진단 결과를 확인하세요</p>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-2">
          <button
            onClick={onNewGrading}
            className="flex-1 px-3 py-2 rounded-sm text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            새 채점 시작
          </button>
          {isLevelTest && selectedTest && (
            <Link
              href={`/level-test/${selectedTest.seq}/results`}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-sm text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              결과 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {!isLevelTest && (
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-sm text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-colors"
            >
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
