-- ─────────────────────────────────────────────────────────────
-- questionIds/dailyQuestions Json 컬럼 제거 마이그레이션
-- 2026-04-29
--
-- 배경: Test/QuizSession/QuestionHomeworkPlan 모델의 Json 컬럼이
-- TestQuestion/QuizSessionQuestion/HomeworkQuestion 중간테이블로
-- 완전 단일화됨. Prisma schema에서 이미 제거됨.
--
-- 실행 방법 (둘 중 택1):
--   A) 자동 (권장): `npx prisma db push`
--      - schema.prisma와 DB를 자동 동기화하여 ALTER TABLE 자동 실행
--   B) 수동: 본 SQL 파일을 직접 실행
--      psql $DATABASE_URL -f scripts/drop-question-ids-json.sql
-- ─────────────────────────────────────────────────────────────

BEGIN;

-- 1. Test.questionIds Json 컬럼 제거
ALTER TABLE "Test" DROP COLUMN IF EXISTS "questionIds";

-- 2. QuizSession.questionIds Json 컬럼 제거
ALTER TABLE "QuizSession" DROP COLUMN IF EXISTS "questionIds";

-- 3. QuestionHomeworkPlan.dailyQuestions Json 컬럼 제거
ALTER TABLE "QuestionHomeworkPlan" DROP COLUMN IF EXISTS "dailyQuestions";

COMMIT;

-- 검증: 다음 쿼리로 컬럼이 제거됐는지 확인
-- \d "Test"
-- \d "QuizSession"
-- \d "QuestionHomeworkPlan"
