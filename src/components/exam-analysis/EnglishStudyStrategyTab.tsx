'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Languages, Quote, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import type { AnalyzedQuestion } from '@/lib/exam-analysis/types';
import {
  EXAM_CLI_STORAGE_KEY,
  parseCliKind,
} from '@/lib/exam-analysis/cli-kind';
import {
  buildEnglishStudyFromQuestions,
  parseEnglishStudyResult,
  splitEnglishStudy,
  type EnglishStudyExtracted,
  type EnglishStudyStructure,
  type EnglishStudyTerm,
} from '@/lib/exam-analysis/english-study-pack';

interface EnglishStudyStrategyTabProps {
  questions: AnalyzedQuestion[];
  grade?: string;
  examPaperId: string;
  analysisId?: string;
  storedPack?: unknown;
  onStored?: () => void;
}

function studyRequestBody(extra: Record<string, unknown> = {}): string {
  let cli: ReturnType<typeof parseCliKind>;
  try {
    cli = parseCliKind(
      typeof window !== 'undefined' ? window.localStorage.getItem(EXAM_CLI_STORAGE_KEY) : null,
    );
  } catch {
    cli = undefined;
  }
  return JSON.stringify({ ...extra, ...(cli ? { cli } : {}) });
}

export function EnglishStudyStrategyTab({
  questions,
  examPaperId,
  analysisId,
  storedPack,
  onStored,
}: EnglishStudyStrategyTabProps) {
  const fromQuestions = useMemo(() => buildEnglishStudyFromQuestions(questions), [questions]);
  const parsedStored = useMemo(() => parseEnglishStudyResult(storedPack), [storedPack]);
  const seed = parsedStored ?? fromQuestions;
  const seedEnough = !!seed && seed.vocab.length + seed.structures.length >= 5;

  const [pack, setPack] = useState<EnglishStudyExtracted | null>(seed);
  const [loading, setLoading] = useState(!seedEnough);
  const [error, setError] = useState<string | null>(null);
  const startedKey = useRef<string>('');

  useEffect(() => {
    if (seed) setPack(seed);
    if (seedEnough) {
      setLoading(false);
      setError(null);
    }
  }, [seed, seedEnough]);

  useEffect(() => {
    if (seedEnough || !examPaperId || !analysisId) {
      if (!analysisId) {
        setLoading(false);
        setError('기본 분석을 먼저 실행하세요');
      }
      return;
    }
    const key = `${examPaperId}:${analysisId}`;
    if (startedKey.current === key) return;
    startedKey.current = key;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/exam-analysis/${examPaperId}/english-study`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: studyRequestBody(),
        });
        const json = await res.json() as {
          data?: unknown;
          error?: { message?: string };
        };
        if (!res.ok) throw new Error(json.error?.message || '단어·구문 정리에 실패했습니다');
        const next = parseEnglishStudyResult(json.data);
        if (!next) throw new Error('시험지에서 단어·구문을 찾지 못했습니다');
        if (!cancelled) {
          setPack(next);
          onStored?.();
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '단어·구문 정리에 실패했습니다';
        if (!cancelled) {
          if (fromQuestions) {
            setPack(fromQuestions);
            setError(null);
          } else {
            setError(msg);
            toast.error(msg);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [examPaperId, analysisId, seedEnough, fromQuestions, onStored]);

  const retry = async () => {
    if (!examPaperId) return;
    startedKey.current = `${examPaperId}:${analysisId || ''}:retry`;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/exam-analysis/${examPaperId}/english-study`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: studyRequestBody({ forceRegenerate: true }),
      });
      const json = await res.json() as { data?: unknown; error?: { message?: string } };
      if (!res.ok) throw new Error(json.error?.message || '단어·구문 정리에 실패했습니다');
      const next = parseEnglishStudyResult(json.data);
      if (!next) throw new Error('시험지에서 단어·구문을 찾지 못했습니다');
      setPack(next);
      onStored?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '단어·구문 정리에 실패했습니다';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !pack) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          시험지에 적힌 영어 단어와 구문을 찾고 있습니다. 빈칸 추론 같은 유형 이름이 아니라, 실제로 나온 표현만 모읍니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="border rounded-sm bg-white p-6 text-center space-y-3">
        <p className="text-sm text-slate-600">{error || '시험지에서 단어·구문을 찾지 못했습니다'}</p>
        <Button size="sm" onClick={retry}>다시 정리</Button>
      </div>
    );
  }

  const split = splitEnglishStudy(pack);
  const traps = [
    ...split.trapVocab.map((v) => ({ kind: 'vocab' as const, text: v.word, meaning: v.meaning, count: v.count })),
    ...split.trapStructures.map((s) => ({ kind: 'structure' as const, text: s.pattern, meaning: s.meaning, count: s.count })),
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 leading-relaxed">
        이번 시험지에 <strong className="font-semibold text-slate-800">실제로 적혀 있던</strong> 단어와 구문입니다.
        빈칸 추론·글의 구조 같은 유형 이름은 넣지 않았습니다.
      </p>

      <Board
        title="자주 나온 단어"
        hint={split.frequentVocab.length ? `${split.frequentVocab.length}개` : undefined}
        icon={<Repeat2 className="w-3.5 h-3.5 text-emerald-600" />}
        iconBg="bg-emerald-500/15"
      >
        {split.frequentVocab.length === 0 ? (
          <EmptyLine text="두 번 이상 나온 단어가 없습니다. 아래 단어장을 보세요." />
        ) : (
          <TermChips items={split.frequentVocab} />
        )}
      </Board>

      <Board
        title="자주 나온 구문"
        hint={split.frequentStructures.length ? `${split.frequentStructures.length}개` : undefined}
        icon={<Repeat2 className="w-3.5 h-3.5 text-violet-600" />}
        iconBg="bg-violet-500/15"
      >
        {split.frequentStructures.length === 0 ? (
          <EmptyLine text="두 번 이상 나온 구문이 없습니다. 아래 구문 정리를 보세요." />
        ) : (
          <StructureChips items={split.frequentStructures} />
        )}
      </Board>

      <Board
        title="자주 틀리는 단어·구문"
        hint={traps.length ? `${traps.length}개` : undefined}
        icon={<AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
        iconBg="bg-red-500/15"
      >
        {traps.length === 0 ? (
          <EmptyLine text="혼동하기 쉬운 표현으로 표시된 것이 없습니다." />
        ) : (
          <MixedChips items={traps} />
        )}
      </Board>

      <Board
        title="이번 시험 단어장"
        hint={`${pack.vocab.length}개`}
        icon={<Languages className="w-3.5 h-3.5 text-emerald-600" />}
        iconBg="bg-emerald-500/15"
      >
        {pack.vocab.length === 0 ? (
          <EmptyLine text="뽑아 둔 단어가 없습니다." />
        ) : (
          <TermTable items={pack.vocab} />
        )}
      </Board>

      <Board
        title="이번 시험 구문"
        hint={`${pack.structures.length}개`}
        icon={<Quote className="w-3.5 h-3.5 text-violet-600" />}
        iconBg="bg-violet-500/15"
      >
        {pack.structures.length === 0 ? (
          <EmptyLine text="뽑아 둔 구문이 없습니다." />
        ) : (
          <StructureTable items={pack.structures} />
        )}
      </Board>

      <div className="flex justify-end">
        <button type="button" onClick={retry} className="text-xs text-primary hover:underline font-medium px-3 py-1.5">
          다시 정리
        </button>
      </div>
    </div>
  );
}

