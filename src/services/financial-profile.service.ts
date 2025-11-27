import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'
import {
  AccountData,
  BudgetData,
  CategoryData,
  TransactionData,
} from './report-generation.service/types'

const model = anthropic('claude-sonnet-4-5-20250929')

const profileSchema = z.object({
  profile: z.object({
    incomePattern: z
      .object({
        frequency: z.string().optional(),
        paydays: z.array(z.number()).optional(),
        avgMonthlyIncome: z.number().optional(),
        notes: z.string().optional(),
      })
      .optional(),
    typicalSpending: z.record(z.number()).optional(),
    recurringExpenses: z
      .array(
        z.object({
          name: z.string(),
          amount: z.number(),
          dayOfMonth: z.number().optional(),
          category: z.string().optional(),
        })
      )
      .optional(),
    budgetBehavior: z
      .object({
        strictness: z.string().optional(),
        avgAdherence: z.number().optional(),
        notablePatterns: z.string().optional(),
      })
      .optional(),
    cashflowAnchors: z
      .object({
        avgWeek: z.number().optional(),
        avgMonth: z.number().optional(),
        bufferTarget: z.number().optional(),
      })
      .optional(),
    avgMonthlySavings: z.number().optional(),
    notes: z
      .record(
        z.object({
          value: z.union([z.string(), z.number(), z.boolean()]),
          description: z.string().optional(),
          lastUpdated: z.string().optional(),
        })
      )
      .optional(),
  }),
})

export interface FinancialProfile {
  incomePattern?: {
    frequency?: string
    paydays?: number[]
    avgMonthlyIncome?: number
    notes?: string
  }
  typicalSpending?: Record<string, number>
  recurringExpenses?: Array<{
    name: string
    amount: number
    dayOfMonth?: number
    category?: string
  }>
  budgetBehavior?: {
    strictness?: string
    avgAdherence?: number
    notablePatterns?: string
  }
  cashflowAnchors?: {
    avgWeek?: number
    avgMonth?: number
    bufferTarget?: number
  }
  avgMonthlySavings?: number
  notes?: Record<
    string,
    {
      value: string | number | boolean
      description?: string
      lastUpdated?: string
    }
  >
}

export interface FinancialProfileContext {
  householdName?: string
  existingProfile?: FinancialProfile | null
  startDate: Date
  endDate: Date
  currency?: string
  transactions: TransactionData[]
  categories: CategoryData[]
  budgets: BudgetData[]
  accounts: AccountData[]
}

const currencySymbol = (currency?: string): string => {
  if (!currency) return '$'
  switch (currency) {
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    default:
      return currency
  }
}

