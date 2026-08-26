import { NextResponse } from 'next/server';
import { requireTeacher, isResponse } from '@/lib/api';
import {
  isProductionRuntime,
  listInstalledClis,
  parseCliKind,
} from '@/lib/exam-analysis/cli-llm';

/**
 * GET /api/exam-analysis/cli-options
 * 개발 서버에서 로컬 CLI(grok/claude/codex) 설치 여부만 조회.
 * 운영에서는 enabled:false 만 반환한다.
 */
export async function GET() {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  if (isProductionRuntime()) {
    return NextResponse.json({
      data: { enabled: false, available: [] as const, defaultKind: null },
    });
  }

  const available = await listInstalledClis();
  const envKind = parseCliKind(process.env.EXAM_ANALYSIS_CLI);
  const defaultKind =
    (envKind && available.some((a) => a.kind === envKind) ? envKind : null)
    ?? available[0]?.kind
    ?? null;

  return NextResponse.json({
    data: {
      enabled: true,
      available: available.map((a) => a.kind),
      defaultKind,
    },
  });
}
