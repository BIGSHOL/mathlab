'use client';

import { useState, useCallback } from 'react';
import { Volume2, VolumeX, Play, Music } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { SOUNDS, SOUND_CATEGORIES, type SoundDef, toggleMute, isMuted } from '@/lib/sounds';
import { useAuth } from '@/hooks/useAuth';

type Category = 'all' | keyof typeof SOUND_CATEGORIES;

const TAB_ITEMS: { key: Category; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'feedback', label: '학습 피드백' },
  { key: 'reward', label: '보상/성취' },
  { key: 'ui', label: 'UI' },
  { key: 'timer', label: '타이머' },
];

export default function AdminSoundsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Category>('all');
  const [muted, setMuted] = useState(() => isMuted());
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredSounds = activeTab === 'all'
    ? SOUNDS
    : SOUNDS.filter((s) => s.category === activeTab);

  const handlePlay = useCallback((sound: SoundDef) => {
    // 미리듣기는 음소거 무시하고 직접 재생
    try {
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      sound.play(ctx);
      setPlayingId(sound.id);
      setTimeout(() => setPlayingId(null), 600);
    } catch {
      // ignore
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const newMuted = toggleMute();
    setMuted(newMuted);
  }, []);

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <PageContainer>
        <p className="text-text-secondary">접근 권한이 없습니다.</p>
      </PageContainer>
    );
  }

  const categoryStats = Object.entries(SOUND_CATEGORIES).map(([key, meta]) => ({
    key,
    ...meta,
    count: SOUNDS.filter((s) => s.category === key).length,
  }));

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="사운드 관리"
        subtitle="효과음 미리듣기 및 설정"
        icon={<Music className="w-6 h-6" />}
      />

      {/* 요약 + 음소거 토글 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {categoryStats.map((cat) => (
            <span
              key={cat.key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-sm border ${cat.color}`}
            >
              <span>{cat.icon}</span>
              {cat.label}
              <span className="font-bold">{cat.count}</span>
            </span>
          ))}
          <span className="text-xs text-text-muted">
            총 {SOUNDS.length}개
          </span>
        </div>

        <button
          onClick={handleToggleMute}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-sm border transition-colors ${
            muted
              ? 'border-slate-300 text-slate-500 hover:bg-slate-50'
              : 'border-primary bg-primary text-white hover:bg-primary-hover'
          }`}
        >
          {muted ? (
            <>
              <VolumeX className="w-4 h-4" />
              음소거 중
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              사운드 켜짐
            </>
          )}
        </button>
      </div>

      {/* 탭 */}
      <div className="mb-4">
        <Tabs
          items={TAB_ITEMS}
          activeKey={activeTab}
          onChange={setActiveTab}
          variant="pill"
        />
      </div>

      {/* 사운드 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSounds.map((sound) => {
          const cat = SOUND_CATEGORIES[sound.category];
          const isPlaying = playingId === sound.id;

          return (
            <Card key={sound.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{sound.label}</span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded-sm border ${cat.color}`}>
                      {cat.icon} {cat.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">{sound.description}</p>
                </div>

                <button
                  onClick={() => handlePlay(sound)}
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isPlaying
                      ? 'bg-primary text-white scale-110 shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <Play className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

    </PageContainer>
  );
}
