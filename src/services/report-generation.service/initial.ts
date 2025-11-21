import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { randomUUID } from 'crypto'
import {
  AccountData,
  CategoryData,
  GeneratedReport,
  TransactionData,
  reportSchema,
} from './types'

const model = anthropic('claude-sonnet-4-5-20250929')

export async function generateInitialReport(
  startDate: Date,
  endDate: Date,
  transactions: TransactionData[],
  categories: CategoryData[],
  accounts: AccountData[],
  currency: string = 'USD'
): Promise<GeneratedReport> {
  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalTransfers = transactions
    .filter((t) => t.type === 'TRANSFER')
    .reduce((sum, t) => sum + t.amount, 0)

  const netChange = totalIncome - totalExpenses

  const savingsRate = totalIncome > 0 ? (netChange / totalIncome) * 100 : 0

  const expensesByCategory = new Map<
    string,
    { amount: number; count: number; name: string }
  >()
  for (const t of transactions.filter((t) => t.type === 'EXPENSE')) {
    const catId = t.categoryId || 'uncategorized'
    const existing = expensesByCategory.get(catId) || {
      amount: 0,
      count: 0,
      name: t.categoryName || 'Uncategorized',
    }
    expensesByCategory.set(catId, {
      amount: existing.amount + t.amount,
      count: existing.count + 1,
      name: existing.name,
    })
  }

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')
  const incomeCategories = categories.filter((c) => c.type === 'INCOME')

  const categorySpending = Array.from(expensesByCategory.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      amount: data.amount,
      transactionCount: data.count,
    }))
    .sort((a, b) => b.amount - a.amount)

  const periodDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const periodDescription =
    periodDays <= 7
      ? 'week'
      : periodDays <= 31
        ? 'month'
        : periodDays <= 93
          ? 'quarter'
          : 'year'

  const currencySymbol =
    currency === 'USD'
      ? '$'
      : currency === 'EUR'
        ? '€'
        : currency === 'GBP'
          ? '£'
          : currency

  const prompt = `You are a financial advisor analyzing a user's INITIAL financial report for the period from ${
    startDate.toISOString().split('T')[0]
  } to ${
    endDate.toISOString().split('T')[0]
  } (${periodDays} days, approximately ${periodDescription}).

CURRENCY: All amounts should be reported in ${currency} (${currencySymbol}).

USER PREFERENCES:
- All budgets are MONTHLY. Budget suggestions should always create monthly recurring budgets.

UNDERSTANDING TRANSACTIONS:
- INCOME: Money coming into accounts (salary, bonuses, etc.)
- EXPENSE: Money spent on goods and services
- TRANSFER: Money moved between accounts. Transfers represent:
  * Moving money TO savings/investment accounts (saving/investing)
  * Moving money FROM savings/investments to checking (drawdown)
  * Transfers do NOT change net worth

FINANCIAL SUMMARY:
- Total Income: ${currencySymbol}${totalIncome.toFixed(2)}
- Total Expenses: ${currencySymbol}${totalExpenses.toFixed(2)}
- Total Transfers: ${currencySymbol}${totalTransfers.toFixed(2)}
- Net Change: ${currencySymbol}${netChange.toFixed(2)}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Total Transactions: ${transactions.length} (${transactions.filter((t) => t.type === 'INCOME').length} income, ${transactions.filter((t) => t.type === 'EXPENSE').length} expenses, ${transactions.filter((t) => t.type === 'TRANSFER').length} transfers)

ACCOUNTS:
${accounts.length > 0 ? accounts.map((a) => `- ${a.name} (${a.type})`).join('\n') : 'No accounts'}

TOP SPENDING CATEGORIES:
${categorySpending
  .slice(0, 10)
  .map(
    (c) =>
      `- ${c.categoryName}: ${currencySymbol}${c.amount.toFixed(2)} (${c.transactionCount} transactions)`
  )
  .join('\n')}

ALL AVAILABLE EXPENSE CATEGORIES (for reference when creating budget suggestions):
${expenseCategories
  .map((c) => {
    const spending = transactions
      .filter((t) => t.type === 'EXPENSE' && t.categoryId === c.id)
      .reduce((sum, t) => sum + t.amount, 0)
    return `- ${c.name} (ID: ${c.id})${
      spending > 0
        ? `: ${currencySymbol}${spending.toFixed(2)} spent`
        : ': No spending'
    }`
  })
  .join('\n')}

ALL AVAILABLE INCOME CATEGORIES (for context on income sources):
${incomeCategories
  .map((c) => {
    const incomeTotal = transactions
      .filter((t) => t.type === 'INCOME' && t.categoryId === c.id)
      .reduce((sum, t) => sum + t.amount, 0)
    return `- ${c.name} (ID: ${c.id})${
      incomeTotal > 0
        ? `: ${currencySymbol}${incomeTotal.toFixed(2)} received`
        : ': No income recorded'
    }`
  })
  .join('\n')}

ALL TRANSFERS (important for understanding savings/investment activity):
${
  transactions.filter((t) => t.type === 'TRANSFER').length > 0
    ? transactions
        .filter((t) => t.type === 'TRANSFER')
        .map(
          (t) =>
            `- ${t.occurredAt.split('T')[0]}: ${t.type} ${currencySymbol}${t.amount.toFixed(2)} - ${t.description || 'No description'} (Category: ${t.categoryName || 'Uncategorized'}${t.categoryId ? `, ID: ${t.categoryId}` : ''})`
        )
        .join('\n')
    : 'No transfers in this period'
}

TOP 20 TRANSACTIONS BY AMOUNT (excluding transfers):
${
  transactions
    .filter((t) => t.type !== 'TRANSFER')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20)
    .map(
      (t) =>
        `- ${t.occurredAt.split('T')[0]}: ${t.type} ${currencySymbol}${t.amount.toFixed(2)} - ${t.description || 'No description'} (Category: ${t.categoryName || 'Uncategorized'}${t.categoryId ? `, ID: ${t.categoryId}` : ''})`
    )
    .join('\n') || 'No transactions in this period'
}

TASK (INITIAL REPORT):
1. Write a concise summary as 3-5 bullet points (focus on baseline overview and quick wins to set up core budgets)
2. Provide detailed insights (3-5 paragraphs) analyzing spending patterns, trends, unusual activity, and transfers
3. Give actionable recommendations as 3-5 bullet points for improving financial health
4. Generate category budgets — this is the primary goal of the Initial Report. Your output must define a clear, actionable monthly budget plan:
   - Create budgets for categories with significant spending (start with core living: rent/mortgage, groceries, utilities, transport; then top discretionary by spend). Avoid long-tail budgets.
   - For each category budget, provide a short rationale and expected impact.
   - Use a 1‑month period and make budgets monthly recurring by default. Set startDate to ${
     startDate.toISOString().split('T')[0]
   } and compute endDate one month later.

CRITICAL RULES FOR BUDGET SUGGESTIONS:
- Each budget ties to exactly ONE category (1:1 relationship)
- categoryId MUST be a valid UUID from the category list above
- Always use ${currency} (${currencySymbol}) for amounts
- Budgets are monthly recurring by default
- Be specific, actionable, and base on observed spending`

  try {
    const result = await generateObject({
      model,
      schema: reportSchema,
      prompt,
    })

    const categoryMap = new Map(
      expenseCategories.map((c) => [c.name.toLowerCase(), c.id])
    )

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    const fixedSuggestions = result.object.budgetSuggestions.map(
      (suggestion) => {
        // Generate a valid UUID if the ID is missing or invalid
        const validId =
          suggestion.id && uuidRegex.test(suggestion.id)
            ? suggestion.id
            : randomUUID()

        // Fix categoryId if needed
        if (suggestion.suggestion?.categoryId) {
          if (!uuidRegex.test(suggestion.suggestion.categoryId)) {
            const categoryName = suggestion.suggestion.name
              ?.split(' - ')[0]
              .toLowerCase()
            const foundId = categoryName
              ? categoryMap.get(categoryName)
              : undefined
            if (foundId) {
              suggestion.suggestion.categoryId = foundId
            } else {
              // leave as-is; validation upstream
            }
          }
        }
        return {
          ...suggestion,
          id: validId,
        }
      }
    )

    return {
      ...result.object,
      budgetSuggestions: fixedSuggestions,
    }
  } catch (error) {
    console.error('Error generating INITIAL report:', error)
    throw new Error('Failed to generate initial report')
  }
}
