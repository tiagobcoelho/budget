/*
  Warnings:

  - You are about to drop the column `userId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `BudgetDefinition` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Report` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Transaction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[householdId,categoryId,startDate,endDate]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[householdId,categoryId,period]` on the table `BudgetDefinition` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[householdId,name,type]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[householdId,period,startDate,endDate]` on the table `Report` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `householdId` to the `Account` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Budget` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `BudgetDefinition` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdByUserId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `householdId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('OWNER', 'MEMBER');

-- DropForeignKey
ALTER TABLE "public"."Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Budget" DROP CONSTRAINT "Budget_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BudgetDefinition" DROP CONSTRAINT "BudgetDefinition_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Report" DROP CONSTRAINT "Report_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_userId_fkey";

-- DropIndex
DROP INDEX "public"."Account_userId_idx";

-- DropIndex
DROP INDEX "public"."Budget_userId_categoryId_startDate_endDate_key";

-- DropIndex
DROP INDEX "public"."Budget_userId_idx";

-- DropIndex
DROP INDEX "public"."BudgetDefinition_userId_categoryId_period_key";

-- DropIndex
DROP INDEX "public"."BudgetDefinition_userId_idx";

-- DropIndex
DROP INDEX "public"."Category_userId_idx";

-- DropIndex
DROP INDEX "public"."Category_userId_name_type_key";

-- DropIndex
DROP INDEX "public"."Report_userId_period_startDate_endDate_key";

-- DropIndex
DROP INDEX "public"."Report_userId_startDate_endDate_idx";

-- DropIndex
DROP INDEX "public"."Subscription_userId_idx";

-- DropIndex
DROP INDEX "public"."Transaction_userId_occurredAt_idx";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "userId",
ADD COLUMN     "householdId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "userId",
ADD COLUMN     "householdId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "BudgetDefinition" DROP COLUMN "userId",
ADD COLUMN     "householdId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "userId",
ADD COLUMN     "householdId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "userId",
ADD COLUMN     "householdId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "userId",
ADD COLUMN     "householdId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "userId",
ADD COLUMN     "createdByUserId" UUID NOT NULL,
ADD COLUMN     "householdId" UUID NOT NULL;

-- CreateTable
CREATE TABLE "Household" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "seatLimit" INTEGER NOT NULL DEFAULT 1,
    "stripeCustomerId" VARCHAR(255),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" UUID NOT NULL,
    "householdId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "HouseholdRole" NOT NULL DEFAULT 'MEMBER',
    "invitedAt" TIMESTAMP(6),
    "joinedAt" TIMESTAMP(6),

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Household_seatLimit_idx" ON "Household"("seatLimit");

-- CreateIndex
CREATE INDEX "HouseholdMember_userId_idx" ON "HouseholdMember"("userId");

-- CreateIndex
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_householdId_userId_key" ON "HouseholdMember"("householdId", "userId");

-- CreateIndex
CREATE INDEX "Account_householdId_idx" ON "Account"("householdId");

-- CreateIndex
CREATE INDEX "Budget_householdId_idx" ON "Budget"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_householdId_categoryId_startDate_endDate_key" ON "Budget"("householdId", "categoryId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "BudgetDefinition_householdId_idx" ON "BudgetDefinition"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetDefinition_householdId_categoryId_period_key" ON "BudgetDefinition"("householdId", "categoryId", "period");

-- CreateIndex
CREATE INDEX "Category_householdId_idx" ON "Category"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_householdId_name_type_key" ON "Category"("householdId", "name", "type");

-- CreateIndex
CREATE INDEX "Report_householdId_startDate_endDate_idx" ON "Report"("householdId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Report_householdId_period_startDate_endDate_key" ON "Report"("householdId", "period", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Subscription_householdId_idx" ON "Subscription"("householdId");

-- CreateIndex
CREATE INDEX "Transaction_householdId_occurredAt_idx" ON "Transaction"("householdId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_createdByUserId_idx" ON "Transaction"("createdByUserId");

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetDefinition" ADD CONSTRAINT "BudgetDefinition_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
