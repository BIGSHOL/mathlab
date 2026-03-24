'use client';

import React, { useId } from 'react';
import { GEM_STAGE_LABELS, GEM_VARIANT_LABELS, type GemVariant } from '@/lib/utils/gem';

// ═══════════════════════════════════════
//  Props & Sizes
// ═══════════════════════════════════════

interface GemStoneProps {
  variant: GemVariant;
  /** 0=미시작, 1=원석, 2=커팅, 3=광택, 4=완성 */
  stage: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  /** 애니메이션 비활성화 (목록 등 성능 최적화) */
  disableAnimation?: boolean;
}

const SIZES = {
  xs: { gem: 22, fontSize: 8 },
  sm: { gem: 34, fontSize: 10 },
  md: { gem: 52, fontSize: 12 },
  lg: { gem: 78, fontSize: 16 },
} as const;

// ═══════════════════════════════════════
//  확장 팔레트 (d=dark, m=medium, b=bright,
//  h=highlight, g=glow, ga=glow-alpha,
//  sh=shine, w=white-tint, sd=shadow)
// ═══════════════════════════════════════

interface GP {
  d: string; m: string; b: string; h: string;
  g: string; ga: string; sh: string; w: string; sd: string;
}

const P: Record<GemVariant, GP> = {
  ruby:     { d:'#4a0818', m:'#b01030', b:'#e82050', h:'#ff6080', g:'#ff2050', ga:'rgba(255,32,80,0.35)', sh:'#ffa0b0', w:'#ffe8ee', sd:'rgba(180,16,48,0.4)' },
  sapphire: { d:'#081840', m:'#1848b8', b:'#3070e8', h:'#60a0ff', g:'#2060ff', ga:'rgba(32,96,255,0.35)', sh:'#a0c8ff', w:'#e8f0ff', sd:'rgba(24,72,184,0.4)' },
  emerald:  { d:'#082e14', m:'#18802e', b:'#28b848', h:'#60e080', g:'#20d848', ga:'rgba(32,216,72,0.35)', sh:'#a0ffc0', w:'#e8fff0', sd:'rgba(24,128,46,0.4)' },
  amethyst: { d:'#200840', m:'#6838a8', b:'#9060e0', h:'#b890ff', g:'#8050e0', ga:'rgba(128,80,224,0.35)', sh:'#d0b8ff', w:'#f0e8ff', sd:'rgba(104,56,168,0.4)' },
  topaz:    { d:'#3e2200', m:'#c06810', b:'#e89028', h:'#ffb860', g:'#f09020', ga:'rgba(240,144,32,0.35)', sh:'#ffe0a0', w:'#fff8e8', sd:'rgba(192,104,16,0.4)' },
  quartz:   { d:'#222228', m:'#787888', b:'#a0a0b8', h:'#c8c8d8', g:'#a0a0c0', ga:'rgba(160,160,192,0.35)', sh:'#e0e0f0', w:'#f4f4f8', sd:'rgba(120,120,136,0.4)' },
};

// ═══════════════════════════════════════
//  고유 외곽선 (200×200 viewBox)
// ═══════════════════════════════════════

const OL: Record<GemVariant, string> = {
  ruby:     '100,10 144,16 176,40 190,80 176,120 144,156 100,176 56,156 24,120 10,80 24,40 56,16',
  sapphire: '50,16 150,16 184,50 184,150 150,184 50,184 16,150 16,50',
  emerald:  '100,6 136,20 164,44 180,76 184,100 180,124 164,156 136,180 100,194 64,180 36,156 20,124 16,100 20,76 36,44 64,20',
  amethyst: '100,4 130,36 144,76 150,116 140,150 116,180 84,180 60,150 50,116 56,76 70,36',
  topaz:    '100,12 140,20 170,40 184,76 180,110 160,140 130,164 100,190 70,164 40,140 20,110 16,76 30,40 60,20',
  quartz:   '84,6 124,10 156,30 170,64 164,110 144,144 110,176 80,184 56,164 30,130 20,90 24,56 44,24',
};

// 보석별 Stage 4 반짝임 위치
const SP: Record<GemVariant, { x: number; y: number; r: number; d: string }[]> = {
  ruby:     [{x:84,y:52,r:4,d:'1.1s'},{x:114,y:60,r:2.8,d:'1.6s'},{x:100,y:38,r:2.2,d:'2s'},{x:68,y:70,r:2,d:'2.5s'},{x:136,y:78,r:1.8,d:'1.8s'}],
  sapphire: [{x:80,y:54,r:3.5,d:'1.2s'},{x:112,y:62,r:2.5,d:'1.8s'},{x:96,y:40,r:2,d:'2.2s'},{x:66,y:72,r:2,d:'2.6s'},{x:136,y:80,r:1.8,d:'2s'}],
  emerald:  [{x:70,y:52,r:3.5,d:'1.3s'},{x:112,y:58,r:2.5,d:'1.9s'},{x:92,y:40,r:2,d:'2.3s'},{x:56,y:68,r:2,d:'2.7s'},{x:140,y:80,r:1.8,d:'2.1s'}],
  amethyst: [{x:94,y:40,r:3.5,d:'1.1s'},{x:76,y:54,r:2.5,d:'1.7s'},{x:124,y:50,r:2.5,d:'2s'},{x:100,y:28,r:2,d:'2.4s'},{x:58,y:76,r:2,d:'2.6s'}],
  topaz:    [{x:84,y:58,r:4,d:'1s'},{x:115,y:65,r:2.8,d:'1.6s'},{x:100,y:42,r:2.2,d:'2.1s'},{x:68,y:75,r:2,d:'2.5s'},{x:136,y:82,r:1.8,d:'1.8s'}],
  quartz:   [{x:88,y:46,r:3,d:'1.4s'},{x:112,y:52,r:2.2,d:'2s'},{x:100,y:34,r:1.8,d:'2.5s'},{x:72,y:64,r:1.8,d:'2.8s'},{x:130,y:72,r:1.5,d:'2.2s'}],
};

