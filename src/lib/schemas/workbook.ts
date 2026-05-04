import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// Enum 스키마 (Prisma enum과 1:1 매칭)
// ─────────────────────────────────────────────────────────────────

export const workbookKindSchema = z.enum([
  'TEST_PAPER',
  'QUESTION',
  'ARITHMETIC_DAY',
  'CONCEPT_DOC',
  'EXAM_PAPER',
  'HOMEWORK_DAY',
  'OX_BUNDLE',
]);

export const answerSpaceSizeSchema = z.enum(['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE']);

export const printTemplateSchema = z.enum([
  'default',
  'exam',
  'large',
  'minimal',
  'csat',
  'classic',
  'notebook',
  'formal',
  'bubble',
]);

// ─────────────────────────────────────────────────────────────────
// PrintOptions — tests/[id]/print과 호환
// ─────────────────────────────────────────────────────────────────

export const printOptionsSchema = z.object({
  template: printTemplateSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '#RRGGBB 형식이어야 합니다'),
  columns: z.union([z.literal(1), z.literal(2)]),
  spacing: z.number().int().min(0).max(200),
  showAnswers: z.boolean(),
  quickAnswerOnly: z.boolean(),
  showDate: z.boolean(),
  showChapter: z.boolean(),
  showDifficulty: z.boolean(),
  showDivider: z.boolean(),
});

export type PrintOptionsInput = z.infer<typeof printOptionsSchema>;

// ─────────────────────────────────────────────────────────────────
// Workbook 메타정보
// ─────────────────────────────────────────────────────────────────

export const workbookMetaSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요').max(200),
  subtitle: z.string().max(200).optional().nullable(),
  studentLabel: z.string().max(100).optional().nullable(),
  semesterLabel: z.string().max(50).optional().nullable(),
  academyName: z.string().max(100).optional().nullable(),
  ownerName: z.string().max(50).optional().nullable(),
  defaultAnswerSpace: answerSpaceSizeSchema.default('MEDIUM'),
  separateAnswerKey: z.boolean().default(true),
  showToc: z.boolean().default(true),
  showCover: z.boolean().default(true),
});

// ─────────────────────────────────────────────────────────────────
// 폴리모픽 무결성 — kind별 필수 FK 매핑
// DB가 enforce 못하므로 Zod refine으로 강제
// ─────────────────────────────────────────────────────────────────

const ALL_FK_FIELDS = [
  'questionId',
  'testId',
  'arithmeticPlanId',
  'arithmeticDayIndex',
  'homeworkPlanId',
  'homeworkDayIndex',
  'conceptId',
  'examPaperId',
] as const;

const KIND_REQUIRED_FK: Record<z.infer<typeof workbookKindSchema>, readonly (typeof ALL_FK_FIELDS)[number][]> = {
  TEST_PAPER: ['testId'],
  QUESTION: ['questionId'],
  ARITHMETIC_DAY: ['arithmeticPlanId', 'arithmeticDayIndex'],
  HOMEWORK_DAY: ['homeworkPlanId', 'homeworkDayIndex'],
  CONCEPT_DOC: ['conceptId'],
  EXAM_PAPER: ['examPaperId'],
  OX_BUNDLE: [], // FK 없음 — inlineData.statementIds 사용
};

/** OX_BUNDLE inlineData 검증 — workbookItemInputSchema에서 kind === 'OX_BUNDLE'일 때 적용 */
export const oxBundleInlineDataSchema = z.object({
  category: z.string().min(1),
  level: z.enum(['easy', 'medium', 'hard']),
  questionTypes: z.array(z.string()).optional(),
  statementIds: z.array(z.string()).min(1).max(100),
  count: z.number().int().min(1).max(100),
});

export type OxBundleInlineData = z.infer<typeof oxBundleInlineDataSchema>;

const itemFkFieldsSchema = z.object({
  questionId: z.string().nullable().optional(),
  testId: z.string().nullable().optional(),
  arithmeticPlanId: z.string().nullable().optional(),
  arithmeticDayIndex: z.number().int().min(0).nullable().optional(),
  homeworkPlanId: z.string().nullable().optional(),
  homeworkDayIndex: z.number().int().min(0).nullable().optional(),
  conceptId: z.string().nullable().optional(),
  examPaperId: z.string().nullable().optional(),
});

/**
 * kind에 맞는 필수 FK가 모두 채워졌고, 그 외 FK는 모두 null/undefined여야 한다.
 * 이 검증은 DB 레벨에서 강제할 수 없으므로 모든 쓰기 경로에서 필수.
 */
