import { createGridHandler } from '@/lib/api/homework-grid';
import { getQuestionHomeworkGrid } from '@/lib/services/question-homework';

/** GET: 문제 숙제 그리드 데이터 */
export const GET = createGridHandler(getQuestionHomeworkGrid);
