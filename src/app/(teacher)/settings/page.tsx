'use client';

import { useState } from 'react';
import {
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  Save,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const TABS = [
  { id: 'profile', label: '프로필 설정', icon: User },
  { id: 'security', label: '보안', icon: Lock },
  { id: 'notifications', label: '알림', icon: Bell },
  { id: 'appearance', label: '화면', icon: Palette },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <div className="flex-1 p-6 md:p-10 max-w-[1000px] mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">설정</h1>
        <p className="text-text-secondary text-sm mt-1">시스템 및 계정 설정을 관리합니다.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Tabs */}
        <nav className="md:w-56 shrink-0 flex md:flex-col gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all text-left ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-text-secondary hover:bg-slate-50 hover:text-text-primary'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Settings Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card className="p-6 flex flex-col gap-6">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> 프로필 설정
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">이름</label>
                  <input
                    className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    defaultValue="관리자"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">이메일</label>
                  <input
                    className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    defaultValue="admin@mathlogic.lab"
                    type="email"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">역할</label>
                  <input
                    className="h-11 px-4 rounded-lg border border-slate-200 bg-slate-50 text-text-secondary text-[15px] cursor-not-allowed"
                    value="선생님"
                    disabled
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  변경사항 저장
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="p-6 flex flex-col gap-6">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> 보안 설정
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">현재 비밀번호</label>
                  <input
                    className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    type="password"
                    placeholder="현재 비밀번호 입력"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">새 비밀번호</label>
                  <input
                    className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    type="password"
                    placeholder="새 비밀번호 입력"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-text-primary">비밀번호 확인</label>
                  <input
                    className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
                    type="password"
                    placeholder="비밀번호 재입력"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <Button>
                  <Lock className="w-4 h-4 mr-2" />
                  비밀번호 변경
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="p-6 flex flex-col gap-6">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> 알림 설정
              </h2>
              <div className="flex flex-col gap-4">
                {[
                  { label: '학생 가입 알림', desc: '새 학생이 가입하면 알림을 받습니다.', defaultChecked: true },
                  { label: '학습 완료 알림', desc: '학생이 스테이지를 완료하면 알림을 받습니다.', defaultChecked: false },
                  { label: '주간 리포트', desc: '매주 월요일 학습 요약 리포트를 받습니다.', defaultChecked: true },
                  { label: '시스템 공지', desc: '시스템 업데이트 및 공지사항을 받습니다.', defaultChecked: true },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={item.defaultChecked}
                      className="form-checkbox text-primary rounded border-slate-300 mt-0.5 focus:ring-primary focus:ring-offset-0"
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
            <Card className="p-6 flex flex-col gap-6">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> 화면 설정
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-text-primary">테마</p>
                  <div className="flex gap-3">
                    {['라이트', '다크', '시스템'].map((theme) => (
                      <button
                        key={theme}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
      </div>
    </div>
  );
}
