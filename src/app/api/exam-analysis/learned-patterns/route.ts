import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireOwner, isResponse, badRequest } from '@/lib/api';

/** GET /api/exam-analysis/learned-patterns — 학습된 패턴 목록 (OWNER+) */
export async function GET(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get('subject') as 'MATH' | 'ENGLISH' | null;
  const isActive = searchParams.get('isActive');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {
    ...(subject && { subject }),
    ...(isActive !== null && isActive !== undefined && isActive !== '' && {
      isActive: isActive === 'true',
    }),
  };

  const [items, total] = await Promise.all([
    prisma.learnedPattern.findMany({
      where,
      orderBy: { confidence: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.learnedPattern.count({ where }),
  ]);

  return NextResponse.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * POST /api/exam-analysis/learned-patterns — 피드백 분석 → 패턴 생성 (OWNER+)
 * ?action=analyze: 처리 대기 중인 피드백을 분석하여 패턴 자동 생성
 */
export async function POST(request: NextRequest) {
  const user = await requireOwner();
  if (isResponse(user)) return user;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action !== 'analyze') {
    return badRequest('action=analyze 파라미터가 필요합니다');
  }

  // pending 상태의 피드백 조회 (테넌트 스코핑)
  const feedbacks = await prisma.examFeedback.findMany({
    where: {
      status: 'pending',
      ...(user.tenantId ? { tenantId: user.tenantId } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  if (feedbacks.length === 0) {
    return NextResponse.json({
      data: { patternsCreated: 0, feedbacksProcessed: 0, message: '처리할 피드백이 없습니다' },
    });
  }

  // feedbackType별 그룹화
  const grouped: Record<string, typeof feedbacks> = {};
  for (const fb of feedbacks) {
    if (!grouped[fb.feedbackType]) {
      grouped[fb.feedbackType] = [];
    }
    grouped[fb.feedbackType].push(fb);
  }

  const createdPatterns: string[] = [];

  // wrong_topic 패턴: 3건 이상 → topic_review 생성
  if (grouped['wrong_topic'] && grouped['wrong_topic'].length >= 3) {
    const count = grouped['wrong_topic'].length;
    const confidence = getConfidenceFromCount(count);

    await prisma.learnedPattern.create({
      data: {
        subject: 'MATH',
        patternType: 'topic_review',
        description: `${count}건의 토픽 오분류 피드백이 감지됨. 토픽 분류 기준 재검토 필요.`,
        confidence,
        sourceCount: count,
        rule: { feedbackType: 'wrong_topic', sampleCount: count },
        isAutoApplied: confidence >= 0.7,
        isActive: true,
      },
    });
    createdPatterns.push('topic_review');
  }

  // wrong_difficulty 패턴: 3건 이상 → difficulty_adjust 생성
  if (grouped['wrong_difficulty'] && grouped['wrong_difficulty'].length >= 3) {
    const count = grouped['wrong_difficulty'].length;
    const confidence = getConfidenceFromCount(count);

    await prisma.learnedPattern.create({
      data: {
        subject: 'MATH',
        patternType: 'difficulty_adjust',
        description: `${count}건의 난이도 오분류 피드백이 감지됨. 난이도 기준 조정 필요.`,
        confidence,
        sourceCount: count,
        rule: { feedbackType: 'wrong_difficulty', sampleCount: count },
        isAutoApplied: confidence >= 0.7,
        isActive: true,
      },
    });
    createdPatterns.push('difficulty_adjust');
  }

  // wrong_recognition 패턴: 3건 이상 → type_correction 생성
  if (grouped['wrong_recognition'] && grouped['wrong_recognition'].length >= 3) {
    const count = grouped['wrong_recognition'].length;
    const confidence = getConfidenceFromCount(count);

    await prisma.learnedPattern.create({
      data: {
        subject: 'MATH',
        patternType: 'type_correction',
        description: `${count}건의 인식 오류 피드백이 감지됨. 문항 인식 정확도 개선 필요.`,
        confidence,
        sourceCount: count,
        rule: { feedbackType: 'wrong_recognition', sampleCount: count },
        isAutoApplied: confidence >= 0.7,
        isActive: true,
      },
    });
    createdPatterns.push('type_correction');
  }

  // 처리된 피드백 상태 업데이트
  const processedIds = feedbacks.map(fb => fb.id);
  await prisma.examFeedback.updateMany({
    where: { id: { in: processedIds } },
    data: { status: 'processed', processedAt: new Date() },
  });

  return NextResponse.json({
    data: {
      patternsCreated: createdPatterns.length,
      feedbacksProcessed: processedIds.length,
      patterns: createdPatterns,
    },
  });
}

/** 피드백 건수 → 신뢰도 변환 */
function getConfidenceFromCount(count: number): number {
  if (count >= 10) return 0.7;
  if (count >= 5) return 0.6;
  return 0.5;
}
