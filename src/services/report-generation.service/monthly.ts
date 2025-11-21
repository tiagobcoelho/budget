import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import {
  AccountData,
  BudgetData,
  CategoryData,
  GeneratedReport,
  TransactionData,
  reportSchema,
} from './types'
import { randomUUID } from 'crypto'

const model = anthropic('claude-sonnet-4-5-20250929')

export async function generateReport(
  householdId: string,
  startDate: Date,
  endDate: Date,
  transactions: TransactionData[],
  categories: CategoryData[],
  budgets: BudgetData[],
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

  const categoryMap = new Map(
    categories.map((category) => [category.id, category])
  )

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
  const categoriesWithBudgets = new Set(
    budgets.map((b) => b.categoryId).filter(Boolean)
  )
  const categoriesWithoutBudgets = expenseCategories.filter(
    (c) => !categoriesWithBudgets.has(c.id)
  )

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

  const currencySymbol =
    currency === 'USD'
      ? '$'
      : currency === 'EUR'
        ? '€'
        : currency === 'GBP'
          ? '£'
          : currency

  const prompt = [
    `You are a financial advisor analyzing a user's MONTHLY financial report for the period from ${
      startDate.toISOString().split('T')[0]
    } to ${endDate.toISOString().split('T')[0]} (${periodDays} days).`,
    '',
    `CURRENCY: All amounts should be reported in ${currency} (${currencySymbol}).`,
    '',
    'FINANCIAL SUMMARY:',
    `- Total Income: ${currencySymbol}${totalIncome.toFixed(2)}`,
    `- Total Expenses: ${currencySymbol}${totalExpenses.toFixed(2)}`,
    `- Total Transfers: ${currencySymbol}${totalTransfers.toFixed(2)}`,
    `- Net Change: ${currencySymbol}${netChange.toFixed(2)}`,
    `- Savings Rate: ${savingsRate.toFixed(1)}%`,
    `- Total Transactions: ${transactions.length} (${transactions.filter((t) => t.type === 'INCOME').length} income, ${transactions.filter((t) => t.type === 'EXPENSE').length} expenses, ${transactions.filter((t) => t.type === 'TRANSFER').length} transfers)`,
    '',
    'ACCOUNTS:',
    accounts.length > 0
      ? accounts.map((a) => `- ${a.name} (${a.type})`).join('\n')
      : 'No accounts',
    '',
    'TOP SPENDING CATEGORIES (this month):',
    categorySpending
      .slice(0, 10)
      .map(
        (c) =>
          `- ${c.categoryName}: ${currencySymbol}${c.amount.toFixed(2)} (${c.transactionCount} transactions)`
      )
      .join('\n'),
    '',
    'ALL CATEGORIES (use these IDs exactly):',
    categories.length > 0
      ? categories.map((c) => `- ${c.name}: ${c.id} (${c.type})`).join('\n')
      : 'No categories available',
    '',
    'EXISTING BUDGETS (monthly):',
    budgets.length > 0
      ? budgets
          .map(
            (b) =>
              `- ${b.name}: ${currencySymbol}${b.amount.toFixed(
                2
              )} (MONTHLY, Category: ${
                categoryMap.get(b.categoryId)?.name || 'Unknown Category'
              }, ID: ${b.categoryId})`
          )
          .join('\n')
      : 'No budgets currently set',
    '',
    'CATEGORIES WITHOUT BUDGETS (with significant spending this month):',
    categoriesWithoutBudgets
      .map((c) => {
        const spending = transactions
          .filter((t) => t.type === 'EXPENSE' && t.categoryId === c.id)
          .reduce(
            (acc, t) => {
              acc.amount += t.amount
              acc.count += 1
              return acc
            },
            { amount: 0, count: 0 }
          )
        return spending.amount > 0
          ? `- ${c.name} (ID: ${c.id}): ${currencySymbol}${spending.amount.toFixed(2)} (${spending.count} transactions)`
          : null
      })
      .filter(Boolean)
      .join('\n') || 'All categories with spending have budgets',
    '',
    'ALL TRANSFERS (for savings/investment activity):',
    transactions.filter((t) => t.type === 'TRANSFER').length > 0
      ? transactions
          .filter((t) => t.type === 'TRANSFER')
          .map(
            (t) =>
              `- ${t.occurredAt.split('T')[0]}: ${t.type} ${currencySymbol}${t.amount.toFixed(2)} - ${t.description || 'No description'}`
          )
          .join('\n')
      : 'No transfers in this period',
    '',
    'TASK (MONTHLY REPORT):',
    '1. Write a concise summary as 3-5 bullet points (focus on month-wide patterns and goal progress)',
    '2. Provide detailed insights (3-5 paragraphs) covering spending patterns, trends, unusual activity, transfer behavior, and notable observations across the month',
    '3. Give actionable recommendations as 3-5 bullet points for improving financial health next month',
    '4. Generate 3-5 budget suggestions:',
    '   - CREATE suggestions for categories with significant spending (>5% of total or notable absolute amounts) that do not have budgets',
    '   - UPDATE suggestions for budgets that are consistently exceeded (>110%) or too restrictive (<70%)',
    '   - For CREATE suggestions, use a 1-month period starting at the report start date (monthly recurring)',
    '',
    'CRITICAL RULES:',
    '- Each budget ties to exactly ONE category (1:1 relationship)',
    '- categoryId MUST be a valid UUID from known categories',
    `- Always use ${currency} (${currencySymbol}) for amounts`,
    '- Budgets are monthly recurring by default',
    '- Be specific, actionable, and grounded in observed data',
  ].join('\n')

  try {
    const result = await generateObject({
      model,
      schema: reportSchema,
      prompt,
    })

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    // Fix budget suggestion IDs
    const fixedSuggestions = result.object.budgetSuggestions.map(
      (suggestion) => {
        // Generate a valid UUID if the ID is missing or invalid
        const validId =
          suggestion.id && uuidRegex.test(suggestion.id)
            ? suggestion.id
            : randomUUID()

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
    console.error('Error generating MONTHLY report:', error)
    throw new Error('Failed to generate monthly report')
  }
}
