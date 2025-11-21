import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { PDFDocument } from 'pdf-lib'

const model = anthropic('claude-sonnet-4-5-20250929')

// Schema for a single extracted transaction
const extractedTransactionSchema = z.object({
  type: z.enum(['EXPENSE', 'INCOME', 'TRANSFER']),
  amount: z.number().positive(),
  occurredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in ISO format YYYY-MM-DD'), // ISO date string
  description: z.string().min(1, 'Description is required'), // Required description
  note: z.string().optional(),
  categoryId: z.string().uuid().nullable().optional(), // null or undefined if no match (not used for TRANSFER)
  fromAccountId: z.string().uuid().nullable().optional(), // Used for EXPENSE and TRANSFER
  toAccountId: z.string().uuid().nullable().optional(), // Used for INCOME and TRANSFER
  possibleDuplicate: z.boolean().optional(),
})
const duplicateDetectionSchema = z.object({
  duplicates: z
    .array(
      z.object({
        duplicateId: z.string(),
        originalId: z.string(),
        reason: z.string().optional(),
      })
    )
    .optional()
    .default([]),
})

const CURRENT_YEAR = new Date().getFullYear()

// Schema for the array of transactions
const transactionsArraySchema = z.object({
  transactions: z.array(extractedTransactionSchema),
})

type ExtractedTransactionBase = z.infer<typeof extractedTransactionSchema>

type DuplicateSummary = {
  description: string
  amount: number
  occurredAt: string
}

type DuplicateLink = {
  duplicateId: string
  originalId: string
  reason?: string
}

export type ExtractedTransaction = ExtractedTransactionBase & {
  tempId?: string
  duplicateOfId?: string
  duplicateOfSummary?: DuplicateSummary
  duplicateReason?: string
}

export type DuplicateCheckTransaction = {
  id: string
  occurredAt: string | Date
  amount: number
  description: string | null
  possibleDuplicate?: boolean | null
}

type DuplicateCheckOptions = {
  existingTransactions?: DuplicateCheckTransaction[]
}

type TransactionSource = 'new' | 'existing'

type ComparableTransactionSummary = {
  id: string
  source: TransactionSource
  occurredAt: string
  amount: number
  description: string
  normalizedDescription: string
  normalizedAmount: number
  order: number
}

type HeuristicDuplicateResult = {
  links: DuplicateLink[]
  diagnostics: Array<{
    duplicateId: string
    originalId: string
    reason: string
  }>
}

/**
 * Validates that a transaction is complete and properly formatted
 */
function isValidTransaction(
  transaction: unknown
): transaction is ExtractedTransaction {
  if (!transaction || typeof transaction !== 'object') {
    return false
  }

  const t = transaction as Record<string, unknown>

  if (!t.type || !t.amount || !t.occurredAt) {
    return false
  }

  // Validate date is a complete ISO date (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (typeof t.occurredAt !== 'string' || !dateRegex.test(t.occurredAt)) {
    return false
  }

  // Validate date is actually a valid date
  const date = new Date(t.occurredAt)
  if (isNaN(date.getTime())) {
    return false
  }

  // Validate amount is a positive number
  if (typeof t.amount !== 'number' || t.amount <= 0) {
    return false
  }

  // Description is required (per our updated prompt)
  // Also ensure it's not too short (likely truncated)
  if (
    !t.description ||
    typeof t.description !== 'string' ||
    t.description.trim() === '' ||
    t.description.trim().length < 3
  ) {
    return false
  }

  return true
}

/**
 * Splits a PDF into individual page buffers using pdf-lib
 * @param pdfBuffer - Full PDF buffer
 * @returns Array of PDF buffers, one per page
 */
export async function splitPDFIntoPages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pageCount = pdfDoc.getPageCount()
    const pageBuffers: Buffer[] = []

    for (let i = 0; i < pageCount; i++) {
      // Create a new PDF with just this page
      const newPdf = await PDFDocument.create()
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i])
      newPdf.addPage(copiedPage)

      const pdfBytes = await newPdf.save()
      pageBuffers.push(Buffer.from(pdfBytes))
    }

    return pageBuffers
  } catch (error) {
    console.error('Error splitting PDF into pages:', error)
    throw new Error('Failed to split PDF into pages')
  }
}

