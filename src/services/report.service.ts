import { db } from '@/db'
import {
  Prisma,
  ReportPeriod,
  Transaction,
  type Budget,
  type Category,
  type Report,
} from '@prisma/client'
import {
  reportDataSchema,
  type ReportData,
} from '@/server/trpc/schemas/report.schema'
import {
  BudgetSuggestionStatus,
  type TransactionData,
} from './report-generation.service/types'
// Note: LLM orchestration remains in the API route; this service exposes
// only calculations and persistence helpers.

/**
 * Typed Report type where the `data` field is properly typed as ReportData | null
 * instead of Prisma.JsonValue | null.
 * This ensures tRPC automatically infers the correct type on the frontend.
 */
export type TypedReport = Omit<Report, 'data'> & {
  data: ReportData | null
}

export interface ReportListInput {
  period?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
  from?: string
  to?: string
  status?: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
}

type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: { category: true; fromAccount: true; toAccount: true }
}>

export class ReportService {
  static async list(
    householdId: string,
    input?: ReportListInput
  ): Promise<TypedReport[]> {
    const where: Prisma.ReportWhereInput = { householdId }

    if (input?.period) {
      where.period = input.period
    }

    if (input?.status) {
      where.status = input.status
    }

    if (input?.from && input?.to) {
      where.AND = [
        { startDate: { lte: new Date(input.to) } },
        { endDate: { gte: new Date(input.from) } },
      ]
    }

    const reports = await db.report.findMany({
      where,
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    })

    // Parse and type the data field for each report
    return reports.map((report) => ({
      ...report,
      data: report.data ? reportDataSchema.parse(report.data) : null,
    }))
  }

  static async getById(
    householdId: string,
    id: string
  ): Promise<TypedReport | null> {
    const report = await db.report.findFirst({
      where: { id, householdId },
    })

    if (!report) {
      return null
    }

    // Parse and type the data field
    return {
      ...report,
      data: report.data ? reportDataSchema.parse(report.data) : null,
    }
  }

  static async create(
    householdId: string,
    data: {
      period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
      startDate: string | Date
      endDate: string | Date
      isInitial?: boolean
    }
  ): Promise<TypedReport> {
    const report = await db.report.create({
      data: {
        householdId,
        period: data.period,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: 'PENDING',
        isInitial: data.isInitial ?? false,
      },
    })

    // Parse and type the data field (will be null for new reports)
    return {
      ...report,
      data: report.data ? reportDataSchema.parse(report.data) : null,
    }
  }

