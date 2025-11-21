import { db } from '@/db'

export interface AccountListInput {
  type?: 'CASH' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT' | 'OTHER'
}

export class AccountService {
  static async list(householdId: string, input?: AccountListInput) {
    const where = {
      householdId,
      ...(input?.type ? { type: input.type } : {}),
    }

    const accounts = await db.account.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        _count: {
          select: { transactionsTo: true, transactionsFrom: true },
        },
        transactionsFrom: {
          select: {
            amount: true,
            occurredAt: true,
          },
        },
        transactionsTo: {
          select: {
            amount: true,
            occurredAt: true,
          },
        },
      },
    })

    // Calculate balance and find last transaction for each account
    return accounts.map((account) => {
      // Calculate balance: initialBalance + incoming - outgoing
      let balance = Number(account.initialBalance)

      // Add amounts from incoming transactions
      account.transactionsTo.forEach((t) => {
        balance += Number(t.amount)
      })

      // Subtract amounts from outgoing transactions
      account.transactionsFrom.forEach((t) => {
        balance -= Number(t.amount)
      })

      // Find last transaction date from both directions
      const allTransactionDates = [
        ...account.transactionsTo.map((t) => t.occurredAt),
        ...account.transactionsFrom.map((t) => t.occurredAt),
      ]

      const lastTransactionDate =
        allTransactionDates.length > 0
          ? allTransactionDates.reduce((latest, date) =>
              date > latest ? date : latest
            )
          : null

      const totalTransactions =
        account._count.transactionsTo + account._count.transactionsFrom

      return {
        ...account,
        balance,
        lastTransactionDate,
        totalTransactions,
      }
    })
  }

  static async getById(householdId: string, id: string) {
    return db.account.findFirst({
      where: { id, householdId },
      include: {
        _count: {
          select: { transactionsTo: true, transactionsFrom: true },
        },
      },
    })
  }

  static async create(
    householdId: string,
    data: {
      name: string
      type: 'CASH' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT' | 'OTHER'
      currencyCode?: string
      initialBalance?: number
    }
  ) {
    return db.account.create({
      data: {
        householdId,
        name: data.name,
        type: data.type,
        currencyCode: data.currencyCode ?? 'EUR',
        initialBalance: data.initialBalance ?? 0,
      },
    })
  }

  static async update(
    householdId: string,
    id: string,
    data: Partial<{
      name: string
      type: 'CASH' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT' | 'OTHER'
      currencyCode: string
      initialBalance: number
    }>
  ) {
    const updated = await db.account.updateMany({
      where: { id, householdId },
      data: {
        ...('name' in data ? { name: data.name } : {}),
        ...('type' in data ? { type: data.type } : {}),
        ...('currencyCode' in data ? { currencyCode: data.currencyCode } : {}),
        ...('initialBalance' in data
          ? { initialBalance: data.initialBalance }
          : {}),
        updatedAt: new Date(),
      },
    })
    if (updated.count === 0) return null
    return db.account.findUnique({ where: { id } })
  }

  static async remove(householdId: string, id: string): Promise<boolean> {
    const result = await db.account.deleteMany({ where: { id, householdId } })
    return result.count > 0
  }

  static async removeBulk(householdId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0
    }
    const result = await db.account.deleteMany({
      where: {
        id: { in: ids },
        householdId,
      },
    })
    return result.count
  }

  /**
   * Calculate net worth for a household
   * Net worth = sum of all account initial balances + sum of all transactions
   * Balance calculation: +amount on toAccount, -amount on fromAccount
   */
  static async getNetWorth(householdId: string): Promise<number> {
    const accounts = await db.account.findMany({
      where: { householdId },
      include: {
        transactionsFrom: {
          select: {
            amount: true,
          },
        },
        transactionsTo: {
          select: {
            amount: true,
          },
        },
      },
    })

    let netWorth = 0

    for (const account of accounts) {
      // Start with initial balance
      let balance = Number(account.initialBalance)

      // Subtract amounts from outgoing transactions (EXPENSE and TRANSFER)
      for (const transaction of account.transactionsFrom) {
        balance -= Number(transaction.amount)
      }

      // Add amounts from incoming transactions (INCOME and TRANSFER)
      for (const transaction of account.transactionsTo) {
        balance += Number(transaction.amount)
      }

      netWorth += balance
    }

    return netWorth
  }

  /**
   * Calculate savings rate for a household in a given period
   * Savings rate = (sum of transfers to SAVINGS/INVESTMENT accounts) / (total income)
   */
  static async getSavingsRate(
    householdId: string,
    period: { from: Date; to: Date }
  ): Promise<number> {
    // Get total income (type = INCOME, excluding transfers)
    const incomeTransactions = await db.transaction.findMany({
      where: {
        householdId,
        type: 'INCOME',
        occurredAt: {
          gte: period.from,
          lte: period.to,
        },
      },
      select: {
        amount: true,
      },
    })

    const totalIncome = incomeTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    )

    if (totalIncome === 0) return 0

    // Get total transfers to SAVINGS or INVESTMENT accounts
    const savingsTransfers = await db.transaction.findMany({
      where: {
        householdId,
        type: 'TRANSFER',
        occurredAt: {
          gte: period.from,
          lte: period.to,
        },
      },
      include: {
        toAccount: {
          select: {
            type: true,
          },
        },
      },
    })

    const totalSavingsTransfers = savingsTransfers
      .filter(
        (t) =>
          t.toAccount?.type === 'SAVINGS' || t.toAccount?.type === 'INVESTMENT'
      )
      .reduce((sum, t) => sum + Number(t.amount), 0)

    return totalSavingsTransfers / totalIncome
  }

  /**
   * Get or create default "Main Cash" account for a household
   */
  static async getOrCreateDefaultAccount(householdId: string) {
    // Try to find existing default account
    const existing = await db.account.findFirst({
      where: {
        householdId,
        type: 'CASH',
        name: 'Main Cash',
      },
    })

    if (existing) {
      return existing
    }

    // Create default account
    return db.account.create({
      data: {
        householdId,
        name: 'Main Cash',
        type: 'CASH',
        currencyCode: 'EUR',
        initialBalance: 0,
      },
    })
  }
}
