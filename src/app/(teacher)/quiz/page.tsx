'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Plus, Users, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingEmptyState } from '@/components/ui/LoadingEmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

interface QuizSessionItem {
  id: string;
  title: string;
  joinCode: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  currentQ: number;
  questionIds: string[];
  createdAt: string;
  _count: { participants: number };
}

const STATUS_LABELS: Record<string, string> = {
  WAITING: '대기 중',
  ACTIVE: '진행 중',
  COMPLETED: '종료',
};

const STATUS_VARIANT: Record<string, 'info' | 'warning' | 'success'> = {
  WAITING: 'info',
  ACTIVE: 'warning',
  COMPLETED: 'success',
};

export default function QuizPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<QuizSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [bookCode, setBookCode] = useState('1-1');
  const [creating, setCreating] = useState(false);
  const [questions, setQuestions] = useState<{ id: string; content: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/quiz');
      if (res.ok) {
        const json = await res.json();
        setSessions(json.data ?? []);
      }
    } catch (err) { console.error('퀴즈 세션 목록 조회 실패:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const fetchQuestions = useCallback(async () => {
    const res = await fetch(`/api/questions?bookCode=${bookCode}&limit=30`);
    if (res.ok) {
      const json = await res.json();
      setQuestions(json.data ?? []);
    }
  }, [bookCode]);

  useEffect(() => {
    if (showCreate) fetchQuestions();
  }, [showCreate, fetchQuestions]);

  const handleCreate = async () => {
    if (!title.trim() || selectedIds.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, questionIds: selectedIds }),
      });
      if (res.ok) {
        const json = await res.json();
        router.push(`/quiz/${json.data.joinCode}/host`);
      }
    } catch (err) { console.error('퀴즈 세션 생성 실패:', err); }
    setCreating(false);
  };

  return (
    <LoadingEmptyState
      loading={loading}
      empty={false}
    >
      <div className="p-5 max-w-4xl mx-auto">
        <PageHeader
          title="퀴즈 배틀"
          icon={<Zap className="w-6 h-6 text-yellow-500" />}
          actions={
            <Button onClick={() => setShowCreate(!showCreate)}>
              <Plus className="w-4 h-4 mr-1" />
              새 퀴즈
            </Button>
          }
        />

        {/* Create form */}
        {showCreate && (
          <Card padding="md" className="mb-6">
            <h3 className="font-bold text-text-primary mb-4">새 퀴즈 만들기</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="퀴즈 제목 (예: 방정식 스피드 퀴즈)"
                className="w-full px-4 py-2 border border-slate-200 rounded-sm text-sm"
              />
              <div className="flex items-center gap-2">
                <select
                  value={bookCode}
                  onChange={(e) => setBookCode(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-sm text-sm"
                >
                  {['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="text-xs text-text-secondary">
                  {selectedIds.length}문제 선택됨
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-sm p-2">
                {questions.map((q) => (
                  <label key={q.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(q.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(q.id) ? prev.filter((x) => x !== q.id) : [...prev, q.id]
                        )
                      }
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-xs text-text-primary truncate">{q.content.slice(0, 80)}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} loading={creating} disabled={!title.trim() || selectedIds.length === 0}>
                  퀴즈 생성 & 진행
                </Button>
                <Button variant="ghost" onClick={() => setShowCreate(false)}>취소</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Session list */}
        <LoadingEmptyState
          loading={false}
          empty={sessions.length === 0}
          icon={<Zap className="w-10 h-10 text-slate-300" />}
          message="아직 생성된 퀴즈가 없습니다"
        >
          <div className="space-y-3">
            {sessions.map((s) => (
              <Card
                key={s.id}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => router.push(`/quiz/${s.joinCode}/host`)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-sm">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">{s.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                      <span className="font-mono font-bold text-primary">{s.joinCode}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {s._count.participants}명
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Array.isArray(s.questionIds) ? s.questionIds.length : 0}문제
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[s.status]}>
                  {s.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {STATUS_LABELS[s.status]}
                </Badge>
              </Card>
            ))}
          </div>
        </LoadingEmptyState>
      </div>
    </LoadingEmptyState>
  );
}
