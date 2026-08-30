'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';

const SIZE_MAP = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-14 h-14 text-xl',
} as const;

interface UserAvatarProps {
  name: string;
  badgeIcon?: string | null;
  size?: keyof typeof SIZE_MAP;
  className?: string;
  /** 상점 프레임 스타일 (인라인) */
  frameStyle?: CSSProperties;
  /** 상점 아바타 이미지 경로 */
  avatarSrc?: string | null;
}

export function UserAvatar({ name, badgeIcon, size = 'md', className = '', frameStyle, avatarSrc }: UserAvatarProps) {
  const sizeClass = SIZE_MAP[size];

  // 상점 아바타 이미지 우선
  if (avatarSrc) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden shrink-0 ${frameStyle ? '' : 'ring-1 ring-slate-200'} relative bg-gradient-to-b from-sky-50 to-white ${className}`}
        style={frameStyle}
      >
        <Image
          src={avatarSrc}
          alt={`${name} 아바타`}
          fill
          sizes="56px"
          className="object-contain"
        />
      </div>
    );
  }

  if (badgeIcon && badgeIcon.startsWith('/')) {
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden shrink-0 ${frameStyle ? '' : 'ring-1 ring-amber-200/60'} relative ${className}`}
        style={frameStyle}
      >
        <Image
          src={badgeIcon}
          alt={`${name} 대표 배지`}
          fill
          sizes="56px"
          className="object-cover scale-[1.15]"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold shrink-0 ${className}`}
      style={frameStyle}
    >
      {name[0] ?? '?'}
    </div>
  );
}