// ═══════════════════════════════════════
//  자수정 결정편 / 석영 삼각 모자이크
// ═══════════════════════════════════════

const SHARDS = [
  { pts:'100,22 112,78 88,78', h:0.4, b:0.35 },
  { pts:'74,38 90,88 62,78', h:0.35, b:0.3 },
  { pts:'126,36 136,84 110,76', h:0.32, b:0.28 },
  { pts:'52,62 70,112 40,100', h:0.28, b:0.25 },
  { pts:'148,60 156,108 132,98', h:0.26, b:0.22 },
  { pts:'84,95 100,155 68,135', h:0.3, b:0.28 },
  { pts:'116,95 128,148 100,155', h:0.28, b:0.25 },
];

const TRI_FACETS = [
  { pts:'100,10 55,55 145,55', t:'top' },
  { pts:'100,10 190,55 145,55', t:'tr' },
  { pts:'100,10 55,55 10,55', t:'tl' },
  { pts:'55,55 145,55 100,100', t:'mc' },
  { pts:'190,55 145,55 190,100', t:'mr1' },
  { pts:'10,55 55,55 10,100', t:'ml1' },
  { pts:'145,55 190,100 100,100', t:'mr2' },
  { pts:'55,55 100,100 10,100', t:'ml2' },
  { pts:'190,100 190,145 100,100', t:'br1' },
  { pts:'10,100 100,100 10,145', t:'bl1' },
  { pts:'100,100 190,145 100,190', t:'br2' },
  { pts:'100,100 100,190 10,145', t:'bl2' },
];

// ═══════════════════════════════════════
//  스테이지 렌더 타입
// ═══════════════════════════════════════

type SFn = (c: GP, id: string, ol: string, a: boolean) => React.ReactNode;

// ── Stage 0: 점선 외곽 ──
const s0: SFn = (c, id, ol, a) => (
  <g>
    <polygon points={ol} fill="none" stroke={`${c.m}35`} strokeWidth="2" strokeDasharray="8 6" opacity="0.5">
      {a && <animate attributeName="stroke-dashoffset" values="0;28" dur="4s" repeatCount="indefinite" />}
    </polygon>
  </g>
);

// ═══════════════════════════════════════
//  RUBY — 6선 별 광채 (Star Asterism)
//  외곽: 라운드 브릴리언트 (12각)
// ═══════════════════════════════════════

const rubyS1: SFn = (c, id, ol) => (
  <g opacity="0.75">
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <linearGradient id={`${id}-f`} x1="0.3" y1="0" x2="0.7" y2="1">
        <stop offset="0%" stopColor={c.m} stopOpacity="0.6" /><stop offset="100%" stopColor={c.d} />
      </linearGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-f)`} />
      <ellipse cx="100" cy="100" rx="55" ry="50" fill={c.d} opacity="0.25" />
      <ellipse cx="85" cy="80" rx="30" ry="25" fill={c.m} opacity="0.15" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.m}50`} strokeWidth="1.5" />
  </g>
);

const rubyS2: SFn = (c, id, ol) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="45%" cy="40%"><stop offset="0%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} />
      <polygon points="100,10 145,55 100,75" fill={c.h} opacity="0.3" />
      <polygon points="100,10 55,55 100,75" fill={c.b} opacity="0.28" />
      <polygon points="190,55 190,100 130,85" fill={c.m} opacity="0.3" />
      <polygon points="10,55 70,85 10,100" fill={c.m} opacity="0.25" />
      <polygon points="190,145 130,115 190,100" fill={c.d} opacity="0.35" />
      <polygon points="10,145 10,100 70,115" fill={c.d} opacity="0.3" />
      <polygon points="100,190 145,145 130,115 100,125 70,115 55,145" fill={c.d} opacity="0.35" />
      {[0,60,120,180,240,300].map((deg,i) => {
        const r = Math.PI * deg / 180;
        return <line key={i} x1="100" y1="100" x2={100+Math.cos(r)*30} y2={100+Math.sin(r)*30} stroke={c.h} opacity="0.15" strokeWidth="2" />;
      })}
    </g>
    <polygon points={ol} fill="none" stroke={`${c.b}35`} strokeWidth="0.6" />
  </g>
);

const rubyS3: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="45%" cy="38%" r="68%"><stop offset="0%" stopColor={c.h} /><stop offset="40%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor={c.ga} result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <ellipse cx="100" cy="196" rx="50" ry="8" fill={c.ga} opacity="0.35" />
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      <polygon points="100,10 145,55 100,70" fill={c.w} opacity="0.2" />
      <polygon points="100,10 55,55 100,70" fill={c.h} opacity="0.22" />
      <polygon points="190,55 190,100 125,82" fill={c.b} opacity="0.3" />
      <polygon points="10,55 75,82 10,100" fill={c.m} opacity="0.28" />
      <polygon points="190,145 125,118 190,100" fill={c.d} opacity="0.35" />
      <polygon points="10,145 10,100 75,118" fill={c.d} opacity="0.32" />
      <polygon points="100,190 145,145 125,118 100,128 75,118 55,145" fill={c.d} opacity="0.38" />
      {[0,60,120,180,240,300].map((deg,i) => {
        const r = Math.PI * deg / 180;
        return <line key={i} x1="100" y1="100" x2={100+Math.cos(r)*55} y2={100+Math.sin(r)*55} stroke={c.sh} opacity="0.2" strokeWidth="3" strokeLinecap="round" />;
      })}
      <ellipse cx="90" cy="85" rx="28" ry="18" fill={c.b} opacity="0.12" transform="rotate(-15,90,85)" />
      <ellipse cx="88" cy="52" rx="22" ry="8" fill="white" opacity="0.2" transform="rotate(-8,88,52)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.h}40`} strokeWidth="0.7" />
    <circle cx="86" cy="56" r="2.5" fill="white" opacity={a ? undefined : 0.45}>
      {a && <animate attributeName="opacity" values="0.25;0.65;0.25" dur="2s" repeatCount="indefinite" />}
    </circle>
  </g>
);

