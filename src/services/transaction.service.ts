import { db } from '@/db'
import { Prisma } from '@prisma/client'
import { ListTransactionsInput } from '@/server/trpc/schemas/transaction.schema'

export class TransactionService {
  static async list(householdId: string, input: ListTransactionsInput) {
    const {
      from,
      to,
      fromAccountId,
      toAccountId,
      categoryId,
      type,
      q,
      limit = 20,
      page = 1,
    } = input

    // Build account filter: match if fromAccountId or toAccountId matches
    const accountConditions = []
    if (fromAccountId) {
      accountConditions.push({ fromAccountId })
    }
    if (toAccountId) {
      accountConditions.push({ toAccountId })
    }

    // Build search filter
    const searchConditions = q
      ? [
          { description: { contains: q, mode: 'insensitive' as const } },
          { note: { contains: q, mode: 'insensitive' as const } },
        ]
      : []

    const where: Prisma.TransactionWhereInput = {
      householdId,
    }

    if (from || to) {
      const occurredAtFilter: Prisma.DateTimeFilter = {}

      if (from) {
        const fromDate = new Date(from)
        occurredAtFilter.gte = fromDate
      }

      if (to) {
        const toDate = new Date(to)
        occurredAtFilter.lte = toDate
      }

      if (Object.keys(occurredAtFilter).length > 0) {
        where.occurredAt = occurredAtFilter
      }
    }

    // Only add categoryId if provided
    if (categoryId) {
      where.categoryId = categoryId
    }

    // Only add type if provided
    if (type) {
      where.type = type
    }

    // Build AND conditions array
    const andConditions: Prisma.TransactionWhereInput[] = []

    // Add account filter using OR inside
    if (accountConditions.length > 0) {
      andConditions.push({
        OR: accountConditions,
      })
    }

    // Add search filter
    if (searchConditions.length > 0) {
      andConditions.push({
        OR: searchConditions,
      })
    }

    // Only add AND if we have conditions
    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      db.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        include: {
          category: true,
          fromAccount: true,
          toAccount: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              imageUrl: true,
            },
          },
          duplicateOf: {
            select: {
              id: true,
              description: true,
              amount: true,
              occurredAt: true,
            },
          },
        },
      }),
      db.transaction.count({ where }),
    ])

    return { items, total }
  }

  static async getById(householdId: string, id: string) {
    return db.transaction.findFirst({
      where: { id, householdId },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        duplicateOf: {
          select: {
            id: true,
            description: true,
            amount: true,
            occurredAt: true,
          },
        },
      },
    })
  }

  static async getLatest(householdId: string) {
    return db.transaction.findFirst({
      where: { householdId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        duplicateOf: {
          select: {
            id: true,
            description: true,
            amount: true,
            occurredAt: true,
          },
        },
      },
    })
  }

  private static async getSingleMemberUserId(
    householdId: string
  ): Promise<string | null> {
    const members = await db.householdMember.findMany({
      where: { householdId },
      select: { userId: true },
    })

    if (members.length === 1) {
      return members[0].userId
    }
    return null
  }

  static async create(
    householdId: string,
    createdByUserId: string,
    data: {
      fromAccountId?: string | null
      toAccountId?: string | null
      type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
      categoryId?: string | null
      amount: number
      occurredAt: string | Date
      description?: string | null
      note?: string | null
      reviewed?: boolean
      possibleDuplicate?: boolean
      duplicateOfTransactionId?: string | null
      userId?: string | null
    }
  ) {
    // Validate TRANSFER transactions: if both accounts are provided, they must differ
    if (data.type === 'TRANSFER') {
      if (
        data.fromAccountId &&
        data.toAccountId &&
        data.fromAccountId === data.toAccountId
      ) {
        throw new Error(
          'fromAccountId and toAccountId must differ for TRANSFER transactions'
        )
      }
    }

    // Determine which user should own this transaction
    let resolvedUserId =
      typeof data.userId === 'undefined' ? createdByUserId : data.userId

    if (resolvedUserId === null) {
      const singleMemberUserId = await this.getSingleMemberUserId(householdId)
      if (singleMemberUserId) {
        resolvedUserId = singleMemberUserId
      }
    }

    return db.transaction.create({
      data: {
        householdId,
        createdByUserId,
        userId: resolvedUserId ?? null,
        fromAccountId: data.fromAccountId ?? null,
        toAccountId: data.toAccountId ?? null,
        type: data.type,
        categoryId: data.type === 'TRANSFER' ? null : (data.categoryId ?? null),
        amount: data.amount,
        occurredAt: new Date(data.occurredAt),
        description: data.description ?? null,
        note: data.note ?? null,
        reviewed: data.reviewed ?? true,
        // @ts-ignore Prisma client needs regeneration to include possibleDuplicate column
        possibleDuplicate: data.possibleDuplicate ?? false,
        duplicateOfTransactionId: data.duplicateOfTransactionId ?? null,
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        duplicateOf: {
          select: {
            id: true,
            description: true,
            amount: true,
            occurredAt: true,
          },
        },
      },
    })
  }

  static async update(
    householdId: string,
    id: string,
    data: Partial<{
      fromAccountId: string | null
      toAccountId: string | null
      type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
      categoryId: string | null
      amount: number
      occurredAt: string | Date
      description: string | null
      note: string | null
      reviewed: boolean
      possibleDuplicate?: boolean
      duplicateOfTransactionId?: string | null
      userId?: string | null
    }>
  ) {
    // Get existing transaction to validate updates
    const existing = await db.transaction.findFirst({
      where: { id, householdId },
    })

    if (!existing) {
      return null
    }

    const updateData: Prisma.TransactionUncheckedUpdateInput = {
      ...('occurredAt' in data && data.occurredAt
        ? { occurredAt: new Date(data.occurredAt) }
        : {}),
      ...('amount' in data ? { amount: data.amount } : {}),
      ...('description' in data
        ? { description: data.description ?? null }
        : {}),
      ...('note' in data ? { note: data.note ?? null } : {}),
      ...('reviewed' in data ? { reviewed: data.reviewed } : {}),
      ...('possibleDuplicate' in data
        ? {
            // @ts-ignore Prisma client needs regeneration to include possibleDuplicate column
            possibleDuplicate: data.possibleDuplicate ?? false,
          }
        : {}),
      ...('duplicateOfTransactionId' in data
        ? {
            duplicateOfTransactionId: data.duplicateOfTransactionId ?? null,
          }
        : {}),
      ...('userId' in data ? { userId: data.userId ?? null } : {}),
      updatedAt: new Date(),
    }

    if ('userId' in data && data.userId === null) {
      const singleMemberUserId = await this.getSingleMemberUserId(householdId)
      if (singleMemberUserId) {
        updateData.userId = singleMemberUserId
      }
    }

    // Handle type-specific updates
    if ('type' in data) {
      updateData.type = data.type
      // Reset accounts and category based on new type
      if (data.type === 'EXPENSE') {
        updateData.fromAccountId =
          'fromAccountId' in data
            ? (data.fromAccountId ?? null)
            : existing.fromAccountId
        updateData.toAccountId = null
        updateData.categoryId =
          'categoryId' in data ? (data.categoryId ?? null) : existing.categoryId
      } else if (data.type === 'INCOME') {
        updateData.fromAccountId = null
        updateData.toAccountId =
          'toAccountId' in data
            ? (data.toAccountId ?? null)
            : existing.toAccountId
        updateData.categoryId =
          'categoryId' in data ? (data.categoryId ?? null) : existing.categoryId
      } else if (data.type === 'TRANSFER') {
        updateData.fromAccountId =
          'fromAccountId' in data
            ? (data.fromAccountId ?? null)
            : existing.fromAccountId
        updateData.toAccountId =
          'toAccountId' in data
            ? (data.toAccountId ?? null)
            : existing.toAccountId
        updateData.categoryId = null
      }
    } else {
      // Update accounts without changing type
      if ('fromAccountId' in data) {
        updateData.fromAccountId = data.fromAccountId ?? null
      }
      if ('toAccountId' in data) {
        updateData.toAccountId = data.toAccountId ?? null
      }
      if ('categoryId' in data && existing.type !== 'TRANSFER') {
        updateData.categoryId = data.categoryId ?? null
      }
    }

    const updated = await db.transaction.updateMany({
      where: { id, householdId },
      data: updateData,
    })
    if (updated.count === 0) return null
    return db.transaction.findUnique({
      where: { id },
      include: { category: true, fromAccount: true, toAccount: true },
    })
  }

  static async remove(householdId: string, id: string): Promise<boolean> {
    const result = await db.transaction.deleteMany({
      where: { id, householdId },
    })
    return result.count > 0
  }

  static async createBulk(
    householdId: string,
    createdByUserId: string,
    transactions: Array<{
      fromAccountId?: string | null
      toAccountId?: string | null
      type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
      categoryId?: string | null
      amount: number
      occurredAt: string | Date
      description?: string | null
      note?: string | null
      reviewed?: boolean
      userId?: string | null
    }>,
    defaultUserId?: string | null
  ) {
    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [] as Array<{ index: number; error: string }>,
    }

    // Create transactions individually to handle errors gracefully
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i]!
      try {
        // Use transaction-specific userId, or defaultUserId, or createdByUserId
        const userId = transaction.userId ?? defaultUserId ?? createdByUserId
        await this.create(householdId, createdByUserId, {
          ...transaction,
          userId,
        })
        results.successCount++
      } catch (error) {
        results.failedCount++
        results.errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  /**
   * Create a transfer between two accounts
   * Creates a single TRANSFER transaction with both fromAccountId and toAccountId
   */
  static async createTransfer(
    householdId: string,
    createdByUserId: string,
    data: {
      fromAccountId: string
      toAccountId: string
      amount: number
      occurredAt: string | Date
      description?: string | null
      note?: string | null
      reviewed?: boolean
    }
  ) {
    // Verify both accounts exist
    const [fromAccount, toAccount] = await Promise.all([
      db.account.findFirst({
        where: { id: data.fromAccountId, householdId },
      }),
      db.account.findFirst({
        where: { id: data.toAccountId, householdId },
      }),
    ])

    if (!fromAccount) {
      throw new Error('Source account not found')
    }

    if (!toAccount) {
      throw new Error('Destination account not found')
    }

    if (data.fromAccountId === data.toAccountId) {
      throw new Error(
        'fromAccountId and toAccountId must differ for TRANSFER transactions'
      )
    }

    // Create single TRANSFER transaction
    return db.transaction.create({
      data: {
        householdId,
        createdByUserId,
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        type: 'TRANSFER',
        categoryId: null,
        amount: data.amount,
        occurredAt: new Date(data.occurredAt),
        description: data.description ?? null,
        note: data.note ?? null,
        reviewed: data.reviewed ?? true,
      },
      include: { category: true, fromAccount: true, toAccount: true },
    })
  }

  /**
   * Mark transactions as reviewed
   * Validates that all transactions belong to the household
   */
  static async markAsReviewed(
    householdId: string,
    transactionIds: string[]
  ): Promise<number> {
    if (transactionIds.length === 0) {
      return 0
    }

    // Verify all transactions belong to the household
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        householdId,
      },
      select: { id: true },
    })

    if (transactions.length !== transactionIds.length) {
      throw new Error(
        'Some transactions not found or do not belong to household'
      )
    }

    // Update all transactions to reviewed
    const result = await db.transaction.updateMany({
      where: {
        id: { in: transactionIds },
        householdId,
      },
      data: {
        reviewed: true,
        updatedAt: new Date(),
      },
    })

    return result.count
  }

  /**
   * Unlink a duplicate transaction from its parent
   * Sets duplicateOfTransactionId to null and possibleDuplicate to false
   */
  static async unlinkDuplicate(
    householdId: string,
    transactionId: string
  ): Promise<boolean> {
    // Verify transaction belongs to household
    const transaction = await db.transaction.findFirst({
      where: {
        id: transactionId,
        householdId,
      },
      select: { id: true },
    })

    if (!transaction) {
      throw new Error('Transaction not found or does not belong to household')
    }

    // Update transaction to remove duplicate link
    const result = await db.transaction.updateMany({
      where: {
        id: transactionId,
        householdId,
      },
      data: {
        duplicateOfTransactionId: null,
        possibleDuplicate: false,
        updatedAt: new Date(),
      },
    })

    return result.count > 0
  }
}
