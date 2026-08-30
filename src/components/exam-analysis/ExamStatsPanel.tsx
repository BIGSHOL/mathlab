'use client';

import { useState } from 'react';
import { BarChart3, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import {
  achievementSum,
  examStatsAttribution,
  hasAchievement,
  hasAnyExamStats,
  readExamStats,
  type ExamStats,
} from '@/lib/exam-analysis/shared/exam-stats';

/**
 * 학교 공지 실측 지표 — 입력·표시.
 *
 * ## 없을 때가 기본이다
 *
 * 성적표는 시험 2~4주 뒤에 나오고 학교가 공지하지 않으면 알 방법이 없다. 그래서
 * **값이 없으면 카드도 헤딩도 만들지 않고**, 접근 경로만 한 줄로 남긴다.
 * 빈 카드에 "—"를 채워 두면 사용자는 "분석이 빠졌다"고 읽는다.
 *
 * 값은 우리가 계산한 게 아니라 사람이 옮겨 적은 것이므로, 화면에 **누가 언제 넣었는지**를
 * 함께 보여준다(§12-5 — 검증 불가 수치를 공식 지표처럼 보이게 하지 않는다).
 */

const GRADES = ['A', 'B', 'C', 'D', 'E'] as const;

type Draft = {
  subjectAverage: string;
  examinees: string;
  standardDeviation: string;
  A: string; B: string; C: string; D: string; E: string;
  source: string;
};

function toDraft(s: ExamStats): Draft {
  const n = (v: number | null) => (v === null ? '' : String(v));
  return {
    subjectAverage: n(s.subjectAverage),
    examinees: n(s.examinees),
    standardDeviation: n(s.standardDeviation),
    A: n(s.achievement?.A ?? null),
    B: n(s.achievement?.B ?? null),
    C: n(s.achievement?.C ?? null),
    D: n(s.achievement?.D ?? null),
    E: n(s.achievement?.E ?? null),
    source: s.source ?? '',
  };
}

/** 빈 칸은 보내지 않는다 — 모르는 축을 0 으로 만들지 않기 위해서다. */
function numOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function ExamStatsPanel({
  examPaperId,
  raw,
  onSaved,
}: {
  examPaperId: string;
  raw: unknown;
  onSaved: () => void;
}) {
  const stats = readExamStats(raw);
  const has = hasAnyExamStats(stats);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(stats));
  const [saving, setSaving] = useState(false);

  const open = () => { setDraft(toDraft(readExamStats(raw))); setEditing(true); };

  const save = async () => {
    setSaving(true);
    try {
      const achievement = {
        A: numOrNull(draft.A), B: numOrNull(draft.B), C: numOrNull(draft.C),
        D: numOrNull(draft.D), E: numOrNull(draft.E),
      };
      const anyAch = GRADES.some((g) => achievement[g] !== null);
      const res = await fetch(`/api/exam-analysis/${examPaperId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examStats: {
            subjectAverage: numOrNull(draft.subjectAverage),
            examinees: numOrNull(draft.examinees),
            standardDeviation: numOrNull(draft.standardDeviation),
            achievement: anyAch ? achievement : null,
            source: draft.source.trim() || null,
          },
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error?.message || '저장에 실패했습니다');
      }
      toast.success('학교 공지 지표를 저장했습니다');
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/exam-analysis/${examPaperId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examStats: null }),
      });
      if (!res.ok) throw new Error('삭제에 실패했습니다');
      toast.success('학교 공지 지표를 지웠습니다');
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // ── 편집 폼 ──
  if (editing) {
    const sum = GRADES.map((g) => numOrNull(draft[g])).filter((v): v is number => v !== null);
    const achSum = sum.length ? Math.round(sum.reduce((a, b) => a + b, 0) * 10) / 10 : null;
    const field = (label: string, key: keyof Draft, unit: string, ph: string) => (
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <span className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={draft[key]}
            placeholder={ph}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value.replace(/[^0-9.]/g, '') })}
            className="w-full border rounded-sm px-2 py-1 text-sm"
          />
          <span className="text-[11px] text-slate-400 shrink-0">{unit}</span>
        </span>
      </label>
    );

    return (
      <div className="border border-slate-200 rounded-sm p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-slate-800">학교 공지 지표 입력</div>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          학교가 공지한 값만 적으세요. <strong className="text-slate-600">모르는 항목은 비워 두면 됩니다</strong> —
          빈 칸은 저장되지 않고, 총평도 아는 값만 사용합니다.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {field('과목평균', 'subjectAverage', '점', '73.4')}
          {field('응시자 수', 'examinees', '명', '188')}
          {field('표준편차', 'standardDeviation', '', '15.2')}
        </div>

        <div className="mb-3">
          <div className="text-[11px] font-medium text-slate-500 mb-1">
            성취도 분포 (%)
            {achSum !== null && (
              <span className={`ml-2 ${Math.abs(achSum - 100) > 3 ? 'text-amber-600' : 'text-slate-400'}`}>
                합 {achSum}%
                {Math.abs(achSum - 100) > 3 && ' — 확인해 보세요'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {GRADES.map((g) => (
              <label key={g} className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 text-center">{g}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft[g]}
                  onChange={(e) => setDraft({ ...draft, [g]: e.target.value.replace(/[^0-9.]/g, '') })}
                  className="w-full border rounded-sm px-1.5 py-1 text-sm text-center"
                />
              </label>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 mb-4">
          <span className="text-[11px] font-medium text-slate-500">출처</span>
          <input
            type="text"
            value={draft.source}
            placeholder="학교 공지 / 성적표"
            maxLength={60}
            onChange={(e) => setDraft({ ...draft, source: e.target.value })}
            className="w-full border rounded-sm px-2 py-1 text-sm"
          />
        </label>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={saving}>{saving ? '저장 중...' : '저장'}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>취소</Button>
          {has && (
            <button onClick={clear} disabled={saving} className="ml-auto text-[11px] text-slate-400 hover:text-red-600">
              지우기
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 값 없음: 카드를 만들지 않고 접근 경로만 한 줄 ──
  if (!has) {
    return (
      <button
        onClick={open}
        className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-primary transition-colors"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        학교 공지 지표 입력 (과목평균·성취도 분포)
      </button>
    );
  }

  // ── 값 있음 ──
  const attribution = examStatsAttribution(stats);
  const achSum = achievementSum(stats);

  return (
    <div className="border border-slate-200 rounded-sm p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-800">학교 공지 지표</span>
        </div>
        <button onClick={open} className="text-slate-400 hover:text-primary" aria-label="수정">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-2">
        {stats.subjectAverage !== null && (
          <div>
            <div className="text-[10px] text-slate-400">과목평균</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">{stats.subjectAverage}<span className="text-xs font-normal text-slate-400 ml-0.5">점</span></div>
          </div>
        )}
        {stats.examinees !== null && (
          <div>
            <div className="text-[10px] text-slate-400">응시자</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">{stats.examinees}<span className="text-xs font-normal text-slate-400 ml-0.5">명</span></div>
          </div>
        )}
        {stats.standardDeviation !== null && (
          <div>
            <div className="text-[10px] text-slate-400">표준편차</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">{stats.standardDeviation}</div>
          </div>
        )}
      </div>

      {hasAchievement(stats) && (
        <div className="mb-2">
          <div className="text-[10px] text-slate-400 mb-1">
            성취도 분포{achSum !== null && achSum !== 100 && <span className="ml-1.5 text-slate-300">합 {achSum}%</span>}
          </div>
          <div className="flex gap-1">
            {GRADES.map((g) => {
              const v = stats.achievement?.[g] ?? null;
              if (v === null) return null;
              return (
                <div key={g} className="flex-1 min-w-0 border border-slate-100 rounded-sm px-1.5 py-1 text-center">
                  <div className="text-[10px] text-slate-400">{g}</div>
                  <div className="text-xs font-semibold text-slate-700 tabular-nums">{v}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 우리가 계산한 값이 아니라는 것을 화면이 밝힌다 */}
      {attribution && <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">{attribution}</div>}
    </div>
  );
}