const rubyS4: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="46%" cy="35%" r="72%"><stop offset="0%" stopColor={c.w} stopOpacity="0.8" /><stop offset="20%" stopColor={c.h} /><stop offset="50%" stopColor={c.b} /><stop offset="100%" stopColor={c.m} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="5" result="b" /><feFlood floodColor={c.g} floodOpacity="0.3" result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <linearGradient id={`${id}-sw`} x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="48%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.35" /><stop offset="52%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
        {a && <animateTransform attributeName="gradientTransform" type="translate" values="-1,0;2,0" dur="2.2s" repeatCount="indefinite" />}
      </linearGradient>
      <filter id={`${id}-sp`}><feGaussianBlur stdDeviation="1.5" /></filter>
    </defs>
    <ellipse cx="100" cy="198" rx="60" ry="14" fill={c.ga} opacity={a ? undefined : 0.4}>
      {a && <><animate attributeName="rx" values="52;68;52" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.3;0.55;0.3" dur="2s" repeatCount="indefinite" /></>}
    </ellipse>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      <polygon points="100,10 145,55 100,68" fill={c.w} opacity="0.25" />
      <polygon points="100,10 55,55 100,68" fill={c.sh} opacity="0.25" />
      <polygon points="190,55 190,100 122,80" fill={c.b} opacity="0.32" />
      <polygon points="10,55 78,80 10,100" fill={c.m} opacity="0.3" />
      <polygon points="190,145 122,116 190,100" fill={c.d} opacity="0.38" />
      <polygon points="10,145 10,100 78,116" fill={c.d} opacity="0.35" />
      <polygon points="100,190 145,145 122,116 100,126 78,116 55,145" fill={c.d} opacity="0.4" />
      {[0,60,120,180,240,300].map((deg,i) => {
        const r = Math.PI * deg / 180, len = 65;
        return (
          <g key={i}>
            <line x1="100" y1="100" x2={100+Math.cos(r)*len} y2={100+Math.sin(r)*len} stroke={c.w} opacity="0.15" strokeWidth="6" strokeLinecap="round" />
            <line x1="100" y1="100" x2={100+Math.cos(r)*len} y2={100+Math.sin(r)*len} stroke={c.sh} opacity="0.3" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      })}
      <circle cx="100" cy="100" r="8" fill={c.w} opacity="0.2" />
      <ellipse cx="88" cy="82" rx="30" ry="20" fill={c.b} opacity="0.1" transform="rotate(-12,88,82)" />
      <polygon points={ol} fill={`url(#${id}-sw)`} />
      <ellipse cx="88" cy="48" rx="26" ry="9" fill="white" opacity="0.28" transform="rotate(-6,88,48)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.sh}55`} strokeWidth="0.8" />
    {SP.ruby.map((s,i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" filter={`url(#${id}-sp)`} opacity={a ? undefined : 0.6}>
        {a && <animate attributeName="opacity" values="0.3;1;0.3" dur={s.d} repeatCount="indefinite" />}
      </circle>
    ))}
  </g>
);

// ═══════════════════════════════════════
//  SAPPHIRE — 카슈미르 깊이감 (Kashmir Depth)
//  외곽: 에메랄드 컷 (모서리 깎인 직사각)
// ═══════════════════════════════════════

const sapphireS1: SFn = (c, id, ol) => (
  <g opacity="0.75">
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <linearGradient id={`${id}-f`} x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor={c.m} stopOpacity="0.5" /><stop offset="100%" stopColor={c.d} /></linearGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-f)`} />
      <ellipse cx="100" cy="95" rx="50" ry="42" fill={c.d} opacity="0.2" />
      <ellipse cx="100" cy="98" rx="28" ry="22" fill={c.d} opacity="0.15" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.m}50`} strokeWidth="1.5" />
  </g>
);

const sapphireS2: SFn = (c, id, ol) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="50%" cy="42%"><stop offset="0%" stopColor={c.h} stopOpacity="0.5" /><stop offset="40%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} />
      {[70,55,40,25,12].map((rx,i) => (
        <ellipse key={i} cx="100" cy={88+i*2} rx={rx} ry={rx*0.75}
          fill="none" stroke={i<2?c.h:c.b} opacity={0.12+i*0.04} strokeWidth={0.8-i*0.1} />
      ))}
      {Array.from({length:9}).map((_,i) => (
        <line key={i} x1={30+i*18} y1={25} x2={20+i*18} y2={175} stroke={c.h} opacity="0.04" strokeWidth="0.6" />
      ))}
      <ellipse cx="100" cy="92" rx="10" ry="7" fill={c.w} opacity="0.06" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.b}35`} strokeWidth="0.6" />
  </g>
);

const sapphireS3: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="48%" cy="38%" r="68%"><stop offset="0%" stopColor={c.w} stopOpacity="0.4" /><stop offset="25%" stopColor={c.h} /><stop offset="55%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor={c.ga} result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <ellipse cx="100" cy="196" rx="50" ry="8" fill={c.ga} opacity="0.35" />
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {[68,54,40,26,14].map((rx,i) => (
        <ellipse key={i} cx="100" cy={86+i*2} rx={rx} ry={rx*0.72}
          fill={i===4?c.w:c.h} opacity={i===4?0.1:0.06+i*0.03} stroke={c.sh} strokeOpacity={0.1+i*0.04} strokeWidth={0.7} />
      ))}
      {Array.from({length:14}).map((_,i) => (
        <line key={i} x1={15+i*13} y1={20} x2={8+i*13} y2={180} stroke={c.sh} opacity="0.04" strokeWidth="0.5" />
      ))}
      <ellipse cx="100" cy="78" rx="45" ry="10" fill={c.b} opacity="0.1" transform="rotate(-5,100,78)" />
      <ellipse cx="86" cy="54" rx="24" ry="9" fill="white" opacity="0.18" transform="rotate(-8,86,54)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.h}45`} strokeWidth="0.7" />
    <circle cx="82" cy="58" r="2.5" fill="white" opacity={a ? undefined : 0.4}>
      {a && <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.2s" repeatCount="indefinite" />}
    </circle>
  </g>
);

