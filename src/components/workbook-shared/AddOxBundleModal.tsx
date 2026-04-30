'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckSquare, X, Save } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { MathRenderer } from '@/components/math/MathRenderer';
import {
  CATEGORY_LABELS,
  IMPLEMENTED_CATEGORIES,
  LEVEL_LABELS,
  QUESTION_TYPE_LABELS,
} from '@/lib/services/ox-generator';
import type {
  OxQuizCategory,
  OxLevel,
  OxQuestionType,
} from '@/lib/services/ox-generator';

const COLOR_NAVY = '#081429';
const COLOR_YELLOW = '#fdb813';
const COLOR_GREY = '#373d41';

const ALL_CATEGORIES: OxQuizCategory[] = [
  'm1_pf_misconception',
  'm1_int_rational',
  'm1_equation',
  'm1_geometry',
  'm1_statistics',
];
const LEVELS: OxLevel[] = ['easy', 'medium', 'hard'];
const QUESTION_TYPES: OxQuestionType[] = [
  'definition',
  'property',
  'computation',
  'application',
  'misconception',
];
const COUNT_OPTIONS = [5, 10, 20, 30, 50] as const;

interface OxStatementRow {
  id: string;
  categoryId: string;
  level: string;
  content: string;
  answer: string;
  questionType: string | null;
  isActive: boolean;
}

interface Props {
  workbookId: string;
  sectionId: string;
  onClose: () => void;
  onAdded: () => void;
}

/**
 * 워크북 편집 페이지에서 "OX 묶음 추가" 버튼 클릭 시 열리는 모달.
 * 단원/난이도/유형 필터로 OxStatement 풀을 미리보고, 무작위 N개를 선택해 워크북에 추가.
 */
