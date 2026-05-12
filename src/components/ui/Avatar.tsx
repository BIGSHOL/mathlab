import * as React from 'react';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export type AvatarProps = {
  /** 표시할 이름 (첫 글자만 렌더). 한글이면 첫 글자, 영문이면 대문자. */
  name: string;
  size?: AvatarSize;
  /** CSS background 값. 미지정 시 mathlab-v2.css 기본(회색) */
  background?: string;
  className?: string;
};

function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const ch = Array.from(trimmed)[0];
  // 영문이면 대문자
  return /^[a-zA-Z]$/.test(ch) ? ch.toUpperCase() : ch;
}

/**
 * v2 디자인 시스템 Avatar (단색/그라데이션 원형 + 이니셜).
 * mathlab-v2.css 의 .av .av.sm .av.lg .av.xl 매핑.
 *
 * 사용 예:
 *   <Avatar name="이서연" size="lg" background="linear-gradient(135deg,#A78BFA,#7C3AED)" />
 */
export function Avatar({ name, size = 'md', background, className }: AvatarProps) {
  const classes = ['av'];
  if (size !== 'md') classes.push(size);
  if (className) classes.push(className);

  const style: React.CSSProperties | undefined = background ? { background } : undefined;

  return (
    <div className={classes.join(' ')} style={style}>
      {initial(name)}
    </div>
  );
}
