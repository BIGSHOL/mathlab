'use client';

const SIZE_MAP = {
  xs: 'w-7 h-7 text-[11px]',
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
}

export function UserAvatar({ name, badgeIcon, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClass = SIZE_MAP[size];

  if (badgeIcon && badgeIcon.startsWith('/')) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 ring-1 ring-amber-200/60 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={badgeIcon}
          alt={`${name} 대표 배지`}
          className="w-full h-full object-cover scale-[1.15]"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold shrink-0 ${className}`}>
      {name[0] ?? '?'}
    </div>
  );
}
