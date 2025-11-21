-- CreateEnum
CREATE TYPE "ReportPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "period" "ReportPeriod" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "insights" TEXT,
    "recommendations" TEXT,
    "metrics" JSONB,
    "categoryBreakdown" JSONB,
    "accountBreakdown" JSONB,
    "timeSeries" JSONB,
    "topTransactions" JSONB,
    "budgetComparison" JSONB,
    "budgetSuggestions" JSONB,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_userId_startDate_endDate_idx" ON "Report"("userId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_period_idx" ON "Report"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Report_userId_period_startDate_endDate_key" ON "Report"("userId", "period", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
