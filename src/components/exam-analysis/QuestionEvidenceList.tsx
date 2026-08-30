'use client';

import {
  isTagLikeReason,
  type QuestionEvidence,
} from '@/lib/exam-analysis/shared/question-evidence';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/lib/exam-analysis/shared/constants';
import { renderInlineMath } from '@/lib/exam-analysis/rendering';

/**
 * 문항 근거 목록 — AI 가 시험지를 보고 쓴 문항별 소견.
 *
 * 학습 대책 탭의 조언은 전부 정적 카탈로그라 어느 시험에서나 같은 문장이 나온다.
 * 이 목록이 그 옆에서 "그래서 이 시험은?" 에 답한다.
 *
 * ## 왜 컴포넌트로 빼는가
 * 같은 목록이 세 곳에 필요하다 — 영역별 학습 전략(수학) · 킬러 문항 경고(수학) ·
 * 이 시험에서 특히 볼 문항(영어). 인라인으로 복제하면 세 곳의 생김새가 갈라진다
 * (프로젝트 규칙 #3 뷰 일관성 — 같은 항목은 어디서나 같은 뷰).
 *
 * ## 배치 근거 (측정으로 정함)
 * `difficulty_reason` 은 평균 8자짜리 짧은 태그이고 `ai_comment` 가 47~53자 본문이다.
 * 그래서 근거는 번호 옆 **배지**로, 소견은 **본문**으로 놓는다.
 * 처음엔 반대로 넣었다가(킬러 문항이니 "왜 어려운가" 가 본론일 거라 가정) 실측에서 뒤집었다.
 */
export function QuestionEvidenceList({
  items,
  keyPrefix,
}: {
  items: QuestionEvidence[];
  /** renderInlineMath 의 key 충돌 방지 — 한 화면에 여러 목록이 있을 수 있다 */
  keyPrefix: string;
}) {
  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((ev) => {
        const tagReason = isTagLikeReason(ev.reason);
        return (
          <li key={ev.number} className="py-2 first:pt-0 last:pb-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-700">{ev.number}번</span>
              {ev.difficulty && (
                <span
                  className="px-1 py-0.5 rounded-sm text-[9px] font-bold text-white"
                  style={{ backgroundColor: DIFFICULTY_COLORS[ev.difficulty] || '#94A3B8' }}
                >
                  {DIFFICULTY_LABELS[ev.difficulty] || ev.difficulty}
                </span>
              )}
              {ev.points !== null && (
                <span className="text-[10px] text-slate-500 tabular-nums">{ev.points}점</span>
              )}
              {ev.isEssay && (
                <span className="text-[9px] font-medium text-amber-700 bg-amber-50 px-1 py-0.5 rounded-sm">
                  서술형
                </span>
              )}
              {tagReason && (
                <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1 py-0.5 rounded-sm">
                  {ev.reason}
                </span>
              )}
            </div>

            {/* AI 생성 텍스트 — renderInlineMath 를 거치지 않으면 raw $ 가 노출되고
                영문 enum 방어막(normalizeKoreanLabels)도 통과하지 않는다. */}
            {ev.comment && (
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {renderInlineMath(ev.comment, `${keyPrefix}-c-${ev.number}`)}
              </p>
            )}
            {/* 근거가 배지로 못 들어갈 만큼 길면 문단으로 흐르게 둔다 */}
            {ev.reason && !tagReason && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                난이도 근거: {renderInlineMath(ev.reason, `${keyPrefix}-r-${ev.number}`)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
