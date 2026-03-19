'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  MessageSquare,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  CheckCircle2,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

interface Inquiry {
  id: string;
  title: string;
  category: string;
  content: string;
  status: 'PENDING' | 'ANSWERED';
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; username: string };
  replier: { id: string; name: string } | null;
}

const FAQ_ITEMS = [
  {
    q: '학생 계정은 어떻게 생성하나요?',
    a: '학생 관리 페이지에서 "학생 추가" 버튼을 클릭하여 이름, 아이디, 초기 비밀번호, 학년을 입력하면 계정이 생성됩니다.',
  },
  {
    q: '학생의 비밀번호를 초기화하려면?',
    a: '학생 관리 페이지에서 해당 학생의 "비밀번호 초기화" 버튼을 클릭하면 비밀번호가 1234로 초기화됩니다.',
  },
  {
    q: '학습 분석 리포트는 어떻게 확인하나요?',
    a: '학습 분석 메뉴에서 학생을 선택하면 월간 분석 리포트를 확인할 수 있습니다. PDF로 다운로드하여 학부모에게 전달할 수도 있습니다.',
  },
  {
    q: '4단계 학습 시스템이 무엇인가요?',
    a: 'Stage 1(개념 읽기) → Stage 2(빈칸 쉬움) → Stage 3(빈칸 어려움) → Stage 4(백지 쓰기)의 4단계로 구성되어 있으며, 학생이 개념을 완전히 이해할 수 있도록 설계되었습니다.',
  },
  {
    q: 'XP와 레벨 시스템은 어떻게 작동하나요?',
    a: '학생이 각 스테이지를 완료할 때마다 XP를 획득합니다. XP가 일정량 이상 쌓이면 레벨이 올라가며, 랭킹 페이지에서 다른 학생과 순위를 비교할 수 있습니다.',
  },
];

const CATEGORIES = ['계정 관련', '학습 기능', '시스템 오류', '기타'];

