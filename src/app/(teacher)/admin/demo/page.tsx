'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserPlus, Plus, Save, Copy, RotateCcw, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

type Paper = {
  id: string; title: string; grade: string; status: string;
  createdAt: string; analyzedAt: string | null;
  hasCommentary: boolean; hasBlog: boolean; copies: number;
};
type Perm = 'analyze' | 'commentary' | 'blog';
type SortCol = 'username' | 'name' | 'used' | 'activity' | 'lastActivityAt';
type DemoAccount = {
  id: string; username: string; name: string; createdAt: string;
  used: number; limit: number; remaining: number; exhausted: boolean;
  uploads: number; inProgress: number; failed: number;
  commentary: number; blog: number; copies: number;
  perms: Record<Perm, boolean>;
  lastActivityAt: string | null; papers: Paper[];
};
type Summary = {
  accounts: number; active: number; exhausted: number; totalUsed: number;
  totalCommentary: number; totalBlog: number; totalCopies: number;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', ANALYZING: '분석중', COMPLETED: '완료', FAILED: '실패',
};

const PERM_LABEL: Record<Perm, string> = { analyze: '분석', commentary: '총평', blog: '블로그' };
const PERM_KEYS: Perm[] = ['analyze', 'commentary', 'blog'];

/** 압축 시간 표기 — "YY.MM.DD HH:mm" (한 줄). */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const EMPTY_SUMMARY: Summary = { accounts: 0, active: 0, exhausted: 0, totalUsed: 0, totalCommentary: 0, totalBlog: 0, totalCopies: 0 };

