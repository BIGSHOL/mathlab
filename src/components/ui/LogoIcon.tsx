/** 파비콘 SVG를 인라인 렌더링하는 로고 아이콘 */
export function LogoIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
    >
      <defs>
        <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <polygon points="256,32 464,152 464,360 256,480 48,360 48,152" fill="url(#hexGrad)" />
      <path d="M160,350 L160,180 L256,260 L352,180 L352,350" fill="none" stroke="white" strokeWidth="48" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="380" cy="130" r="30" fill="#FBBF24" />
      <path d="M370,130 h20 M380,120 v20" stroke="white" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
