import {
  type BudgetAdherenceBreakdown,
  type BudgetAdherenceScore,
  type BudgetCadence,
  type BudgetData,
  type CategoryData,
  type CategoryHistory,
  type CategoryTotal,
  type IncomeSourceMetric,
  type MonthlyReportAnalytics,
  type MonthAtGlanceMetrics,
  type ProjectionConfidence,
  type ProjectionStatus,
  type SpendingPatterns,
  type TransactionData,
  type WeeklyBudgetProjectionAnalytics,
  type WeeklyBudgetProjectionCategory,
} from '../types'

const MS_IN_DAY = 24 * 60 * 60 * 1000

interface BuildMonthlyAnalyticsParams {
  transactions: TransactionData[]
  previousTransactions?: TransactionData[]
  rollingTransactions?: TransactionData[]
  budgets: BudgetData[]
  categories: CategoryData[]
  startDate: Date
  endDate: Date
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const standardDeviation = (values: number[]) => {
  if (!values.length) return 0
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) /
    values.length
  return Math.sqrt(variance)
}

const percentageChange = (current: number, previous?: number | null) => {
  if (!previous || previous === 0) {
    return null
  }
  return ((current - previous) / previous) * 100
}

const getCategoryName = (
  categoryId: string | null,
  categories: CategoryData[],
  fallback?: string | null
) => {
  if (!categoryId) return fallback ?? 'Uncategorized'
  const match = categories.find((c) => c.id === categoryId)
  return match?.name ?? fallback ?? 'Uncategorized'
}

const sumByType = (transactions: TransactionData[], type: string) =>
  transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + t.amount, 0)

const groupExpensesByCategory = (
  transactions: TransactionData[],
  categories: CategoryData[]
) => {
  const map = new Map<
    string,
    { amount: number; count: number; name: string; categoryId: string }
  >()
  for (const txn of transactions) {
    if (txn.type !== 'EXPENSE') continue
    const key = txn.categoryId ?? 'uncategorized'
    const existing = map.get(key) ?? {
      amount: 0,
      count: 0,
      name: getCategoryName(
        key === 'uncategorized' ? null : key,
        categories,
        txn.categoryName
      ),
      categoryId: txn.categoryId ?? 'uncategorized',
    }
    existing.amount += txn.amount
    existing.count += 1
    map.set(key, existing)
  }
  return map
}

const buildMonthAtGlance = (
  transactions: TransactionData[],
  previousTransactions?: TransactionData[]
): MonthAtGlanceMetrics => {
  const totalIncome = sumByType(transactions, 'INCOME')
  const totalExpenses = sumByType(transactions, 'EXPENSE')
  const savingsAmount = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (savingsAmount / totalIncome) * 100 : 0

  const previousIncome = previousTransactions
    ? sumByType(previousTransactions, 'INCOME')
    : undefined
  const previousExpenses = previousTransactions
    ? sumByType(previousTransactions, 'EXPENSE')
    : undefined
  const previousSavingsRate =
    previousIncome && previousIncome > 0
      ? ((previousIncome - (previousExpenses ?? 0)) / previousIncome) * 100
      : undefined

  return {
    totalIncome,
    totalExpenses,
    savingsAmount,
    savingsRate,
    previousIncome,
    previousExpenses,
    previousSavingsRate,
  }
}

const buildCategoryTotals = (params: {
  transactions: TransactionData[]
  previousTransactions?: TransactionData[]
  categories: CategoryData[]
  budgets: BudgetData[]
}): CategoryTotal[] => {
  const { transactions, previousTransactions, categories, budgets } = params
  const currentMap = groupExpensesByCategory(transactions, categories)
  const previousMap = previousTransactions
    ? groupExpensesByCategory(previousTransactions, categories)
    : new Map()
  const budgetsByCategory = new Map(
    budgets.map((b) => [b.categoryId, Number(b.amount)])
  )

  return Array.from(currentMap.values())
    .sort((a, b) => b.amount - a.amount)
    .map((entry) => ({
      categoryId: entry.categoryId,
      name: entry.name,
      type: 'EXPENSE' as const,
      amount: entry.amount,
      previousAmount: previousMap.get(entry.categoryId)?.amount,
      changePct: percentageChange(
        entry.amount,
        previousMap.get(entry.categoryId)?.amount ?? null
      ),
      transactionCount: entry.count,
      hasBudget: budgetsByCategory.has(entry.categoryId),
      budgetAmount: budgetsByCategory.get(entry.categoryId) ?? null,
    }))
}