const sapphireS4: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="46%" cy="35%" r="70%"><stop offset="0%" stopColor={c.w} stopOpacity="0.85" /><stop offset="18%" stopColor={c.sh} /><stop offset="45%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="5" result="b" /><feFlood floodColor={c.g} floodOpacity="0.3" result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <linearGradient id={`${id}-sw`} x1="0" y1="0" x2="1" y2="0.2">
        <stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="48%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.3" /><stop offset="52%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
        {a && <animateTransform attributeName="gradientTransform" type="translate" values="-1,0;2,0" dur="2.8s" repeatCount="indefinite" />}
      </linearGradient>
      <filter id={`${id}-sp`}><feGaussianBlur stdDeviation="1.5" /></filter>
    </defs>
    <ellipse cx="100" cy="198" rx="58" ry="14" fill={c.ga} opacity={a ? undefined : 0.35}>
      {a && <><animate attributeName="rx" values="50;66;50" dur="2.2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.25;0.5;0.25" dur="2.2s" repeatCount="indefinite" /></>}
    </ellipse>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {[65,52,40,28,16,8].map((rx,i) => (
        <ellipse key={i} cx="100" cy={84+i*2} rx={rx} ry={rx*0.7}
          fill={i>=4?c.w:'none'} fillOpacity={i>=4?0.08+i*0.03:0}
          stroke={c.sh} strokeOpacity={0.08+i*0.05} strokeWidth={0.8} />
      ))}
      {Array.from({length:18}).map((_,i) => (
        <line key={i} x1={10+i*10.5} y1={15} x2={4+i*10.5} y2={185} stroke={c.w} opacity="0.035" strokeWidth="0.5" />
      ))}
      <ellipse cx="100" cy="75" rx="48" ry="12" fill={c.b} opacity="0.08" transform="rotate(-4,100,75)" />
      <ellipse cx="100" cy="110" rx="40" ry="8" fill={c.m} opacity="0.06" transform="rotate(3,100,110)" />
      <polygon points={ol} fill={`url(#${id}-sw)`} />
      <ellipse cx="86" cy="50" rx="28" ry="10" fill="white" opacity="0.25" transform="rotate(-6,86,50)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.sh}55`} strokeWidth="0.8" />
    {SP.sapphire.map((s,i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" filter={`url(#${id}-sp)`} opacity={a ? undefined : 0.6}>
        {a && <animate attributeName="opacity" values="0.3;1;0.3" dur={s.d} repeatCount="indefinite" />}
      </circle>
    ))}
  </g>
);

// ═══════════════════════════════════════
//  EMERALD — 자르댕 (Jardin Inclusions)
//  외곽: 마키즈/나벳 (양쪽 뾰족 타원)
// ═══════════════════════════════════════

const emeraldS1: SFn = (c, id, ol) => (
  <g opacity="0.75">
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <linearGradient id={`${id}-f`} x1="0.3" y1="0.2" x2="0.7" y2="0.8"><stop offset="0%" stopColor={c.m} stopOpacity="0.5" /><stop offset="100%" stopColor={c.d} /></linearGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-f)`} />
      <rect x="60" y="55" width="80" height="90" rx="2" fill={c.d} opacity="0.15" />
      <line x1="75" y1="80" x2="90" y2="95" stroke={c.m} opacity="0.12" strokeWidth="0.6" />
      <line x1="115" y1="90" x2="125" y2="110" stroke={c.m} opacity="0.1" strokeWidth="0.5" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.m}50`} strokeWidth="1.5" />
  </g>
);

const emeraldS2: SFn = (c, id, ol) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="50%" cy="45%"><stop offset="0%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} />
      {[{x:32,y:35,w:136,h:130},{x:48,y:50,w:104,h:100},{x:64,y:65,w:72,h:70},{x:80,y:78,w:40,h:44}].map((r,i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="1"
          fill={i===3?c.h:'none'} fillOpacity={i===3?0.06:0}
          stroke={c.h} strokeOpacity={0.1+i*0.04} strokeWidth={0.7-i*0.1} />
      ))}
      <polygon points="32,35 48,50 48,35" fill={c.h} opacity="0.1" />
      <polygon points="168,35 152,50 152,35" fill={c.b} opacity="0.08" />
      <polygon points="32,165 48,150 48,165" fill={c.m} opacity="0.08" />
      <polygon points="168,165 152,150 152,165" fill={c.d} opacity="0.1" />
      <path d="M72,82 Q78,76 85,82 Q80,90 72,82Z" fill={c.d} opacity="0.15" />
      <line x1="110" y1="95" x2="128" y2="108" stroke={c.d} opacity="0.1" strokeWidth="0.8" />
      <circle cx="92" cy="112" r="3" fill={c.d} opacity="0.08" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.b}35`} strokeWidth="0.6" />
  </g>
);

const emeraldS3: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="48%" cy="40%" r="65%"><stop offset="0%" stopColor={c.h} /><stop offset="40%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor={c.ga} result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <ellipse cx="100" cy="196" rx="48" ry="8" fill={c.ga} opacity="0.35" />
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {[{x:28,y:30,w:144,h:140},{x:44,y:46,w:112,h:108},{x:60,y:60,w:80,h:80},{x:76,y:74,w:48,h:52},{x:88,y:84,w:24,h:32}].map((r,i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="1"
          fill={i>=3?c.sh:'none'} fillOpacity={i>=3?0.05+i*0.02:0}
          stroke={c.sh} strokeOpacity={0.08+i*0.04} strokeWidth={0.7} />
      ))}
      <polygon points="28,30 44,46 44,30" fill={c.w} opacity="0.1" />
      <polygon points="172,30 156,46 156,30" fill={c.h} opacity="0.08" />
      <path d="M68,78 Q76,70 84,78 Q78,88 68,78Z" fill={c.d} opacity="0.12" />
      <path d="M118,100 Q124,94 130,100 Q126,106 118,100Z" fill={c.d} opacity="0.1" />
      <line x1="108" y1="90" x2="125" y2="105" stroke={c.d} opacity="0.08" strokeWidth="0.8" />
      <circle cx="88" cy="115" r="2.5" fill={c.d} opacity="0.07" />
      <rect x="52" y="48" width="48" height="8" rx="2" fill="white" opacity="0.15" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.h}45`} strokeWidth="0.7" />
    <circle cx="74" cy="56" r="2.5" fill="white" opacity={a ? undefined : 0.35}>
      {a && <animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.4s" repeatCount="indefinite" />}
    </circle>
  </g>
);

