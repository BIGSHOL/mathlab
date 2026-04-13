/**
 * 동형 변형 문제 (숫자만 다른 같은 유형) 관리
 *
 * GET  /api/questions/:id/variants            — 원본의 모든 변형 조회
 * POST /api/questions/:id/variants            — 변형 일괄 저장 (수동/AI 모두)
 *   body: { variants: [{ content, choices, answer, explanation, ... }], source?: 'ai'|'rule'|'manual' }
 *
 * 각 변형은 자동으로 다음 seed 번호가 할당되며, variantOfId로 원본과 연결된다.
 * 원본이 삭제되면 cascade로 변형도 삭제됨.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  requireTeacher,
  isResponse,
  badRequest,
  notFound,
  serverError,
} from '@/lib/api';
import { autoTag } from '@/lib/services/question-tagger';

type Params = { params: Promise<{ id: string }> };

const variantInputSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'SHORT_ANSWER', 'ESSAY']),
  difficulty: z.enum(['BASIC', 'MEDIUM', 'HIGH', 'HIGHEST']),
  choices: z.array(z.string()).optional(),
  answer: z.string().min(1),
  explanation: z.string().optional(),
  diagramSpec: z.unknown().optional(),
  diagramSVG: z.string().nullable().optional(),
});

const createSchema = z.object({
  variants: z.array(variantInputSchema).min(1).max(20),
  source: z.enum(['ai', 'rule', 'manual']).default('manual'),
});

/** GET — 원본의 모든 변형 + 원본 정보 */
export async function GET(_request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;

  const source = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      chapter: true,
      section: true,
      difficulty: true,
      type: true,
      bookCode: true,
      variantOfId: true,
    },
  });
  if (!source) return notFound('원본 문제를 찾을 수 없습니다');

  // 변형이 들어온 경우 → 원본 ID로 다시 시작
  const rootId = source.variantOfId ?? source.id;

  const variants = await prisma.question.findMany({
    where: { variantOfId: rootId },
    select: {
      id: true,
      content: true,
      choices: true,
      answer: true,
      explanation: true,
      difficulty: true,
      variantSeed: true,
      variantSource: true,
      createdAt: true,
    },
    orderBy: { variantSeed: 'asc' },
  });

  return NextResponse.json({
    data: {
      sourceId: rootId,
      isViewingVariant: source.variantOfId !== null,
      total: variants.length,
      variants,
    },
  });
}

/** POST — 변형 일괄 저장 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await requireTeacher();
  if (isResponse(user)) return user;

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch { return badRequest('요청 본문을 읽을 수 없습니다'); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest('입력값을 확인하세요');

  const source = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true,
      bookCode: true,
      chapter: true,
      section: true,
      tenantId: true,
      conceptId: true,
      domain: true,
      abilityDomain: true,
      questionNum: true,
      variantOfId: true,
    },
  });
  if (!source) return notFound('원본 문제를 찾을 수 없습니다');
  if (source.variantOfId) return badRequest('변형의 변형은 만들 수 없습니다 (원본 문제로 시도하세요)');

  // 다음 seed 번호 계산
  const lastSeed = await prisma.question.aggregate({
    where: { variantOfId: source.id },
    _max: { variantSeed: true },
  });
  let nextSeed = (lastSeed._max.variantSeed ?? 0) + 1;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const ids: string[] = [];
      for (const v of parsed.data.variants) {
        const tag = await autoTag({
          chapter: source.chapter,
          section: source.section,
          difficulty: v.difficulty,
          bookCode: source.bookCode,
        });
        const newQ = await tx.question.create({
          data: {
            bookCode: source.bookCode,
            chapter: source.chapter,
            section: source.section,
            questionNum: source.questionNum, // 원본 번호 그대로
            difficulty: v.difficulty,
            type: v.type,
            content: v.content,
            choices: v.choices ?? undefined,
            answer: v.answer,
            explanation: v.explanation ?? null,
            diagramSpec: (v.diagramSpec as object | undefined) ?? undefined,
            diagramSVG: v.diagramSVG ?? null,
            domain: source.domain ?? tag.domain ?? null,
            abilityDomain: source.abilityDomain ?? tag.abilityDomain ?? null,
            conceptId: source.conceptId ?? tag.conceptId ?? null,
            tenantId: source.tenantId,
            createdById: user.id,
            variantOfId: source.id,
            variantSeed: nextSeed,
            variantSource: parsed.data.source,
          },
          select: { id: true },
        });
        ids.push(newQ.id);
        nextSeed += 1;
      }
      return ids;
    });

    return NextResponse.json({
      data: { sourceId: source.id, created: created.length, variantIds: created },
    }, { status: 201 });
  } catch (err) {
    console.error('[variants POST]', err);
    return serverError('변형 저장에 실패했습니다');
  }
}