const buildCategoryHistory = (params: {
  currentTransactions: TransactionData[]
  rollingTransactions?: TransactionData[]
  categories: CategoryData[]
}): CategoryHistory[] => {
  const { currentTransactions, rollingTransactions, categories } = params
  const combined = [
    ...(rollingTransactions ?? []),
    ...currentTransactions.filter((t) => t.type === 'EXPENSE'),
  ]

  if (!combined.length) {
    return []
  }

  const timelineMap = new Map<
    string,
    { name: string; history: Map<string, number> }
  >()

  for (const txn of combined) {
    if (txn.type !== 'EXPENSE') continue
    const categoryId = txn.categoryId ?? 'uncategorized'
    const monthKey = txn.occurredAt.slice(0, 7)
    const existing = timelineMap.get(categoryId) ?? {
      name: getCategoryName(categoryId, categories, txn.categoryName),
      history: new Map<string, number>(),
    }
    existing.history.set(
      monthKey,
      (existing.history.get(monthKey) ?? 0) + txn.amount
    )
    timelineMap.set(categoryId, existing)
  }

  return Array.from(timelineMap.entries()).map(([categoryId, value]) => {
    const history = Array.from(value.history.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, amount]) => ({ month, amount }))

    const amounts = history.map((item) => item.amount)
    const average =
      amounts.length > 0
        ? amounts.reduce((sum, val) => sum + val, 0) / amounts.length
        : null
    const variance =
      amounts.length > 0
        ? amounts.reduce(
            (sum, val) => sum + Math.pow(val - (average ?? 0), 2),
            0
          ) / amounts.length
        : 0
    const stdDev = Math.sqrt(variance)
    const volatility =
      average && average !== 0 ? Number((stdDev / average).toFixed(3)) : null

    return {
      categoryId,
      name: value.name,
      history,
      average: average ? Number(average.toFixed(2)) : null,
      volatility,
    }
  })
}

const buildIncomeSources = (params: {
  transactions: TransactionData[]
  previousTransactions?: TransactionData[]
}): IncomeSourceMetric[] => {
  const { transactions, previousTransactions } = params
  const incomes = transactions.filter((t) => t.type === 'INCOME')
  const prevIncomes =
    previousTransactions?.filter((t) => t.type === 'INCOME') ?? []

  const currentMap = new Map<string, { amount: number; name: string }>()
  const prevMap = new Map<string, number>()

  for (const txn of incomes) {
    const key = txn.categoryId ?? 'income'
    const existing = currentMap.get(key) ?? {
      amount: 0,
      name: txn.categoryName ?? 'Income',
    }
    existing.amount += txn.amount
    currentMap.set(key, existing)
  }

  for (const txn of prevIncomes) {
    const key = txn.categoryId ?? 'income'
    prevMap.set(key, (prevMap.get(key) ?? 0) + txn.amount)
  }

  return Array.from(currentMap.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([categoryId, data]) => ({
      categoryId: categoryId === 'income' ? null : categoryId,
      name: data.name,
      amount: data.amount,
      changePct: percentageChange(data.amount, prevMap.get(categoryId) ?? null),
    }))
}

