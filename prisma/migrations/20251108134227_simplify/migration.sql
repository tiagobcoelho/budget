/*
  Warnings:

  - You are about to drop the column `budgetPeriodicity` on the `UserPreference` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserPreference" DROP COLUMN "budgetPeriodicity",
ADD COLUMN     "budgetStartDay" INTEGER NOT NULL DEFAULT 1;

-- DropEnum
DROP TYPE "public"."BudgetPeriodicity";
