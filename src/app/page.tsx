import { redirect } from 'next/navigation';

/**
 * 루트 — 기출분석 전용 앱의 진입점. 항상 /exam-analysis 로 보낸다.
 * (비인증 시 (teacher) 레이아웃이 /login 으로 흡수)
 */
export default function Page() {
  redirect('/exam-analysis');
}