const calculateBudgetAdherence = (params: {
  transactions: TransactionData[]
  budgets: BudgetData[]
  categories: CategoryData[]
}): BudgetAdherenceScore => {
  const { transactions, budgets, categories } = params
  if (!budgets.length) {
    return { score: null, grade: null, breakdown: [] }
  }

  const expenseByCategory = groupExpensesByCategory(transactions, categories)

  const breakdown: BudgetAdherenceBreakdown[] = budgets.map((budget) => {
    const spent = expenseByCategory.get(budget.categoryId)?.amount ?? 0
    const ratio = budget.amount > 0 ? spent / budget.amount : 0
    let score = 100
    if (ratio > 1) {
      score -= Math.min(70, (ratio - 1) * 120)
    } else {
      score -= (1 - ratio) * 25
      score += Math.min(10, (1 - ratio) * 20)
    }
    score = clamp(score, 40, 100)
    let status: BudgetAdherenceBreakdown['status'] = 'ON_TRACK'
    if (ratio > 1.1) {
      status = 'OVER'
    } else if (ratio < 0.8) {
      status = 'UNDER'
    }
    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      categoryName: getCategoryName(budget.categoryId, categories, budget.name),
      budgeted: budget.amount,
      spent,
      ratio,
      status,
      score,
    }
  })

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0)
  const weightedScore =
    totalBudget > 0
      ? breakdown.reduce(
          (sum, item) => sum + item.score * (item.budgeted / totalBudget),
          0
        )
      : 0

  const grade =
    weightedScore >= 90
      ? 'A'
      : weightedScore >= 80
        ? 'B'
        : weightedScore >= 70
          ? 'C'
          : weightedScore >= 60
            ? 'D'
            : 'E'

  return {
    score: Number(weightedScore.toFixed(1)),
    grade,
    breakdown,
  }
}

const buildSpendingPatterns = (params: {
  transactions: TransactionData[]
  startDate: Date
  endDate: Date
}): SpendingPatterns => {
  const { transactions, startDate, endDate } = params
  const expenseTxns = transactions.filter((t) => t.type === 'EXPENSE')

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const byDayOfWeek = new Array(7).fill(0)
  let weekendTotal = 0
  let weekdayTotal = 0

  const msInDay = 24 * 60 * 60 * 1000
  const periodDays =
    Math.floor((endDate.getTime() - startDate.getTime()) / msInDay) + 1

  for (const txn of expenseTxns) {
    const date = new Date(txn.occurredAt)
    const dayIndex = (date.getDay() + 6) % 7 // convert to 0=Mon
    byDayOfWeek[dayIndex] += txn.amount
    if (dayIndex >= 5) weekendTotal += txn.amount
    else weekdayTotal += txn.amount
  }

  const weeklyTotals: { weekLabel: string; amount: number }[] = []
  const cursor = new Date(startDate)
  let weekIndex = 1
  while (cursor <= endDate) {
    const weekStart = new Date(cursor)
    const weekEnd = new Date(cursor)
    weekEnd.setDate(weekEnd.getDate() + 6)
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime())
    const amount = expenseTxns
      .filter((txn) => {
        const date = new Date(txn.occurredAt)
        return date >= weekStart && date <= weekEnd
      })
      .reduce((sum, txn) => sum + txn.amount, 0)
    weeklyTotals.push({
      weekLabel: `Week ${weekIndex}`,
      amount,
    })
    weekIndex += 1
    cursor.setDate(cursor.getDate() + 7)
  }

  const lastSevenStart = new Date(endDate)
  lastSevenStart.setDate(endDate.getDate() - 6)
  const lastSevenDaysTotal = expenseTxns
    .filter((txn) => new Date(txn.occurredAt) >= lastSevenStart)
    .reduce((sum, txn) => sum + txn.amount, 0)

  const priorDays = Math.max(0, periodDays - 7)
  const priorSpend =
    expenseTxns.reduce((sum, txn) => sum + txn.amount, 0) - lastSevenDaysTotal
  const priorPeriods = Math.max(1, priorDays / 7)
  const averageSevenDay =
    priorDays > 0 ? priorSpend / priorPeriods : lastSevenDaysTotal

  return {
    byDayOfWeek: byDayOfWeek.map((amount, index) => ({
      dayIndex: index,
      label: dayLabels[index],
      amount,
    })),
    weekendVsWeekday: {
      weekend: weekendTotal,
      weekday: weekdayTotal,
    },
    weeklyTotals,
    lastSevenDaysTotal,
    averageSevenDay,
  }
}

