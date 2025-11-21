/*
  Warnings:

  - You are about to drop the column `accountBreakdown` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `budgetComparison` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `budgetSuggestions` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `categoryBreakdown` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `insights` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `metrics` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `recommendations` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `timeSeries` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `topTransactions` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "accountBreakdown",
DROP COLUMN "budgetComparison",
DROP COLUMN "budgetSuggestions",
DROP COLUMN "categoryBreakdown",
DROP COLUMN "insights",
DROP COLUMN "metrics",
DROP COLUMN "recommendations",
DROP COLUMN "summary",
DROP COLUMN "timeSeries",
DROP COLUMN "topTransactions",
ADD COLUMN     "data" JSONB;