const emeraldS4: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="46%" cy="36%" r="68%"><stop offset="0%" stopColor={c.w} stopOpacity="0.7" /><stop offset="20%" stopColor={c.sh} /><stop offset="50%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="5" result="b" /><feFlood floodColor={c.g} floodOpacity="0.3" result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <linearGradient id={`${id}-sw`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="48%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.28" /><stop offset="52%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
        {a && <animateTransform attributeName="gradientTransform" type="translate" values="-1,0;2,0" dur="3s" repeatCount="indefinite" />}
      </linearGradient>
      <filter id={`${id}-sp`}><feGaussianBlur stdDeviation="1.5" /></filter>
    </defs>
    <ellipse cx="100" cy="198" rx="56" ry="13" fill={c.ga} opacity={a ? undefined : 0.35}>
      {a && <><animate attributeName="rx" values="48;64;48" dur="2.4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.25;0.5;0.25" dur="2.4s" repeatCount="indefinite" /></>}
    </ellipse>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {[{x:24,y:26,w:152,h:148},{x:40,y:42,w:120,h:116},{x:56,y:56,w:88,h:88},{x:72,y:70,w:56,h:60},{x:86,y:82,w:28,h:36}].map((r,i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="1"
          fill={i>=3?c.w:'none'} fillOpacity={i>=3?0.04+i*0.025:0}
          stroke={c.w} strokeOpacity={0.06+i*0.045} strokeWidth={0.8} />
      ))}
      <polygon points="24,26 40,42 40,26" fill={c.w} opacity="0.13" />
      <polygon points="176,26 160,42 160,26" fill={c.h} opacity="0.1" />
      <polygon points="24,174 40,158 40,174" fill={c.m} opacity="0.1" />
      <polygon points="176,174 160,158 160,174" fill={c.d} opacity="0.12" />
      <path d="M65,75 Q74,66 83,75 Q76,86 65,75Z" fill={c.d} opacity="0.1" />
      <path d="M120,96 Q127,88 134,96 Q128,104 120,96Z" fill={c.d} opacity="0.08" />
      <line x1="105" y1="88" x2="124" y2="102" stroke={c.d} opacity="0.07" strokeWidth="0.8" />
      <circle cx="85" cy="118" r="3" fill={c.d} opacity="0.06" />
      <path d="M90,105 Q94,100 98,105 Q95,110 90,105Z" fill={c.d} opacity="0.05" />
      <polygon points={ol} fill={`url(#${id}-sw)`} />
      <rect x="48" y="44" width="52" height="8" rx="3" fill="white" opacity="0.22" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.sh}55`} strokeWidth="0.8" />
    {SP.emerald.map((s,i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" filter={`url(#${id}-sp)`} opacity={a ? undefined : 0.6}>
        {a && <animate attributeName="opacity" values="0.3;1;0.3" dur={s.d} repeatCount="indefinite" />}
      </circle>
    ))}
  </g>
);

// ═══════════════════════════════════════
//  AMETHYST — 결정 지오드 (Crystal Geode)
//  외곽: 크리스탈 포인트 (위 뾰족, 아래 넓음)
// ═══════════════════════════════════════

const amethystS1: SFn = (c, id, ol) => (
  <g opacity="0.75">
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <linearGradient id={`${id}-f`} x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor={c.m} stopOpacity="0.5" /><stop offset="100%" stopColor={c.d} /></linearGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-f)`} />
      <polygon points="92,75 100,48 108,75" fill={c.m} opacity="0.2" />
      <polygon points="76,90 86,65 96,90" fill={c.d} opacity="0.15" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.m}50`} strokeWidth="1.5" />
  </g>
);

const amethystS2: SFn = (c, id, ol) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="50%" cy="50%"><stop offset="0%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} />
      {SHARDS.slice(0,5).map((s,i) => (
        <polygon key={i} points={s.pts} fill={i<2?c.h:c.b} opacity={s.b} stroke={`${c.h}20`} strokeWidth="0.5" />
      ))}
      <polygon points="96,35 100,22 104,35 100,70" fill={c.sh} opacity="0.08" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.b}35`} strokeWidth="0.6" />
  </g>
);

const amethystS3: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="50%" cy="42%" r="65%"><stop offset="0%" stopColor={c.h} /><stop offset="45%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor={c.ga} result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <ellipse cx="100" cy="196" rx="48" ry="8" fill={c.ga} opacity="0.35" />
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {SHARDS.map((s,i) => (
        <polygon key={i} points={s.pts} fill={i<2?c.h:i<4?c.b:c.m} opacity={s.h}
          stroke={c.sh} strokeOpacity={0.15} strokeWidth="0.5" />
      ))}
      <polygon points="96,32 100,22 104,32 100,68" fill={c.w} opacity="0.1" />
      <polygon points="72,46 74,38 76,46 78,72" fill={c.sh} opacity="0.07" />
      <circle cx="100" cy="88" r="16" fill={c.h} opacity="0.08" />
      <ellipse cx="92" cy="50" rx="20" ry="8" fill="white" opacity="0.15" transform="rotate(-8,92,50)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.h}45`} strokeWidth="0.7" />
    <circle cx="96" cy="48" r="2.5" fill="white" opacity={a ? undefined : 0.4}>
      {a && <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2s" repeatCount="indefinite" />}
    </circle>
  </g>
);