function refinePolymorphicFk<T extends { kind: z.infer<typeof workbookKindSchema> } & z.infer<typeof itemFkFieldsSchema>>(
  item: T,
): boolean {
  const required = KIND_REQUIRED_FK[item.kind];
  for (const f of required) {
    if (item[f] == null) return false;
  }
  for (const f of ALL_FK_FIELDS) {
    if (!required.includes(f) && item[f] != null) return false;
  }
  return true;
}

const POLYMORPHIC_FK_MESSAGE = 'kind에 맞는 FK 한 종류만 정확히 채워져야 합니다';

// ─────────────────────────────────────────────────────────────────
// WorkbookSectionItem — 단일 아이템 (장바구니 추가, 위자드 draft)
// ─────────────────────────────────────────────────────────────────

const itemBaseFields = {
  kind: workbookKindSchema,
  ...itemFkFieldsSchema.shape,
  inlineData: z.record(z.unknown()).nullable().optional(),
  answerSpace: answerSpaceSizeSchema.default('MEDIUM'),
  customLabel: z.string().max(200).nullable().optional(),
  hideQuestionNum: z.boolean().default(false),
};

export const workbookItemInputSchema = z.object({
  ...itemBaseFields,
  sectionId: z.string().optional(), // 미지정 시 첫 섹션 또는 새 섹션
}).refine(refinePolymorphicFk, { message: POLYMORPHIC_FK_MESSAGE });

export const workbookItemUpdateSchema = z.object({
  answerSpace: answerSpaceSizeSchema.optional(),
  customLabel: z.string().max(200).nullable().optional(),
  hideQuestionNum: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ─────────────────────────────────────────────────────────────────
// WorkbookSection
// ─────────────────────────────────────────────────────────────────

export const workbookSectionInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  startNewPage: z.boolean().default(true),
  sortOrder: z.number().int().min(0).optional(),
  /** 1 또는 2 — null이면 워크북 전역 columns 따름 */
  columnsOverride: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
});

export const workbookSectionsBulkSchema = z.object({
  sections: z.array(workbookSectionInputSchema).min(1).max(100),
});

// ─────────────────────────────────────────────────────────────────
// Workbook 생성 (위자드 최종 저장)
// ─────────────────────────────────────────────────────────────────

export const createWorkbookSchema = workbookMetaSchema.extend({
  printPreset: printOptionsSchema,
  /** 즉시 채울 초기 아이템 (선택) — 장바구니 일괄 생성용 */
  sourceItems: z.array(z.object({
    sectionTitle: z.string().min(1).max(200),
    items: z.array(z.object(itemBaseFields).refine(refinePolymorphicFk, { message: POLYMORPHIC_FK_MESSAGE })).min(1),
  })).optional(),
});

export const updateWorkbookSchema = workbookMetaSchema.partial().extend({
  printPreset: printOptionsSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────
// Items 재정렬 (drag-drop) — 후속 PR에서 /reorder API와 함께 사용 예정.
// 현재는 정의만 유지하여 외부 사용처/테스트 호환성 확보.
// ─────────────────────────────────────────────────────────────────

export const reorderItemsSchema = z.object({
  orders: z.array(z.object({
    itemId: z.string().min(1),
    sectionId: z.string().min(1),
    sortOrder: z.number().int().min(0),
  })).min(1).max(500),
});

// ─────────────────────────────────────────────────────────────────
// 페이지 추정 캐시
// ─────────────────────────────────────────────────────────────────

export const pageEstimatesSchema = z.object({
  estimates: z.record(z.string(), z.number().int().min(1)),
});

// ─────────────────────────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────────────────────────

export const workbookListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  recent: z.coerce.number().int().min(1).max(50).optional(),
});

// ─────────────────────────────────────────────────────────────────
// 타입 export
// ─────────────────────────────────────────────────────────────────

export type WorkbookKindInput = z.infer<typeof workbookKindSchema>;
export type AnswerSpaceSizeInput = z.infer<typeof answerSpaceSizeSchema>;
export type WorkbookItemInput = z.infer<typeof workbookItemInputSchema>;
export type WorkbookSectionInput = z.infer<typeof workbookSectionInputSchema>;
export type CreateWorkbookInput = z.infer<typeof createWorkbookSchema>;
export type UpdateWorkbookInput = z.infer<typeof updateWorkbookSchema>;
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;
export type PageEstimatesInput = z.infer<typeof pageEstimatesSchema>;
export type WorkbookListQuery = z.infer<typeof workbookListQuerySchema>;

/** 외부 노출용 — 단위 테스트에서 사용 */
export { KIND_REQUIRED_FK, ALL_FK_FIELDS };