  static async updateStatus(
    id: string,
    status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
  ): Promise<TypedReport> {
    const report = await db.report.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' ? { generatedAt: new Date() } : {}),
        updatedAt: new Date(),
      },
    })

    // Parse and type the data field
    return {
      ...report,
      data: report.data ? reportDataSchema.parse(report.data) : null,
    }
  }

  // Set the full typed data snapshot
  static async setData(
    id: string,
    data: unknown,
    transactionCount?: number
  ): Promise<TypedReport> {
    const parsed = reportDataSchema.parse(data)
    const report = await db.report.update({
      where: { id },
      data: {
        ...(typeof transactionCount === 'number' ? { transactionCount } : {}),
        updatedAt: new Date(),
        data: parsed,
      },
    })

    // Parse and type the data field
    return {
      ...report,
      data: report.data ? reportDataSchema.parse(report.data) : null,
    }
  }

  /**
   * Fetches all raw data needed to build a period report in one go so API routes
   * stay thin. Returns current-period entities plus contextual data (previous
   * period + rolling window) for analytics calculations.
   */
  static async getGenerationData(params: {
    householdId: string
    period: ReportPeriod
    startDate: Date
    endDate: Date
  }) {
    const { householdId, period, startDate, endDate } = params

    const monthRange =
      period === ReportPeriod.WEEKLY
        ? ReportService.getMonthRange(startDate, endDate)
        : null

    const previousMonthRange =
      period === ReportPeriod.MONTHLY
        ? ReportService.getPreviousMonthRange(startDate)
        : null

    const rollingRange =
      period === ReportPeriod.MONTHLY
        ? ReportService.getRollingRange(endDate, 90)
        : null

    const [transactions, categories, accounts, budgets, householdRecord] =
      await Promise.all([
        ReportService.fetchTransactionsWithRelations({
          householdId,
          startDate,
          endDate,
        }),
        db.category.findMany({ where: { householdId } }),
        db.account.findMany({ where: { householdId } }),
        db.budget.findMany({
          where: {
            householdId,
            AND: [
              {
                startDate: {
                  lte:
                    period === ReportPeriod.WEEKLY && monthRange
                      ? monthRange.end
                      : endDate,
                },
              },
              {
                endDate: {
                  gte:
                    period === ReportPeriod.WEEKLY && monthRange
                      ? monthRange.start
                      : startDate,
                },
              },
            ],
          },
          include: { category: true },
        }),
        db.household.findUnique({
          where: { id: householdId },
          select: { financialProfile: true },
        }),
      ])

    let monthlyTransactions: TransactionData[] = []
    if (period === ReportPeriod.WEEKLY && monthRange) {
      const monthlyTxns = await ReportService.fetchTransactionsWithRelations({
        householdId,
        startDate: monthRange.start,
        endDate: monthRange.end,
      })
      monthlyTransactions = ReportService.mapTransactionsToData(monthlyTxns)
    }

    let previousPeriodTransactions: TransactionData[] = []
    if (previousMonthRange) {
      const prevTxns = await ReportService.fetchTransactionsWithRelations({
        householdId,
        startDate: previousMonthRange.start,
        endDate: previousMonthRange.end,
      })
      previousPeriodTransactions = ReportService.mapTransactionsToData(prevTxns)
    }

    let rollingTransactions: TransactionData[] = []
    if (rollingRange) {
      const rollingTxns = await ReportService.fetchTransactionsWithRelations({
        householdId,
        startDate: rollingRange.start,
        endDate: rollingRange.end,
      })
      rollingTransactions = ReportService.mapTransactionsToData(rollingTxns)
    }

    return {
      transactions,
      categories,
      accounts,
      budgets,
      monthlyTransactions,
      previousPeriodTransactions,
      rollingTransactions,
      financialProfile: householdRecord?.financialProfile ?? null,
    }
  }

  // Compute totals and category breakdown (no LLM, no persistence)
  static async computeSnapshot(
    householdId: string,
    startDate: Date,
    endDate: Date,
    preloaded?: {
      transactions?: Transaction[]
      categories?: Category[]
      budgets?: Budget[]
    }
  ) {
    const [transactions, categories, budgets] = await Promise.all([
      preloaded?.transactions ??
        db.transaction.findMany({
          where: {
            householdId,
            occurredAt: { gte: startDate, lte: endDate },
          },
          include: { category: true },
          orderBy: { occurredAt: 'desc' },
        }),
      preloaded?.categories ?? db.category.findMany({ where: { householdId } }),
      preloaded?.budgets ??
        db.budget.findMany({
          where: {
            householdId,
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
          include: { category: true },
        }),
    ])

    // Totals
    const income = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expenses = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const savingsRate = income > 0 ? (income - expenses) / income : 0

    // Category aggregation
    const spendByCategory = new Map<
      string,
      {
        total: number
        transactions: Transaction[]
      }
    >()
    for (const transaction of transactions) {
      if (transaction.type !== 'EXPENSE' || !transaction.categoryId) continue
      const key = transaction.categoryId
      const entry = spendByCategory.get(key) || {
        total: 0,
        transactions: [] as Transaction[],
      }
      entry.total += Number(transaction.amount)
      entry.transactions.push(transaction)
      spendByCategory.set(key, entry)
    }
    const budgetByCategory = new Map(
      budgets.map((b) => [b.categoryId, Number(b.amount)])
    )
    const categoriesData = categories
      .filter((c) => spendByCategory.has(c.id))
      .map((c) => {
        const spend = spendByCategory.get(c.id)!
        const budgetAmount = budgetByCategory.get(c.id)
        const hasBudget = typeof budgetAmount === 'number'
        const remaining = hasBudget
          ? Number((budgetAmount as number) - spend.total)
          : undefined
        const percentUsed =
          hasBudget && (budgetAmount as number) > 0
            ? spend.total / (budgetAmount as number)
            : undefined
        return {
          id: c.id,
          name: c.name,
          color: c.color ?? undefined,
          icon: c.icon ?? undefined,
          spent: Number(spend.total),
          hasBudget,
          budgetAmount,
          remaining,
          percentUsed,
          transactions: spend.transactions.map((t) => ({
            ...t,
            amount: Number(t.amount),
            occurredAt: t.occurredAt.toISOString(),
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
          })),
        }
      })

    return {
      totals: { income, expenses, savingsRate },
      categories: categoriesData,
      transactionCount: transactions.length,
    }
  }

  /**
   * Approve a budget suggestion on a report and apply the change.
   * - CREATE: creates a new recurring monthly budget via BudgetService.create
   * - UPDATE: updates an existing budget (and its definition when applicable)
   * Persists the suggestion status inside report.data.llm.budgetSuggestions if present.
   */
  static async approveBudgetSuggestion(
    householdId: string,
    params: {
      reportId: string
      suggestionId: string
      editedData?: {
        name?: string
        amount?: number
      }
    }
  ): Promise<TypedReport | null> {
    const report = await this.getById(householdId, params.reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    if (!report.data) {
      throw new Error('Report data not found')
    }

    const data = report.data // Already typed as ReportData
    const suggestions = data.llm?.budgetSuggestions ?? []
    const suggestion = suggestions.find((s) => s.id === params.suggestionId)

    if (!suggestion) {
      throw new Error('Suggestion not found')
    }

    const { BudgetService } = await import('./budget.service')

    if (suggestion.type === 'CREATE') {
      if (!suggestion.suggestion?.categoryId) {
        throw new Error('Missing categoryId for create suggestion')
      }

      if (!suggestion.suggestion?.startDate) {
        throw new Error('Missing startDate for create suggestion')
      }

      if (!suggestion.suggestion?.endDate) {
        throw new Error('Missing endDate for create suggestion')
      }

      const name = params.editedData?.name ?? suggestion.suggestion?.name
      const amount = params.editedData?.amount ?? suggestion.suggestion?.amount

      await BudgetService.create(householdId, {
        categoryId: suggestion.suggestion.categoryId,
        name,
        startDate: suggestion.suggestion.startDate,
        endDate: suggestion.suggestion.endDate,
        amount,
      })
    } else if (suggestion.type === 'UPDATE') {
      const budgetId = suggestion.budgetId

      if (!budgetId) {
        throw new Error('Missing budgetId for update suggestion')
      }

      const amount = params.editedData?.amount ?? suggestion.suggestion?.amount
      const name = params.editedData?.name ?? suggestion.suggestion?.name

      await BudgetService.update(householdId, budgetId, {
        amount,
        name,
      })
    }

    // Update suggestion status in report data
    const updatedSuggestions = suggestions.map((s) =>
      s.id === params.suggestionId
        ? { ...s, status: BudgetSuggestionStatus.APPROVED }
        : s
    )

    await this.setData(
      params.reportId,
      {
        ...data,
        llm: {
          ...data.llm,
          budgetSuggestions: updatedSuggestions,
        },
      },
      report.transactionCount ?? undefined
    )

    return this.getById(householdId, params.reportId)
  }

  /**
   * Reject a budget suggestion on a report.
   * Persists the suggestion status inside report.data.llm.budgetSuggestions if present.
   */
  static async rejectBudgetSuggestion(
    householdId: string,
    params: { reportId: string; suggestionId: string }
  ): Promise<TypedReport | null> {
    const report = await this.getById(householdId, params.reportId)
    if (!report) {
      throw new Error('Report not found')
    }

    if (!report.data) {
      throw new Error('Report data not found')
    }

    const data = report.data // Already typed as ReportData
    const suggestions = data.llm?.budgetSuggestions ?? []
    const suggestion = suggestions.find((s) => s.id === params.suggestionId)

    if (!suggestion) {
      throw new Error('Suggestion not found')
    }

    // Update suggestion status in report data
    const updatedSuggestions = suggestions.map((s) =>
      s.id === params.suggestionId
        ? { ...s, status: BudgetSuggestionStatus.REJECTED }
        : s
    )

    await this.setData(
      params.reportId,
      {
        ...data,
        llm: {
          ...data.llm,
          budgetSuggestions: updatedSuggestions,
        },
      },
      report.transactionCount ?? undefined
    )

    return this.getById(householdId, params.reportId)
  }

  private static async fetchTransactionsWithRelations(params: {
    householdId: string
    startDate: Date
    endDate: Date
  }): Promise<TransactionWithRelations[]> {
    return db.transaction.findMany({
      where: {
        householdId: params.householdId,
        occurredAt: { gte: params.startDate, lte: params.endDate },
      },
      include: { category: true, fromAccount: true, toAccount: true },
      orderBy: { occurredAt: 'desc' },
    })
  }

  private static mapTransactionsToData(
    transactions: TransactionWithRelations[]
  ): TransactionData[] {
    return transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      occurredAt: t.occurredAt.toISOString(),
      description: t.description,
      categoryId: t.categoryId,
      categoryName: t.category?.name || null,
    }))
  }

  private static getMonthRange(startDate: Date, endDate: Date) {
    const monthStart = new Date(startDate)
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const monthEnd = new Date(endDate)
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    monthEnd.setDate(0)
    monthEnd.setHours(23, 59, 59, 999)

    return { start: monthStart, end: monthEnd }
  }

  private static getPreviousMonthRange(startDate: Date) {
    const prevStart = new Date(startDate)
    prevStart.setMonth(prevStart.getMonth() - 1)
    prevStart.setDate(1)
    prevStart.setHours(0, 0, 0, 0)

    const prevEnd = new Date(startDate)
    prevEnd.setDate(0)
    prevEnd.setHours(23, 59, 59, 999)

    return { start: prevStart, end: prevEnd }
  }

  private static getRollingRange(endDate: Date, days: number) {
    const start = new Date(endDate)
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)

    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }
}
