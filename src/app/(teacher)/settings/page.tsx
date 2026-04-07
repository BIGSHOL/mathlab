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
  Eye,
  EyeOff,
} from 'lucide-react';
import { MathSpinner } from '@/components/ui/MathSpinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';

const TABS = [
  { id: 'profile', label: '프로필 설정', icon: User },
  { id: 'security', label: '보안', icon: Lock },
  { id: 'notifications', label: '알림', icon: Bell },
  { id: 'appearance', label: '화면', icon: Palette },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsPage() {
  const { user } = useAuth();
  const isOwner = hasRoleClient(user?.role, 'OWNER');
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
      <main className="flex-1 flex items-center justify-center min-w-0 bg-white overflow-y-auto">
        <div className="p-3 md:p-4 max-w-[800px] w-full">
          {activeTab === 'profile' && (
            <Card padding="sm" className="flex flex-col gap-3">
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
                    value={isOwner ? '관리자' : '선생님'}
                    disabled
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <Button onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? <MathSpinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  변경사항 저장
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card padding="sm" className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> 보안 설정
              </h2>
              <div className="flex flex-col gap-2">
                <PasswordField label="현재 비밀번호" placeholder="현재 비밀번호 입력" value={currentPassword} onChange={setCurrentPassword} />
                <PasswordField label="새 비밀번호" placeholder="새 비밀번호 입력" value={newPassword} onChange={setNewPassword} />
                <PasswordField label="비밀번호 확인" placeholder="비밀번호 재입력" value={confirmPassword} onChange={setConfirmPassword} />
              </div>
              <div className="pt-2 border-t border-slate-200">
                <Button onClick={handleChangePassword} disabled={passwordSaving}>
                  {passwordSaving ? <MathSpinner size="sm" className="mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  비밀번호 변경
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card padding="sm" className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> 알림 설정
              </h2>
              <div className="text-center py-8">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-text-secondary">알림 기능 준비 중</p>
                <p className="text-xs text-text-secondary mt-1">이메일/푸시 알림 기능이 추후 업데이트될 예정입니다.</p>
              </div>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card padding="sm" className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> 화면 설정
              </h2>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-text-primary">테마</p>
                <div className="flex gap-3">
                  <button className="px-3 py-2 rounded-sm text-sm font-medium bg-primary text-white">라이트</button>
                  <button className="px-3 py-2 rounded-sm text-sm font-medium bg-slate-100 text-slate-300 cursor-not-allowed" disabled>다크</button>
                  <button className="px-3 py-2 rounded-sm text-sm font-medium bg-slate-100 text-slate-300 cursor-not-allowed" disabled>시스템</button>
                </div>
                <p className="text-xs text-text-secondary mt-1">다크 모드는 추후 업데이트 예정입니다.</p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function PasswordField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-text-primary">{label}</label>
      <div className="relative">
        <input
          className="h-11 w-full px-3 pr-10 rounded-sm border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" tabIndex={-1} onClick={() => setShow((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
