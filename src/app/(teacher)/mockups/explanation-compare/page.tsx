'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, RefreshCw, Brain, Zap, Clock, Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toast';
import { MathRenderer } from '@/components/math/MathRenderer';

interface QuestionSample {
  id: string;
  questionNum: number;
  content: string;
  choices: string[] | null;
  answer: string;
  type: string;
  chapter: string | null;
  section: string | null;
  difficulty: string;
  source: string | null;
}

interface GenerationResult {
  text: string;
  answer?: string;
  explanation?: string;
  answerChanged?: boolean;
  time: number;
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
}

interface CompareResult {
  question: QuestionSample;
  noThinking?: GenerationResult;
  thinking?: GenerationResult;
}

type CompareMode = 'both' | 'thinking' | 'noThinking' | 'auto';

/** 해설 텍스트를 **전략**/**풀이**/**핵심 포인트** 섹션으로 분리하여 렌더링 */
function ExplanationSections({ content }: { content: string }) {
  // 섹션 헤더 패턴: **전략**, **풀이**, **핵심 포인트** (또는 볼드 없이)
  const sectionRegex = /\*{0,2}(전략|풀이|핵심\s?포인트)\*{0,2}\s*/g;
  const parts: { label: string | null; body: string }[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(content)) !== null) {
    const before = content.slice(lastIdx, match.index).trim();
    if (before) parts.push({ label: null, body: before });
    lastIdx = match.index + match[0].length;
    parts.push({ label: match[1].replace(/\s/g, ''), body: '' });
  }
  const remaining = content.slice(lastIdx).trim();
  if (remaining && parts.length > 0 && parts[parts.length - 1].label && !parts[parts.length - 1].body) {
    parts[parts.length - 1].body = remaining;
  } else if (remaining) {
    parts.push({ label: null, body: remaining });
  }

  // 섹션이 감지되지 않으면 일반 렌더링
  if (!parts.some(p => p.label)) {
    return <MathRenderer content={content} />;
  }

  // label이 있는 part에 다음 label 전까지의 body를 병합
  const sections: { label: string; body: string }[] = [];
  for (const p of parts) {
    if (p.label) {
      sections.push({ label: p.label, body: p.body });
    } else if (sections.length > 0) {
      sections[sections.length - 1].body += '\n' + p.body;
    } else {
      sections.push({ label: '', body: p.body });
    }
  }

  return (
    <div className="space-y-3">
      {sections.map((sec, i) => (
        <div key={i}>
          {sec.label && (
            <div className="border-l-[3px] border-slate-300 bg-slate-50 px-3 py-1.5 mb-1.5">
              <span className="text-xs font-bold text-slate-600">{sec.label}</span>
            </div>
          )}
          {sec.body && (
            <div className="text-sm leading-relaxed prose prose-sm max-w-none pl-0.5">
              <MathRenderer content={sec.body.trim()} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ExplanationComparePage() {
  const [samples, setSamples] = useState<QuestionSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, CompareResult>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<CompareMode>('auto');
  const [expandedRaw, setExpandedRaw] = useState<Set<string>>(new Set());

  // 해설 없는 문제 샘플 로드
  const fetchSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/questions?bookCode=1-1&limit=30&noExplanation=true');
      const json = await res.json();
      if (json.data) {
        setSamples(json.data);
        // 처음 5개 자동 선택
        const first5 = json.data.slice(0, 5).map((q: QuestionSample) => q.id);
        setSelectedIds(new Set(first5));
      }
    } catch {
      toast.error('문제 목록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  // 해설 생성
  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.warning('문제를 선택해주세요');
      return;
    }
    setGenerating(true);
    setResults({});
    try {
      const res = await fetch('/api/admin/explanation-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: [...selectedIds],
          mode,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setResults(json.data);
        toast.success('해설 생성 완료');
      } else {
        toast.error(json.error?.message || '생성 실패');
      }
    } catch {
      toast.error('해설 생성 중 오류가 발생했습니다');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === samples.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(samples.map(s => s.id)));
    }
  };

  const toggleRaw = (key: string) => {
    setExpandedRaw(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resultList = Object.values(results);

  // 비용 계산
  const totalStats = resultList.reduce(
    (acc, r) => {
      if (r.noThinking) {
        acc.noThinkInput += r.noThinking.inputTokens || 0;
        acc.noThinkOutput += r.noThinking.outputTokens || 0;
        acc.noThinkTime += r.noThinking.time;
      }
      if (r.thinking) {
        acc.thinkInput += r.thinking.inputTokens || 0;
        acc.thinkOutput += r.thinking.outputTokens || 0;
        acc.thinkThinking += r.thinking.thinkingTokens || 0;
        acc.thinkTime += r.thinking.time;
      }
      return acc;
    },
    { noThinkInput: 0, noThinkOutput: 0, noThinkTime: 0, thinkInput: 0, thinkOutput: 0, thinkThinking: 0, thinkTime: 0 }
  );

  return (
    <div className="flex-1 p-6 md:p-10 max-w-[1800px] mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          해설 생성 비교 (Thinking vs Non-Thinking)
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Gemini 2.5 Flash의 Thinking 모드 유무에 따른 해설 품질을 비교합니다
        </p>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-secondary">모드:</span>
            {([
              { key: 'auto' as CompareMode, label: '자동 (난이도별)', icon: Sparkles },
              { key: 'both' as CompareMode, label: '둘 다 비교', icon: RefreshCw },
              { key: 'noThinking' as CompareMode, label: 'Non-Thinking만', icon: Zap },
              { key: 'thinking' as CompareMode, label: 'Thinking만', icon: Brain },
            ]).map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-colors ${
                  mode === m.key
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                <m.icon className="w-3.5 h-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-text-secondary">
              {selectedIds.size}개 선택
            </span>
            <Button size="sm" variant="secondary" onClick={selectAll}>
              {selectedIds.size === samples.length ? '전체 해제' : '전체 선택'}
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating || selectedIds.size === 0}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  해설 생성 ({selectedIds.size}개)
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Question Selection */}
      {loading ? (
        <div className="text-center py-12 text-text-secondary text-sm">로딩 중...</div>
      ) : (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-text-secondary mb-3">
            해설 없는 문제 목록 (bookCode: 1-1)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {samples.map(q => (
              <button
                key={q.id}
                onClick={() => toggleSelect(q.id)}
                className={`text-left p-3 rounded-sm border transition-colors ${
                  selectedIds.has(q.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center text-[10px] font-bold ${
                      selectedIds.has(q.id)
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300'
                    }`}
                  >
                    {selectedIds.has(q.id) && '✓'}
                  </div>
                  <span className="text-xs font-bold text-text-secondary">Q{q.questionNum}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    q.type === 'MULTIPLE_CHOICE' ? 'bg-blue-50 text-blue-600' :
                    q.type === 'SHORT_ANSWER' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {q.type === 'MULTIPLE_CHOICE' ? '객관식' : q.type === 'SHORT_ANSWER' ? '단답형' : '서술형'}
                  </span>
                  <span className="text-[10px] text-slate-400">{q.difficulty}</span>
                </div>
                <p className="text-xs text-text-primary line-clamp-2 leading-relaxed">
                  {q.content?.replace(/\$[^$]+\$/g, '[수식]').substring(0, 80)}
                </p>
                {q.chapter && (
                  <span className="text-[10px] text-slate-400 mt-1 block">{q.chapter}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generating indicator */}
      {generating && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-text-secondary">
            Gemini로 해설 생성 중... ({selectedIds.size}개 문제)
          </span>
        </div>
      )}

      {/* Results — auto 모드는 단일 리스트, 나머지는 좌우 비교 */}
      {resultList.length > 0 && mode === 'auto' && (
        <div className="max-w-[900px] space-y-3">
          <h3 className="text-sm font-bold text-text-secondary">생성 결과 (auto: 난이도별 모드 자동 선택)</h3>
          <div className="border border-slate-200 rounded-sm divide-y divide-slate-100">
            {resultList.map((r, idx) => {
              const isThinking = r.question.difficulty === 'HIGH' || r.question.difficulty === 'HIGHEST';
              const gen = isThinking ? r.thinking : r.noThinking;
              return (
                <div key={r.question.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">#{idx + 1}</span>
                    <span className="text-xs font-bold text-text-secondary">Q{r.question.questionNum}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      r.question.type === 'MULTIPLE_CHOICE' ? 'bg-blue-50 text-blue-600' :
                      r.question.type === 'SHORT_ANSWER' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {r.question.type === 'MULTIPLE_CHOICE' ? '객관식' : r.question.type === 'SHORT_ANSWER' ? '단답형' : '서술형'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      r.question.difficulty === 'BASIC' ? 'bg-green-50 text-green-600' :
                      r.question.difficulty === 'MEDIUM' ? 'bg-blue-50 text-blue-600' :
                      r.question.difficulty === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {r.question.difficulty}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isThinking ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                      {isThinking ? 'Thinking' : 'Non-Thinking'}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">{r.question.chapter}</span>
                  </div>
                  <div className="text-xs text-text-secondary mb-3 line-clamp-2">
                    <MathRenderer content={r.question.content} />
                  </div>
                  {gen ? (
                    <>
                      {gen.answer && (
                        <div className={`text-xs px-2.5 py-1.5 rounded mb-2 ${
                          gen.answerChanged ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
                        }`}>
                          {gen.answerChanged ? (
                            <><span className="font-bold">정답 변경:</span> {r.question.answer} → <span className="font-bold">{gen.answer}</span></>
                          ) : (
                            <><span className="font-bold">정답 확인:</span> {gen.answer}</>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {(gen.time / 1000).toFixed(1)}초
                          {gen.outputTokens && <> | {gen.outputTokens} tokens</>}
                          {gen.thinkingTokens && <> | 사고 {gen.thinkingTokens}</>}
                        </span>
                      </div>
                      <ExplanationSections content={gen.explanation || gen.text} />
                      <button onClick={() => toggleRaw(`${r.question.id}-auto`)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 mt-3">
                        {expandedRaw.has(`${r.question.id}-auto`) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Raw 텍스트
                      </button>
                      {expandedRaw.has(`${r.question.id}-auto`) && (
                        <pre className="mt-2 p-3 bg-slate-50 rounded text-[11px] text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                          {gen.text}
                        </pre>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">생성 안 됨</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resultList.length > 0 && mode !== 'auto' && (
        <div className={`flex gap-4 ${mode === 'both' ? '' : 'max-w-[900px]'}`}>
          {/* Non-Thinking 패널 */}
          {mode !== 'thinking' && (
            <div className={`${mode === 'both' ? 'w-1/2' : 'w-full'} flex flex-col`}>
              {/* 패널 헤더 */}
              <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-t-sm px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-bold text-blue-700">Non-Thinking</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-blue-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(totalStats.noThinkTime / 1000).toFixed(1)}초
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {totalStats.noThinkInput + totalStats.noThinkOutput} tokens
                    <span className="text-blue-400">(입력 {totalStats.noThinkInput} / 출력 {totalStats.noThinkOutput})</span>
                  </span>
                </div>
              </div>
              {/* 문제별 결과 */}
              <div className="border border-t-0 border-blue-200 rounded-b-sm divide-y divide-blue-100">
                {resultList.map((r, idx) => (
                  <div key={r.question.id} className="p-4">
                    {/* 문제 헤더 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-text-secondary">Q{r.question.questionNum}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        r.question.type === 'MULTIPLE_CHOICE' ? 'bg-blue-50 text-blue-600' :
                        r.question.type === 'SHORT_ANSWER' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {r.question.type === 'MULTIPLE_CHOICE' ? '객관식' : r.question.type === 'SHORT_ANSWER' ? '단답형' : '서술형'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        r.question.difficulty === 'BASIC' ? 'bg-green-50 text-green-600' :
                        r.question.difficulty === 'MEDIUM' ? 'bg-blue-50 text-blue-600' :
                        r.question.difficulty === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {r.question.difficulty}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{r.question.chapter}</span>
                    </div>
                    <div className="text-xs text-text-secondary mb-3 line-clamp-2">
                      <MathRenderer content={r.question.content} />
                    </div>
                    {/* 정답 + 해설 */}
                    {r.noThinking ? (
                      <>
                        {/* 정답 비교 */}
                        {r.noThinking.answer && (
                          <div className={`text-xs px-2.5 py-1.5 rounded mb-2 ${
                            r.noThinking.answerChanged
                              ? 'bg-red-50 border border-red-200 text-red-700'
                              : 'bg-green-50 border border-green-200 text-green-700'
                          }`}>
                            {r.noThinking.answerChanged ? (
                              <><span className="font-bold">정답 변경:</span> {r.question.answer} → <span className="font-bold">{r.noThinking.answer}</span></>
                            ) : (
                              <><span className="font-bold">정답 확인:</span> {r.noThinking.answer}</>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {(r.noThinking.time / 1000).toFixed(1)}초
                            {r.noThinking.outputTokens && <> | {r.noThinking.outputTokens} tokens</>}
                          </span>
                        </div>
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                          <ExplanationSections content={r.noThinking.explanation || r.noThinking.text} />
                        </div>
                        <button
                          onClick={() => toggleRaw(`${r.question.id}-noThink`)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 mt-3"
                        >
                          {expandedRaw.has(`${r.question.id}-noThink`) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          Raw 텍스트
                        </button>
                        {expandedRaw.has(`${r.question.id}-noThink`) && (
                          <pre className="mt-2 p-3 bg-slate-50 rounded text-[11px] text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                            {r.noThinking.text}
                          </pre>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic">생성 안 됨</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thinking 패널 */}
          {mode !== 'noThinking' && (
            <div className={`${mode === 'both' ? 'w-1/2' : 'w-full'} flex flex-col`}>
              {/* 패널 헤더 */}
              <div className="sticky top-0 z-10 bg-orange-50 border border-orange-200 rounded-t-sm px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-700">Thinking</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-orange-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(totalStats.thinkTime / 1000).toFixed(1)}초
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {totalStats.thinkInput + totalStats.thinkOutput} tokens
                    <span className="text-orange-400">(입력 {totalStats.thinkInput} / 출력 {totalStats.thinkOutput} / 사고 {totalStats.thinkThinking})</span>
                  </span>
                </div>
              </div>
              {/* 문제별 결과 */}
              <div className="border border-t-0 border-orange-200 rounded-b-sm divide-y divide-orange-100">
                {resultList.map((r, idx) => (
                  <div key={r.question.id} className="p-4">
                    {/* 문제 헤더 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-text-secondary">Q{r.question.questionNum}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        r.question.type === 'MULTIPLE_CHOICE' ? 'bg-blue-50 text-blue-600' :
                        r.question.type === 'SHORT_ANSWER' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {r.question.type === 'MULTIPLE_CHOICE' ? '객관식' : r.question.type === 'SHORT_ANSWER' ? '단답형' : '서술형'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        r.question.difficulty === 'BASIC' ? 'bg-green-50 text-green-600' :
                        r.question.difficulty === 'MEDIUM' ? 'bg-blue-50 text-blue-600' :
                        r.question.difficulty === 'HIGH' ? 'bg-orange-50 text-orange-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {r.question.difficulty}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{r.question.chapter}</span>
                    </div>
                    <div className="text-xs text-text-secondary mb-3 line-clamp-2">
                      <MathRenderer content={r.question.content} />
                    </div>
                    {/* 정답 + 해설 */}
                    {r.thinking ? (
                      <>
                        {/* 정답 비교 */}
                        {r.thinking.answer && (
                          <div className={`text-xs px-2.5 py-1.5 rounded mb-2 ${
                            r.thinking.answerChanged
                              ? 'bg-red-50 border border-red-200 text-red-700'
                              : 'bg-green-50 border border-green-200 text-green-700'
                          }`}>
                            {r.thinking.answerChanged ? (
                              <><span className="font-bold">정답 변경:</span> {r.question.answer} → <span className="font-bold">{r.thinking.answer}</span></>
                            ) : (
                              <><span className="font-bold">정답 확인:</span> {r.thinking.answer}</>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {(r.thinking.time / 1000).toFixed(1)}초
                            {r.thinking.outputTokens && <> | {r.thinking.outputTokens} tokens</>}
                            {r.thinking.thinkingTokens && <> | 사고 {r.thinking.thinkingTokens}</>}
                          </span>
                        </div>
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                          <ExplanationSections content={r.thinking.explanation || r.thinking.text} />
                        </div>
                        <button
                          onClick={() => toggleRaw(`${r.question.id}-think`)}
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 mt-3"
                        >
                          {expandedRaw.has(`${r.question.id}-think`) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          Raw 텍스트
                        </button>
                        {expandedRaw.has(`${r.question.id}-think`) && (
                          <pre className="mt-2 p-3 bg-slate-50 rounded text-[11px] text-slate-600 overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                            {r.thinking.text}
                          </pre>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic">생성 안 됨</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
