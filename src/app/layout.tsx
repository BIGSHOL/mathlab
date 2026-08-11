import type { Metadata } from 'next';
import { Noto_Serif_KR, Bodoni_Moda, Abril_Fatface } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import './globals.css';

// V3 NYT Science 톤
// - Noto Serif KR: 본문 헤드라인/덱/단락
// - Abril Fatface: 거대 숫자(65%) + 강조 숫자(KPI, bars value 등) — 압축형 디스플레이 세리프
// - Bodoni Moda: 보조용(인용구 등) 유지
const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif-kr',
  display: 'swap',
});

const abrilFatface = Abril_Fatface({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-abril',
  display: 'swap',
});

const bodoniModa = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-bodoni',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Injaewon MathLAB - 수학 학습 플랫폼',
  description: '초등~고등 학생들을 위한 게이미피케이션 수학 학습 플랫폼',
  // 네이버 서치어드바이저 소유확인. 지우면 소유확인이 해제된다.
  verification: {
    other: {
      'naver-site-verification': 'fffd2fb5480df4c43dd010c93be52e86ef162cc9',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          crossOrigin="anonymous"
        />
        {/* V3 거대 숫자용 Abril Fatface — next/font 다운로드 실패 시 폴백 */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Abril+Fatface&display=swap"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${notoSerifKR.variable} ${bodoniModa.variable} ${abrilFatface.variable} antialiased overflow-hidden`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
