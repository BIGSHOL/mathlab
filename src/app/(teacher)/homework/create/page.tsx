'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import {
  CalendarCheck,
  Search,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Plus,
  School,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { CATEGORY_LABELS } from '@/lib/services/arithmetic-generator';
import type { ArithmeticCategory } from '@/lib/services/arithmetic-generator';

// ─── Types ───

type ProgressionMode = 'sequential' | 'round_robin' | 'weekday';
type CountMode = 'total' | 'per_category';

interface Slot {
  id: string;
  categories: ArithmeticCategory[];
  days: number;
}

interface StudentItem {
  id: string;
  name: string;
  grade: number | null;
  username: string;
}

// ─── Constants ───

const MODE_LABELS: Record<ProgressionMode, { label: string; desc: string }> = {
  sequential: { label: '구간 지정', desc: '단원별 일수를 직접 설정' },
  round_robin: { label: '순환 배정', desc: '카테고리를 돌아가며 출제' },
  weekday: { label: '요일별 배정', desc: '월·화·수 각 요일에 지정' },
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const CATEGORIES_BY_GRADE: Record<string, ArithmeticCategory[]> = {
  'elementary-1': ['add_1digit', 'sub_1digit'],
  'elementary-2': ['add_2digit', 'sub_2digit', 'mul_table', 'unit_convert'],
  'elementary-3': ['add_3digit', 'sub_3digit', 'mul_2x1', 'div_basic', 'div_remainder', 'time_calc'],
  'elementary-4': ['mul_large', 'div_large', 'frac_add_same', 'frac_sub_same', 'dec_add', 'dec_sub', 'angle_calc', 'sequence_pattern'],
  'elementary-5': ['mixed_calc', 'frac_add_diff', 'frac_sub_diff', 'frac_mul', 'dec_mul', 'gcd_lcm', 'avg_calc', 'area_calc'],
  'elementary-6': ['frac_div', 'dec_div', 'ratio_calc', 'percent_calc', 'circle_area', 'frac_all', 'dec_all'],
  'middle-1': ['int_add', 'int_sub', 'int_mul', 'int_div', 'int_all', 'abs_basic', 'abs_add', 'abs_sub', 'abs_mul', 'abs_mixed', 'abs_all', 'pf_exponent', 'pf_find', 'pf_value', 'pf_all', 'proportion', 'quadrant'],
  'middle-2': ['exp_calc', 'exp_law', 'mono_mul', 'mono_div', 'poly_add', 'poly_sub', 'linear_eq', 'pythagoras', 'similarity', 'poly_all'],
  'middle-3': ['poly_mul', 'mul_formula', 'factoring', 'sqrt_simplify', 'sqrt_add', 'sqrt_mul', 'sqrt_rationalize', 'sqrt_all', 'discriminant', 'trig_value', 'inscribed_angle', 'median_calc', 'variance_calc'],
};

const GRADE_SECTIONS = [
  { key: 'elementary-1', short: '초1' },
  { key: 'elementary-2', short: '초2' },
  { key: 'elementary-3', short: '초3' },
  { key: 'elementary-4', short: '초4' },
  { key: 'elementary-5', short: '초5' },
  { key: 'elementary-6', short: '초6' },
  { key: 'middle-1', short: '중1' },
  { key: 'middle-2', short: '중2' },
  { key: 'middle-3', short: '중3' },
];

const CATEGORY_GRADE: Record<string, string> = {};
for (const section of GRADE_SECTIONS) {
  for (const cat of CATEGORIES_BY_GRADE[section.key] ?? []) {
    CATEGORY_GRADE[cat] = section.short;
  }
}

let slotIdCounter = 0;
function newSlotId() { return `slot-${++slotIdCounter}-${Date.now()}`; }

// ─── Component ───

export default function CreateHomeworkPage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(() => {
    const now = new Date();
    return `${now.getMonth() + 1}월 연산 훈련`;
  });
  const [selectedCats, setSelectedCats] = useState<ArithmeticCategory[]>([]);
  const [mode, setMode] = useState<ProgressionMode>('sequential');
  const [countMode, setCountMode] = useState<CountMode>('total');
  const [dailyCount, setDailyCount] = useState(20);
  const [perCatCounts, setPerCatCounts] = useState<Record<string, number>>({});
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  // Grade picker
  const [schoolLevel, setSchoolLevel] = useState<'elementary' | 'middle'>('elementary');
  const [gradeNum, setGradeNum] = useState(1);

  // Sequential mode: slots
  const [slots, setSlots] = useState<Slot[]>([]);

  // Round-robin mode
  const [rrOrder, setRrOrder] = useState<ArithmeticCategory[]>([]);
  const [daysPerCategory, setDaysPerCategory] = useState(5);

  // 활성 요일 (구간지정/순환배정 공통) — 기본 월~금
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Weekday mode
  const [weekdayMap, setWeekdayMap] = useState<Record<string, ArithmeticCategory[]>>({
    '0': [], '1': [], '2': [], '3': [], '4': [], '5': [], '6': [],
  });
  const [weeks, setWeeks] = useState(4);

  // Passing score & retry
  const [passingScore, setPassingScore] = useState(80);
  const [retryOnFail, setRetryOnFail] = useState(false);
  const [retryMode, setRetryMode] = useState<'wrong_same' | 'wrong_new' | 'all_same' | 'all_new'>('wrong_same');
  const [maxRetries, setMaxRetries] = useState(3);

  // Student selection
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; students: { id: string }[] }[]>([]);

  // ─── Sync selected cats → mode-specific state ───
  useEffect(() => {
    if (mode === 'sequential') {
      setSlots((prev) => {
        const existingCats = new Set(prev.flatMap((s) => s.categories));
        const newSlots = prev
          .map((s) => ({ ...s, categories: s.categories.filter((c) => selectedCats.includes(c)) }))
          .filter((s) => s.categories.length > 0);
        for (const cat of selectedCats) {
          if (!existingCats.has(cat)) {
            newSlots.push({ id: newSlotId(), categories: [cat], days: 5 });
          }
        }
        return newSlots;
      });
    } else if (mode === 'round_robin') {
      setRrOrder((prev) => {
        const order = prev.filter((c) => selectedCats.includes(c));
        for (const cat of selectedCats) {
          if (!order.includes(cat)) order.push(cat);
        }
        return order;
      });
    }
  }, [selectedCats, mode]);

  // Sync perCatCounts with selectedCats
  useEffect(() => {
    setPerCatCounts((prev) => {
      const next = { ...prev };
      for (const cat of selectedCats) {
        if (!(cat in next)) next[cat] = dailyCount;
      }
      return next;
    });
  }, [selectedCats, dailyCount]);

  // Fetch students + classrooms
  const fetchStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({ role: 'STUDENT', limit: '200' });
      if (studentSearch) params.set('search', studentSearch);
      const [userRes, crRes] = await Promise.all([
        fetch(`/api/users?${params}`),
        fetch('/api/classrooms'),
      ]);
      if (userRes.ok) {
        const json = await userRes.json();
        setStudents(json.data ?? []);
      }
      if (crRes.ok) {
        const json = await crRes.json();
        setClassrooms(json.data ?? []);
      }
    } catch (err) { console.error('학생 목록 조회 실패:', err); }
    setLoadingStudents(false);
  }, [studentSearch]);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // ─── Category toggle ───
  const toggleCat = (cat: ArithmeticCategory) => {
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // ─── Slot helpers (sequential) ───
  const moveSlot = (idx: number, dir: -1 | 1) => {
    setSlots((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };
  const addCatToSlot = (slotId: string, cat: ArithmeticCategory) => {
    setSlots((prev) => prev.map((s) =>
      s.id === slotId ? { ...s, categories: [...s.categories, cat] } : s
    ));
  };
  const removeCatFromSlot = (slotId: string, cat: ArithmeticCategory) => {
    setSlots((prev) => prev
      .map((s) => s.id === slotId ? { ...s, categories: s.categories.filter((c) => c !== cat) } : s)
      .filter((s) => s.categories.length > 0)
    );
    const remaining = slots.flatMap((s) => s.id === slotId ? s.categories.filter((c) => c !== cat) : s.categories);
    if (!remaining.includes(cat)) {
      setSelectedCats((prev) => prev.filter((c) => c !== cat));
    }
  };
  const setSlotDays = (slotId: string, days: number) => {
    setSlots((prev) => prev.map((s) =>
      s.id === slotId ? { ...s, days: Math.max(1, Math.min(30, days)) } : s
    ));
  };
  const addNewSlot = () => {
    setSlots((prev) => [...prev, { id: newSlotId(), categories: [], days: 5 }]);
  };

  // ─── Round-robin helpers ───
  const moveRR = (idx: number, dir: -1 | 1) => {
    setRrOrder((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  // ─── Weekday helpers ───
  const toggleWeekdayCat = (dayNum: string, cat: ArithmeticCategory) => {
    setWeekdayMap((prev) => {
      const current = prev[dayNum] ?? [];
      return {
        ...prev,
        [dayNum]: current.includes(cat)
          ? current.filter((c) => c !== cat)
          : [...current, cat],
      };
    });
  };

  // ─── Student helpers ───
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };
  // 전체 선택/해제는 인라인으로 처리

  // ─── Computed ───
  const summary = useMemo(() => {
    if (mode === 'sequential') {
      const activeCount = slots.reduce((sum, s) => sum + s.days, 0);
      if (activeDays.length < 7 && activeDays.length > 0) {
        // 활성일 + 쉬는날 포함 총 달력일
        const calendarDays = Math.ceil(activeCount * 7 / activeDays.length);
        return { totalDays: calendarDays, activeDays: activeCount };
      }
      return { totalDays: activeCount, activeDays: activeCount };
    }
    if (mode === 'round_robin') {
      const activeCount = rrOrder.length * daysPerCategory;
      if (activeDays.length < 7 && activeDays.length > 0) {
        const calendarDays = Math.ceil(activeCount * 7 / activeDays.length);
        return { totalDays: calendarDays, activeDays: activeCount };
      }
      return { totalDays: activeCount, activeDays: activeCount };
    }
    const assignedCount = Object.values(weekdayMap).filter((cats) => cats.length > 0).length;
    return { totalDays: weeks * 7, activeDays: assignedCount * weeks };
  }, [mode, slots, rrOrder, daysPerCategory, weekdayMap, weeks, activeDays]);

  const catsInSlots = useMemo(() => new Set(slots.flatMap((s) => s.categories)), [slots]);

  const canSubmit = title.trim() && (
    mode === 'sequential' ? slots.some((s) => s.categories.length > 0) :
    mode === 'round_robin' ? rrOrder.length > 0 :
    Object.values(weekdayMap).some((cats) => cats.length > 0)
  );

  // ─── Submit ───
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        progressionMode: mode,
        countMode,
        dailyCount,
        passingScore,
        retryOnFail,
        retryMode: retryOnFail ? retryMode : undefined,
        maxRetries: retryOnFail ? maxRetries : undefined,
        startDate,
        studentIds: selectedStudentIds,
      };

      if (countMode === 'per_category') {
        const counts: Record<string, number> = {};
        for (const cat of selectedCats) {
          counts[cat] = perCatCounts[cat] ?? dailyCount;
        }
        payload.perCatCounts = counts;
      }

      if (mode === 'sequential') {
        payload.slots = slots
          .filter((s) => s.categories.length > 0)
          .map((s) => ({ categories: s.categories, days: s.days }));
        if (activeDays.length < 7) payload.activeDays = activeDays;
      } else if (mode === 'round_robin') {
        payload.categories = rrOrder;
        payload.daysPerCategory = daysPerCategory;
        if (activeDays.length < 7) payload.activeDays = activeDays;
      } else {
        const cleanMap: Record<string, string[]> = {};
        for (const [day, cats] of Object.entries(weekdayMap)) {
          if (cats.length > 0) cleanMap[day] = cats;
        }
        payload.weekdayMap = cleanMap;
        payload.weeks = weeks;
      }

      const res = await fetch('/api/arithmetic/homework-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push('/homework');
      } else {
        const json = await res.json();
        toast.error(json.error?.message || '생성 실패');
      }
    } catch {
      toast.error('생성 실패');
    }
    setSaving(false);
  };

  // ─── Derived ───
  const gradeKey = `${schoolLevel}-${gradeNum}`;
  const gradeCats = CATEGORIES_BY_GRADE[gradeKey] ?? [];

  // ─── Render ───
  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="숙제 플랜 만들기"
        subtitle="연산 유형을 선택하고 학생에게 배정합니다"
        icon={<CalendarCheck className="w-6 h-6" />}
        backHref="/homework"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">

          {/* ── Card 1: Title + Start date (one row) ── */}
          <Card padding="base">
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="text-xs font-medium text-text-secondary">제목 *</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 3월 연산 훈련"
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </label>
              <label className="w-40 shrink-0">
                <span className="text-xs font-medium text-text-secondary">시작일</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </label>
            </div>
          </Card>

          {/* ── Card 2: Category Picker ── */}
          <Card padding="base">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-text-primary">연산 유형 선택 *</h2>
              <span className="text-xs text-text-secondary">{selectedCats.length}개 선택</span>
            </div>

            {/* School level + Grade in one row */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex gap-1">
                {(['elementary', 'middle'] as const).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => { setSchoolLevel(lv); setGradeNum(1); }}
                    className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                      schoolLevel === lv ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    {lv === 'elementary' ? '초등' : '중등'}
                  </button>
                ))}
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex gap-1">
                {(schoolLevel === 'elementary' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3]).map((g) => {
                  const key = `${schoolLevel}-${g}`;
                  const count = (CATEGORIES_BY_GRADE[key] ?? []).filter((c) => selectedCats.includes(c)).length;
                  return (
                    <button
                      key={g}
                      onClick={() => setGradeNum(g)}
                      className={`relative px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                        gradeNum === g ? 'bg-slate-800 text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                      }`}
                    >
                      {g}학년
                      {count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-primary text-white text-[8px] font-bold flex items-center justify-center">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {gradeCats.map((cat) => {
                const isSelected = selectedCats.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCat(cat)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium transition-colors border ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 text-text-secondary hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-2 h-2 text-white" />}
                    </div>
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>

            {/* Selected chips */}
            {selectedCats.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-200">
                {selectedCats.map((cat) => (
                  <span key={cat} className="inline-flex items-center gap-0.5 px-2 py-1 rounded-sm text-xs font-medium bg-primary/10 text-primary">
                    {CATEGORY_LABELS[cat]}
                    <span className="text-primary/50">{CATEGORY_GRADE[cat]}</span>
                    <button onClick={() => toggleCat(cat)} className="ml-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* ── Card 3: Assignment Mode + Problem Count (merged) ── */}
          <Card padding="base">
            <h2 className="text-sm font-bold text-text-primary mb-3">배정 방식 *</h2>

            <div className="flex gap-2 mb-3">
              {(Object.keys(MODE_LABELS) as ProgressionMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 px-2 py-1.5 rounded-sm text-center transition-colors border ${
                    mode === m ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`text-xs font-semibold ${mode === m ? 'text-primary' : 'text-text-primary'}`}>
                    {MODE_LABELS[m].label}
                  </div>
                  <div className="text-xs text-text-secondary">{MODE_LABELS[m].desc}</div>
                </button>
              ))}
            </div>

            {/* ── 활성 요일 선택 (구간지정/순환배정 공통) ── */}
            {(mode === 'sequential' || mode === 'round_robin') && (
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-text-secondary shrink-0">배정 요일</span>
                {(['일', '월', '화', '수', '목', '금', '토'] as const).map((label, dow) => (
                  <button
                    key={dow}
                    onClick={() => setActiveDays((prev) =>
                      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow].sort()
                    )}
                    className={`w-7 h-7 rounded-sm text-xs font-medium transition-colors ${
                      activeDays.includes(dow)
                        ? dow === 0 ? 'bg-red-500 text-white' : dow === 6 ? 'bg-blue-500 text-white' : 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setActiveDays(activeDays.length === 7 ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6])}
                  className="text-xs text-primary hover:underline ml-1"
                >
                  {activeDays.length === 7 ? '주말 제외' : '전체'}
                </button>
              </div>
            )}

            {/* ── Sequential: Compact slot rows ── */}
            {mode === 'sequential' && (
              <div className="space-y-1.5 mb-3">
                {slots.map((slot, idx) => (
                  <div key={slot.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-sm border border-slate-200">
                    <span className="text-xs font-bold text-slate-400 w-4 text-center">{idx + 1}</span>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0 flex-wrap">
                      {slot.categories.map((cat) => (
                        <span key={cat} className="inline-flex items-center gap-0.5 px-2 py-1 rounded-sm text-xs font-medium bg-primary/10 text-primary">
                          {CATEGORY_LABELS[cat]}
                          <button onClick={() => removeCatFromSlot(slot.id, cat)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      {selectedCats.filter((c) => !catsInSlots.has(c)).length > 0 && (
                        <select
                          value=""
                          onChange={(e) => { if (e.target.value) addCatToSlot(slot.id, e.target.value as ArithmeticCategory); }}
                          className="px-1.5 py-0.5 rounded-sm text-xs border border-dashed border-slate-300 bg-white text-text-secondary"
                        >
                          <option value="">+</option>
                          {selectedCats.filter((c) => !catsInSlots.has(c)).map((cat) => (
                            <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <input
                      type="number"
                      value={slot.days}
                      onChange={(e) => setSlotDays(slot.id, parseInt(e.target.value) || 1)}
                      className="w-12 px-1.5 py-1 text-xs text-center border border-slate-200 rounded-sm"
                    />
                    <span className="text-xs text-text-secondary">일</span>
                    <button onClick={() => moveSlot(idx, -1)} disabled={idx === 0} className="p-0.5 disabled:opacity-20"><ArrowUp className="w-2.5 h-2.5 text-slate-400" /></button>
                    <button onClick={() => moveSlot(idx, 1)} disabled={idx === slots.length - 1} className="p-0.5 disabled:opacity-20"><ArrowDown className="w-2.5 h-2.5 text-slate-400" /></button>
                  </div>
                ))}
                <button onClick={addNewSlot} className="w-full py-1.5 border border-dashed border-slate-300 rounded-sm text-xs text-text-secondary hover:bg-slate-50 flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" /> 구간 추가
                </button>
              </div>
            )}

            {/* ── Round-robin ── */}
            {mode === 'round_robin' && (
              <div className="mb-3">
                <div className="space-y-1.5 mb-3">
                  {rrOrder.map((cat, idx) => (
                    <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-sm border border-slate-200">
                      <span className="text-xs font-bold text-slate-400 w-4 text-center">{idx + 1}</span>
                      <span className="flex-1 text-xs font-medium text-text-primary">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-xs text-text-secondary">{CATEGORY_GRADE[cat]}</span>
                      <button onClick={() => moveRR(idx, -1)} disabled={idx === 0} className="p-0.5 disabled:opacity-20"><ArrowUp className="w-2.5 h-2.5 text-slate-400" /></button>
                      <button onClick={() => moveRR(idx, 1)} disabled={idx === rrOrder.length - 1} className="p-0.5 disabled:opacity-20"><ArrowDown className="w-2.5 h-2.5 text-slate-400" /></button>
                    </div>
                  ))}
                  {rrOrder.length === 0 && (
                    <p className="text-xs text-text-secondary text-center py-3">위에서 연산 유형을 선택하세요</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary shrink-0">반복</span>
                  <div className="flex gap-1.5">
                    {[3, 5, 7, 10].map((n) => (
                      <button
                        key={n}
                        onClick={() => setDaysPerCategory(n)}
                        className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                          daysPerCategory === n ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                        }`}
                      >
                        {n}바퀴
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Weekday: Compact grid table ── */}
            {mode === 'weekday' && (
              <div className="mb-3">
                {selectedCats.length === 0 ? (
                  <p className="text-xs text-text-secondary text-center py-3">위에서 연산 유형을 선택하세요</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left py-1 pr-2 text-text-secondary font-medium">유형</th>
                          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                            <th key={d} className={`px-1 py-1 text-center font-bold w-8 ${
                              d === 0 ? 'text-red-400' : d === 6 ? 'text-blue-400' : 'text-text-secondary'
                            }`}>
                              {WEEKDAY_LABELS[d]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCats.map((cat) => (
                          <tr key={cat} className="border-t border-slate-100">
                            <td className="py-1 pr-2 text-xs text-text-primary font-medium whitespace-nowrap">{CATEGORY_LABELS[cat]}</td>
                            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                              const isActive = (weekdayMap[String(d)] ?? []).includes(cat);
                              return (
                                <td key={d} className="px-1 py-1 text-center">
                                  <button
                                    onClick={() => toggleWeekdayCat(String(d), cat)}
                                    className={`w-6 h-6 rounded-sm border transition-colors ${
                                      isActive
                                        ? 'bg-primary border-primary text-white'
                                        : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {isActive && <Check className="w-3 h-3 mx-auto" />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-text-secondary shrink-0">반복</span>
                  <div className="flex gap-1.5">
                    {[2, 4, 8, 12].map((n) => (
                      <button
                        key={n}
                        onClick={() => setWeeks(n)}
                        className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                          weeks === n ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                        }`}
                      >
                        {n}주
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Divider ── */}
            <div className="border-t border-slate-200 pt-3">
              <h3 className="text-sm font-bold text-text-primary mb-3">문제 수</h3>

              <div className="flex gap-2 mb-3">
                {([
                  { value: 'total' as CountMode, label: '하루 총 문제수' },
                  { value: 'per_category' as CountMode, label: '유형별 개별 설정' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setCountMode(opt.value)}
                    className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${
                      countMode === opt.value ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Total mode: quick buttons */}
              {countMode === 'total' && (
                <div className="flex gap-2">
                  {[10, 20, 30, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setDailyCount(n)}
                      className={`flex-1 px-2 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                        dailyCount === n ? 'bg-slate-800 text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                      }`}
                    >
                      {n}문제
                    </button>
                  ))}
                </div>
              )}

              {/* Per-category mode: individual inputs */}
              {countMode === 'per_category' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-text-secondary">일괄 설정:</span>
                    {[10, 20, 30].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setDailyCount(n);
                          setPerCatCounts((prev) => {
                            const next = { ...prev };
                            for (const cat of selectedCats) next[cat] = n;
                            return next;
                          });
                        }}
                        className="px-2 py-0.5 rounded-sm text-xs font-medium bg-slate-100 text-text-secondary hover:bg-slate-200"
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {/* Per-cat rows */}
                  {selectedCats.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-3">유형을 먼저 선택하세요</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCats.map((cat) => (
                        <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-sm border border-slate-100">
                          <span className="flex-1 text-xs font-medium text-text-primary truncate">{CATEGORY_LABELS[cat]}</span>
                          <input
                            type="number"
                            value={perCatCounts[cat] ?? dailyCount}
                            onChange={(e) => setPerCatCounts((prev) => ({ ...prev, [cat]: Math.max(1, Math.min(100, parseInt(e.target.value) || 1)) }))}
                            className="w-12 px-1.5 py-1 text-xs text-center border border-slate-200 rounded-sm"
                          />
                          <span className="text-xs text-text-secondary">문제</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Passing score ── */}
            <div className="border border-slate-200 rounded-sm p-4 space-y-3 mt-3">
              <h3 className="text-sm font-bold text-text-primary">통과 기준</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary shrink-0">통과 점수</span>
                <div className="flex gap-1.5">
                  {[60, 70, 80, 90, 100].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPassingScore(s)}
                      className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                        passingScore === s
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retryOnFail}
                  onChange={(e) => setRetryOnFail(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-xs text-text-primary">미통과 시 재시도 필수</span>
                <span className="text-xs text-text-secondary">(학생이 통과할 때까지 재풀이)</span>
              </label>
              {retryOnFail && (
                <div className="space-y-3 pl-5 border-l-2 border-primary/20">
                  <div>
                    <div className="text-xs text-text-secondary mb-1.5">재시도 방식</div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'wrong_same' as const, label: '틀린 문제만', desc: '숫자 그대로' },
                        { value: 'wrong_new' as const, label: '틀린 문제만', desc: '숫자 변경' },
                        { value: 'all_same' as const, label: '전체 문제', desc: '숫자 그대로' },
                        { value: 'all_new' as const, label: '전체 문제', desc: '숫자 변경' },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRetryMode(opt.value)}
                          className={`px-2 py-1.5 rounded-sm text-left transition-colors border ${
                            retryMode === opt.value
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className={`text-xs font-semibold ${retryMode === opt.value ? 'text-primary' : 'text-text-primary'}`}>
                            {opt.label}
                          </div>
                          <div className="text-xs text-text-secondary">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary shrink-0">최대 재시도</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 5, 0].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMaxRetries(n)}
                          className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                            maxRetries === n
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                          }`}
                        >
                          {n === 0 ? '무제한' : `${n}회`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Inline summary ── */}
            {canSubmit && (
              <div className="mt-3 px-3 py-2 bg-indigo-50 rounded-sm border border-indigo-100 text-xs text-indigo-600">
                {summary.activeDays !== summary.totalDays
                  ? `총 ${summary.totalDays}일 중 ${summary.activeDays}일 배정`
                  : `총 ${summary.totalDays}일`}
                {' · '}
                {countMode === 'per_category'
                  ? '유형별 개별 문제수'
                  : `하루 ${dailyCount}문제`}
                {' · '}
                통과 {passingScore}%{retryOnFail ? ` · 재시도 ${maxRetries === 0 ? '무제한' : `최대 ${maxRetries}회`}` : ''}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: Student selection ── */}
        <div className="lg:col-span-1">
          <Card padding="base">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                학생 배정
                {selectedStudentIds.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {selectedStudentIds.length}명
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedStudentIds(students.map((s) => s.id))}
                  className="text-xs text-primary hover:underline"
                >
                  전체 선택
                </button>
                {selectedStudentIds.length > 0 && (
                  <button
                    onClick={() => setSelectedStudentIds([])}
                    className="text-xs text-slate-400 hover:text-red-500 hover:underline"
                  >
                    전체 해제
                  </button>
                )}
              </div>
            </div>

            {/* 반별 배정 */}
            {classrooms.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <School className="w-3.5 h-3.5" /> 반별 배정:
                </span>
                {classrooms.map((cr) => {
                  const crStudentIds = cr.students.map((s) => s.id);
                  const allSelected = crStudentIds.length > 0 && crStudentIds.every((id) => selectedStudentIds.includes(id));
                  return (
                    <button
                      key={cr.id}
                      onClick={() => {
                        if (allSelected) {
                          setSelectedStudentIds((prev) => prev.filter((id) => !crStudentIds.includes(id)));
                        } else {
                          setSelectedStudentIds((prev) => [...new Set([...prev, ...crStudentIds])]);
                        }
                      }}
                      className={`text-xs px-2.5 py-1 rounded-sm border transition-colors ${
                        allSelected ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-slate-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {cr.name} ({crStudentIds.length})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="이름 또는 아이디 검색"
                className="w-full h-9 pl-8 pr-3 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            <div className="max-h-[400px] overflow-y-auto border border-slate-200 rounded-sm">
              {loadingStudents ? (
                <div className="space-y-1.5 p-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded" />
                  ))}
                </div>
              ) : students.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-4">학생이 없습니다</p>
              ) : (
                students.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b border-slate-100 last:border-0 transition-colors ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary border-primary' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-text-primary truncate">{student.name}</span>
                      <span className="ml-auto text-xs text-text-secondary shrink-0">{student.username}</span>
                      {student.grade && (
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-sm shrink-0">
                          {student.grade > 6 ? `중${student.grade - 6}` : `초${student.grade}`}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <p className="text-xs text-slate-400 mt-2">
              * 학생을 선택하지 않고도 플랜을 먼저 생성할 수 있습니다.
            </p>

            <Button
              className="w-full mt-3"
              onClick={handleSubmit}
              loading={saving}
              disabled={!canSubmit}
            >
              <CalendarCheck className="w-4 h-4 mr-1" />
              숙제 플랜 생성{selectedStudentIds.length > 0 ? ` + ${selectedStudentIds.length}명 배정` : ''}
            </Button>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
