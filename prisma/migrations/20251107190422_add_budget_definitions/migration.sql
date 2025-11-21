/*
  Warnings:

  - You are about to drop the `BudgetAllocation` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,categoryId,startDate,endDate]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `categoryId` to the `Budget` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."BudgetAllocation" DROP CONSTRAINT "BudgetAllocation_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BudgetAllocation" DROP CONSTRAINT "BudgetAllocation_categoryId_fkey";

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "categoryId" UUID NOT NULL,
ADD COLUMN     "definitionId" UUID;

-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "budgetPeriodicity" "BudgetPeriodicity" NOT NULL DEFAULT 'MONTHLY';

-- DropTable
DROP TABLE "public"."BudgetAllocation";

-- CreateTable
CREATE TABLE "BudgetDefinition" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "name" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "carryover" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(6),

    CONSTRAINT "BudgetDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetDefinition_userId_idx" ON "BudgetDefinition"("userId");

-- CreateIndex
CREATE INDEX "BudgetDefinition_categoryId_idx" ON "BudgetDefinition"("categoryId");

-- CreateIndex
CREATE INDEX "BudgetDefinition_isActive_idx" ON "BudgetDefinition"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetDefinition_userId_categoryId_period_key" ON "BudgetDefinition"("userId", "categoryId", "period");

-- CreateIndex
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");

-- CreateIndex
CREATE INDEX "Budget_definitionId_idx" ON "Budget"("definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_startDate_endDate_key" ON "Budget"("userId", "categoryId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "BudgetDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetDefinition" ADD CONSTRAINT "BudgetDefinition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetDefinition" ADD CONSTRAINT "BudgetDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
