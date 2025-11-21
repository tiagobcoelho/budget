import { db } from '@/db'
import {
  calculatePeriodBounds,
  normalizePeriodStart,
} from '@/lib/budget/period'
import { ReportPeriod } from '@prisma/client'
import { BudgetRolloverService } from './budget-rollover.service'

type ReportOpportunity = {
  period: ReportPeriod
  startDate: string
  endDate: string
  transactionCount: number
}

type ListOpportunitiesResult = {
  monthly: ReportOpportunity[]
  weekly?: ReportOpportunity | null
}

export class ReportOpportunityService {
  static async list(householdId: string): Promise<ListOpportunitiesResult> {
    const [latestReviewedTxn, earliestReviewedTxn] = await Promise.all([
      db.transaction.findFirst({
        where: { householdId, reviewed: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        select: { occurredAt: true },
      }),
      db.transaction.findFirst({
        where: { householdId, reviewed: true },
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        select: { occurredAt: true },
      }),
    ])

    if (!latestReviewedTxn) {
      return { monthly: [], weekly: null }
    }

    const budgetStartDay =
      await BudgetRolloverService.getBudgetStartDay(householdId)

    const [monthly, weekly] = await Promise.all([
      this.getMonthlyOpportunities({
        householdId,
        budgetStartDay,
        latestReviewedDate: latestReviewedTxn.occurredAt,
        earliestReviewedDate: earliestReviewedTxn?.occurredAt ?? null,
      }),
      this.getWeeklyOpportunity({
        householdId,
      }),
    ])

    return {
      monthly,
      weekly,
    }
  }

  private static async getMonthlyOpportunities(args: {
    householdId: string
    budgetStartDay: number
    earliestReviewedDate: Date | null
    latestReviewedDate: Date
  }): Promise<ReportOpportunity[]> {
    const {
      householdId,
      budgetStartDay,
      earliestReviewedDate,
      latestReviewedDate,
    } = args

    const latestBounds = calculatePeriodBounds(
      latestReviewedDate,
      budgetStartDay
    )
    const latestStart = latestBounds.start

    const lastReport = await db.report.findFirst({
      where: { householdId, period: 'MONTHLY' },
      orderBy: [{ endDate: 'desc' }, { createdAt: 'desc' }],
      select: { startDate: true, endDate: true },
    })

    let seedDate: Date | null = null
    if (lastReport) {
      const nextDay = new Date(lastReport.endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      seedDate = nextDay
    } else if (earliestReviewedDate) {
      seedDate = earliestReviewedDate
    }

    if (!seedDate) {
      return []
    }

    let currentStart = calculatePeriodBounds(seedDate, budgetStartDay).start
    if (
      lastReport &&
      currentStart.getTime() === new Date(lastReport.startDate).getTime()
    ) {
      currentStart = this.addMonth(currentStart, budgetStartDay)
    }

    const opportunities: ReportOpportunity[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxPeriods = 24

    while (
      currentStart.getTime() <= latestStart.getTime() &&
      opportunities.length < maxPeriods
    ) {
      const { end: currentEnd } = calculatePeriodBounds(
        currentStart,
        budgetStartDay
      )

      const periodEndDateOnly = new Date(currentEnd)
      periodEndDateOnly.setHours(0, 0, 0, 0)

      if (periodEndDateOnly >= today) {
        break
      }

      const [transactionCount, hasUnreviewed, existingReport] =
        await Promise.all([
          db.transaction.count({
            where: {
              householdId,
              occurredAt: {
                gte: currentStart,
                lte: currentEnd,
              },
            },
          }),
          db.transaction.findFirst({
            where: {
              householdId,
              reviewed: false,
              occurredAt: {
                gte: currentStart,
                lte: currentEnd,
              },
            },
            select: { id: true },
          }),
          db.report.findFirst({
            where: {
              householdId,
              startDate: { lte: currentStart },
              endDate: { gte: periodEndDateOnly },
              status: { not: 'FAILED' },
            },
            select: { id: true },
          }),
        ])

      if (transactionCount > 0 && !hasUnreviewed && !existingReport) {
        opportunities.push({
          period: 'MONTHLY',
          startDate: currentStart.toISOString(),
          endDate: currentEnd.toISOString(),
          transactionCount,
        })
      }

      currentStart = this.addMonth(currentStart, budgetStartDay)
    }

    return opportunities
  }

  private static async getWeeklyOpportunity(args: {
    householdId: string
  }): Promise<ReportOpportunity | null> {
    const { householdId } = args

    const weekBounds = this.getLastCompletedWeek()
    if (!weekBounds) {
      return null
    }

    const { start, end } = weekBounds

    const [transactionCount, hasUnreviewed, existingReport] = await Promise.all(
      [
        db.transaction.count({
          where: {
            householdId,
            occurredAt: {
              gte: start,
              lte: end,
            },
          },
        }),
        db.transaction.findFirst({
          where: {
            householdId,
            reviewed: false,
            occurredAt: {
              gte: start,
              lte: end,
            },
          },
          select: { id: true },
        }),
        db.report.findFirst({
          where: {
            householdId,
            period: 'WEEKLY',
            startDate: start,
            endDate: end,
          },
          select: { id: true },
        }),
      ]
    )

    if (transactionCount === 0 || hasUnreviewed || existingReport) {
      return null
    }

    return {
      period: 'WEEKLY',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      transactionCount,
    }
  }

  private static getLastCompletedWeek(referenceDate = new Date()) {
    const reference = new Date(referenceDate)
    reference.setHours(0, 0, 0, 0)

    const dayOfWeek = reference.getDay()
    const normalizedDay = dayOfWeek === 0 ? 7 : dayOfWeek

    const end = new Date(reference)
    end.setDate(reference.getDate() - normalizedDay)
    end.setHours(23, 59, 59, 999)

    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    start.setHours(0, 0, 0, 0)

    if (start > end) {
      return null
    }

    return { start, end }
  }

  private static addMonth(start: Date, budgetStartDay: number): Date {
    const next = new Date(start)
    next.setMonth(next.getMonth() + 1)
    return normalizePeriodStart(next, budgetStartDay)
  }
}
