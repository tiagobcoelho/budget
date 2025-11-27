import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { ReportService } from '@/services/report.service'
import { generateInitialReport } from '@/services/report-generation.service/initial'
import { generateUpdatedFinancialProfile } from '@/services/financial-profile.service'
import { HouseholdService } from '@/services/household.service'
import {
  reportDataSchema,
  type ReportData,
} from '@/server/trpc/schemas/report.schema'
import { BudgetSuggestionType } from '@/services/report-generation.service/types'
import { BudgetService } from '@/services/budget.service'
import { randomUUID } from 'crypto'
import { InputJsonValue } from '@prisma/client/runtime/library'

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user from database with preferences
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

    // Get user's household
    const household = await HouseholdService.getByUserId(user.id)
    if (!household) {
      return new Response(JSON.stringify({ error: 'Household not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user's preferences
    const currency = user.preference?.defaultCurrencyCode || 'USD'

    const body = await req.json()
    const { reportId } = body

    if (!reportId) {
      return new Response(JSON.stringify({ error: 'Report ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get report
    const report = await ReportService.getById(household.id, reportId)
    if (!report) {
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update status to GENERATING
    await ReportService.updateStatus(reportId, 'GENERATING')

    // Return immediately and process in background
    // This allows the generation to continue even if the client disconnects
    void (async () => {
      try {
        const startDate = new Date(report.startDate)
        const endDate = new Date(report.endDate)

        // Fetch all necessary data
        const [transactions, categories, accounts] = await Promise.all([
          db.transaction.findMany({
            where: {
              householdId: household.id,
              occurredAt: { gte: startDate, lte: endDate },
            },
            include: { category: true, fromAccount: true, toAccount: true },
            orderBy: { occurredAt: 'desc' },
          }),
          db.category.findMany({
            where: { householdId: household.id },
          }),
          db.account.findMany({
            where: { householdId: household.id },
          }),
        ])

        // Check for incomplete transactions
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

        const incompleteCount = incompleteTransactions.length
        if (incompleteCount > 0) {
          console.warn(
            `Warning: ${incompleteCount} transaction${incompleteCount !== 1 ? 's' : ''} in this period ${incompleteCount !== 1 ? 'are' : 'is'} missing required account information.`
          )
        }

        // Compute totals + categories via the service
        const snapshot = await ReportService.computeSnapshot(
          household.id,
          startDate,
          endDate
        )

        // Prepare inputs for LLM in the route
        const transactionData = transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          occurredAt: t.occurredAt.toISOString(),
          description: t.description,
          categoryId: t.categoryId,
          categoryName: t.category?.name || null,
        }))
        const categoryData = categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }))

        const accountData = accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
        }))

        const generatedContent = await generateInitialReport(
          startDate,
          endDate,
          transactionData,
          categoryData,
          accountData,
          currency
        )

        // Add unique IDs to budget suggestions
        const createSuggestions =
          generatedContent?.budgetSuggestions
            .map((suggestion) => ({
              ...suggestion,
              id: randomUUID(),
            }))
            .filter(
              (suggestion) =>
                suggestion.type === BudgetSuggestionType.CREATE &&
                !!suggestion.suggestion
            ) ?? []

        const budgetSuggestionsWithBudgets =
          createSuggestions.length > 0
            ? await Promise.all(
                createSuggestions.map(async (suggestion) => {
                  const suggestionData = suggestion.suggestion
                  if (!suggestionData) {
                    return suggestion
                  }

                  try {
                    const createdBudget = await BudgetService.create(
                      household.id,
                      {
                        categoryId: suggestionData.categoryId,
                        name: suggestionData.name,
                        startDate: suggestionData.startDate,
                        endDate: suggestionData.endDate,
                        amount: suggestionData.amount,
                      }
                    )

                    if (createdBudget) {
                      return {
                        ...suggestion,
                        budgetId: createdBudget.id,
                        currentBudget: {
                          name: createdBudget.name,
                          categoryId: createdBudget.categoryId,
                          amount: Number(createdBudget.amount),
                        },
                      }
                    }
                  } catch (e) {
                    console.warn('Failed to create budget from suggestion', {
                      suggestion,
                      error: e instanceof Error ? e.message : e,
                    })
                  }

                  return suggestion
                })
              )
            : createSuggestions

        const data: ReportData = {
          totals: snapshot.totals,
          categories: snapshot.categories,
          llm: {
            budgetSuggestions: budgetSuggestionsWithBudgets,
            behaviorPatterns: generatedContent?.behaviorPatterns ?? null,
            risks: generatedContent?.risks ?? null,
            opportunities: generatedContent?.opportunities ?? null,
          },
          meta: { currencyCode: currency },
        }

        reportDataSchema.parse(data)
        await ReportService.setData(reportId, data, snapshot.transactionCount)

        try {
          const updatedProfile = await generateUpdatedFinancialProfile({
            existingProfile: null,
            startDate,
            endDate,
            currency,
            transactions: transactionData,
            categories: categoryData,
            budgets: [],
            accounts: accountData,
            householdName: household.name,
          })

          await db.household.update({
            where: { id: household.id },
            data: {
              financialProfile: updatedProfile as InputJsonValue,
            },
          })
        } catch (profileError) {
          console.error(
            'Failed to refresh household financial profile',
            profileError
          )
        }

        // Update status to COMPLETED
        await ReportService.updateStatus(reportId, 'COMPLETED')
      } catch (error) {
        console.error('Error generating report:', error)
        // Update status to FAILED
        await ReportService.updateStatus(reportId, 'FAILED')
      }
    })()

    // Return immediately - generation continues in background
    return new Response(
      JSON.stringify({
        success: true,
        reportId,
        message: 'Report generation started',
      }),
      {
        status: 202, // Accepted - processing started
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in report generation API:', error)
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