/** 데모 계정 발급/모니터링 — SUPER_ADMIN 전용. */
export default function AdminDemoPage() {
  const { user, status } = useAuth();
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [demoLimit, setDemoLimit] = useState(3);
  const [loading, setLoading] = useState(true);

  // 발급 폼
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);

  // 기본 한도 입력
  const [limitInput, setLimitInput] = useState('3');

  // 펼친 행
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // 정렬 (데이터성 컬럼만) — col=null이면 API 순서(발급 최신순) 유지
  const [sort, setSort] = useState<{ col: SortCol | null; dir: 'asc' | 'desc' }>({ col: null, dir: 'asc' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/demo');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '불러오기 실패');
      setAccounts(json.data.accounts ?? []);
      setSummary(json.data.summary ?? EMPTY_SUMMARY);
      setDemoLimit(json.data.demoLimit ?? 3);
      setLimitInput(String(json.data.demoLimit ?? 3));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  // SUPER_ADMIN 일 때만 조회(세션 로딩 중·비권한 사용자의 불필요한 403 fetch/오류 토스트 방지).
  useEffect(() => { if (user?.role === 'SUPER_ADMIN') void load(); }, [load, user?.role]);

  const issue = async () => {
    setIssuing(true);
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim() || undefined,
          name: newName.trim() || undefined,
          limit: newLimit.trim() || undefined,
          password: newPassword.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '발급 실패');
      setIssued({ username: json.data.username, password: json.data.password });
      setNewUsername(''); setNewName(''); setNewLimit(''); setNewPassword('');
      toast.success('데모 계정이 발급되었습니다');
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIssuing(false);
    }
  };

  const saveDefaultLimit = async () => {
    const raw = Number(limitInput);
    if (limitInput.trim() === '' || !Number.isFinite(raw)) { toast.error('0 이상 숫자를 입력하세요'); return; }
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoLimit: Math.max(0, Math.floor(raw)) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '저장 실패');
      toast.success(`기본 체험 횟수를 ${json.data.demoLimit}회로 설정했습니다`);
      void load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const setAccountLimit = async (a: DemoAccount, limit: number) => {
    if (limit === a.limit) return;
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: a.id, limit }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '한도 변경 실패');
      toast.success(`${a.username} 체험 횟수 ${limit}회로 변경했습니다`);
      void load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const setAccountPerm = async (a: DemoAccount, key: Perm, value: boolean) => {
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: a.id, perms: { ...a.perms, [key]: value } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '권한 변경 실패');
      toast.success(`${a.username} · ${PERM_LABEL[key]} ${value ? '허용' : '차단'}`);
      void load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const resetUsage = async (a: DemoAccount) => {
    if (!window.confirm(`${a.username} 계정의 체험 기록을 초기화할까요?\n(업로드한 시험지·분석이 모두 삭제됩니다)`)) return;
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetUserId: a.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '초기화 실패');
      toast.success('체험 기록을 초기화했습니다');
      void load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const revoke = async (a: DemoAccount) => {
    if (!window.confirm(`${a.username} 계정을 회수(삭제)할까요?`)) return;
    try {
      const res = await fetch(`/api/admin/demo?id=${encodeURIComponent(a.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '회수 실패');
      toast.success('데모 계정을 회수했습니다');
      void load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const copy = (text: string) => { void navigator.clipboard?.writeText(text); toast.success('복사됨'); };

  const toggle = (id: string) => setExpanded((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleSort = (col: SortCol) =>
    setSort((s) => (s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));

  const sortedAccounts = useMemo(() => {
    const col = sort.col;
    if (!col) return accounts; // 정렬 안 함 → API 순서(발급 최신순)
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (a: DemoAccount): string | number => {
      switch (col) {
        case 'username': return a.username;
        case 'name': return a.name;
        case 'used': return a.used;
        case 'activity': return a.commentary + a.blog + a.copies;
        case 'lastActivityAt': return a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      }
    };
    return [...accounts].sort((x, y) => {
      const vx = val(x), vy = val(y);
      if (typeof vx === 'number' && typeof vy === 'number') return (vx - vy) * dir;
      return String(vx).localeCompare(String(vy), 'ko') * dir;
    });
  }, [accounts, sort]);

  if (status === 'loading') {
    return <div className="p-8 text-center text-slate-400">불러오는 중…</div>;
  }
  if (!user || user.role !== 'SUPER_ADMIN') {
    return <div className="p-8 text-center text-slate-500">SUPER_ADMIN 전용 페이지입니다.</div>;
  }

  return (
    <PageContainer maxWidth="full">
      <PageHeader title="데모 계정 발급" icon={<UserPlus className="w-6 h-6" />} />

      {/* 집계 — 계정 현황 + 누적 활동(분석·총평·블로그·복사) */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border border-slate-200 rounded-sm bg-white px-4 py-3">
        {[
          { label: '데모 계정', value: summary.accounts },
          { label: '활성', value: summary.active },
          { label: '소진', value: summary.exhausted },
        ].map((c) => (
          <span key={c.label} className="flex items-baseline gap-1.5">
            <span className="text-xs text-slate-400">{c.label}</span>
            <b className="text-slate-800">{c.value}</b>
          </span>
        ))}
        <span className="h-4 w-px bg-slate-200" />
        {[
          { label: '분석', value: summary.totalUsed },
          { label: '총평', value: summary.totalCommentary },
          { label: '블로그', value: summary.totalBlog },
          { label: '복사', value: summary.totalCopies },
        ].map((c) => (
          <span key={c.label} className="flex items-baseline gap-1.5">
            <span className="text-xs text-slate-400">{c.label}</span>
            <b className="text-slate-800">{c.value}</b>
          </span>
        ))}
      </div>

      {/* 발급 폼 */}
      <div className="mb-4 p-4 border border-slate-200 rounded-sm bg-slate-50">
        <div className="grid grid-cols-[13rem_15rem_6rem_13rem_auto] gap-3 items-end">
          <Input label="아이디 (비우면 자동)" placeholder="예: hanmath" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          <Input label="이름 (예: 학원명)" placeholder="예: 한수학학원" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input label="초기 횟수" type="number" min={0} placeholder={String(demoLimit)} value={newLimit} onChange={(e) => setNewLimit(e.target.value)} />
          <Input label="비밀번호 (비우면 자동)" placeholder="자동 생성" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Button size="md" onClick={issue} loading={issuing}><Plus className="w-4 h-4 mr-1" /> 발급</Button>
        </div>
        {issued && (
          <div className="mt-3 p-3 border border-emerald-300 bg-emerald-50 rounded-sm">
            <div className="text-sm font-bold text-emerald-800 mb-1.5">발급 완료 — 비밀번호는 지금만 표시됩니다</div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5"><span className="text-slate-500">아이디</span><code className="font-mono font-bold">{issued.username}</code></span>
              <span className="flex items-center gap-1.5"><span className="text-slate-500">비밀번호</span><code className="font-mono font-bold">{issued.password}</code></span>
              <button onClick={() => copy(`아이디: ${issued.username}\n비밀번호: ${issued.password}`)} className="flex items-center gap-1 text-xs text-emerald-700 hover:underline"><Copy className="w-3.5 h-3.5" /> 전체 복사</button>
              <button onClick={() => setIssued(null)} className="text-xs text-slate-400 hover:text-slate-600">닫기</button>
            </div>
          </div>
        )}
      </div>

      {/* 신규 계정 기본 체험 횟수 */}
      <div className="mb-4 flex items-end gap-2">
        <Input label="신규 계정 기본 체험 횟수" type="number" min={0} value={limitInput} onChange={(e) => setLimitInput(e.target.value)} className="w-44" />
        <Button size="sm" variant="secondary" onClick={saveDefaultLimit}><Save className="w-4 h-4 mr-1" /> 저장</Button>
        <span className="text-xs text-slate-400 pb-3">현재 기본값: {demoLimit}회 · 신규 발급에만 적용(기존 계정은 아래 표에서 개별 조정)</span>
      </div>

      {/* 계정 테이블 */}
      <div className="border border-slate-200 rounded-sm overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="w-8" />
              <SortTh col="username" label="아이디" sort={sort} onSort={toggleSort} />
              <SortTh col="name" label="이름" sort={sort} onSort={toggleSort} />
              <SortTh col="used" label="체험 사용" sort={sort} onSort={toggleSort} />
              <th className="text-left px-3 py-2 font-medium">한도 조정</th>
              <th className="text-left px-3 py-2 font-medium">권한</th>
              <SortTh col="activity" label="활동" sort={sort} onSort={toggleSort} />
              <SortTh col="lastActivityAt" label="마지막 활동" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">불러오는 중…</td></tr>
            ) : accounts.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">발급된 데모 계정이 없습니다</td></tr>
            ) : sortedAccounts.map((a) => (
              <AccountRow
                key={a.id}
                a={a}
                expanded={expanded.has(a.id)}
                onToggle={() => toggle(a.id)}
                onSetLimit={setAccountLimit}
                onSetPerm={setAccountPerm}
                onReset={() => resetUsage(a)}
                onRevoke={() => revoke(a)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        데모 계정은 전용 지점(<code>demo</code>)의 일회용 강사 계정입니다. 계정마다 독립적으로 기출분석을 한도만큼 체험할 수 있고,
        소진되면 분석 실행이 차단됩니다. &ldquo;횟수 부족&rdquo; 요청 시 해당 계정 한도를 즉시 올릴 수 있습니다.
        비밀번호는 발급 시 1회만 표시됩니다. 특정 학원 전용으로 발급하려면 아이디·이름에 학원 정보를 입력하세요.
        <b>권한</b> 칸에서 <b>분석·총평·블로그</b> 체험을 계정별로 켜고 끌 수 있습니다(기본 전체 허용, 클릭하면 토글).
      </p>
    </PageContainer>
  );
}

/** 정렬 가능한 헤더 셀 (데이터성 컬럼). */
function SortTh({ col, label, sort, onSort }: {
  col: SortCol;
  label: string;
  sort: { col: SortCol | null; dir: 'asc' | 'desc' };
  onSort: (col: SortCol) => void;
}) {
  const active = sort.col === col;
  return (
    <th className="text-left px-3 py-2 font-medium">
      <button
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
        title="클릭하여 정렬"
      >
        {label}
        <span className={`text-[9px] leading-none ${active ? 'text-slate-600' : 'text-slate-300'}`}>
          {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
}

/** 계정 한 행 + (펼침 시) 분석 이력. */
function AccountRow({
  a, expanded, onToggle, onSetLimit, onSetPerm, onReset, onRevoke,
}: {
  a: DemoAccount;
  expanded: boolean;
  onToggle: () => void;
  onSetLimit: (a: DemoAccount, limit: number) => void;
  onSetPerm: (a: DemoAccount, key: Perm, value: boolean) => void;
  onReset: () => void;
  onRevoke: () => void;
}) {
  const [limitDraft, setLimitDraft] = useState(String(a.limit));
  useEffect(() => { setLimitDraft(String(a.limit)); }, [a.limit]);

  const applyLimit = () => {
    const raw = Number(limitDraft);
    if (limitDraft.trim() === '' || !Number.isFinite(raw)) { toast.error('0 이상 숫자를 입력하세요'); return; }
    onSetLimit(a, Math.max(0, Math.floor(raw)));
  };

  return (
    <>
      <tr className="border-t border-slate-100">
        <td className="px-2 text-center">
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-700" title="분석 이력 보기">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-3 py-2"><code className="font-mono">{a.username}</code></td>
        <td className="px-3 py-2 text-slate-600">{a.name}</td>
        <td className="px-3 py-2">
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${a.exhausted ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {a.used} / {a.limit}{a.exhausted ? ' · 소진' : ` · 남은 ${a.remaining}`}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              value={limitDraft}
              onChange={(e) => setLimitDraft(e.target.value)}
              className="w-16 h-8 px-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button size="sm" variant="secondary" onClick={applyLimit}>적용</Button>
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {PERM_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => onSetPerm(a, k, !a.perms[k])}
                title={`${PERM_LABEL[k]} ${a.perms[k] ? '허용됨 — 클릭하면 차단' : '차단됨 — 클릭하면 허용'}`}
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold transition-colors ${a.perms[k] ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-400 line-through hover:bg-slate-200'}`}
              >
                {PERM_LABEL[k]}
              </button>
            ))}
          </div>
        </td>
        <td
          className="px-3 py-2 text-xs text-slate-600"
          title={`업로드 ${a.uploads} · 진행 ${a.inProgress} · 실패 ${a.failed}`}
        >
          총평 {a.commentary} · 블로그 {a.blog} · 복사 {a.copies}
        </td>
        <td className="px-3 py-2 text-xs text-slate-500">
          {a.lastActivityAt ? fmtTime(a.lastActivityAt) : '—'}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1 justify-end">
            <Button size="sm" variant="secondary" onClick={onReset} title="체험 기록 초기화"><RotateCcw className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="danger" onClick={onRevoke} title="계정 회수"><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50/60">
          <td />
          <td colSpan={8} className="px-3 py-2">
            {a.papers.length === 0 ? (
              <div className="text-xs text-slate-400">분석 이력이 없습니다</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="text-left py-1 pr-3 font-medium">시험지</th>
                    <th className="text-left py-1 pr-3 font-medium">학년</th>
                    <th className="text-left py-1 pr-3 font-medium">상태</th>
                    <th className="text-center py-1 pr-3 font-medium">총평</th>
                    <th className="text-center py-1 pr-3 font-medium">블로그</th>
                    <th className="text-center py-1 pr-3 font-medium">복사</th>
                    <th className="text-left py-1 font-medium">분석 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {a.papers.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="py-1 pr-3 text-slate-700">{p.title}</td>
                      <td className="py-1 pr-3 text-slate-500">{p.grade}</td>
                      <td className="py-1 pr-3 text-slate-600">{STATUS_LABEL[p.status] ?? p.status}</td>
                      <td className="py-1 pr-3 text-center">{p.hasCommentary ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="py-1 pr-3 text-center">{p.hasBlog ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="py-1 pr-3 text-center text-slate-600">{p.copies > 0 ? p.copies : <span className="text-slate-300">—</span>}</td>
                      <td className="py-1 text-slate-500">{p.analyzedAt ? fmtTime(p.analyzedAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