function buildComparableSummaries(
  transactions: ExtractedTransaction[],
  existingTransactions: DuplicateCheckTransaction[] | undefined
): {
  summaries: ComparableTransactionSummary[]
  summaryById: Map<string, ComparableTransactionSummary>
} {
  let orderCounter = 0

  const existingSummaries =
    existingTransactions?.map((transaction) => ({
      id: transaction.id,
      source: 'existing' as TransactionSource,
      occurredAt: normalizeDateValue(transaction.occurredAt),
      amount: Number(transaction.amount),
      description: transaction.description ?? '',
      normalizedDescription: normalizeDescription(
        transaction.description ?? ''
      ),
      normalizedAmount: normalizeAmount(transaction.amount),
      order: orderCounter++,
    })) ?? []

  const newSummaries = transactions.map((transaction) => ({
    id: transaction.tempId!,
    source: 'new' as TransactionSource,
    occurredAt: normalizeDateValue(transaction.occurredAt),
    amount: Number(transaction.amount),
    description: transaction.description ?? '',
    normalizedDescription: normalizeDescription(transaction.description ?? ''),
    normalizedAmount: normalizeAmount(transaction.amount),
    order: orderCounter++,
  }))

  const summaries = [...existingSummaries, ...newSummaries]
  const summaryById = new Map(summaries.map((summary) => [summary.id, summary]))

  return { summaries, summaryById }
}

