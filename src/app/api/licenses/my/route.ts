import { NextResponse } from 'next/server';
import { requireAuth, isResponse } from '@/lib/api';
import { getStudentLicenses, ALL_LICENSE_FEATURES } from '@/lib/services/license';

/** GET /api/licenses/my — 학생 본인의 이용권 상태 조회 */
export async function GET() {
  const user = await requireAuth();
  if (isResponse(user)) return user;

  // 학생이 아닌 경우 전부 true 반환
  if (user.role !== 'STUDENT') {
    const allLicensed = Object.fromEntries(
      ALL_LICENSE_FEATURES.map((f) => [f, { licensed: true, expiresAt: null }])
    );
    return NextResponse.json({ data: allLicensed });
  }

  const licenses = await getStudentLicenses(user.id);
  return NextResponse.json({ data: licenses });
}
