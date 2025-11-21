/*
  Warnings:

  - You are about to drop the column `carryover` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `carryover` on the `BudgetDefinition` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "carryover";

-- AlterTable
ALTER TABLE "BudgetDefinition" DROP COLUMN "carryover";