interface BuildCategoryCadenceParams {
  transactions?: TransactionData[]
}

interface CategoryCadenceSummary {
  cadence: BudgetCadence
  confidence: ProjectionConfidence
  monthsObserved: number
  averageMonthlyCount: number
  averageMonthlyAmount: number
}

const buildCategoryCadenceMap = ({
  transactions,
}: BuildCategoryCadenceParams) => {
  const result = new Map<string, CategoryCadenceSummary>()
  if (!transactions?.length) return result

  const monthMap = new Map<
    string,
    Map<
      string,
      {
        amount: number
        count: number
      }
    >
  >()

  for (const txn of transactions) {
    if (txn.type !== 'EXPENSE') continue
    const categoryId = txn.categoryId ?? 'uncategorized'
    const monthKey = txn.occurredAt.slice(0, 7)
    const existingCategory = monthMap.get(categoryId) ?? new Map()
    const existingMonth =
      existingCategory.get(monthKey) ??
      ({ amount: 0, count: 0 } as {
        amount: number
        count: number
      })
    existingMonth.amount += txn.amount
    existingMonth.count += 1
    existingCategory.set(monthKey, existingMonth)
    monthMap.set(categoryId, existingCategory)
  }

  const determineCadence = (stats: {
    monthsObserved: number
    averageMonthlyCount: number
    averageMonthlyAmount: number
    singleTxnRatio: number
    amountVolatility: number
  }): BudgetCadence => {
    if (stats.monthsObserved < 2) return 'UNKNOWN'
    if (
      stats.averageMonthlyCount <= 1.2 ||
      stats.singleTxnRatio >= 0.65 ||
      stats.amountVolatility >= 0.8
    ) {
      return 'LUMPY'
    }
    if (
      stats.averageMonthlyCount >= 3 ||
      (stats.averageMonthlyCount >= 2 && stats.amountVolatility <= 0.45)
    ) {
      return 'STEADY'
    }
    return 'UNKNOWN'
  }

  for (const [categoryId, months] of monthMap.entries()) {
    const monthEntries = Array.from(months.values())
    const monthsObserved = monthEntries.length
    if (!monthsObserved) continue

    const totalAmount = monthEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0
    )
    const totalCount = monthEntries.reduce((sum, entry) => sum + entry.count, 0)
    const averageMonthlyAmount = totalAmount / monthsObserved
    const averageMonthlyCount = totalCount / monthsObserved
    const amounts = monthEntries.map((entry) => entry.amount)
    const amountVolatility =
      averageMonthlyAmount > 0
        ? standardDeviation(amounts) / averageMonthlyAmount
        : 0
    const singleTxnRatio =
      monthEntries.filter((entry) => entry.count <= 1).length / monthsObserved

    const cadence = determineCadence({
      monthsObserved,
      averageMonthlyCount,
      averageMonthlyAmount,
      singleTxnRatio,
      amountVolatility,
    })

    const confidence: ProjectionConfidence =
      monthsObserved >= 4 ? 'HIGH' : monthsObserved >= 2 ? 'MEDIUM' : 'LOW'

    result.set(categoryId, {
      cadence,
      confidence,
      monthsObserved,
      averageMonthlyAmount,
      averageMonthlyCount,
    })
  }

  return result
}

interface BuildWeeklyBudgetProjectionParams {
  weeklyTransactions: TransactionData[]
  monthlyTransactions: TransactionData[]
  rollingTransactions?: TransactionData[]
  budgets: BudgetData[]
  categories: CategoryData[]
  startDate: Date
  endDate: Date
}