const amethystS4: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="48%" cy="38%" r="68%"><stop offset="0%" stopColor={c.w} stopOpacity="0.6" /><stop offset="20%" stopColor={c.sh} /><stop offset="50%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="5" result="b" /><feFlood floodColor={c.g} floodOpacity="0.3" result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <linearGradient id={`${id}-sw`} x1="0" y1="0.5" x2="0.8" y2="0">
        <stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="48%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.22" /><stop offset="52%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
        {a && <animateTransform attributeName="gradientTransform" type="translate" values="-1,0;2,0" dur="2.5s" repeatCount="indefinite" />}
      </linearGradient>
      <filter id={`${id}-sp`}><feGaussianBlur stdDeviation="1.5" /></filter>
    </defs>
    <ellipse cx="100" cy="198" rx="56" ry="14" fill={c.ga} opacity={a ? undefined : 0.4}>
      {a && <><animate attributeName="rx" values="48;64;48" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.3;0.55;0.3" dur="2s" repeatCount="indefinite" /></>}
    </ellipse>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {SHARDS.map((s,i) => (
        <polygon key={i} points={s.pts} fill={i<2?c.sh:i<4?c.h:c.b} opacity={s.h+0.05}
          stroke={c.w} strokeOpacity={0.12} strokeWidth="0.6" />
      ))}
      <polygon points="97,30 100,22 103,30 100,65" fill="white" opacity="0.12" />
      <polygon points="72,45 74,38 76,45 80,70" fill={c.w} opacity="0.08" />
      <polygon points="124,44 126,36 128,44 132,72" fill={c.w} opacity="0.06" />
      <rect x="55" y="120" width="90" height="50" fill={c.d} opacity="0.08" rx="4" />
      <circle cx="100" cy="85" r="18" fill={c.sh} opacity="0.08" />
      <polygon points={ol} fill={`url(#${id}-sw)`} />
      <ellipse cx="90" cy="44" rx="22" ry="8" fill="white" opacity="0.22" transform="rotate(-5,90,44)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.sh}50`} strokeWidth="0.8" />
    {SP.amethyst.map((s,i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" filter={`url(#${id}-sp)`} opacity={a ? undefined : 0.6}>
        {a && <animate attributeName="opacity" values="0.3;1;0.3" dur={s.d} repeatCount="indefinite" />}
      </circle>
    ))}
  </g>
);

// ═══════════════════════════════════════
//  TOPAZ — 선파이어 선버스트 (Sunfire)
//  외곽: 페어 커팅 (물방울)
// ═══════════════════════════════════════

const topazS1: SFn = (c, id, ol) => (
  <g opacity="0.75">
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <linearGradient id={`${id}-f`} x1="0.5" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor={c.m} stopOpacity="0.55" /><stop offset="100%" stopColor={c.d} /></linearGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-f)`} />
      <circle cx="100" cy="95" r="22" fill={c.m} opacity="0.15" />
      <circle cx="100" cy="95" r="8" fill={c.d} opacity="0.1" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.m}50`} strokeWidth="1.5" />
  </g>
);

const topazS2: SFn = (c, id, ol) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="50%" cy="48%"><stop offset="0%" stopColor={c.h} /><stop offset="100%" stopColor={c.d} /></radialGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} />
      {Array.from({length:12}).map((_,i) => {
        const a1 = (i*30)*Math.PI/180, a2 = ((i+1)*30)*Math.PI/180, R = 80;
        return (
          <polygon key={i}
            points={`100,100 ${100+Math.cos(a1)*R},${100+Math.sin(a1)*R} ${100+Math.cos(a2)*R},${100+Math.sin(a2)*R}`}
            fill={i%2===0?c.b:c.m} opacity={0.12+((i%3)*0.05)} />
        );
      })}
      <circle cx="100" cy="100" r="14" fill={c.h} opacity="0.12" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.b}35`} strokeWidth="0.6" />
  </g>
);

const topazS3: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="48%" cy="42%" r="65%"><stop offset="0%" stopColor={c.w} stopOpacity="0.4" /><stop offset="25%" stopColor={c.h} /><stop offset="55%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="3" result="b" /><feFlood floodColor={c.ga} result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <ellipse cx="100" cy="196" rx="48" ry="8" fill={c.ga} opacity="0.35" />
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {Array.from({length:12}).map((_,i) => {
        const a1 = (i*30)*Math.PI/180, a2 = ((i+1)*30)*Math.PI/180, R = 82;
        return (
          <polygon key={i}
            points={`100,100 ${100+Math.cos(a1)*R},${100+Math.sin(a1)*R} ${100+Math.cos(a2)*R},${100+Math.sin(a2)*R}`}
            fill={i%2===0?c.h:c.b} opacity={0.1+((i%3)*0.05)} />
        );
      })}
      {Array.from({length:12}).map((_,i) => {
        const ang = (i*30)*Math.PI/180;
        return <line key={i} x1="100" y1="100" x2={100+Math.cos(ang)*80} y2={100+Math.sin(ang)*80} stroke={c.sh} opacity="0.1" strokeWidth="0.5" />;
      })}
      <circle cx="100" cy="100" r="18" fill={c.h} opacity="0.12" />
      <circle cx="100" cy="100" r="8" fill={c.w} opacity="0.08" />
      <ellipse cx="90" cy="58" rx="22" ry="8" fill="white" opacity="0.18" transform="rotate(-6,90,58)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.h}45`} strokeWidth="0.7" />
    <circle cx="86" cy="62" r="2.5" fill="white" opacity={a ? undefined : 0.35}>
      {a && <animate attributeName="opacity" values="0.2;0.55;0.2" dur="2.2s" repeatCount="indefinite" />}
    </circle>
  </g>
);

