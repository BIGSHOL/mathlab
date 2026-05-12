/**
 * /v2/landing — Pattern G V1 랜딩 (v2 별도 라우트 보존)
 * 시안: data/refact2/pages/landing-auth-hifi.html § V1
 *
 * 매니페스트 §M3 — LandingV1 컴포넌트 재사용 (/ 와 동일 컴포넌트).
 * v2 라우트(/v2/login, /v2/onboarding)로 href 전달.
 */
import { LandingV1 } from '@/components/landing';

export const metadata = {
  title: 'Injaewon MathLAB — 학원장님, 학교 시험 점수로 학부모를 설득하세요',
};

export default function LandingV2Page() {
  return <LandingV1 homeHref="/v2/landing" loginHref="/v2/login" signupHref="/v2/onboarding" />;
}
