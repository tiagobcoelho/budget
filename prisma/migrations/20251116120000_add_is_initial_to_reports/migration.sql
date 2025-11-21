-- Add isInitial flag to Report and index
ALTER TABLE "Report" ADD COLUMN "isInitial" boolean NOT NULL DEFAULT false;
CREATE INDEX "Report_isInitial_idx" ON "Report"("isInitial");