const formatTopCategories = (
  transactions: TransactionData[],
  categories: CategoryData[]
) => {
  const expenseMap = new Map<
    string,
    { amount: number; count: number; name: string }
  >()
  for (const txn of transactions.filter((t) => t.type === 'EXPENSE')) {
    const categoryId = txn.categoryId || 'uncategorized'
    const existing = expenseMap.get(categoryId) || {
      amount: 0,
      count: 0,
      name:
        txn.categoryName ||
        categories.find((c) => c.id === categoryId)?.name ||
        'Uncategorized',
    }
    expenseMap.set(categoryId, {
      amount: existing.amount + txn.amount,
      count: existing.count + 1,
      name: existing.name,
    })
  }

  return Array.from(expenseMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(
      (entry) =>
        `${entry.name}: ${entry.amount.toFixed(2)} (${entry.count} txns)`
    )
    .join('; ')
}

const formatRecurringBudgets = (
  budgets: BudgetData[],
  categories: CategoryData[]
) =>
  budgets
    .slice(0, 5)
    .map((budget) => {
      const categoryName =
        categories.find((c) => c.id === budget.categoryId)?.name || 'Unknown'
      return `${budget.name || categoryName}: ${budget.amount.toFixed(2)}`
    })
    .join('; ')

export function formatFinancialProfileForPrompt(
  profile?: FinancialProfile | null
): string {
  if (!profile || Object.keys(profile).length === 0) {
    return 'HOUSEHOLD PROFILE MEMORY: (none yet)'
  }

  return `HOUSEHOLD PROFILE MEMORY:\n${JSON.stringify(profile, null, 2)}`
}

export async function generateUpdatedFinancialProfile(
  context: FinancialProfileContext
): Promise<FinancialProfile> {
  const {
    existingProfile,
    startDate,
    endDate,
    currency = 'USD',
    transactions,
    categories,
    budgets,
    accounts,
    householdName,
  } = context

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalTransfers = transactions
    .filter((t) => t.type === 'TRANSFER')
    .reduce((sum, t) => sum + t.amount, 0)

  const summaryLines = [
    `HOUSEHOLD: ${householdName ?? 'Unnamed Household'}`,
    `PERIOD: ${startDate.toISOString().split('T')[0]} → ${
      endDate.toISOString().split('T')[0]
    }`,
    `ACCOUNTS: ${
      accounts.length > 0
        ? accounts.map((a) => `${a.name} (${a.type})`).join(', ')
        : 'None'
    }`,
    `TRANSACTIONS: ${transactions.length} total (income ${
      transactions.filter((t) => t.type === 'INCOME').length
    }, expenses ${
      transactions.filter((t) => t.type === 'EXPENSE').length
    }, transfers ${transactions.filter((t) => t.type === 'TRANSFER').length})`,
    `TOTAL INCOME: ${currencySymbol(currency)}${totalIncome.toFixed(2)}`,
    `TOTAL EXPENSES: ${currencySymbol(currency)}${totalExpenses.toFixed(2)}`,
    `TOTAL TRANSFERS: ${currencySymbol(currency)}${totalTransfers.toFixed(2)}`,
    `TOP EXPENSE CATEGORIES: ${
      formatTopCategories(transactions, categories) || 'No expenses'
    }`,
    `ACTIVE BUDGETS: ${
      budgets.length > 0
        ? formatRecurringBudgets(budgets, categories)
        : 'No budgets yet'
    }`,
  ]

  const prompt = [
    'You maintain a persistent household financial profile with the following structure. Fill what you can from the latest period and prior knowledge, leave fields out when unknown.',
    `PROFILE STRUCTURE:
{
  "incomePattern": { "frequency": string, "paydays": number[], "avgMonthlyIncome": number, "notes": string },
  "typicalSpending": { "<categoryName>": number },
  "recurringExpenses": [{ "name": string, "amount": number, "dayOfMonth": number, "category": string }],
  "budgetBehavior": { "strictness": string, "avgAdherence": number, "notablePatterns": string },
  "cashflowAnchors": { "avgWeek": number, "avgMonth": number, "bufferTarget": number },
  "avgMonthlySavings": number,
  "notes": { "<customKey>": { "value": string|number|boolean, "description": string, "lastUpdated": iso8601 } }
}`,
    'Use the latest period data to update the profile. Keep useful existing entries, refine them when new evidence appears, and remove items that are clearly outdated.',
    'CRITICAL REQUIREMENTS:',
    '- Always capture the best possible snapshot of recurring income (frequency, cadence, observed paydays) even if the pattern is still emerging.',
    '- Always surface the highest essential expense, prioritizing housing costs like rent or mortgage. Represent it clearly inside `recurringExpenses` (preferred) or `notes` with amount, cadence, and category.',
    existingProfile
      ? '- If the latest period lacks explicit housing data, carry forward the last known reliable housing insight instead of removing it.'
      : '- Because this is the first profile, infer income cadence and the primary housing cost from the transactions/budgets provided, even if the amounts are approximate.',
    'Only place ad-hoc insights inside the `notes` object so the core shape stays predictable.',
    existingProfile
      ? `CURRENT PROFILE JSON:\n${JSON.stringify(existingProfile, null, 2)}`
      : 'CURRENT PROFILE JSON: {} (create an initial profile)',
    'LATEST PERIOD SUMMARY:',
    summaryLines.join('\n'),
    'TASK:',
    '- Return a JSON object under the key "profile".',
    '- The JSON should reflect the best understanding of recurring income, spending habits, recurring obligations, savings behavior, or any other persistent traits that would help an LLM personalize financial advice.',
    '- You may invent new keys when helpful. Keep names descriptive and concise (camelCase).',
    '- Prefer numbers for monetary values where possible.',
    '- Keep the profile compact (aim for < 2KB when stringified).',
  ].join('\n\n')

  const result = await generateObject({
    model,
    schema: profileSchema,
    prompt,
  })

  return result.object.profile as FinancialProfile
}
