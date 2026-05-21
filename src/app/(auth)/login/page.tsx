'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { LogoIcon } from '@/components/ui/LogoIcon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);

  // 서브도메인 테넌트 정보 조회
  useEffect(() => {
    fetch('/api/tenant/current')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setTenant(json.data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      username,
      password,
      tenantSlug: tenant?.slug || '',
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        tenant
          ? '아이디 또는 비밀번호가 올바르지 않거나, 이 지점에 등록된 계정이 아닙니다'
          : '아이디 또는 비밀번호가 올바르지 않습니다'
      );
      return;
    }

    // 라우팅: 데모 → /demo, 기출분석 전용 계정(csganga*) → /exam-analysis, 그 외 → /dashboard
    const target =
      username === 'demo' ? '/demo'
      : /^csganga\d+$/i.test(username) ? '/exam-analysis'
      : '/dashboard';
    window.location.href = target;
  };

  const displayName = tenant?.name || 'Injaewon MathLAB';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            {tenant?.logo ? (
              <img src={tenant.logo} alt={displayName} className="w-8 h-8 object-contain" />
            ) : (
              <LogoIcon className="w-8 h-8" />
            )}
            <span className="text-2xl font-black tracking-tight">{displayName}</span>
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">로그인</h1>
          <p className="text-text-secondary mt-2">
            {tenant ? `${tenant.name}에 등록된 계정으로 로그인하세요` : '학원에서 받은 계정으로 로그인하세요'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-8">
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
            <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-text-secondary mt-6">
          비밀번호를 잊으셨나요? 선생님께 문의하세요.
        </p>
      </div>
    </div>
  );
}