export default function SupportPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // Teacher form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Admin state
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ANSWERED'>('ALL');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Split panel state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [showInquiryForm, setShowInquiryForm] = useState(false);

  const pendingCount = inquiries.filter((inq) => inq.status === 'PENDING').length;

  const filteredInquiries =
    statusFilter === 'ALL' ? inquiries : inquiries.filter((inq) => inq.status === statusFilter);

  const fetchInquiries = useCallback(async () => {
    try {
      const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/inquiries${params}`);
      if (res.ok) {
        const json = await res.json();
        setInquiries(json.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user) fetchInquiries();
  }, [user, fetchInquiries]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, content }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setCategory(CATEGORIES[0]);
        setSubmitSuccess(true);
        setTimeout(() => setSubmitSuccess(false), 3000);
        setShowInquiryForm(false);
        fetchInquiries();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!selectedInquiry || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/inquiries/${selectedInquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText }),
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedInquiry(json.data);
        setReplyText('');
        fetchInquiries();
      }
    } finally {
      setReplying(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  // ===== RENDER =====
  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel ===== */}
      <aside
        className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${
          leftPanelCollapsed ? 'w-12' : 'w-72'
        }`}
      >
        {/* Panel Header */}
        <div className="shrink-0 p-3 border-b border-slate-200 flex items-center justify-between gap-2">
          {!leftPanelCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <HelpCircle className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-base font-bold text-text-primary truncate">고객지원</h1>
              {isAdmin && pendingCount > 0 && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  {pendingCount}
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            className="p-1 rounded-sm hover:bg-slate-200 text-text-secondary transition-colors shrink-0"
            title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
          >
            {leftPanelCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Panel Body (hidden when collapsed) */}
        {!leftPanelCollapsed && (
          <div className="flex-1 flex flex-col min-h-0">
            {isAdmin ? (
              <>
                {/* Admin: Status Filter Pills */}
                <div className="shrink-0 px-3 py-2 border-b border-slate-200 flex gap-1">
                  {(['ALL', 'PENDING', 'ANSWERED'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2 py-1 rounded-sm text-xs font-semibold transition-colors ${
                        statusFilter === s
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                      }`}
                    >
                      {s === 'ALL' ? '전체' : s === 'PENDING' ? '대기중' : '답변완료'}
                    </button>
                  ))}
                </div>

                {/* Admin: Inquiry List */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : filteredInquiries.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary text-xs">
                      접수된 문의가 없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {filteredInquiries.map((inq) => (
                        <button
                          key={inq.id}
                          onClick={() => {
                            setSelectedInquiry(inq);
                            setReplyText('');
                          }}
                          className={`w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-slate-100 transition-colors ${
                            selectedInquiry?.id === inq.id
                              ? 'bg-primary/5 border-l-2 border-l-primary'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`px-1.5 py-0.5 rounded-sm text-xs font-bold ${
                                inq.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {inq.status === 'PENDING' ? '대기' : '완료'}
                            </span>
                            <span className="text-xs text-text-secondary truncate">
                              {inq.category}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-text-primary truncate">
                            {inq.title}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {inq.user.name} · {formatDateShort(inq.createdAt)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Teacher: New Inquiry Button */}
                <div className="shrink-0 px-3 py-2 border-b border-slate-200">
                  <button
                    onClick={() => {
                      setShowInquiryForm(true);
                      setSelectedInquiry(null);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    문의하기
                  </button>
                </div>

                {/* Teacher: My Inquiry List */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : inquiries.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary text-xs">
                      등록된 문의가 없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {inquiries.map((inq) => (
                        <button
                          key={inq.id}
                          onClick={() => {
                            setSelectedInquiry(inq);
                            setShowInquiryForm(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-slate-100 transition-colors ${
                            selectedInquiry?.id === inq.id
                              ? 'bg-primary/5 border-l-2 border-l-primary'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`px-1.5 py-0.5 rounded-sm text-xs font-bold ${
                                inq.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {inq.status === 'PENDING' ? '대기' : '완료'}
                            </span>
                            <span className="text-xs text-text-secondary truncate">
                              {inq.category}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-text-primary truncate">
                            {inq.title}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {formatDateShort(inq.createdAt)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {/* ===== Right Panel ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <div className="flex-1 flex items-center justify-center overflow-y-auto p-3 md:p-4">
          {/* ---- Teacher: Inquiry Form ---- */}
          {!isAdmin && showInquiryForm && !selectedInquiry ? (
            <div className="max-w-[700px] mx-auto flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  1:1 문의하기
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  궁금한 점이나 불편한 사항을 문의해주세요.
                </p>
              </div>

              <Card className="p-3 flex flex-col gap-2">
                {submitSuccess && (
                  <div className="flex items-center gap-2 px-3 py-3 bg-emerald-50 text-emerald-700 rounded-sm text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> 문의가 등록되었습니다.
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">제목</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 px-3 rounded-sm border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    placeholder="문의 제목을 입력해주세요"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">카테고리</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-11 px-3 rounded-sm border border-slate-200 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">내용</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="px-3 py-3 rounded-sm border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px] min-h-[120px] resize-y"
                    placeholder="문의 내용을 자세히 적어주세요"
                  />
                </div>
                <div className="pt-2 flex gap-2">
                  <Button onClick={handleSubmit} loading={submitting} disabled={!title.trim() || !content.trim()}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    문의 등록
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowInquiryForm(false);
                      setTitle('');
                      setContent('');
                      setCategory(CATEGORIES[0]);
                    }}
                  >
                    취소
                  </Button>
                </div>
              </Card>
            </div>
          ) : selectedInquiry ? (
            /* ---- Inquiry Detail (both Admin and Teacher) ---- */
            <div className="max-w-[700px] mx-auto flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-0.5 rounded-sm text-xs font-bold ${
                    selectedInquiry.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {selectedInquiry.status === 'PENDING' ? '대기중' : '답변완료'}
                </span>
                <span className="text-xs text-text-secondary">{selectedInquiry.category}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-text-primary">{selectedInquiry.title}</h3>
                <p className="text-xs text-text-secondary mt-1">
                  {selectedInquiry.user.name}
                  {isAdmin && ` (${selectedInquiry.user.username})`} ·{' '}
                  {formatDate(selectedInquiry.createdAt)}
                </p>
              </div>

              <div className="bg-slate-50 rounded-sm p-2.5 text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {selectedInquiry.content}
              </div>

              {selectedInquiry.reply && (
                <div className="border-l-4 border-primary bg-primary/5 rounded-r-sm p-2.5">
                  <p className="text-xs font-bold text-primary mb-2">
                    관리자 답변 ·{' '}
                    {selectedInquiry.repliedAt && formatDate(selectedInquiry.repliedAt)}
                  </p>
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {selectedInquiry.reply}
                  </p>
                </div>
              )}

              {/* Admin: Reply Form */}
              {isAdmin && selectedInquiry.status === 'PENDING' && (
                <div className="flex flex-col gap-3 border-t border-slate-200 pt-2">
                  <label className="text-sm font-semibold text-text-primary">답변 작성</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="px-3 py-3 rounded-sm border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px] min-h-[120px] resize-y"
                    placeholder="답변 내용을 입력해주세요"
                  />
                  <div>
                    <Button onClick={handleReply} loading={replying} disabled={!replyText.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      답변 등록
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ---- Default: FAQ + Guide ---- */
            <div className="max-w-[700px] mx-auto flex flex-col gap-3">
              {/* Submit Success Toast (visible even on FAQ view after submitting) */}
              {submitSuccess && (
                <div className="flex items-center gap-2 px-3 py-3 bg-emerald-50 text-emerald-700 rounded-sm text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> 문의가 등록되었습니다.
                </div>
              )}

              {/* 사용 가이드 */}
              <Card className="p-3 flex items-center gap-2 hover:shadow-hover transition-shadow">
                <div className="p-3 bg-amber-50 rounded-sm">
                  <BookOpen className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-text-primary">사용 가이드</h3>
                  <p className="text-sm text-text-secondary">자세한 사용법 안내</p>
                </div>
                <Link href="/help" className="text-sm text-primary font-bold flex items-center gap-1 hover:underline">
                  가이드 보기 <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </Card>

              {/* FAQ */}
              <div>
                <h2 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" /> 자주 묻는 질문
                </h2>
                <div className="flex flex-col gap-2">
                  {FAQ_ITEMS.map((item, i) => (
                    <Card key={i} className="overflow-hidden">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-semibold text-text-primary pr-4">
                          {item.q}
                        </span>
                        {expandedFaq === i ? (
                          <ChevronUp className="w-5 h-5 text-text-secondary shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-text-secondary shrink-0" />
                        )}
                      </button>
                      {expandedFaq === i && (
                        <div className="px-3 pb-2 text-sm text-text-secondary leading-relaxed border-t border-slate-200 pt-3">
                          {item.a}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