function findLocalDuplicateLinks(
  summaries: ComparableTransactionSummary[]
): HeuristicDuplicateResult {
  const groups = new Map<string, ComparableTransactionSummary[]>()

  for (const summary of summaries) {
    const key = `${summary.occurredAt}|${summary.normalizedAmount}|${summary.normalizedDescription}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(summary)
  }

  const links: DuplicateLink[] = []
  const diagnostics: HeuristicDuplicateResult['diagnostics'] = []

  for (const group of groups.values()) {
    if (group.length < 2) continue

    const canonical = group.reduce<ComparableTransactionSummary | null>(
      (best, candidate) => {
        if (!best) return candidate
        if (candidate.source === 'existing' && best.source !== 'existing') {
          return candidate
        }
        if (candidate.source === best.source && candidate.order < best.order) {
          return candidate
        }
        return best
      },
      null
    )

    if (!canonical) continue

    for (const candidate of group) {
      if (candidate.id === canonical.id) continue
      if (candidate.source !== 'new') continue

      const reason = `Matches ${canonical.description || 'another transaction'} on ${canonical.occurredAt} for €${canonical.amount.toFixed(2)}`
      const link: DuplicateLink = {
        duplicateId: candidate.id,
        originalId: canonical.id,
        reason,
      }
      links.push(link)
      diagnostics.push({
        duplicateId: candidate.id,
        originalId: canonical.id,
        reason,
      })
    }
  }

  return { links, diagnostics }
}

function normalizeDescription(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 120)
}

function normalizeAmount(value: number | string): number {
  const numeric = typeof value === 'string' ? parseFloat(value) : value
  return Math.round(Number(numeric) * 100) / 100
}

function normalizeDateValue(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  const date = new Date(value)
  return date.toISOString().slice(0, 10)
}

function applyDuplicateLinks(
  transactions: ExtractedTransaction[],
  links: DuplicateLink[],
  summaryById: Map<string, ComparableTransactionSummary>
) {
  if (links.length === 0) {
    return
  }

  const transactionById = new Map(
    transactions.map((transaction) => [transaction.tempId!, transaction])
  )

  for (const link of links) {
    const transaction = transactionById.get(link.duplicateId)
    if (!transaction) {
      continue
    }

    transaction.possibleDuplicate = true
    transaction.duplicateOfId = link.originalId
    transaction.duplicateReason = link.reason

    const summary = summaryById.get(link.originalId)
    if (summary) {
      transaction.duplicateOfSummary = {
        description: summary.description,
        occurredAt: summary.occurredAt,
        amount: summary.amount,
      }
      if (!transaction.duplicateReason) {
        transaction.duplicateReason = `Matches ${summary.description} on ${summary.occurredAt} for €${summary.amount.toFixed(2)}`
      }
    }
  }
}

/**
 * Builds the category context string for the LLM prompt
 */
function buildCategoryContext(
  categories: Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' }>
): string {
  return categories
    .map((cat) => `- ${cat.id}: ${cat.name} (${cat.type})`)
    .join('\n')
}

/**
 * Builds the account context string for the LLM prompt
 */
function buildAccountContext(
  accounts: Array<{ id: string; name: string; type: string }>
): string {
  return accounts
    .map((acc) => `- ${acc.id}: ${acc.name} (${acc.type})`)
    .join('\n')
}

/**
 * Builds the extraction prompt for the LLM
 */
function buildExtractionPrompt(
  categories: Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' }>,
  accounts: Array<{ id: string; name: string; type: string }>,
  pageNumber?: number,
  totalPages?: number
): string {
  const categoryContext = buildCategoryContext(categories)
  const accountContext = buildAccountContext(accounts)
  const pageInfo =
    pageNumber && totalPages ? ` (Page ${pageNumber} of ${totalPages})` : ''

  return `You are analyzing a bank statement PDF${pageInfo}. Extract all transactions from the statement.

The current calendar year is ${CURRENT_YEAR}. If the document does not explicitly display a year for a date (for example it only shows "JAN 12"), assume the year is ${CURRENT_YEAR}. Only use a different year when the document clearly states it.

For each transaction, you MUST extract:
1. Determine if it's an EXPENSE (money going out) or INCOME (money coming in)
2. Extract the amount (always positive number)
3. Extract the date (convert to ISO format YYYY-MM-DD)
4. Extract the description/merchant name - THIS IS REQUIRED FOR EVERY TRANSACTION
5. Try to match the transaction to one of the user's existing accounts based on similarity (e.g., bank name, account type, account number visible in statement)
6. Try to match the transaction to one of the user's existing categories based on similarity

Available accounts:
${accountContext || 'No accounts available - leave fromAccountId/toAccountId undefined'}

Available categories:
${categoryContext || 'No categories available - leave categoryId undefined'}

IMPORTANT RULES:
- DESCRIPTION IS MANDATORY: Every transaction MUST have a complete, full description field. Extract the ENTIRE merchant name, transaction description, memo, or any identifying text from the statement. Include the complete description text - do not truncate or abbreviate. If the statement shows "STARBUCKS STORE #1234", use the full "STARBUCKS STORE #1234" as the description. If it shows "ACH DEPOSIT SALARY FROM ACME CORP", use the complete text. Never leave description empty, undefined, or truncated.
- CATEGORY MATCHING: For each transaction, carefully analyze the description and try to match it to one of the available categories above. Look for keywords and patterns. For example:
  * "STARBUCKS", "COFFEE", "RESTAURANT", "FOOD" → match to Food & Dining categories
  * "SALARY", "PAYROLL", "DEPOSIT" → match to Income/Salary categories  
  * "GAS", "FUEL", "SHELL", "EXXON" → match to Transportation/Gas categories
  * "AMAZON", "WALMART", "TARGET" → match to Shopping categories
  * "UTILITY", "ELECTRIC", "WATER" → match to Utilities categories
  When you find a reasonable match, include the categoryId. Be more liberal with matching - if there's any reasonable connection, include the categoryId.
- ACCOUNT MATCHING: Match transactions to accounts based on type:
  * For EXPENSE transactions: assign to fromAccountId (money leaving this account)
  * For INCOME transactions: assign to toAccountId (money entering this account)
  * For TRANSFER transactions: assign both fromAccountId and toAccountId (money moving between accounts)
- If you can confidently match a transaction to an account (e.g., statement shows "Chase Checking" matches account named "Chase Checking", or account number/IBAN matches), include the appropriate account field(s)
- If no good account match exists, default to the current / checking account or the account with the most similar bank name or account type.
- All amounts should be positive numbers
- Dates should be in ISO format (YYYY-MM-DD)
- Extract ALL transactions visible in the statement
- For descriptions: include the COMPLETE merchant names, transaction IDs, memo fields, or any text that identifies what the transaction is. Copy the EXACT, FULL text from the statement - never truncate descriptions.
- Ignore header rows, totals, and non-transaction lines`
}

/**
 * Extracts transactions from a single PDF page (non-streaming for better results)
 * @param pageBuffer - PDF buffer for a single page
 * @param categories - Array of user's existing categories to match against
 * @param accounts - Array of user's existing accounts to match against
 * @param pageNumber - Page number (for context)
 * @param totalPages - Total number of pages (for context)
 * @returns Promise that resolves to an array of extracted transactions
 */
export async function extractTransactionsFromVisualPage(
  pageBuffer: Buffer,
  mimeType: string = 'application/pdf',
  categories: Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' }>,
  accounts: Array<{ id: string; name: string; type: string }>,
  pageNumber?: number,
  totalPages?: number,
  duplicateOptions?: DuplicateCheckOptions
): Promise<ExtractedTransaction[]> {
  try {
    // Convert PDF page buffer to base64
    const pageBase64 = pageBuffer.toString('base64')
    const prompt = buildExtractionPrompt(
      categories,
      accounts,
      pageNumber,
      totalPages
    )

    // Use generateObject instead of streamObject for more reliable, complete results
    // The model sees the complete page context and can make better decisions
    const result = await generateObject({
      model,
      schema: transactionsArraySchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image',
              image: `data:${mimeType};base64,${pageBase64}`,
            },
          ],
        },
      ],
    })

    // Return all complete, validated transactions
    const normalizedTransactions = result.object.transactions
      .map((transaction) => ({
        ...transaction,
        categoryId:
          transaction.type === 'TRANSFER'
            ? null
            : (transaction.categoryId ?? undefined),
        fromAccountId: transaction.fromAccountId ?? undefined,
        toAccountId: transaction.toAccountId ?? undefined,
        possibleDuplicate: transaction.possibleDuplicate ?? false,
      }))
      .filter(isValidTransaction) as ExtractedTransaction[]

    const transactionsWithIds = normalizedTransactions.map((transaction) => ({
      ...transaction,
      tempId: transaction.tempId ?? randomUUID(),
    }))

    return await markTransactionsWithPossibleDuplicates(
      transactionsWithIds,
      duplicateOptions
    )
  } catch (error) {
    console.error(
      `Error extracting transactions from page ${pageNumber}:`,
      error
    )
    throw error
  }
}

/**
 * Extracts transactions from all PDF pages, processing pages sequentially
 * and yielding complete page results as they finish
 * @param pdfBuffer - Full PDF buffer
 * @param categories - Array of user's existing categories to match against
 * @param accounts - Array of user's existing accounts to match against
 * @returns Async generator that yields transactions with page info and progress updates
 */
export async function* extractTransactionsFromPDFPages(
  pdfBuffer: Buffer,
  categories: Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' }>,
  accounts: Array<{ id: string; name: string; type: string }>,
  duplicateOptions?: DuplicateCheckOptions
): AsyncGenerator<
  | { type: 'progress'; pageNumber: number; totalPages: number }
  | {
      type: 'transaction'
      transaction: ExtractedTransaction
      pageNumber: number
    },
  void,
  unknown
> {
  try {
    // Split PDF into individual pages
    const pageBuffers = await splitPDFIntoPages(pdfBuffer)
    const totalPages = pageBuffers.length

    if (totalPages === 0) {
      return
    }

    const duplicateContext: DuplicateCheckTransaction[] = [
      ...(duplicateOptions?.existingTransactions ?? []),
    ]

    // Process pages sequentially and yield complete results as each page finishes
    // This gives progress updates without partial data issues
    for (let i = 0; i < pageBuffers.length; i++) {
      const pageNumber = i + 1

      // Send progress update before processing page
      yield { type: 'progress', pageNumber, totalPages }

      try {
        const transactions = await extractTransactionsFromVisualPage(
          pageBuffers[i],
          'application/pdf',
          categories,
          accounts,
          pageNumber,
          totalPages,
          { existingTransactions: duplicateContext }
        )

        // Yield all transactions from this page
        for (const transaction of transactions) {
          yield { type: 'transaction', transaction, pageNumber }
        }

        duplicateContext.push(
          ...transactions.map((transaction) => ({
            id: transaction.tempId!,
            occurredAt: transaction.occurredAt,
            amount: transaction.amount,
            description: transaction.description ?? '',
            possibleDuplicate: transaction.possibleDuplicate ?? false,
          }))
        )
      } catch (error) {
        console.error(`Error processing page ${pageNumber}:`, error)
        // Continue with next page even if one fails
        // Could yield an error event here if needed
      }
    }
  } catch (error) {
    console.error('Error extracting transactions from PDF pages:', error)
    throw error
  }
}

/**
 * Extracts transactions from a single image file (treated as one page)
 * @param imageBuffer - Image buffer
 * @param mimeType - Image MIME type (e.g., image/png)
 */
export async function* extractTransactionsFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  categories: Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' }>,
  accounts: Array<{ id: string; name: string; type: string }>,
  duplicateOptions?: DuplicateCheckOptions
): AsyncGenerator<
  | { type: 'progress'; pageNumber: number; totalPages: number }
  | {
      type: 'transaction'
      transaction: ExtractedTransaction
      pageNumber: number
    },
  void,
  unknown
> {
  const pageNumber = 1
  const totalPages = 1

  yield { type: 'progress', pageNumber, totalPages }

  try {
    const transactions = await extractTransactionsFromVisualPage(
      imageBuffer,
      mimeType,
      categories,
      accounts,
      pageNumber,
      totalPages,
      duplicateOptions
    )

    for (const transaction of transactions) {
      yield { type: 'transaction', transaction, pageNumber }
    }
  } catch (error) {
    console.error('Error extracting transactions from image:', error)
    throw error
  }
}

async function markTransactionsWithPossibleDuplicates(
  transactions: ExtractedTransaction[],
  options: DuplicateCheckOptions = {}
): Promise<ExtractedTransaction[]> {
  const totalComparable =
    transactions.length + (options.existingTransactions?.length ?? 0)

  const { summaries, summaryById } = buildComparableSummaries(
    transactions,
    options.existingTransactions
  )

  const { links: heuristicLinks, diagnostics: heuristicDiagnostics } =
    findLocalDuplicateLinks(summaries)

  applyDuplicateLinks(transactions, heuristicLinks, summaryById)

  if (totalComparable < 2) {
    return transactions
  }

  const heuristicSummary =
    heuristicDiagnostics.length > 0
      ? JSON.stringify(heuristicDiagnostics.slice(0, 25), null, 2)
      : 'No heuristic duplicate pairs detected.'

  try {
    const result = await generateObject({
      model,
      schema: duplicateDetectionSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Review the following transactions extracted from the same statement upload. Each entry includes an "id" field and a "source" that is either "new" (just extracted) or "existing" (previously uploaded). Identify entries that appear to be duplicates of another transaction (identical or nearly identical amount, date, and description). Only flag a transaction if there is strong evidence it is a duplicate of another entry. Return an array named "duplicates" where every object contains "duplicateId" (must be one of the new transactions), "originalId" (the entry it matches, prefer existing entries or earlier new ones), and an optional "reason".`,
            },
            {
              type: 'text',
              text: `Heuristic duplicate candidates (for additional context):\n${heuristicSummary}`,
            },
            {
              type: 'text',
              text: JSON.stringify(summaries, null, 2),
            },
          ],
        },
      ],
    })

    console.debug('Duplicate detection LLM response', {
      duplicates: result.object.duplicates ?? [],
      heuristicLinkCount: heuristicLinks.length,
      transactionCount: summaries.length,
    })

    const llmLinks =
      result.object.duplicates?.map((entry) => ({
        duplicateId: entry.duplicateId,
        originalId: entry.originalId,
        reason: entry.reason,
      })) ?? []

    applyDuplicateLinks(transactions, llmLinks, summaryById)

    return transactions
  } catch (error) {
    console.error('Error detecting possible duplicate transactions:', error)
    return transactions
  }
}