const sumExpensesByCategory = (transactions: TransactionData[]) => {
  const map = new Map<string, number>()
  for (const txn of transactions) {
    if (txn.type !== 'EXPENSE') continue
    const categoryId = txn.categoryId ?? 'uncategorized'
    map.set(categoryId, (map.get(categoryId) ?? 0) + txn.amount)
  }
  return map
}

const determinePacingStatus = (
  projected: number | null,
  actual: number,
  budgetAmount: number,
  cadence: BudgetCadence
): ProjectionStatus => {
  if (cadence === 'LUMPY') return 'LUMPY'
  if (projected === null) return 'INSUFFICIENT_DATA'
  if (actual >= budgetAmount) return 'OVER'
  if (projected > budgetAmount * 1.1) return 'OVER'
  if (projected > budgetAmount * 1.02) return 'AT_RISK'
  return 'ON_TRACK'
}

export const buildWeeklyBudgetProjections = (
  params: BuildWeeklyBudgetProjectionParams
): WeeklyBudgetProjectionAnalytics | null => {
  const {
    weeklyTransactions,
    monthlyTransactions,
    rollingTransactions,
    budgets,
    categories,
    startDate,
    endDate,
  } = params

  // Get all categories that have transactions this week
  const weeklyExpenses = sumExpensesByCategory(weeklyTransactions)
  const monthlyExpenses = sumExpensesByCategory(monthlyTransactions)

  // If no transactions this week, return null
  if (weeklyExpenses.size === 0) {
    return null
  }

  const cadenceMap = buildCategoryCadenceMap({
    transactions: rollingTransactions,
  })

  // Create a map of budgets by categoryId for quick lookup
  const budgetMap = new Map(
    budgets.map((budget) => [budget.categoryId, budget])
  )

  const monthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
  const daysInMonth = new Date(
    endDate.getFullYear(),
    endDate.getMonth() + 1,
    0
  ).getDate()
  const daysIntoMonth = Math.min(
    daysInMonth,
    Math.max(
      1,
      Math.floor((endDate.getTime() - monthStart.getTime()) / MS_IN_DAY) + 1
    )
  )
  const daysRemaining = Math.max(0, daysInMonth - daysIntoMonth)
  const elapsedRatio = Math.min(1, daysIntoMonth / daysInMonth)
  const weeklyPeriodDays = Math.max(
    1,
    Math.floor((endDate.getTime() - startDate.getTime()) / MS_IN_DAY) + 1
  )

  // Process all categories with transactions this week
  const allCategories: WeeklyBudgetProjectionCategory[] = Array.from(
    weeklyExpenses.keys()
  ).map((categoryId) => {
    const budget = budgetMap.get(categoryId)
    const categoryName = getCategoryName(categoryId, categories, budget?.name)
    const spentThisWeek = weeklyExpenses.get(categoryId) ?? 0
    const spentThisMonth = monthlyExpenses.get(categoryId) ?? 0
    const cadenceSummary = cadenceMap.get(categoryId)
    const cadence = cadenceSummary?.cadence ?? 'UNKNOWN'
    let confidence = cadenceSummary?.confidence ?? 'LOW'
    let projectedMonthEnd: number | null = null
    let notes: string | null = null
    const budgetAmount = budget?.amount ?? 0

    const monthDailyRate =
      daysIntoMonth > 0 ? spentThisMonth / daysIntoMonth : 0
    const weekDailyRate =
      weeklyPeriodDays > 0 ? spentThisWeek / weeklyPeriodDays : 0
    const blendedDailyRate =
      cadence === 'STEADY'
        ? monthDailyRate * 0.6 + weekDailyRate * 0.4
        : monthDailyRate * 0.8 + weekDailyRate * 0.2

    if (cadence === 'LUMPY') {
      notes =
        'Large or irregular monthly payments detected. Monitoring actual spend.'
      projectedMonthEnd = null
      confidence = 'LOW'
    } else if (spentThisMonth === 0 && spentThisWeek === 0) {
      notes = 'No spending recorded yet for this month.'
      projectedMonthEnd = null
      confidence = 'LOW'
    } else if (daysIntoMonth < 3) {
      notes = 'Too early in the month to project confidently.'
      projectedMonthEnd = null
      confidence = 'LOW'
    } else {
      projectedMonthEnd = Number((blendedDailyRate * daysInMonth).toFixed(2))
    }

    // For categories without budgets, set variance to null
    const projectedVariance =
      budget && projectedMonthEnd !== null
        ? Number((projectedMonthEnd - budgetAmount).toFixed(2))
        : null

    // For categories without budgets, use INSUFFICIENT_DATA status
    const pacingStatus = budget
      ? determinePacingStatus(
          projectedMonthEnd,
          spentThisMonth,
          budgetAmount,
          cadence
        )
      : 'INSUFFICIENT_DATA'

    // Only check expected spend if there's a budget
    if (budget) {
      const expectedSpend = budgetAmount * elapsedRatio
      if (
        projectedMonthEnd === null &&
        cadence !== 'LUMPY' &&
        spentThisMonth > expectedSpend * 1.15
      ) {
        notes =
          'Spending is already ahead of the expected pace even without a projection.'
      }
    } else {
      notes = 'No budget set for this category'
    }

    return {
      budgetId: budget?.id ?? '',
      categoryId,
      categoryName,
      budgetAmount,
      spentThisWeek: Number(spentThisWeek.toFixed(2)),
      spentThisMonth: Number(spentThisMonth.toFixed(2)),
      projectedMonthEnd,
      projectedVariance,
      pacingStatus,
      cadence,
      confidence,
      notes,
    }
  })

  // Calculate summary: totalBudget only includes categories with budgets
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)

  // actualMonthToDate includes all categories (with and without budgets)
  const actualMonthToDate = allCategories.reduce(
    (sum, category) => sum + category.spentThisMonth,
    0
  )

  // projectedMonthEndTotal includes all categories (with and without budgets)
  const projectedMonthEndTotal = allCategories.some(
    (category) => category.projectedMonthEnd !== null
  )
    ? Number(
        allCategories
          .reduce(
            (sum, category) =>
              sum + (category.projectedMonthEnd ?? category.spentThisMonth),
            0
          )
          .toFixed(2)
      )
    : null

  // projectedVariance only makes sense if we have budgets to compare against
  const projectedVariance =
    totalBudget > 0 && projectedMonthEndTotal !== null
      ? Number((projectedMonthEndTotal - totalBudget).toFixed(2))
      : null

  return {
    generatedAt: new Date().toISOString(),
    daysIntoMonth,
    daysRemaining,
    daysInMonth,
    categories: allCategories,
    summary: {
      projectedMonthEndTotal,
      actualMonthToDate: Number(actualMonthToDate.toFixed(2)),
      totalBudget: Number(totalBudget.toFixed(2)),
      projectedVariance,
    },
  }
}

export function buildMonthlyAnalytics(
  params: BuildMonthlyAnalyticsParams
): MonthlyReportAnalytics {
  const {
    transactions,
    previousTransactions,
    rollingTransactions,
    budgets,
    categories,
    startDate,
    endDate,
  } = params

  const monthAtGlance = buildMonthAtGlance(transactions, previousTransactions)

  const categoryTotals = buildCategoryTotals({
    transactions,
    previousTransactions,
    categories,
    budgets,
  })

  const categoryHistory = buildCategoryHistory({
    currentTransactions: transactions,
    rollingTransactions,
    categories,
  })

  const incomeSources = buildIncomeSources({
    transactions,
    previousTransactions,
  })

  const budgetAdherence = calculateBudgetAdherence({
    transactions,
    budgets,
    categories,
  })

  const spendingPatterns = buildSpendingPatterns({
    transactions,
    startDate,
    endDate,
  })

  return {
    monthAtGlance,
    categoryTotals,
    categoryHistory,
    incomeSources,
    budgetAdherence,
    spendingPatterns,
  }
}