const topazS4: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="48%" cy="38%" r="70%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" /><stop offset="15%" stopColor={c.sh} /><stop offset="40%" stopColor={c.h} /><stop offset="65%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="5" result="b" /><feFlood floodColor={c.g} floodOpacity="0.3" result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <linearGradient id={`${id}-sw`} x1="0.2" y1="0.2" x2="0.8" y2="0.8">
        <stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="48%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.3" /><stop offset="52%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
        {a && <animateTransform attributeName="gradientTransform" type="rotate" values="0,0.5,0.5;360,0.5,0.5" dur="4s" repeatCount="indefinite" />}
      </linearGradient>
      <filter id={`${id}-sp`}><feGaussianBlur stdDeviation="1.5" /></filter>
    </defs>
    <ellipse cx="100" cy="198" rx="58" ry="14" fill={c.ga} opacity={a ? undefined : 0.4}>
      {a && <><animate attributeName="rx" values="50;66;50" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" /></>}
    </ellipse>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {Array.from({length:12}).map((_,i) => {
        const a1 = (i*30)*Math.PI/180, a2 = ((i+1)*30)*Math.PI/180, R = 85;
        return (
          <polygon key={i}
            points={`100,100 ${100+Math.cos(a1)*R},${100+Math.sin(a1)*R} ${100+Math.cos(a2)*R},${100+Math.sin(a2)*R}`}
            fill={i%2===0?c.h:c.b} opacity={0.12+((i%3)*0.05)} />
        );
      })}
      {Array.from({length:12}).map((_,i) => {
        const ang = (i*30)*Math.PI/180;
        return <line key={i} x1="100" y1="100" x2={100+Math.cos(ang)*88} y2={100+Math.sin(ang)*88} stroke={c.w} opacity="0.12" strokeWidth="0.6" />;
      })}
      <circle cx="100" cy="100" r="22" fill={c.h} opacity="0.15" />
      <circle cx="100" cy="100" r="10" fill={c.w} opacity="0.12" />
      <circle cx="100" cy="100" r="4" fill="white" opacity="0.08" />
      <polygon points={ol} fill={`url(#${id}-sw)`} />
      <ellipse cx="88" cy="54" rx="26" ry="9" fill="white" opacity="0.25" transform="rotate(-5,88,54)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.sh}58`} strokeWidth="0.8" />
    {SP.topaz.map((s,i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" filter={`url(#${id}-sp)`} opacity={a ? undefined : 0.6}>
        {a && <animate attributeName="opacity" values="0.3;1;0.3" dur={s.d} repeatCount="indefinite" />}
      </circle>
    ))}
  </g>
);

// ═══════════════════════════════════════
//  QUARTZ — 프리즘 모자이크 (Prismatic)
//  외곽: 원시 크리스탈 (비대칭 다각형)
// ═══════════════════════════════════════

const quartzS1: SFn = (c, id, ol) => (
  <g opacity="0.75">
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <linearGradient id={`${id}-f`} x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stopColor={c.m} stopOpacity="0.45" /><stop offset="100%" stopColor={c.d} /></linearGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-f)`} />
      <line x1="100" y1="35" x2="100" y2="165" stroke={c.m} opacity="0.1" strokeWidth="0.5" />
      <line x1="45" y1="65" x2="155" y2="135" stroke={c.m} opacity="0.08" strokeWidth="0.4" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.m}50`} strokeWidth="1.5" />
  </g>
);

const quartzS2: SFn = (c, id, ol) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <linearGradient id={`${id}-bg`} x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stopColor={c.h} /><stop offset="50%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></linearGradient>
    </defs>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} />
      {TRI_FACETS.map((f,i) => {
        const isTop = f.t.startsWith('t'), isMid = f.t.startsWith('m');
        return (
          <polygon key={i} points={f.pts}
            fill={isTop?c.h:isMid?c.b:c.d} opacity={0.08+i*0.012}
            stroke={c.h} strokeOpacity={0.12} strokeWidth="0.5" />
        );
      })}
    </g>
    <polygon points={ol} fill="none" stroke={`${c.b}35`} strokeWidth="0.6" />
  </g>
);

const quartzS3: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="50%" cy="42%" r="65%"><stop offset="0%" stopColor={c.w} stopOpacity="0.35" /><stop offset="30%" stopColor={c.h} /><stop offset="60%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="2.5" result="b" /><feFlood floodColor={c.ga} result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <ellipse cx="100" cy="196" rx="45" ry="7" fill={c.ga} opacity="0.3" />
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {TRI_FACETS.map((f,i) => {
        const isTop = f.t.startsWith('t'), isMid = f.t.startsWith('m');
        return (
          <polygon key={i} points={f.pts}
            fill={isTop?c.sh:isMid?c.h:c.m} opacity={0.06+i*0.015}
            stroke={c.sh} strokeOpacity={0.12+i*0.01} strokeWidth="0.5" />
        );
      })}
      <line x1="100" y1="10" x2="55" y2="55" stroke="rgba(255,200,200,0.1)" strokeWidth="1" />
      <line x1="100" y1="10" x2="145" y2="55" stroke="rgba(200,200,255,0.1)" strokeWidth="1" />
      <line x1="55" y1="55" x2="10" y2="100" stroke="rgba(200,255,200,0.08)" strokeWidth="0.8" />
      <ellipse cx="92" cy="52" rx="22" ry="8" fill="white" opacity="0.15" transform="rotate(-6,92,52)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.h}42`} strokeWidth="0.7" />
    <circle cx="88" cy="50" r="2" fill="white" opacity={a ? undefined : 0.35}>
      {a && <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2.5s" repeatCount="indefinite" />}
    </circle>
  </g>
);

