-- Add financial profile JSON column to households
ALTER TABLE "Household"
ADD COLUMN "financial_profile" JSONB NOT NULL DEFAULT '{}'::jsonb;

