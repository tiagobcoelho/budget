-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "duplicateOfTransactionId" UUID;

-- CreateIndex
CREATE INDEX "Transaction_duplicateOfTransactionId_idx" ON "Transaction"("duplicateOfTransactionId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_duplicateOfTransactionId_fkey" FOREIGN KEY ("duplicateOfTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

