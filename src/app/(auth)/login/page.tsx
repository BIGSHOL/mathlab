'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { LogoIcon } from '@/components/ui/LogoIcon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다');
      return;
    }

    // 기출분석 전용 — 관리자(injaewon)는 사용 현황 페이지, 그 외 기출분석 메인
    const target = username === 'injaewon' ? '/exam-analysis/admin' : '/exam-analysis';
    window.location.href = target;
  };

  return (
    // 루트 layout의 body가 overflow:hidden(앱 셸 규약)이라 자체 스크롤 컨테이너 필요
    // (세로 좁은 화면에서 잘리던 버그 픽스 겸용 — 콘텐츠가 짧으면 기존처럼 중앙 정렬)
    <div className="h-dvh overflow-y-auto bg-ed-paper">
      <div className="min-h-full flex items-center justify-center p-4 py-10 math-grid-bg ed-grid-fade">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-7">
              <LogoIcon className="w-8 h-8" />
              <span className="ed-serif text-2xl font-bold tracking-tight">Injaewon MathLAB</span>
            </Link>
            <p className="mb-3">
              <span className="ed-kicker">기출분석</span>
            </p>
            <h1 className="ed-serif text-2xl font-bold text-ed-ink">로그인</h1>
            <p className="text-slate-500 mt-2">
              학원에서 받은 계정으로 로그인하세요
            </p>
          </div>

          <div className="bg-white rounded-[4px] border border-ed-rule border-t-[3px] border-t-ed-ink shadow-ed-float p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <Input
                label="아이디"
                placeholder="학원에서 부여받은 아이디"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  label="비밀번호"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <Button type="submit" size="lg" variant="editorial" className="mt-2 w-full" disabled={loading}>
                {loading ? '로그인 중...' : '로그인'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            비밀번호를 잊으셨나요? 선생님께 문의하세요.
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            계정이 없으신가요?{' '}
            <Link href="/demo" className="text-ed-red font-semibold hover:underline">
              데모로 먼저 체험해 보세요
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
