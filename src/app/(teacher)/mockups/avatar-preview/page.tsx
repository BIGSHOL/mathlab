'use client';

import Image from 'next/image';
import { useState } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { CSSProperties } from 'react';

const AVATARS_MALE = [
  { name: '기본 자세', file: 'standing', price: 0 },
  { name: '인사', file: 'waving', price: 50 },
  { name: '자신감', file: 'arms-crossed', price: 80 },
  { name: '발표', file: 'presenting', price: 100 },
  { name: '쑥스러운', file: 'thinking', price: 100 },
  { name: '산책', file: 'casual', price: 120 },
  { name: '쉬는 중', file: 'sitting', price: 150 },
  { name: '최고!', file: 'thumbs-up', price: 200 },
  { name: '깜짝', file: 'running', price: 300 },
];

const AVATARS_FEMALE = [
  { name: '수줍은 (여)', file: 'f-standing', price: 0 },
  { name: '인사 (여)', file: 'f-waving', price: 50 },
  { name: '궁금한 (여)', file: 'f-presenting', price: 80 },
  { name: '안내 (여)', file: 'f-thinking', price: 100 },
  { name: '거수경례 (여)', file: 'f-peace', price: 100 },
  { name: '당당한 (여)', file: 'f-confident', price: 120 },
  { name: '쉬는 중 (여)', file: 'f-sitting', price: 150 },
  { name: '하트', file: 'f-heart', price: 200 },
  { name: '부끄러운 (여)', file: 'f-cheerful', price: 300 },
];

const SAMPLE_FRAMES: { name: string; style: CSSProperties }[] = [
  { name: '없음', style: {} },
  { name: '골드', style: { border: '2px solid #f59e0b', boxShadow: '0 0 4px rgba(245,158,11,0.4)' } },
  { name: '네온 블루', style: { border: '2px solid #60a5fa', boxShadow: '0 0 8px rgba(96,165,250,0.6)' } },
  { name: '다이아몬드', style: { border: '3px solid #67e8f9', boxShadow: '0 0 14px rgba(103,232,249,0.7)' } },
];

export default function AvatarPreviewPage() {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const AVATARS = gender === 'male' ? AVATARS_MALE : AVATARS_FEMALE;
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS_MALE[0]);
  const [selectedFrame, setSelectedFrame] = useState(SAMPLE_FRAMES[0]);

  return (
    <PageContainer maxWidth="xl">
      <PageHeader title="아바타 크롭 결과 미리보기" />

      {/* 성별 선택 */}
      <div className="flex gap-2 mb-4">
        {([{ key: 'male' as const, label: '남학생 (9개)' }, { key: 'female' as const, label: '여학생 (9개)' }]).map((g) => (
          <button
            key={g.key}
            onClick={() => { setGender(g.key); setSelectedAvatar((g.key === 'male' ? AVATARS_MALE : AVATARS_FEMALE)[0]); }}
            className={`px-4 py-2 rounded-sm text-sm font-bold transition-colors ${
              gender === g.key ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* 전체 아바타 그리드 */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">포즈 (200×200 PNG, 투명 배경)</h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 mb-8">
        {AVATARS.map((avatar) => (
          <Card
            key={avatar.file}
            className={`p-3 cursor-pointer transition-all text-center ${
              selectedAvatar.file === avatar.file ? 'border-primary ring-1 ring-primary/30' : 'hover:border-slate-300'
            }`}
            onClick={() => setSelectedAvatar(avatar)}
          >
            <div className="relative w-full aspect-square mb-2 bg-gradient-to-b from-sky-50 to-white rounded-sm overflow-hidden">
              <Image
                src={`/avatars/${avatar.file}.png`}
                alt={avatar.name}
                fill
                sizes="120px"
                className="object-contain"
              />
            </div>
            <p className="text-xs font-semibold text-text-primary truncate">{avatar.name}</p>
            <p className="text-[10px] text-amber-600 font-bold">{avatar.price === 0 ? '무료' : `${avatar.price} XP`}</p>
          </Card>
        ))}
      </div>

      {/* 프레임 조합 미리보기 */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">프레임 조합 미리보기</h2>
      <div className="flex gap-2 mb-4">
        {SAMPLE_FRAMES.map((frame) => (
          <button
            key={frame.name}
            onClick={() => setSelectedFrame(frame)}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-colors ${
              selectedFrame.name === frame.name ? 'bg-primary text-white' : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
            }`}
          >
            {frame.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
        {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
          <div key={size} className="flex flex-col items-center gap-2">
            <UserAvatar
              name="학생"
              size={size}
              avatarSrc={`/avatars/${selectedAvatar.file}.png`}
              frameStyle={Object.keys(selectedFrame.style).length > 0 ? selectedFrame.style : undefined}
            />
            <span className="text-xs text-text-secondary">{size}</span>
          </div>
        ))}
      </div>

      {/* 프로필 카드 시뮬레이션 */}
      <h2 className="text-sm font-bold text-text-secondary mb-3">프로필 카드 시뮬레이션</h2>
      <Card padding="md" className="max-w-lg" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
        <div className="flex items-center gap-4">
          <UserAvatar
            name="김수학"
            size="xl"
            avatarSrc={`/avatars/${selectedAvatar.file}.png`}
            frameStyle={Object.keys(selectedFrame.style).length > 0 ? selectedFrame.style : undefined}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold" style={{ color: '#7c3aed' }}>김수학</h3>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white text-xs font-bold">
                Lv.5
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">👑 수학의 신</p>
            <p className="text-xs text-text-secondary mt-1">초등 6학년 · 총 1,250 XP</p>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
