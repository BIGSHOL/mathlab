-- Add analyzedBy to ExamAnalysis (분석 실행자)
ALTER TABLE "ExamAnalysis" ADD COLUMN IF NOT EXISTS "analyzedBy" TEXT;
CREATE INDEX IF NOT EXISTS "ExamAnalysis_analyzedBy_idx" ON "ExamAnalysis"("analyzedBy");
DO $$ BEGIN
  ALTER TABLE "ExamAnalysis" ADD CONSTRAINT "ExamAnalysis_analyzedBy_fkey"
    FOREIGN KEY ("analyzedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Add lastRunBy, lastRunAt to ExamAnalysisExtension (agent 마지막 실행자)
ALTER TABLE "ExamAnalysisExtension" ADD COLUMN IF NOT EXISTS "lastRunBy" TEXT;
ALTER TABLE "ExamAnalysisExtension" ADD COLUMN IF NOT EXISTS "lastRunAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "ExamAnalysisExtension_lastRunBy_idx" ON "ExamAnalysisExtension"("lastRunBy");
DO $$ BEGIN
  ALTER TABLE "ExamAnalysisExtension" ADD CONSTRAINT "ExamAnalysisExtension_lastRunBy_fkey"
    FOREIGN KEY ("lastRunBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
