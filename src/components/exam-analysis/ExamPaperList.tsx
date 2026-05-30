'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { FileSearch, Play, Trash2, RotateCw, School, X, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { PROMPT_VERSION } from '@/lib/exam-analysis/constants';

/**
 * 분석본의 프롬프트 버전이 현재 PROMPT_VERSION과 일치하는지 검사.
 * modelVersion 포맷: "gemini-X.Y-z / prompt vA.B.C"
 * 일치하지 않으면 구버전으로 간주 → 재분석 권장.
 */
function isStalePrompt(modelVersion: string | null | undefined): boolean {
  if (!modelVersion) return false;
  return !modelVersion.includes(`prompt ${PROMPT_VERSION}`);
}

/** modelVersion에서 prompt vX.Y.Z만 추출 (예: "gemini-3.1-pro-preview / prompt v1.0.5" → "v1.0.5") */
function extractPromptVersion(modelVersion: string | null | undefined): string | null {
  if (!modelVersion) return null;
  const m = modelVersion.match(/prompt\s+(v[\d.]+)/i);
  return m ? m[1] : null;
}

function formatAnalyzedAt(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${min}`;
}

interface ExamPaperItem {
  id: string;
  title: string;
  subject: 'MATH' | 'ENGLISH';
  grade: string;
  examType: string;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  schoolName: string | null;
  schoolId: string | null;
  school: { id: string; name: string; district: string } | null;
  // examScope: 신형 = { topics, examYear, examSemester, examCategory }, 레거시 = string[] | null
  examScope?: unknown;
  createdAt: string;
  teacher: { id: string; name: string };
  student: { id: string; name: string } | null;
  analyses: Array<{
    id: string;
    totalQuestions: number | null;
    totalPoints: number | null;
    earnedPoints: number | null;
    analyzedAt: string | null;
    modelVersion: string | null;
    analyzedBy?: string | null;
    analyzedByUser?: { id: string; name: string } | null;
    extensions?: Array<{
      agentType: string;
      lastRunBy?: string | null;
      lastRunAt?: string | null;
      lastRunByUser?: { id: string; name: string } | null;
    }>;
  }>;
}

const EXAM_CATEGORY_LABEL: Record<string, string> = {
  MIDTERM: '중간',
  FINAL: '기말',
  MOCK: '모의',
  OTHER: '기타',
};

/** 제목에서 학기·시험 종류 라벨 추출 (예: "2025년 1학기 중간고사" → ["1학기", "중간"]) */
function extractExamLabels(title: string): string[] {
  const labels: string[] = [];

  // 1) 명시적 "N학기" 패턴 (예: "1학기 중간고사")
  const semMatch = title.match(/(\d)\s*학기/);
  if (semMatch) {
    labels.push(`${semMatch[1]}학기`);
  } else {
    // 2) 축약형 — "중31" = 중3 1학기, "고12" = 고1 2학기
    //    학교급(중/고) + 학년(1~3) + 학기(1~2) 패턴
    const shortMatch = title.match(/(?:중|고)(\d)([12])\s/);
    if (shortMatch) {
      labels.push(`${shortMatch[2]}학기`);
    }
  }

  // 시험 종류
  if (/중간/.test(title)) labels.push('중간');
  else if (/기말/.test(title)) labels.push('기말');
  else if (/모의/.test(title)) labels.push('모의');
  return labels;
}

/**
 * examScope JSON(우선) 또는 title(폴백)에서 라벨 추출.
 * 신형: `{ topics, examYear, examSemester, examCategory }` → 정확한 라벨
 * 레거시: `string[]` 또는 null → 제목 정규식으로 폴백
 */
function getExamLabels(item: ExamPaperItem): string[] {
  const labels: string[] = [];
  const scope = item.examScope;
  if (scope && typeof scope === 'object' && !Array.isArray(scope)) {
    const s = scope as { examYear?: number | null; examSemester?: number | null; examCategory?: string | null };
    if (s.examYear) labels.push(`${s.examYear}년`);
    if (s.examSemester) labels.push(`${s.examSemester}학기`);
    if (s.examCategory && EXAM_CATEGORY_LABEL[s.examCategory]) {
      labels.push(EXAM_CATEGORY_LABEL[s.examCategory]);
    }
    if (labels.length) return labels;
  }
  // 폴백: 제목에서 추출 (레거시 데이터)
  return extractExamLabels(item.title);
}

/** 5단계 상태 판별 — 업로드 → 분석중 → 분석완료 → 총평완료 → 글작성 완료 (사용자 제안 라벨)
 *  구버전 프롬프트로 분석된 COMPLETED 항목은 진행 단계(총평완료 등) 대신 "구버전"으로 표시 →
 *  "완료"가 최신인 것처럼 오해되는 것 방지 (사용자 요청 2026-05-29). */
function getDetailedStatus(
  item: ExamPaperItem,
  gen?: { phase: 'metadata' | 'commentary' } | null,
): { label: string; color: string; title?: string } {
  // 진행 중 단계(클라이언트 genState)를 우선 — DB 상태보다 실시간으로 표시
  if (gen?.phase === 'metadata') return { label: '총평 준비중', color: 'bg-violet-50 text-violet-600 border-violet-200 animate-pulse' };
  if (gen?.phase === 'commentary') return { label: '총평 생성중', color: 'bg-violet-50 text-violet-600 border-violet-200 animate-pulse' };
  if (item.status === 'FAILED') return { label: '실패', color: 'bg-red-50 text-red-600 border-red-200' };
  if (item.status === 'ANALYZING') return { label: '분석중', color: 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' };
  if (item.status === 'PENDING') return { label: '업로드', color: 'bg-slate-50 text-slate-500 border-slate-200' };
  // COMPLETED — 구버전이면 진행 단계 무시하고 "구버전" 우선 표시
  const modelVersion = item.analyses[0]?.modelVersion;
  if (isStalePrompt(modelVersion)) {
    const v = extractPromptVersion(modelVersion);
    return {
      label: `구버전${v ? ` ${v}` : ''}`,
      color: 'bg-amber-50 text-amber-700 border-amber-300',
      title: `구버전 프롬프트(${v || '?'})로 분석됨. 현재 ${PROMPT_VERSION} — 우측 재분석 버튼으로 최신 버전 + V3 총평으로 갱신하세요.`,
    };
  }
  // 최신 버전 — extensions로 세분화
  const exts = item.analyses[0]?.extensions || [];
  const agentTypes = exts.map(e => e.agentType);
  if (agentTypes.includes('blog-article')) return { label: '글작성 완료', color: 'bg-violet-50 text-violet-600 border-violet-200' };
  if (agentTypes.includes('commentary')) return { label: '총평완료', color: 'bg-blue-50 text-blue-600 border-blue-200' };
  return { label: '분석완료', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
}

interface ExamPaperListProps {
  items: ExamPaperItem[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSelect: (id: string) => void;
  onAnalyze: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, data: Partial<ExamPaperItem>) => void;
  selectedId: string | null;
  canEditSchool?: boolean;
  /** 시험지별 진행 단계 (page.tsx genState) — 'metadata'(총평 준비) / 'commentary'(총평 생성) 실시간 배지용 */
  genState?: Record<string, { phase: 'metadata' | 'commentary'; startMs: number; willChain: boolean }>;
}

interface SchoolResult {
  id: string;
  name: string;
  schoolType: string;
  regionName: string | null;
  district: string;
}

export function ExamPaperList({
  items,
  total,
  page,
  limit,
  onPageChange,
  onSelect,
  onAnalyze,
  onDelete,
  onUpdate,
  selectedId,
  canEditSchool = false,
  genState,
}: ExamPaperListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('시험지를 삭제하시겠습니까? 분석 결과도 함께 삭제됩니다.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/exam-analysis/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('삭제되었습니다');
      onDelete(id);
    } catch {
      toast.error('삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <FileSearch className="w-12 h-12 mb-3" />
        <p className="text-sm">업로드된 시험지가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {items.map(item => {
          const latestAnalysis = item.analyses[0];
          const isSelected = item.id === selectedId;

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`px-3 py-2.5 border-b cursor-pointer hover:bg-slate-50 transition-colors ${
                isSelected ? 'bg-blue-50 border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                  {/* 과목·학년 + 문항수·날짜 */}
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.subject === 'MATH' ? '수학' : '영어'} · {item.grade}
                    {latestAnalysis && item.status === 'COMPLETED' && (
                      <>
                        {latestAnalysis.totalQuestions && <span className="text-slate-400"> · {latestAnalysis.totalQuestions}문항</span>}
                        {latestAnalysis.analyzedAt && <span className="text-slate-300"> · {formatAnalyzedAt(latestAnalysis.analyzedAt)}</span>}
                      </>
                    )}
                  </p>
                  {/* 라벨 줄: 상태 + 학기 + 중간/기말 + 구버전 + 학교 */}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {(() => {
                      const s = getDetailedStatus(item, genState?.[item.id]);
                      return (
                        <span
                          className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-sm border ${s.color}`}
                          title={s.title}
                        >
                          {s.label}
                        </span>
                      );
                    })()}
                    {/* (구버전 배지는 상태 배지로 통합됨 — 위 getDetailedStatus가 구버전 시 라벨 대체) */}
                    {getExamLabels(item).map(label => (
                      <span key={label} className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-sm border bg-teal-50 text-teal-600 border-teal-200">
                        {label}
                      </span>
                    ))}
                    {/* 학교 매칭 뱃지 (인라인) */}
                    {canEditSchool ? (
                      <SchoolMatchBadge item={item} onUpdate={onUpdate} />
                    ) : item.school ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5">
                        <School className="w-2.5 h-2.5" />
                        {item.school.name}
                      </span>
                    ) : null}
                  </div>
                  {/* 실행자 메타 라인 — 분석/총평/글 누가 했는지 (있는 것만) */}
                  {(() => {
                    const analyst = latestAnalysis?.analyzedByUser?.name;
                    const commentaryActor = latestAnalysis?.extensions?.find(e => e.agentType === 'commentary')?.lastRunByUser?.name;
                    const articleActor = latestAnalysis?.extensions?.find(e => e.agentType === 'blog-article')?.lastRunByUser?.name;
                    const parts: string[] = [];
                    if (analyst) parts.push(`분석 ${analyst}`);
                    if (commentaryActor) parts.push(`총평 ${commentaryActor}`);
                    if (articleActor) parts.push(`글 ${articleActor}`);
                    if (parts.length === 0) return null;
                    return (
                      <p className="text-[10px] text-slate-400 mt-1 truncate" title={parts.join(' · ')}>
                        {parts.join(' · ')}
                      </p>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(item.status === 'PENDING' || item.status === 'FAILED') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAnalyze(item.id); }}
                      className="p-1 text-slate-400 hover:text-primary"
                      title="분석 실행"
                    >
                      {item.status === 'FAILED' ? <RotateCw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  )}
                  {/* 구버전 프롬프트 재분석 버튼 — COMPLETED + stale 일 때만 */}
                  {item.status === 'COMPLETED' && isStalePrompt(latestAnalysis?.modelVersion) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const oldVer = extractPromptVersion(latestAnalysis?.modelVersion) || '?';
                        if (!confirm(
                          `구버전 프롬프트(${oldVer})로 분석된 시험지입니다.\n` +
                          `현재 버전(${PROMPT_VERSION})으로 재분석하시겠습니까?\n\n` +
                          `※ 기존 분석 결과와 총평/블로그 글은 삭제됩니다.`,
                        )) return;
                        onAnalyze(item.id);
                      }}
                      className="p-1 text-amber-500 hover:text-amber-700"
                      title={`구버전(${extractPromptVersion(latestAnalysis?.modelVersion) || '?'}) → ${PROMPT_VERSION} 재분석`}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingId === item.id}
                    className="p-1 text-slate-400 hover:text-red-500"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > limit && (
        <div className="p-2 border-t">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            onPageChange={onPageChange}
            compact
          />
        </div>
      )}
    </div>
  );
}

/** 학교 매칭 뱃지 — 클릭으로 학교 검색/변경 (MANAGER+) */
function SchoolMatchBadge({ item, onUpdate }: {
  item: ExamPaperItem;
  onUpdate?: (id: string, data: Partial<ExamPaperItem>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing]);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // grade에서 schoolType 추론
        const type = /^중/.test(item.grade) ? 'middle' : /^고/.test(item.grade) ? 'high' : '';
        const params = new URLSearchParams({ q: q.trim() });
        if (type) params.set('type', type);
        const res = await fetch(`/api/schools/search?${params}`);
        const json = await res.json();
        setResults(json.data || []);
      } catch {
        // 무시
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [item.grade]);

  const handleSelect = async (school: SchoolResult) => {
    try {
      const res = await fetch(`/api/exam-analysis/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, schoolName: school.name }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${school.name} 매칭 완료`);
      onUpdate?.(item.id, {
        schoolId: school.id,
        schoolName: school.name,
        school: { id: school.id, name: school.name, district: school.district },
      });
      setEditing(false);
    } catch {
      toast.error('학교 매칭에 실패했습니다');
    }
  };

  const handleUnlink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/exam-analysis/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: null }),
      });
      if (!res.ok) throw new Error();
      toast.success('학교 매칭 해제');
      onUpdate?.(item.id, { schoolId: null, school: null });
    } catch {
      toast.error('매칭 해제에 실패했습니다');
    }
  };

  const schoolName = item.school?.name || item.schoolName;

  return (
    <div className="relative inline-flex" ref={containerRef}>
      {item.school ? (
        // 매칭된 상태
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-sm px-1.5 py-0.5">
          <School className="w-2.5 h-2.5" />
          {item.school.name}
          <button
            onClick={handleUnlink}
            className="ml-0.5 text-emerald-400 hover:text-red-500"
            title="매칭 해제"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ) : schoolName ? (
        // schoolName은 있지만 매칭 안 됨
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); setQuery(schoolName); search(schoolName); }}
          className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-sm px-1.5 py-0.5 hover:bg-amber-100 transition-colors"
          title="학교 매칭하기"
        >
          <School className="w-2.5 h-2.5" />
          {schoolName} (미매칭)
        </button>
      ) : (
        // schoolName 없음
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          title="학교 매칭하기"
        >
          <School className="w-2.5 h-2.5" />
          학교 미지정
        </button>
      )}

      {/* 학교 검색 드롭다운 */}
      {editing && (
        <div
          className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-sm shadow-lg z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            placeholder="학교명 검색..."
            className="w-full px-3 py-1.5 text-xs border-b outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {searching && <p className="px-3 py-2 text-[10px] text-slate-400">검색 중...</p>}
            {!searching && results.length === 0 && query.length >= 2 && (
              <p className="px-3 py-2 text-[10px] text-slate-400">검색 결과 없음</p>
            )}
            {results.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
              >
                <span className="font-medium text-slate-700">{s.name}</span>
                <span className="text-slate-400 ml-1">
                  {s.regionName} {s.district}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
