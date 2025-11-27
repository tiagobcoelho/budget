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
  type BaseGeneratedReport,
  type CategoryData,
  type GeneratedReportWithBudgets,
  type GeneratedReportWithNarratives,
  type WeeklyGuidanceReport,
  type ReportGenerationContext,
  type TransactionData,
  type AugmentedGeneratedReport,
} from '@/services/report-generation.service/types'
import {
  formatFinancialProfileForPrompt,
  generateUpdatedFinancialProfile,
  type FinancialProfile,
} from '@/services/financial-profile.service'
import { InputJsonValue } from '@prisma/client/runtime/library'

type PeriodicReportGenerator<TReport extends BaseGeneratedReport> = (
  householdId: string,
  startDate: Date,
  endDate: Date,
  transactions: TransactionData[],
  categories: CategoryData[],
  budgets: BudgetData[],
  accounts: AccountData[],
  currency: string,
  profileMemory: string,
  context?: ReportGenerationContext
) => Promise<AugmentedGeneratedReport<TReport>>

interface HandlerConfig<TReport extends BaseGeneratedReport> {
  period: ReportPeriod
  label: string
  generateReport: PeriodicReportGenerator<TReport>
}

function reportHasBudgetSuggestions(
  report: BaseGeneratedReport
): report is GeneratedReportWithBudgets {
  return Array.isArray(
    (report as Partial<GeneratedReportWithBudgets>).budgetSuggestions
  )
}

function reportHasNarratives(
  report: BaseGeneratedReport
): report is GeneratedReportWithNarratives {
  return (
    'behaviorPatterns' in report ||
    'risks' in report ||
    'opportunities' in report
  )
}

function reportHasWeeklyGuidance(
  report: BaseGeneratedReport
): report is WeeklyGuidanceReport {
  return 'potentialIssues' in report || 'recommendedActions' in report
}

export function createPeriodicReportHandler<
  TReport extends BaseGeneratedReport,
>({ period, label, generateReport }: HandlerConfig<TReport>) {
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

          const generationData = await ReportService.getGenerationData({
            householdId: household.id,
            period,
            startDate,
            endDate,
          })

          const {
            transactions,
            categories,
            accounts,
            budgets,
            monthlyTransactions,
            previousPeriodTransactions,
            rollingTransactions,
            financialProfile: householdFinancialProfile,
          } = generationData

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
            endDate,
            {
              transactions,
              categories,
              budgets,
            }
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

          const existingFinancialProfile =
            (householdFinancialProfile as FinancialProfile | null) ?? null
          const profileMemory = formatFinancialProfileForPrompt(
            existingFinancialProfile
          )

          const reportContext =
            period === ReportPeriod.WEEKLY
              ? {
                  monthlyTransactions,
                  rollingTransactions,
                }
              : period === ReportPeriod.MONTHLY
                ? {
                    previousPeriodTransactions,
                    rollingTransactions,
                  }
                : undefined

          const generatedContent = await generateReport(
            household.id,
            startDate,
            endDate,
            transactionData,
            categoryData,
            budgetData,
            accountData,
            currency,
            profileMemory,
            reportContext
          )

          const budgetSuggestions = reportHasBudgetSuggestions(generatedContent)
            ? generatedContent.budgetSuggestions.map((suggestion) => ({
                ...suggestion,
                status: suggestion.status ?? BudgetSuggestionStatus.PENDING,
              }))
            : []

          const data: ReportData = {
            totals: snapshot.totals,
            categories: snapshot.categories,
            llm: {
              budgetSuggestions,
              behaviorPatterns: reportHasNarratives(generatedContent)
                ? (generatedContent.behaviorPatterns ?? null)
                : null,
              risks: reportHasNarratives(generatedContent)
                ? (generatedContent.risks ?? null)
                : null,
              opportunities: reportHasNarratives(generatedContent)
                ? (generatedContent.opportunities ?? null)
                : null,
              potentialIssues: reportHasWeeklyGuidance(generatedContent)
                ? (generatedContent.potentialIssues ?? null)
                : null,
              recommendedActions: reportHasWeeklyGuidance(generatedContent)
                ? (generatedContent.recommendedActions ?? null)
                : null,
            },
            meta: {
              currencyCode: currency,
              label,
            },
            analytics: generatedContent?.analytics,
          }

          reportDataSchema.parse(data)
          await ReportService.setData(reportId, data, snapshot.transactionCount)

          try {
            const updatedProfile = await generateUpdatedFinancialProfile({
              existingProfile: existingFinancialProfile,
              startDate,
              endDate,
              currency,
              transactions: transactionData,
              categories: categoryData,
              budgets: budgetData,
              accounts: accountData,
              householdName: household.name,
            })

            await db.household.update({
              where: { id: household.id },
              data: { financialProfile: updatedProfile as InputJsonValue },
            })
          } catch (profileError) {
            console.error(
              'Failed to refresh household financial profile',
              profileError
            )
          }

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
