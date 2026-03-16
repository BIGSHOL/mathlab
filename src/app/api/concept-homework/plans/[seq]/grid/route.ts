import { createGridHandler } from '@/lib/api/homework-grid';
import { getConceptHomeworkGrid } from '@/lib/services/concept-homework';

/** GET: 개념 숙제 그리드 데이터 */
export const GET = createGridHandler(getConceptHomeworkGrid);
