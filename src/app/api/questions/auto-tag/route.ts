import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, isResponse, badRequest } from '@/lib/api';
import { autoTag, getChapterDomainMap, getChapterConceptMap } from '@/lib/services/question-tagger';

/** GET: 매핑 테이블 반환 (UI에서 참조용) */
export async function GET() {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  return NextResponse.json({
    data: {
      chapterDomains: getChapterDomainMap(),
      chapterConcepts: getChapterConceptMap(),
    },
  });
}

/** POST: chapter/section/difficulty로 자동 태깅 결과 미리보기 */
export async function POST(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (isResponse(user)) return user;

  const body = await request.json();
  const { chapter, section, difficulty, bookCode } = body as {
    chapter?: string;
    section?: string;
    difficulty?: string;
    bookCode?: string;
  };

  if (!chapter) {
    return badRequest('chapter가 필요합니다');
  }

  const result = await autoTag({ chapter, section, difficulty, bookCode });
  return NextResponse.json({ data: result });
}
