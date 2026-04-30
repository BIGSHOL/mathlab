import { prisma } from '@/lib/db';
import type { AnswerSpaceSize, WorkbookSectionItem } from '@prisma/client';
import type { NormalizedItem } from '../types';

/**
 * OX 묶음 — `inlineData.statementIds[]`로 OxStatement 조회 후 N개 NormalizedItem로 펼침.
 *
 * 워크북 스타일:
 *  - displayNumber: 섹션 내 4자리 (0001, 0002, ...) 또는 customLabel 사용
 *  - answerSpace: 보통 NONE (줄 끝 `( )` 답란이 별도 풀이공간 역할)
 *  - questionType: 'OX_BUNDLE' 마커로 SectionContentPages가 OxBundleBlock 렌더하도록
 *
 * 안전 폴백: isActive=false 처리된 진술은 자동 제외 (graceful degradation).
 */
export async function expandOxBundleItem(
  item: Pick<WorkbookSectionItem, 'id' | 'inlineData' | 'answerSpace' | 'hideQuestionNum' | 'customLabel'>,
  positionInSection: number,
): Promise<NormalizedItem[]> {
  const data = item.inlineData as { statementIds?: string[] } | null;
  if (!data?.statementIds?.length) return [];

  const statements = await prisma.oxStatement.findMany({
    where: { id: { in: data.statementIds }, isActive: true },
  });
  if (statements.length === 0) return [];

  // statementIds 순서 보존 (DB findMany 순서 비결정적)
  const byId = new Map(statements.map((s) => [s.id, s]));
  const ordered = data.statementIds
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return ordered.map((s, idx) => {
    const num = positionInSection + idx + 1;
    return {
      itemId: `${item.id}::${s.id}`,
      kind: 'OX_BUNDLE' as const,
      displayNumber: item.hideQuestionNum
        ? ''
        : (item.customLabel
            ? `${item.customLabel}-${idx + 1}`
            : String(num).padStart(4, '0')),
      answerSpace: item.answerSpace as AnswerSpaceSize,
      questionContent: s.content,
      answer: s.answer,
      explanation: s.explanation ?? undefined,
      questionType: 'OX_BUNDLE',
      // OxBundleBlock에서 필요한 메타: 진술 메타데이터 보존
      difficulty: s.level,
    };
  });
}
