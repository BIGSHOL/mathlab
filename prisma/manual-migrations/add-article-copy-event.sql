-- ArticleCopyEvent: 블로그 글 "서식 복사" 이벤트 append-only 로그
CREATE TABLE IF NOT EXISTS "ArticleCopyEvent" (
  "id"          TEXT NOT NULL,
  "examPaperId" TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "copiedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ArticleCopyEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ArticleCopyEvent_examPaperId_idx" ON "ArticleCopyEvent"("examPaperId");
CREATE INDEX IF NOT EXISTS "ArticleCopyEvent_userId_idx" ON "ArticleCopyEvent"("userId");
CREATE INDEX IF NOT EXISTS "ArticleCopyEvent_copiedAt_idx" ON "ArticleCopyEvent"("copiedAt");

DO $$ BEGIN
  ALTER TABLE "ArticleCopyEvent" ADD CONSTRAINT "ArticleCopyEvent_examPaperId_fkey"
    FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ArticleCopyEvent" ADD CONSTRAINT "ArticleCopyEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