export function AddOxBundleModal({ workbookId, sectionId, onClose, onAdded }: Props) {
  const [category, setCategory] = useState<OxQuizCategory>('m1_pf_misconception');
  const [level, setLevel] = useState<OxLevel>('easy');
  const [selectedTypes, setSelectedTypes] = useState<Set<OxQuestionType>>(new Set());
  const [count, setCount] = useState<number>(10);

  const [pool, setPool] = useState<OxStatementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 풀 미리보기 (필터 변경 시 재로드)
  const fetchPool = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('category', category);
      params.set('level', level);
      params.set('isActive', 'true');
      const res = await fetch(`/api/admin/ox-statements?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setPool(json.data?.statements ?? []);
      }
    } catch (err) {
      console.error('[AddOxBundleModal] 풀 조회 실패:', err);
    }
    setLoading(false);
  }, [category, level]);

  useEffect(() => {
    fetchPool();
  }, [fetchPool]);

  // 유형 필터 적용 후 후보 진술
  const candidates = useMemo(() => {
    if (selectedTypes.size === 0) return pool;
    return pool.filter((s) => s.questionType && selectedTypes.has(s.questionType as OxQuestionType));
  }, [pool, selectedTypes]);

  const toggleType = (qt: OxQuestionType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(qt)) next.delete(qt);
      else next.add(qt);
      return next;
    });
  };

  const handleAdd = async () => {
    if (candidates.length === 0) {
      toast.warning('조건에 맞는 진술이 없습니다');
      return;
    }
    const picked = sampleRandom(candidates, Math.min(count, candidates.length));
    const statementIds = picked.map((s) => s.id);

    setSubmitting(true);
    try {
      const res = await fetch(`/api/workbooks/${workbookId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'OX_BUNDLE',
          sectionId,
          answerSpace: 'NONE',
          inlineData: {
            category,
            level,
            questionTypes: selectedTypes.size > 0 ? Array.from(selectedTypes) : undefined,
            statementIds,
            count: statementIds.length,
          },
        }),
      });
      if (res.ok) {
        toast.success(`${statementIds.length}개 진술이 워크북에 추가되었습니다`);
        onAdded();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || '추가 실패');
      }
    } catch (err) {
      console.error('[AddOxBundleModal] 추가 실패:', err);
      toast.error('추가에 실패했습니다');
    }
    setSubmitting(false);
  };

  const previewCount = Math.min(count, candidates.length);
  const insufficient = candidates.length < count;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: COLOR_NAVY }}>
            <CheckSquare className="w-5 h-5" />
            OX 묶음 추가
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-sm hover:bg-slate-100"
            disabled={submitting}
          >
            <X className="w-5 h-5" style={{ color: COLOR_GREY }} />
          </button>
        </div>

        <div className="space-y-4">
          {/* 단원 + 난이도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                단원
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OxQuizCategory)}
                className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm bg-white"
              >
                {ALL_CATEGORIES.filter((c) => IMPLEMENTED_CATEGORIES.has(c)).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
                난이도
              </label>
              <div className="flex gap-1">
                {LEVELS.map((lv) => {
                  const isActive = lv === level;
                  return (
                    <button
                      key={lv}
                      onClick={() => setLevel(lv)}
                      className="flex-1 px-2 py-2 text-xs font-semibold rounded-sm border transition-colors"
                      style={
                        isActive
                          ? { borderColor: COLOR_NAVY, backgroundColor: COLOR_NAVY, color: 'white' }
                          : { borderColor: COLOR_GREY, color: COLOR_GREY, backgroundColor: 'white' }
                      }
                    >
                      {LEVEL_LABELS[lv]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 유형 다중 체크박스 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
              유형 (전체 미선택 = 모두)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {QUESTION_TYPES.map((qt) => {
                const checked = selectedTypes.has(qt);
                return (
                  <label
                    key={qt}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-sm border cursor-pointer transition-colors"
                    style={{
                      backgroundColor: checked ? COLOR_NAVY : 'white',
                      borderColor: checked ? COLOR_NAVY : '#e5e7eb',
                      color: checked ? 'white' : COLOR_GREY,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleType(qt)}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span className="font-medium truncate">{QUESTION_TYPE_LABELS[qt]}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 문제 수 */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: COLOR_GREY }}>
              문제 수
            </label>
            <div className="flex gap-1.5">
              {COUNT_OPTIONS.map((n) => {
                const isActive = n === count;
                return (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className="flex-1 px-2 py-2 text-xs font-semibold rounded-sm border transition-colors"
                    style={
                      isActive
                        ? { borderColor: COLOR_NAVY, backgroundColor: COLOR_NAVY, color: 'white' }
                        : { borderColor: COLOR_GREY, color: COLOR_GREY, backgroundColor: 'white' }
                    }
                  >
                    {n}개
                  </button>
                );
              })}
            </div>
          </div>

          {/* 미리보기 */}
          <div className="border border-slate-200 rounded-sm p-3 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: COLOR_GREY }}>
                미리보기
              </span>
              {loading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <span
                  className="text-xs"
                  style={{ color: insufficient ? '#b91c1c' : COLOR_GREY }}
                >
                  조건 일치 {candidates.length}개 중 무작위 {previewCount}개 선택
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton className="h-20" />
            ) : candidates.length === 0 ? (
              <p className="text-xs" style={{ color: COLOR_GREY }}>
                조건에 맞는 진술이 없습니다.
              </p>
            ) : (
              <div className="space-y-1">
                {candidates.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-baseline gap-2 text-xs py-0.5"
                  >
                    <span
                      className="shrink-0 w-5 h-5 rounded-sm font-bold text-center leading-5"
                      style={{
                        backgroundColor: s.answer === 'O' ? COLOR_YELLOW : '#fee2e2',
                        color: s.answer === 'O' ? COLOR_NAVY : '#b91c1c',
                      }}
                    >
                      {s.answer}
                    </span>
                    <div className="flex-1 truncate" style={{ color: COLOR_NAVY }}>
                      <MathRenderer content={s.content} />
                    </div>
                  </div>
                ))}
                {candidates.length > 3 && (
                  <p className="text-[11px] mt-1" style={{ color: COLOR_GREY }}>
                    ... 외 {candidates.length - 3}개
                  </p>
                )}
              </div>
            )}
          </div>

          {insufficient && candidates.length > 0 && (
            <p className="text-xs px-3 py-2 rounded-sm bg-amber-50 text-amber-800 border border-amber-200">
              조건에 진술이 {candidates.length}개뿐이라 {count}개 대신 가능한 만큼만 추가됩니다.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button
            onClick={handleAdd}
            loading={submitting}
            disabled={candidates.length === 0}
          >
            <Save className="w-4 h-4" />
            워크북에 추가
          </Button>
        </div>
      </Card>
    </div>
  );
}

/** Fisher-Yates 셔플 후 N개 픽업 */
function sampleRandom<T>(arr: readonly T[], n: number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, n);
}
