-- 참조 0건·행 0건이던 패턴 분류 체계 5개 테이블 제거 (2026-08-31)
--
-- 배경: 기출분석 전용화로 배치 추출 스케줄러와 "오답 패턴 분류 체계"(대분류→유형)가
-- 통째로 사문화됐다. 5개 테이블 모두 코드 참조 0건 + 실제 행 0건임을 확인하고 제거한다.
--
--   ExamExtractSchedule       배치 추출 스케줄 (Vercel Cron 폐지와 함께 사문화)
--   ExamProblemCategory       문제 대분류        ┐ Category ← Type 계층
--   ExamProblemType           문제 유형          ┘
--   ExamPatternExample        패턴 예시 (patternId 에 FK 없는 고아 테이블)
--   ExamPatternMatchHistory   패턴 매칭 이력
--
-- 남기는 것: ExamErrorPattern · ExamPromptTemplate — 둘 다 행은 0이지만 **살아 있는 코드가
-- 조회한다**(math/english prompt-builder, /api/exam-analysis/templates). 건드리지 않는다.
--
-- ⚠️ 부수 변경: ExamErrorPattern."problemTypeId" 칼럼을 함께 제거한다.
--   ExamProblemType 이 사라지면 이 FK 가 가리킬 곳이 없다. 실 사용부는
--   name·errorType·frequency·feedbackMessage·description 스칼라만 select 하므로 영향 없음.
--   (사전 확인: ExamErrorPattern 총 0행, problemTypeId 채워진 행 0건)
--
-- ⚠️ prisma db push 금지: 이 DB 의 public 스키마에는 schema.prisma 밖 테이블 16개
--   (lab_* 14, parax_* 2)가 있어 push 하면 43행이 날아간다. 반드시 이 파일처럼 개별 SQL 로.
--
-- 멱등 — 재실행 안전.

BEGIN;

-- ① 살아 있는 테이블에서 죽은 테이블을 가리키던 FK 칼럼 먼저 제거
--    (칼럼을 지우면 FK 제약과 인덱스도 함께 사라진다)
ALTER TABLE "ExamErrorPattern" DROP COLUMN IF EXISTS "problemTypeId";

-- ② 자식 → 부모 순으로 제거. CASCADE 를 쓰지 않는다 —
--    예상 못 한 참조가 있으면 조용히 지우지 말고 에러를 내야 한다.
DROP TABLE IF EXISTS "ExamPatternMatchHistory";
DROP TABLE IF EXISTS "ExamPatternExample";
DROP TABLE IF EXISTS "ExamExtractSchedule";
DROP TABLE IF EXISTS "ExamProblemType";
DROP TABLE IF EXISTS "ExamProblemCategory";

COMMIT;
