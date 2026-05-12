/**
 * /terms — Pattern G V2 (LegalDoc) 약관·정책.
 * 시안: data/refact2/pages/pattern-g-static-doc-hifi.html § V2
 */
import Link from 'next/link';
import { LegalDoc } from '@/components/docs';
import { termsData } from '@/lib/data/legal';

export const metadata = {
  title: '서비스 이용약관 | Injaewon MathLAB',
  description: 'Injaewon MathLAB 서비스 이용약관',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <LegalDoc data={termsData} />
        <div className="mt-10 flex justify-center gap-4 text-sm">
          <Link href="/privacy" className="text-[color:var(--primary)] hover:underline">
            개인정보처리방침 보기
          </Link>
          <span className="text-slate-300">|</span>
          <Link href="/login" className="text-[color:var(--primary)] hover:underline">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
