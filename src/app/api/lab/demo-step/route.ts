// 🚧 Lab — [DEV] 코크핏 데모 한 바퀴 API (은닉, SUPER_ADMIN 전용)
//   POST { studentId? } → 최신 미제출 워크시트 시뮬채점 후 한 사이클. 클릭마다 mastery 적립.
//   실제 운영은 학생 답 제출 UI(⑤)로 대체. dev 전용(프로덕션 404).
import { NextRequest, NextResponse } from 'next/server';
import { guardLabApi } from '@/lib/lab/gate';
import { labDemoStep } from '@/lib/lab/service';

export async function POST(req: NextRequest) {
  const gate = await guardLabApi();
  if (gate instanceof Response) return gate;
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'not found' } }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const studentId = typeof body?.studentId === 'string' ? body.studentId : 'lab-student-demo';
    const worksheet = await labDemoStep(studentId);
    return NextResponse.json({ data: worksheet });
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: e instanceof Error ? e.message : '오류' } },
      { status: 500 },
    );
  }
}
