// 🚧 Lab P4 — 리포트 생성 API (은닉, SUPER_ADMIN 전용)
//   POST { studentId, type? } → 학부모(PARENT)/원장(DIRECTOR) 리포트 생성·영속.
import { NextRequest, NextResponse } from 'next/server';
import { guardLabApi } from '@/lib/lab/gate';
import { generateLabReport } from '@/lib/lab/service';

export async function POST(req: NextRequest) {
  const gate = await guardLabApi();
  if (gate instanceof Response) return gate;
  try {
    const body = await req.json().catch(() => ({}));
    const studentId = typeof body?.studentId === 'string' ? body.studentId : undefined;
    const type = body?.type === 'PARENT' || body?.type === 'DIRECTOR' ? body.type : 'DIRECTOR';
    if (!studentId) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'studentId가 필요합니다' } },
        { status: 400 },
      );
    }
    const report = await generateLabReport(studentId, type);
    return NextResponse.json({ data: report });
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: e instanceof Error ? e.message : '오류' } },
      { status: 500 },
    );
  }
}
