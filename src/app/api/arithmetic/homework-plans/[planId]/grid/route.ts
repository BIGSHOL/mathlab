import { createGridHandler } from '@/lib/api/homework-grid';
import { getHomeworkGrid } from '@/lib/services/homework';

/** GET: 연산 숙제 그리드 데이터 */
export const GET = createGridHandler(getHomeworkGrid, 'planId');