function Board({
  title, hint, icon, iconBg, children,
}: {
  title: string;
  hint?: string;
  icon: ReactNode;
  iconBg: string;
  children: ReactNode;
}) {
  return (
    <div className="border rounded-sm overflow-hidden bg-white">
      <div className="px-4 py-3 flex items-center gap-3 border-b">
        <div className={`w-7 h-7 rounded-sm ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-800">{title}</span>
          {hint && <span className="text-xs text-slate-400 ml-2">{hint}</span>}
        </div>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-xs text-slate-400 text-center py-3">{text}</p>;
}

function TermChips({ items }: { items: EnglishStudyTerm[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.word}
          className="inline-flex items-baseline gap-1.5 px-2.5 py-1.5 rounded-sm border bg-emerald-50/60"
        >
          <span className="text-sm font-semibold text-slate-900">{item.word}</span>
          {item.meaning && <span className="text-xs text-slate-500">{item.meaning}</span>}
          {item.count >= 2 && <span className="text-[10px] font-medium text-indigo-600">{item.count}회</span>}
        </span>
      ))}
    </div>
  );
}

function StructureChips({ items }: { items: EnglishStudyStructure[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.pattern}
          className="inline-flex items-baseline gap-1.5 px-2.5 py-1.5 rounded-sm border bg-violet-50/60"
        >
          <span className="text-sm font-semibold text-slate-900">{item.pattern}</span>
          {item.meaning && <span className="text-xs text-slate-500">{item.meaning}</span>}
          {item.count >= 2 && <span className="text-[10px] font-medium text-indigo-600">{item.count}회</span>}
        </span>
      ))}
    </div>
  );
}

function MixedChips({
  items,
}: {
  items: Array<{ kind: 'vocab' | 'structure'; text: string; meaning: string | null; count: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={`${item.kind}-${item.text}`}
          className={`inline-flex items-baseline gap-1.5 px-2.5 py-1.5 rounded-sm border ${
            item.kind === 'vocab' ? 'bg-emerald-50/60' : 'bg-violet-50/60'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500">{item.kind === 'vocab' ? '단어' : '구문'}</span>
          <span className="text-sm font-semibold text-slate-900">{item.text}</span>
          {item.meaning && <span className="text-xs text-slate-500">{item.meaning}</span>}
        </span>
      ))}
    </div>
  );
}

function TermTable({ items }: { items: EnglishStudyTerm[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.word} className="flex items-baseline justify-between gap-3 py-1.5">
          <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{item.word}</span>
            {item.meaning && <span className="text-xs text-slate-500">{item.meaning}</span>}
          </div>
          {item.count >= 2 && (
            <span className="text-[10px] font-medium text-indigo-600 shrink-0">{item.count}회</span>
          )}
        </div>
      ))}
    </div>
  );
}

function StructureTable({ items }: { items: EnglishStudyStructure[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.pattern} className="flex items-baseline justify-between gap-3 py-1.5">
          <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{item.pattern}</span>
            {item.meaning && <span className="text-xs text-slate-500">{item.meaning}</span>}
          </div>
          {item.count >= 2 && (
            <span className="text-[10px] font-medium text-indigo-600 shrink-0">{item.count}회</span>
          )}
        </div>
      ))}
    </div>
  );
}
