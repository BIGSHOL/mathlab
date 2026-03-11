import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { autoTag, getChapterDomainMap, getChapterConceptMap } from '@/lib/services/question-tagger';

/** GET: 매핑 테이블 반환 (UI에서 참조용) */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  return NextResponse.json({
    data: {
      chapterDomains: getChapterDomainMap(),
      chapterConcepts: getChapterConceptMap(),
    },
  });
}

/** POST: chapter/section/difficulty로 자동 태깅 결과 미리보기 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { chapter, section, difficulty } = body as {
    chapter?: string;
    section?: string;
    difficulty?: string;
  };

  if (!chapter) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'chapter가 필요합니다' } },
      { status: 400 }
    );
  }

  const result = await autoTag({ chapter, section, difficulty });
  return NextResponse.json({ data: result });
}
