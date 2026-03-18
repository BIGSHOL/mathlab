'use client';

import { useState } from 'react';
import {
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  Save,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

const TABS = [
  { id: 'profile', label: '프로필 설정', icon: User },
  { id: 'security', label: '보안', icon: Lock },
  { id: 'notifications', label: '알림', icon: Bell },
  { id: 'appearance', label: '화면', icon: Palette },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // Profile
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user || !profileName.trim()) return;
    setProfileSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profileName.trim() }),
      });
      if (res.ok) {
        toast.success('프로필이 저장되었습니다.');
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!currentPassword || !newPassword) {
      toast.warning('비밀번호를 입력하세요.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 4) {
      toast.warning('비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password: newPassword }),
      });
      if (res.ok) {
        toast.success('비밀번호가 변경되었습니다.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const json = await res.json().catch(() => null);
        toast.error(json?.error?.message ?? '비밀번호 변경에 실패했습니다.');
      }
    } catch {
      toast.error('비밀번호 변경에 실패했습니다.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden">
      {/* ===== Left Panel: Settings Navigation ===== */}
      <aside className={`shrink-0 border-r border-slate-200 bg-slate-50/30 flex flex-col transition-all duration-200 ${leftPanelCollapsed ? 'w-12' : 'w-72'}`}>
        {/* Panel Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            {!leftPanelCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <Settings className="w-4 h-4 text-primary shrink-0" />
                <h1 className="text-base font-bold text-text-primary truncate">설정</h1>
              </div>
            )}
            <button
              onClick={() => setLeftPanelCollapsed((p) => !p)}
              className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
              title={leftPanelCollapsed ? '패널 열기' : '패널 접기'}
            >
              {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tab Navigation (expanded) */}
        {!leftPanelCollapsed && (
          <nav className="flex-1 overflow-y-auto py-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all text-left border-l-2 ${
                    isActive
                      ? 'bg-primary/5 border-l-primary text-primary font-semibold'
                      : 'border-l-transparent text-text-secondary hover:bg-white hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Collapsed state: Settings icon button */}
        {leftPanelCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-3 gap-2">
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              className="p-2 hover:bg-slate-100 rounded-sm text-primary transition-colors"
              title="설정 메뉴 열기"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>

      {/* ===== Right Panel: Settings Content ===== */}
      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
        <div className="p-3 md:p-4 max-w-[800px] w-full">
          {activeTab === 'profile' && (
            <Card className="p-3 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> 프로필 설정
              </h2>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">이름</label>
                  <input
                    className="h-11 px-3 rounded-sm border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    defaultValue={user?.name ?? ''}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">아이디</label>
                  <input
                    className="h-11 px-3 rounded-sm border border-slate-200 bg-slate-50 text-text-secondary text-[15px] cursor-not-allowed"
                    value={user?.username ?? ''}
                    disabled
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">역할</label>
                  <input
                    className="h-11 px-3 rounded-sm border border-slate-200 bg-slate-50 text-text-secondary text-[15px] cursor-not-allowed"
                    value={isAdmin ? '관리자' : '선생님'}
                    disabled
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <Button onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  변경사항 저장
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="p-3 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> 보안 설정
              </h2>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">현재 비밀번호</label>
                  <input
                    className="h-11 px-3 rounded-sm border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    type="password"
                    placeholder="현재 비밀번호 입력"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">새 비밀번호</label>
                  <input
                    className="h-11 px-3 rounded-sm border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    type="password"
                    placeholder="새 비밀번호 입력"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">비밀번호 확인</label>
                  <input
                    className="h-11 px-3 rounded-sm border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <Button onClick={handleChangePassword} disabled={passwordSaving}>
                  {passwordSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  비밀번호 변경
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-3 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> 알림 설정
              </h2>
              <div className="flex flex-col gap-2">
                {[
                  { label: '학생 가입 알림', desc: '새 학생이 가입하면 알림을 받습니다.', defaultChecked: true },
                  { label: '학습 완료 알림', desc: '학생이 스테이지를 완료하면 알림을 받습니다.', defaultChecked: false },
                  { label: '주간 리포트', desc: '매주 월요일 학습 요약 리포트를 받습니다.', defaultChecked: true },
                  { label: '시스템 공지', desc: '시스템 업데이트 및 공지사항을 받습니다.', defaultChecked: true },
                  ...(isAdmin ? [
                    { label: '문의 접수 알림', desc: '선생님이 새 문의를 등록하면 알림을 받습니다.', defaultChecked: true },
                    { label: '선생님 가입 알림', desc: '새 선생님이 가입하면 알림을 받습니다.', defaultChecked: true },
                  ] : []),
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-start gap-2 p-2.5 rounded-sm bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={item.defaultChecked}
                      className="form-checkbox text-primary rounded-sm border-slate-300 mt-0.5 focus:ring-primary focus:ring-offset-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card className="p-3 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> 화면 설정
              </h2>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-text-primary">테마</p>
                  <div className="flex gap-3">
                    {['라이트', '다크', '시스템'].map((theme) => (
                      <button
                        key={theme}
                        className={`px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                          theme === '라이트'
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    현재 라이트 모드만 지원됩니다. 다크 모드는 추후 업데이트 예정입니다.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
