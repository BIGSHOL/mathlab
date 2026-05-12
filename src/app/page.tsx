/**
 * / — Pattern G V1 랜딩 (W2 1.1)
 * 시안: data/refact2/pages/landing-auth-hifi.html § V1
 *
 * 매니페스트 §M3 — LandingV1 컴포넌트 재사용 (v2/landing 과 동일 컴포넌트).
 * v1 라우트(/login)로 href 전달.
 */
import { LandingV1 } from '@/components/landing';

export const metadata = {
  title: 'Injaewon MathLAB — 학원장님, 학교 시험 점수로 학부모를 설득하세요',
  description:
    '강남 26개교 5년치 기출 자동 분석. 우리 학원생이 어느 시험 어디서 막혔는지 한 화면으로 확인하고 학부모 리포트를 자동 발송합니다.',
};

export default function HomePage() {
  return <LandingV1 homeHref="/" loginHref="/login" signupHref="/login" />;
}
