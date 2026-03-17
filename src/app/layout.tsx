import type { Metadata } from 'next';
import { Noto_Serif_KR } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import './globals.css';

const notoSerifKR = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-serif-kr',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MathLab - 수학 학습 플랫폼',
  description: '초중등 학생들을 위한 게이미피케이션 수학 학습 플랫폼',
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
      </head>
      <body className={`${notoSerifKR.variable} antialiased overflow-hidden`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
