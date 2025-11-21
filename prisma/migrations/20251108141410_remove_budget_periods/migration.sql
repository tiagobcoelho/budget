/*
  Warnings:

  - You are about to drop the column `period` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `BudgetDefinition` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[householdId,categoryId]` on the table `BudgetDefinition` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Budget_period_startDate_endDate_idx";

-- DropIndex
DROP INDEX "public"."BudgetDefinition_householdId_categoryId_period_key";

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "period";

-- AlterTable
ALTER TABLE "BudgetDefinition" DROP COLUMN "period";

-- DropEnum
DROP TYPE "public"."BudgetPeriod";

-- CreateIndex
CREATE INDEX "Budget_startDate_endDate_idx" ON "Budget"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetDefinition_householdId_categoryId_key" ON "BudgetDefinition"("householdId", "categoryId");
