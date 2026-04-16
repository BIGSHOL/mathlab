'use client';

import { useState } from 'react';
import { X, Bot, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MathRenderer } from '@/components/math/MathRenderer';
import { toast } from '@/components/ui/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  questionId: string;
  studentAnswer: string;
  questionPreview?: string;
}

interface ChatMessage {
  role: 'student' | 'tutor';
  content: string;
}

const COOLDOWN_MS = 30_000; // 클라이언트 30초 쿨다운

export function AITutorModal({ isOpen, onClose, questionId, studentAnswer, questionPreview }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lastRequestAt, setLastRequestAt] = useState<number>(0);

  async function ask(question?: string) {
    const now = Date.now();
    if (now - lastRequestAt < COOLDOWN_MS) {
      const secLeft = Math.ceil((COOLDOWN_MS - (now - lastRequestAt)) / 1000);
      toast.warning(`잠시 후 다시 시도해주세요 (${secLeft}초 남음)`);
      return;
    }

    setLoading(true);
    setLastRequestAt(now);

    // 학생 메시지 추가 (질문이 있으면)
    if (question) {
      setMessages((prev) => [...prev, { role: 'student', content: question }]);
    }

    try {
      const res = await fetch('/api/learning/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          studentAnswer,
          studentQuestion: question,
        }),
      });

      if (res.status === 429) {
        const body = await res.json();
        toast.error(body.error?.message ?? '요청 한도 초과');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        toast.error('AI 응답 생성 실패');
        setLoading(false);
        return;
      }

      const json = await res.json();
      const answer = json.data?.answer ?? '';
      setRemaining(json.data?.remaining ?? null);

      if (answer) {
        setMessages((prev) => [...prev, { role: 'tutor', content: answer }]);
      }
    } catch {
      toast.error('네트워크 오류');
    } finally {
      setLoading(false);
      setUserInput('');
    }
  }

  // 최초 자동 응답 (첫 오픈 시)
  function handleInitial() {
    if (messages.length === 0) {
      ask(); // 질문 없이 오답 분석 요청
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-sm shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-fuchsia-50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">AI 튜터</h3>
              <p className="text-[11px] text-slate-500">문제당 3회까지 질문 가능{remaining !== null && ` · ${remaining}회 남음`}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50">
          {questionPreview && (
            <div className="mb-3 p-3 bg-white border border-slate-200 rounded-sm text-xs text-slate-600">
              <p className="font-semibold text-slate-500 mb-1">문제</p>
              <p className="line-clamp-3">{questionPreview}</p>
            </div>
          )}

          {messages.length === 0 && !loading && (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-violet-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-4">AI 튜터에게 무엇이 궁금한지 물어보세요</p>
              <Button size="md" onClick={handleInitial}>
                왜 틀렸는지 설명해주세요
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'student' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-sm text-sm ${
                    m.role === 'student'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-slate-200 text-slate-900'
                  }`}
                >
                  {m.role === 'tutor' ? (
                    <div className="prose prose-sm max-w-none">
                      <MathRenderer content={m.content} />
                    </div>
                  ) : (
                    <p>{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-sm px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 입력 */}
        {messages.length > 0 && remaining !== null && remaining > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && userInput.trim() && !loading) {
                    ask(userInput.trim());
                  }
                }}
                placeholder="추가 질문 입력..."
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-sm focus:outline-none focus:border-violet-400"
                disabled={loading}
              />
              <Button
                size="sm"
                disabled={!userInput.trim() || loading}
                onClick={() => userInput.trim() && ask(userInput.trim())}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {remaining === 0 && (
          <div className="px-5 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 text-center">
            이 문제에 대한 질문 한도를 모두 사용했습니다
          </div>
        )}
      </div>
    </div>
  );
}
