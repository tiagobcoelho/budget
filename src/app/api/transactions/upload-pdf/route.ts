import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  DuplicateCheckTransaction,
  extractTransactionsFromImage,
  extractTransactionsFromPDFPages,
} from '@/lib/pdf-extractor'
import { db } from '@/db'
import { HouseholdService } from '@/services/household.service'
import { TransactionService } from '@/services/transaction.service'

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth()

    if (!clerkId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId },
    })

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validate file type
    const mimeType = file.type || ''
    const isPdf = mimeType === 'application/pdf'
    const isImage = mimeType.startsWith('image/')

    if (!isPdf && !isImage) {
      return new Response(
        JSON.stringify({ error: 'File must be a PDF or image (PNG/JPEG)' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Get user's household
    const household = await HouseholdService.getByUserId(user.id)
    if (!household) {
      return new Response(JSON.stringify({ error: 'Household not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user's categories, accounts, and recent transactions for matching
    const [categories, accounts, recentTransactions] = await Promise.all([
      db.category.findMany({
        where: { householdId: household.id },
        select: {
          id: true,
          name: true,
          type: true,
        },
      }),
      db.account.findMany({
        where: { householdId: household.id },
        select: {
          id: true,
          name: true,
          type: true,
        },
      }),
      db.transaction.findMany({
        where: {
          householdId: household.id,
          createdByUserId: user.id,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
        select: {
          id: true,
          occurredAt: true,
          amount: true,
          description: true,
          possibleDuplicate: true,
        },
      }),
    ])

    const duplicateCheckContext: DuplicateCheckTransaction[] =
      recentTransactions.map((transaction) => ({
        id: transaction.id,
        occurredAt: transaction.occurredAt,
        amount: Number(transaction.amount),
        description: transaction.description ?? '',
        possibleDuplicate: transaction.possibleDuplicate ?? false,
      }))

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let transactionCount = 0
        const createdTransactionIds: string[] = []

        const existingTransactionSummaries = new Map<
          string,
          { description: string; occurredAt: string; amount: number }
        >()
        // Populate existingTransactionSummaries with existing transactions from duplicateCheckContext
        for (const existing of duplicateCheckContext) {
          existingTransactionSummaries.set(existing.id, {
            description: existing.description ?? 'No description',
            occurredAt:
              existing.occurredAt instanceof Date
                ? existing.occurredAt.toISOString().slice(0, 10)
                : typeof existing.occurredAt === 'string'
                  ? existing.occurredAt
                  : new Date(existing.occurredAt).toISOString().slice(0, 10),
            amount: existing.amount,
          })
        }
        const tempIdToCreatedId = new Map<string, string>()
        const newTransactionSummaries = new Map<
          string,
          { description: string; occurredAt: string; amount: number }
        >()
        const pendingDuplicateResolutions = new Map<
          string,
          Array<{ transactionId: string }>
        >()

        const resolveDuplicateReference = (
          referenceId?: string,
          fallbackSummary?: {
            description: string
            occurredAt: string
            amount: number
          } | null
        ) => {
          if (!referenceId) {
            return {
              transactionId: null,
              summary: null,
              status: 'none' as const,
            }
          }

          if (existingTransactionSummaries.has(referenceId)) {
            return {
              transactionId: referenceId,
              summary: existingTransactionSummaries.get(referenceId)!,
              status: 'existing' as const,
            }
          }

          if (tempIdToCreatedId.has(referenceId)) {
            const canonicalId = tempIdToCreatedId.get(referenceId)!
            return {
              transactionId: canonicalId,
              summary: newTransactionSummaries.get(referenceId) ?? null,
              status: 'new' as const,
            }
          }

          return {
            transactionId: null,
            summary:
              newTransactionSummaries.get(referenceId) ??
              existingTransactionSummaries.get(referenceId) ??
              fallbackSummary ??
              null,
            status: 'pending' as const,
          }
        }

        const buildSummary = (args: {
          description: string | null
          occurredAt: Date
          amount: number | bigint | string
        }) => ({
          description: args.description ?? 'No description',
          occurredAt: args.occurredAt.toISOString().slice(0, 10),
          amount: Number(args.amount),
        })

        try {
          // Process pages sequentially and stream results as they arrive
          const extractor = isPdf
            ? extractTransactionsFromPDFPages(buffer, categories, accounts, {
                existingTransactions: duplicateCheckContext,
              })
            : extractTransactionsFromImage(
                buffer,
                mimeType,
                categories,
                accounts,
                {
                  existingTransactions: duplicateCheckContext,
                }
              )

          for await (const item of extractor) {
            if (item.type === 'progress') {
              // Send progress update
              const progressChunk = JSON.stringify({
                type: 'progress',
                data: {
                  pageNumber: item.pageNumber,
                  totalPages: item.totalPages,
                },
              })
              controller.enqueue(encoder.encode(progressChunk + '\n'))
            } else if (item.type === 'transaction') {
              transactionCount++

              const {
                tempId,
                duplicateOfId,
                duplicateOfSummary,
                duplicateReason,
                ...transactionPayload
              } = item.transaction

              const duplicateReference = resolveDuplicateReference(
                duplicateOfId,
                duplicateOfSummary ?? null
              )

              try {
                const created = await TransactionService.create(
                  household.id,
                  user.id,
                  {
                    fromAccountId: transactionPayload.fromAccountId ?? null,
                    toAccountId: transactionPayload.toAccountId ?? null,
                    type: transactionPayload.type,
                    categoryId: transactionPayload.categoryId ?? null,
                    amount: transactionPayload.amount,
                    occurredAt: transactionPayload.occurredAt,
                    description: transactionPayload.description ?? null,
                    note: transactionPayload.note ?? null,
                    reviewed: false,
                    possibleDuplicate:
                      transactionPayload.possibleDuplicate ?? false,
                    duplicateOfTransactionId: duplicateReference.transactionId,
                  }
                )
                createdTransactionIds.push(created.id)

                const createdSummary = buildSummary({
                  description:
                    created.description ??
                    transactionPayload.description ??
                    null,
                  occurredAt: created.occurredAt,
                  amount: Number(created.amount),
                })

                if (tempId) {
                  tempIdToCreatedId.set(tempId, created.id)
                  newTransactionSummaries.set(tempId, createdSummary)
                }

                existingTransactionSummaries.set(created.id, createdSummary)

                if (duplicateOfId && !duplicateReference.transactionId) {
                  const pendingList =
                    pendingDuplicateResolutions.get(duplicateOfId) ?? []
                  pendingList.push({ transactionId: created.id })
                  pendingDuplicateResolutions.set(duplicateOfId, pendingList)
                }

                if (tempId && pendingDuplicateResolutions.has(tempId)) {
                  const pendingList =
                    pendingDuplicateResolutions.get(tempId) ?? []
                  if (pendingList.length > 0) {
                    await Promise.all(
                      pendingList.map((pending) =>
                        TransactionService.update(
                          household.id,
                          pending.transactionId,
                          {
                            duplicateOfTransactionId: created.id,
                          }
                        )
                      )
                    )
                  }
                  pendingDuplicateResolutions.delete(tempId)
                }

                duplicateCheckContext.push({
                  id: created.id,
                  occurredAt: created.occurredAt,
                  amount: Number(created.amount),
                  description:
                    created.description ?? transactionPayload.description ?? '',
                  possibleDuplicate: created.possibleDuplicate ?? false,
                })

                const chunk = JSON.stringify({
                  type: 'transaction',
                  data: {
                    transaction: {
                      ...transactionPayload,
                      id: created.id,
                      tempId: undefined,
                      duplicateOfId: undefined,
                      duplicateOfTransactionId:
                        duplicateReference.transactionId,
                      duplicateOfSummary:
                        duplicateReference.summary ??
                        duplicateOfSummary ??
                        null,
                      duplicateReason: duplicateReason ?? null,
                      possibleDuplicate:
                        transactionPayload.possibleDuplicate ?? false,
                    },
                    duplicateReferenceStatus: duplicateReference.status,
                    pageNumber: item.pageNumber,
                    totalSoFar: transactionCount,
                  },
                })
                controller.enqueue(encoder.encode(chunk + '\n'))
              } catch (error) {
                console.error('Error creating transaction:', error)
                const chunk = JSON.stringify({
                  type: 'transaction',
                  data: {
                    transaction: {
                      ...transactionPayload,
                      duplicateOfTransactionId:
                        duplicateReference.transactionId,
                      duplicateOfSummary:
                        duplicateReference.summary ??
                        duplicateOfSummary ??
                        null,
                      duplicateReason: duplicateReason ?? null,
                      possibleDuplicate:
                        transactionPayload.possibleDuplicate ?? false,
                    },
                    duplicateReferenceStatus: duplicateReference.status,
                    pageNumber: item.pageNumber,
                    totalSoFar: transactionCount,
                    error:
                      error instanceof Error
                        ? error.message
                        : 'Failed to create',
                  },
                })
                controller.enqueue(encoder.encode(chunk + '\n'))
              }
            }
          }

          // Send completion signal
          const completionChunk = JSON.stringify({
            type: 'complete',
            data: {
              totalTransactions: transactionCount,
              createdCount: createdTransactionIds.length,
            },
          })
          controller.enqueue(encoder.encode(completionChunk + '\n'))
          controller.close()
        } catch (error) {
          console.error('Error streaming transactions:', error)
          const errorChunk = JSON.stringify({
            type: 'error',
            data: {
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to process PDF',
            },
          })
          controller.enqueue(encoder.encode(errorChunk + '\n'))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error processing PDF upload:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process PDF',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
