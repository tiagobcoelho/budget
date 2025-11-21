import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ReportPeriod } from '@prisma/client'
import { db } from '@/db'
import { HouseholdService } from '@/services/household.service'
import { ReportService } from '@/services/report.service'
import {
  reportDataSchema,
  type ReportData,
} from '@/server/trpc/schemas/report.schema'
import {
  BudgetSuggestionStatus,
  type AccountData,
  type BudgetData,
  type CategoryData,
  type GeneratedReport,
  type TransactionData,
} from '@/services/report-generation.service/types'

type PeriodicReportGenerator = (
  householdId: string,
  startDate: Date,
  endDate: Date,
  transactions: TransactionData[],
  categories: CategoryData[],
  budgets: BudgetData[],
  accounts: AccountData[],
  currency: string,
  monthlyTransactions?: TransactionData[]
) => Promise<GeneratedReport>

interface HandlerConfig {
  period: ReportPeriod
  label: string
  generateReport: PeriodicReportGenerator
}

export function createPeriodicReportHandler({
  period,
  label,
  generateReport,
}: HandlerConfig) {
  return async function POST(req: NextRequest) {
    try {
      const { userId: clerkId } = await auth()

      if (!clerkId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const user = await db.user.findUnique({
        where: { clerkId },
        include: { preference: true },
      })

      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const household = await HouseholdService.getByUserId(user.id)
      if (!household) {
        return new Response(JSON.stringify({ error: 'Household not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const currency = user.preference?.defaultCurrencyCode || 'USD'

      const body = await req.json()
      const { reportId } = body ?? {}

      if (!reportId) {
        return new Response(
          JSON.stringify({ error: 'Report ID is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      const report = await ReportService.getById(household.id, reportId)
      if (!report) {
        return new Response(JSON.stringify({ error: 'Report not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (report.period !== period) {
        return new Response(
          JSON.stringify({
            error: `Report period mismatch. Expected ${period}, got ${report.period}.`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      await ReportService.updateStatus(reportId, 'GENERATING')

      void (async () => {
        try {
          const startDate = new Date(report.startDate)
          const endDate = new Date(report.endDate)

          // For weekly reports, also fetch monthly transactions and budgets for context
          let monthlyTransactions: TransactionData[] = []
          let monthStart: Date | null = null
          let monthEnd: Date | null = null

          if (period === ReportPeriod.WEEKLY) {
            // Calculate month boundaries
            monthStart = new Date(startDate)
            monthStart.setDate(1)
            monthStart.setHours(0, 0, 0, 0)
            monthEnd = new Date(endDate)
            monthEnd.setMonth(monthEnd.getMonth() + 1)
            monthEnd.setDate(0)
            monthEnd.setHours(23, 59, 59, 999)

            const monthlyTxns = await db.transaction.findMany({
              where: {
                householdId: household.id,
                occurredAt: { gte: monthStart, lte: monthEnd },
              },
              include: { category: true, fromAccount: true, toAccount: true },
              orderBy: { occurredAt: 'desc' },
            })

            monthlyTransactions = monthlyTxns.map((t) => ({
              id: t.id,
              type: t.type,
              amount: Number(t.amount),
              occurredAt: t.occurredAt.toISOString(),
              description: t.description,
              categoryId: t.categoryId,
              categoryName: t.category?.name || null,
            }))
          }

          const [transactions, categories, accounts, budgets] =
            await Promise.all([
              db.transaction.findMany({
                where: {
                  householdId: household.id,
                  occurredAt: { gte: startDate, lte: endDate },
                },
                include: { category: true, fromAccount: true, toAccount: true },
                orderBy: { occurredAt: 'desc' },
              }),
              db.category.findMany({ where: { householdId: household.id } }),
              db.account.findMany({ where: { householdId: household.id } }),
              // For weekly reports, fetch budgets for the entire month, not just the week
              db.budget.findMany({
                where: {
                  householdId: household.id,
                  AND: [
                    {
                      startDate: {
                        lte:
                          period === ReportPeriod.WEEKLY && monthEnd
                            ? monthEnd
                            : endDate,
                      },
                    },
                    {
                      endDate: {
                        gte:
                          period === ReportPeriod.WEEKLY && monthStart
                            ? monthStart
                            : startDate,
                      },
                    },
                  ],
                },
                include: { category: true },
              }),
            ])

          const incompleteTransactions = transactions.filter((t) => {
            if (t.type === 'EXPENSE') {
              return !t.fromAccountId
            }
            if (t.type === 'INCOME') {
              return !t.toAccountId
            }
            if (t.type === 'TRANSFER') {
              return !t.fromAccountId || !t.toAccountId
            }
            return false
          })

          if (incompleteTransactions.length > 0) {
            console.warn(
              `Warning: ${incompleteTransactions.length} transaction${
                incompleteTransactions.length !== 1 ? 's' : ''
              } in this period ${
                incompleteTransactions.length !== 1 ? 'are' : 'is'
              } missing required account information.`
            )
          }

          const snapshot = await ReportService.computeSnapshot(
            household.id,
            startDate,
            endDate
          )

          const transactionData: TransactionData[] = transactions.map((t) => ({
            id: t.id,
            type: t.type,
            amount: Number(t.amount),
            occurredAt: t.occurredAt.toISOString(),
            description: t.description,
            categoryId: t.categoryId,
            categoryName: t.category?.name || null,
          }))

          const categoryData: CategoryData[] = categories.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
          }))

          const accountData: AccountData[] = accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
          }))

          const budgetData: BudgetData[] = budgets
            .filter((b) => !!b.categoryId)
            .map((b) => ({
              id: b.id,
              name: b.name,
              categoryId: b.categoryId!,
              startDate: b.startDate.toISOString().split('T')[0],
              endDate: b.endDate.toISOString().split('T')[0],
              amount: Number(b.amount),
            }))

          const generatedContent = await generateReport(
            household.id,
            startDate,
            endDate,
            transactionData,
            categoryData,
            budgetData,
            accountData,
            currency,
            period === ReportPeriod.WEEKLY ? monthlyTransactions : undefined
          )

          const budgetSuggestions =
            generatedContent?.budgetSuggestions?.map((suggestion) => ({
              ...suggestion,
              status: suggestion.status ?? BudgetSuggestionStatus.PENDING,
            })) ?? []

          const data: ReportData = {
            totals: snapshot.totals,
            categories: snapshot.categories,
            llm: {
              summary: generatedContent?.summary ?? [],
              insights: generatedContent?.insights ?? [],
              suggestionsText: generatedContent?.recommendations ?? [],
              budgetSuggestions,
            },
            meta: {
              currencyCode: currency,
              label,
            },
          }

          reportDataSchema.parse(data)
          await ReportService.setData(reportId, data, snapshot.transactionCount)

          await ReportService.updateStatus(reportId, 'COMPLETED')
        } catch (error) {
          console.error(`Error generating ${label.toLowerCase()}:`, error)
          await ReportService.updateStatus(reportId, 'FAILED')
        }
      })()

      return new Response(
        JSON.stringify({
          success: true,
          reportId,
          message: `${label} generation started`,
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (error) {
      console.error('Error in periodic report generation API:', error)
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}
