import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notFound } from '@/lib/api';
import { CROSS_GRADE_CHAINS } from '@/lib/constants/concepts';

// GET /api/concepts/prerequisite-chain?chain=분수 계통
// GET /api/concepts/prerequisite-chain?conceptId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chainName = searchParams.get('chain');
  const conceptId = searchParams.get('conceptId');

  const chainNames = Object.keys(CROSS_GRADE_CHAINS);

  if (chainName) {
    // 특정 체인의 개념들 조회
    const conceptCodes = CROSS_GRADE_CHAINS[chainName];
    if (!conceptCodes || conceptCodes.length === 0) {
      return notFound('해당 체인을 찾을 수 없습니다');
    }

    const concepts = await prisma.concept.findMany({
      where: { conceptCode: { in: conceptCodes } },
      select: {
        id: true,
        conceptCode: true,
        title: true,
        grade: true,
        sortOrder: true,
      },
    });

    // 체인 순서대로 정렬
    const codeOrder = new Map(conceptCodes.map((code, i) => [code, i]));
    concepts.sort((a, b) => (codeOrder.get(a.conceptCode ?? '') ?? 999) - (codeOrder.get(b.conceptCode ?? '') ?? 999));

    // 노드 + 엣지 생성
    const nodes = concepts.map((c) => ({
      id: c.id,
      conceptCode: c.conceptCode,
      title: c.title,
      grade: c.grade,
      gradeLabel: gradeToLabel(c.grade),
    }));

    const edges: { from: string; to: string }[] = [];
    for (let i = 0; i < concepts.length - 1; i++) {
      edges.push({ from: concepts[i].id, to: concepts[i + 1].id });
    }

    return NextResponse.json({
      data: { chains: chainNames, nodes, edges },
    });
  }

  if (conceptId) {
    // 특정 개념의 선수/후행 관계 탐색
    const [prerequisites, dependents, concept] = await Promise.all([
      prisma.conceptPrerequisite.findMany({
        where: { conceptId },
        select: {
          prerequisite: {
            select: { id: true, conceptCode: true, title: true, grade: true },
          },
        },
      }),
      prisma.conceptPrerequisite.findMany({
        where: { prerequisiteId: conceptId },
        select: {
          concept: {
            select: { id: true, conceptCode: true, title: true, grade: true },
          },
        },
      }),
      prisma.concept.findUnique({
        where: { id: conceptId },
        select: { id: true, conceptCode: true, title: true, grade: true },
      }),
    ]);

    if (!concept) {
      return notFound('개념을 찾을 수 없습니다');
    }

    const allNodes = [
      ...prerequisites.map((p) => p.prerequisite),
      concept,
      ...dependents.map((d) => d.concept),
    ];

    // 중복 제거
    const seen = new Set<string>();
    const nodes = allNodes
      .filter((n) => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      })
      .map((n) => ({
        id: n.id,
        conceptCode: n.conceptCode,
        title: n.title,
        grade: n.grade,
        gradeLabel: gradeToLabel(n.grade),
      }));

    const edges = [
      ...prerequisites.map((p) => ({ from: p.prerequisite.id, to: conceptId })),
      ...dependents.map((d) => ({ from: conceptId, to: d.concept.id })),
    ];

    return NextResponse.json({
      data: { chains: chainNames, nodes, edges },
    });
  }

  // 파라미터 없으면 체인 목록만 반환
  return NextResponse.json({
    data: { chains: chainNames, nodes: [], edges: [] },
  });
}

function gradeToLabel(grade: string | null): string {
  if (!grade) return '';
  const map: Record<string, string> = {
    elementary_3: '초3', elementary_4: '초4', elementary_5: '초5', elementary_6: '초6',
    middle_1: '중1', middle_2: '중2', middle_3: '중3',
    high_1: '고-공통1', high_2: '고-공통2', high_algebra: '고-대수',
    high_calculus1: '고-미적I', high_prob: '고-확통', high_calculus2: '고-미적II', high_geo: '고-기하',
  };
  return map[grade] ?? grade;
}
