/**
 * 데모 시험지 ID 판별 — 공개 /demo 페이지의 픽스처 id (demo-g1/demo-m2/demo-m3).
 * 실제 cuid(25자 영숫자)와 충돌 불가. 프로덕션 컴포넌트의 데모 분기 게이트로 사용:
 * 피드백 버튼 비활성, 네이버 복사 사전 베이크 경로, 목록 삭제 로컬 처리 등.
 */
export function isDemoExamId(id: string | null | undefined): boolean {
  return !!id && (id === 'demo' || id.startsWith('demo-'));
}
