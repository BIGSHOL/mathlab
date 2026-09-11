import type { NextConfig } from 'next';
import { setDefaultResultOrder } from 'node:dns';
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';

// ── 빌드 중 Google Fonts 다운로드 안정화 (2026-09-11) ──
// next/font 는 프로덕션 빌드에서 한글 서체 8종의 unicode-range 조각을 굵기별로 전부 받는다(수천 건 동시).
// Node 20+ 는 주소(IPv6/IPv4)마다 250ms 안에 연결되지 않으면 다음 주소로 넘기고, 전부 넘기면
// AggregateError ETIMEDOUT 을 낸다. 2코어 빌드 머신에 요청이 몰리면 이벤트 루프가 밀려 그 타이머가
// 연결보다 먼저 울리고, 매번 다른 서체가 떨어지며 빌드가 죽었다(2026-09-11 연속 3회).
// IPv4 를 먼저 시도하고 주소당 대기를 5초로 늘린다. 이 파일은 빌드·dev 에서 평가되며,
// Vercel 서버리스 런타임은 직렬화된 설정을 쓰므로 여기 코드를 다시 실행하지 않는다.
setDefaultResultOrder('ipv4first');
setDefaultAutoSelectFamilyAttemptTimeout(5000);

const nextConfig: NextConfig = {
  serverExternalPackages: ['@resvg/resvg-js', 'sharp'],
  webpack: (config) => {
    // pdfjs-dist에서 canvas 모듈을 사용하지 않도록 설정
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
