-- CreateEnum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "BudgetPeriodicity" AS ENUM ('WEEKLY', 'MONTHLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DropForeignKey (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BudgetAllocation') THEN
        ALTER TABLE "BudgetAllocation" DROP CONSTRAINT IF EXISTS "BudgetAllocation_budgetId_fkey";
        ALTER TABLE "BudgetAllocation" DROP CONSTRAINT IF EXISTS "BudgetAllocation_categoryId_fkey";
    END IF;
END $$;

-- DropTable (drop BudgetAllocation table first)
DROP TABLE IF EXISTS "BudgetAllocation";

-- Delete existing budgets since they don't have categoryId (no clients yet per user)
-- Only if the Budget table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Budget') THEN
        DELETE FROM "Budget";
    END IF;
END $$;

-- AlterTable (add categoryId to Budget)
-- Only if the Budget table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Budget') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Budget' AND column_name = 'categoryId') THEN
            ALTER TABLE "Budget" ADD COLUMN "categoryId" UUID;
            -- Update existing budgets with a default category if any exist (shouldn't happen after DELETE, but just in case)
            UPDATE "Budget" SET "categoryId" = (SELECT id FROM "Category" WHERE "type" = 'EXPENSE' LIMIT 1) WHERE "categoryId" IS NULL;
            -- Now make it NOT NULL
            ALTER TABLE "Budget" ALTER COLUMN "categoryId" SET NOT NULL;
        END IF;
    END IF;
END $$;

-- AddForeignKey (only if it doesn't exist and Budget table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Budget') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Budget_categoryId_fkey') THEN
            ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- CreateIndex (only if it doesn't exist and Budget table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Budget') THEN
        CREATE INDEX IF NOT EXISTS "Budget_categoryId_idx" ON "Budget"("categoryId");
        DROP INDEX IF EXISTS "Budget_userId_idx";
        DROP INDEX IF EXISTS "Budget_period_startDate_endDate_idx";
        CREATE INDEX IF NOT EXISTS "Budget_userId_idx" ON "Budget"("userId");
        CREATE INDEX IF NOT EXISTS "Budget_period_startDate_endDate_idx" ON "Budget"("period", "startDate", "endDate");
        DROP INDEX IF EXISTS "Budget_userId_categoryId_startDate_endDate_key";
        CREATE UNIQUE INDEX "Budget_userId_categoryId_startDate_endDate_key" ON "Budget"("userId", "categoryId", "startDate", "endDate");
    END IF;
END $$;

-- AlterTable (add budgetPeriodicity to UserPreference with default)
-- Only if UserPreference table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'UserPreference') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserPreference' AND column_name = 'budgetPeriodicity') THEN
            ALTER TABLE "UserPreference" ADD COLUMN "budgetPeriodicity" "BudgetPeriodicity" NOT NULL DEFAULT 'MONTHLY';
        END IF;
    END IF;
END $$;

