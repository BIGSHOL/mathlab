import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 데모 — AI 총평 생성 연출 (인증 불필요, AI 호출 없음).
 *
 * 공개 /demo 페이지의 AnalysisDetail이 detail.id='demo'로 호출하는 실제 경로
 * (/api/exam-analysis/demo/analyze-extended)를 리터럴 세그먼트가 받는다
 * (Next.js: 정적 세그먼트가 동적 [id]보다 우선).
 * 실제 생성 시간을 체감하도록 짧게 대기 후 성공 응답 — 총평 데이터는
 * 클라이언트 픽스처(demo-exam.json)에 이미 있어 onRefresh 시 표시된다.
 */
export async function POST() {
  await new Promise((r) => setTimeout(r, 6000));
  return NextResponse.json({ data: { demo: true, agents: ['commentary'] } });
}