const quartzS4: SFn = (c, id, ol, a) => (
  <g>
    <defs>
      <clipPath id={`${id}-cl`}><polygon points={ol} /></clipPath>
      <radialGradient id={`${id}-bg`} cx="48%" cy="38%" r="70%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" /><stop offset="20%" stopColor={c.sh} /><stop offset="50%" stopColor={c.b} /><stop offset="100%" stopColor={c.d} /></radialGradient>
      <filter id={`${id}-gl`}><feGaussianBlur stdDeviation="4" result="b" /><feFlood floodColor={c.g} floodOpacity="0.25" result="c" /><feComposite in="c" in2="b" operator="in" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <linearGradient id={`${id}-sw`} x1="0" y1="0" x2="1" y2="0.5">
        <stop offset="0%" stopColor="white" stopOpacity="0" /><stop offset="48%" stopColor="white" stopOpacity="0" />
        <stop offset="50%" stopColor="white" stopOpacity="0.2" /><stop offset="52%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
        {a && <animateTransform attributeName="gradientTransform" type="translate" values="-1,0;2,0" dur="3.5s" repeatCount="indefinite" />}
      </linearGradient>
      <filter id={`${id}-sp`}><feGaussianBlur stdDeviation="1.2" /></filter>
    </defs>
    <ellipse cx="100" cy="198" rx="52" ry="12" fill={c.ga} opacity={a ? undefined : 0.3}>
      {a && <><animate attributeName="rx" values="44;60;44" dur="2.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.2;0.42;0.2" dur="2.5s" repeatCount="indefinite" /></>}
    </ellipse>
    <g clipPath={`url(#${id}-cl)`}>
      <polygon points={ol} fill={`url(#${id}-bg)`} filter={`url(#${id}-gl)`} />
      {TRI_FACETS.map((f,i) => {
        const isTop = f.t.startsWith('t'), isMid = f.t.startsWith('m');
        return (
          <polygon key={i} points={f.pts}
            fill={isTop?c.w:isMid?c.sh:c.h} opacity={0.06+i*0.016}
            stroke={c.w} strokeOpacity={0.1+i*0.015} strokeWidth="0.5" />
        );
      })}
      <line x1="100" y1="10" x2="55" y2="55" stroke="rgba(255,180,180,0.14)" strokeWidth="1.5" />
      <line x1="100" y1="10" x2="145" y2="55" stroke="rgba(180,180,255,0.14)" strokeWidth="1.5" />
      <line x1="55" y1="55" x2="10" y2="100" stroke="rgba(180,255,180,0.12)" strokeWidth="1.2" />
      <line x1="145" y1="55" x2="190" y2="100" stroke="rgba(255,255,180,0.12)" strokeWidth="1.2" />
      <line x1="10" y1="100" x2="10" y2="145" stroke="rgba(255,200,255,0.1)" strokeWidth="1" />
      <line x1="190" y1="100" x2="190" y2="145" stroke="rgba(200,255,255,0.1)" strokeWidth="1" />
      <polygon points={ol} fill={`url(#${id}-sw)`} />
      <line x1="65" y1="55" x2="135" y2="55" stroke="white" opacity="0.12" strokeWidth="0.7" />
      <ellipse cx="90" cy="48" rx="24" ry="8" fill="white" opacity="0.2" transform="rotate(-5,90,48)" />
    </g>
    <polygon points={ol} fill="none" stroke={`${c.sh}50`} strokeWidth="0.8" />
    {SP.quartz.map((s,i) => (
      <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" filter={`url(#${id}-sp)`} opacity={a ? undefined : 0.5}>
        {a && <animate attributeName="opacity" values="0.25;0.85;0.25" dur={s.d} repeatCount="indefinite" />}
      </circle>
    ))}
  </g>
);

// ═══════════════════════════════════════
//  Stage Map
// ═══════════════════════════════════════

const SMAP: Record<GemVariant, SFn[]> = {
  ruby:     [s0, rubyS1, rubyS2, rubyS3, rubyS4],
  sapphire: [s0, sapphireS1, sapphireS2, sapphireS3, sapphireS4],
  emerald:  [s0, emeraldS1, emeraldS2, emeraldS3, emeraldS4],
  amethyst: [s0, amethystS1, amethystS2, amethystS3, amethystS4],
  topaz:    [s0, topazS1, topazS2, topazS3, topazS4],
  quartz:   [s0, quartzS1, quartzS2, quartzS3, quartzS4],
};

// ═══════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════

export default function GemStone({
  variant,
  stage,
  size = 'md',
  showLabel,
  className = '',
  disableAnimation,
}: GemStoneProps) {
  const s = SIZES[size];
  const st = Math.max(0, Math.min(4, stage));
  const reactId = useId();
  const uid = `gem-${variant}-${st}-${reactId.replace(/:/g, '')}`;
  const anim = !disableAnimation;
  const c = P[variant];
  const ol = OL[variant];
  const render = SMAP[variant][st];

  return (
    <div
      className={`inline-flex flex-col items-center gap-0.5 ${className}`}
      title={`${GEM_VARIANT_LABELS[variant]} — ${GEM_STAGE_LABELS[st]}`}
    >
      <svg
        width={s.gem}
        height={s.gem}
        viewBox="0 0 200 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {render(c, uid, ol, anim)}
      </svg>

      {showLabel && (
        <span
          className="text-center font-medium leading-tight whitespace-nowrap"
          style={{ fontSize: s.fontSize, color: st === 0 ? '#9CA3AF' : c.m }}
        >
          {GEM_STAGE_LABELS[st]}
        </span>
      )}
    </div>
  );
}
