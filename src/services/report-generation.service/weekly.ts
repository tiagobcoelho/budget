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

const model = anthropic('claude-sonnet-4-5-20250929')

export async function generateReport(
  householdId: string,
  startDate: Date,
  endDate: Date,
  transactions: TransactionData[],
  categories: CategoryData[],
  budgets: BudgetData[],
  accounts: AccountData[],
  currency: string = 'USD',
  monthlyTransactions: TransactionData[] = []
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

  // Calculate monthly metrics if monthly transactions provided
  const monthlyTotalIncome = monthlyTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)
  const monthlyTotalExpenses = monthlyTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)
  const monthlyNetChange = monthlyTotalIncome - monthlyTotalExpenses
  const monthlySavingsRate =
    monthlyTotalIncome > 0 ? (monthlyNetChange / monthlyTotalIncome) * 100 : 0

  // Calculate monthly budget progress
  const monthlyExpensesByCategory = new Map<
    string,
    { amount: number; name: string }
  >()
  for (const t of monthlyTransactions.filter((t) => t.type === 'EXPENSE')) {
    const catId = t.categoryId || 'uncategorized'
    const existing = monthlyExpensesByCategory.get(catId) || {
      amount: 0,
      name: t.categoryName || 'Uncategorized',
    }
    monthlyExpensesByCategory.set(catId, {
      amount: existing.amount + t.amount,
      name: existing.name,
    })
  }

  // Calculate budget progress for the month
  const budgetProgress = budgets.map((budget) => {
    const monthlySpent =
      monthlyExpensesByCategory.get(budget.categoryId)?.amount || 0
    const percentageUsed = (monthlySpent / budget.amount) * 100
    const remaining = Math.max(0, budget.amount - monthlySpent)
    const overBudget = monthlySpent > budget.amount

    // Calculate day of month to estimate pacing
    const monthStart = new Date(startDate)
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const daysIntoMonth = Math.ceil(
      (endDate.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const daysInMonth = new Date(
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      0
    ).getDate()
    const expectedProgress = (daysIntoMonth / daysInMonth) * 100
    const paceStatus =
      percentageUsed > expectedProgress * 1.1
        ? 'AHEAD'
        : percentageUsed < expectedProgress * 0.7
          ? 'BEHIND'
          : 'ON_TRACK'

    return {
      budget,
      categoryName: categoryMap.get(budget.categoryId)?.name || 'Unknown',
      monthlySpent,
      percentageUsed,
      remaining,
      overBudget,
      daysIntoMonth,
      daysInMonth,
      expectedProgress,
      paceStatus,
    }
  })

  const currencySymbol =
    currency === 'USD'
      ? '$'
      : currency === 'EUR'
        ? '€'
        : currency === 'GBP'
          ? '£'
          : currency

  // Calculate month start and end for context
  const monthStart = new Date(startDate)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthEnd = new Date(endDate)
  monthEnd.setMonth(monthEnd.getMonth() + 1)
  monthEnd.setDate(0)
  monthEnd.setHours(23, 59, 59, 999)

  const prompt = [
    `You are a financial advisor analyzing a user's WEEKLY financial report for the period from ${
      startDate.toISOString().split('T')[0]
    } to ${endDate.toISOString().split('T')[0]} (${periodDays} days).`,
    '',
    `IMPORTANT CONTEXT: This is a weekly report, but the PRIMARY GOAL is to help the user meet their MONTHLY budget targets. While analyzing this week's spending, you must keep in mind the overall monthly budget progress and provide guidance to stay on track for the month.`,
    '',
    `CURRENCY: All amounts should be reported in ${currency} (${currencySymbol}).`,
    '',
    '=== WEEKLY SUMMARY (Current Week) ===',
    `- Total Income: ${currencySymbol}${totalIncome.toFixed(2)}`,
    `- Total Expenses: ${currencySymbol}${totalExpenses.toFixed(2)}`,
    `- Total Transfers: ${currencySymbol}${totalTransfers.toFixed(2)}`,
    `- Net Change: ${currencySymbol}${netChange.toFixed(2)}`,
    `- Savings Rate: ${savingsRate.toFixed(1)}%`,
    `- Total Transactions: ${transactions.length} (${transactions.filter((t) => t.type === 'INCOME').length} income, ${transactions.filter((t) => t.type === 'EXPENSE').length} expenses, ${transactions.filter((t) => t.type === 'TRANSFER').length} transfers)`,
    '',
    monthlyTransactions.length > 0
      ? [
          '=== MONTHLY CONTEXT (Full Month Progress) ===',
          `Month Period: ${monthStart.toISOString().split('T')[0]} to ${monthEnd.toISOString().split('T')[0]}`,
          `- Monthly Income (so far): ${currencySymbol}${monthlyTotalIncome.toFixed(2)}`,
          `- Monthly Expenses (so far): ${currencySymbol}${monthlyTotalExpenses.toFixed(2)}`,
          `- Monthly Net Change: ${currencySymbol}${monthlyNetChange.toFixed(2)}`,
          `- Monthly Savings Rate: ${monthlySavingsRate.toFixed(1)}%`,
          `- Total Monthly Transactions: ${monthlyTransactions.length}`,
          '',
          'BUDGET PROGRESS FOR THE MONTH:',
          budgetProgress
            .map(
              (bp) =>
                `- ${bp.categoryName}: Spent ${currencySymbol}${bp.monthlySpent.toFixed(2)} / Budget ${currencySymbol}${bp.budget.amount.toFixed(2)} (${bp.percentageUsed.toFixed(1)}% used, ${bp.paceStatus === 'AHEAD' ? '⚠️ AHEAD of pace' : bp.paceStatus === 'BEHIND' ? '✅ BEHIND pace' : '✅ ON TRACK'}, ${bp.daysIntoMonth}/${bp.daysInMonth} days into month)${bp.overBudget ? ' ❌ OVER BUDGET' : ''}`
            )
            .join('\n') || 'No budgets to track',
          '',
        ].join('\n')
      : '',
    '',
    'ACCOUNTS:',
    accounts.length > 0
      ? accounts.map((a) => `- ${a.name} (${a.type})`).join('\n')
      : 'No accounts',
    '',
    'TOP SPENDING CATEGORIES (this week):',
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
    'CATEGORIES WITHOUT BUDGETS (with significant spending this week):',
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
    'TASK (WEEKLY REPORT):',
    '1. Write a concise summary as 3-5 bullet points focusing on:',
    '   - Key spending patterns this week',
    '   - Progress toward monthly budget goals',
    '   - Any concerns or positive trends',
    '',
    '2. Provide detailed insights (3-5 paragraphs) covering:',
    "   - How this week's spending affects monthly budget progress",
    '   - Which categories are on track, ahead, or behind for the month',
    '   - Notable spending patterns or anomalies this week',
    '   - Recommendations to stay on track for remaining month goals',
    '',
    '3. Give actionable recommendations as 3-5 bullet points:',
    '   - Specific guidance for the coming week to meet monthly budget goals',
    '   - Categories that need attention based on monthly progress',
    '   - Actions to take if spending is ahead of pace',
    '   - Positive reinforcement if on track',
    '',
    'IMPORTANT: DO NOT provide budget suggestions (CREATE or UPDATE) in weekly reports.',
    'The focus is on helping the user meet their existing monthly budget goals,',
    'not on changing budgets. Budget suggestions should only appear in monthly reports.',
    '',
    'CRITICAL RULES:',
    `- Always use ${currency} (${currencySymbol}) for amounts`,
    '- Focus on weekly progress within the context of monthly goals',
    '- Be specific, actionable, and grounded in observed data',
    '- Emphasize staying on track for monthly budgets rather than suggesting changes',
  ].join('\n')

  try {
    const result = await generateObject({
      model,
      schema: reportSchema,
      prompt,
    })

    // Weekly reports should not include budget suggestions
    // Return empty array for budget suggestions
    return {
      ...result.object,
      budgetSuggestions: [],
    }
  } catch (error) {
    console.error('Error generating WEEKLY report:', error)
    throw new Error('Failed to generate weekly report')
  }
}