/**
 * Legacy function: Extracts transactions from a PDF bank statement using OpenAI vision API
 * Kept for backward compatibility
 * OpenAI's vision models (gpt-4o-mini) support PDFs directly
 * @param pdfBuffer - PDF file buffer
 * @param categories - Array of user's existing categories to match against
 * @param accounts - Array of user's existing accounts to match against
 * @returns Array of extracted transactions
 */
export async function extractTransactionsFromPDF(
  pdfBuffer: Buffer,
  categories: Array<{ id: string; name: string; type: 'EXPENSE' | 'INCOME' }>,
  accounts: Array<{ id: string; name: string; type: string }>
): Promise<ExtractedTransaction[]> {
  try {
    // Convert PDF buffer to base64
    const pdfBase64 = pdfBuffer.toString('base64')
    const prompt = buildExtractionPrompt(categories, accounts)

    const result = await generateObject({
      model,
      schema: transactionsArraySchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image',
              image: `data:application/pdf;base64,${pdfBase64}`,
            },
          ],
        },
      ],
    })

    // Normalize categoryId and account fields: convert null to undefined for consistency
    // Filter out invalid transactions (incomplete dates, missing descriptions, etc.)
    const normalizedTransactions = result.object.transactions
      .map((transaction) => ({
        ...transaction,
        categoryId:
          transaction.type === 'TRANSFER'
            ? null
            : (transaction.categoryId ?? undefined),
        fromAccountId: transaction.fromAccountId ?? undefined,
        toAccountId: transaction.toAccountId ?? undefined,
        possibleDuplicate: transaction.possibleDuplicate ?? false,
      }))
      .filter(isValidTransaction) as ExtractedTransaction[]

    const transactionsWithIds = normalizedTransactions.map((transaction) => ({
      ...transaction,
      tempId: transaction.tempId ?? randomUUID(),
    }))

    return markTransactionsWithPossibleDuplicates(transactionsWithIds)
  } catch (error) {
    console.error('Error extracting transactions from PDF:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to extract transactions from PDF')
  }
}
