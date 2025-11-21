'use client'

import { useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/client'
import { formatCurrency } from '@/lib/format'
import { formatDistanceToNow } from 'date-fns'

// Map account types to icons
const getAccountIcon = (type: string) => {
  switch (type) {
    case 'CASH':
      return Wallet
    case 'SAVINGS':
      return PiggyBank
    case 'CREDIT':
      return CreditCard
    case 'INVESTMENT':
      return TrendingUp
    default:
      return Wallet
  }
}

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = trpc.account.list.useQuery()
  const { data: netWorth } = trpc.account.getNetWorth.useQuery()
  const { data: preferences } = trpc.preference.get.useQuery()
  const currencyCode =
    (preferences?.defaultCurrencyCode as string | undefined) ?? 'USD'

  const totalBalance = useMemo(() => {
    if (netWorth !== undefined) {
      return netWorth
    }
    // Fallback: calculate from accounts if netWorth not available
    return accounts.reduce(
      (sum, acc) => sum + (acc.balance ?? Number(acc.initialBalance)),
      0
    )
  }, [accounts, netWorth])

  const activeAccounts = accounts.length

  const formatLastTransaction = (date: Date | null) => {
    if (!date) return 'No transactions'
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Accounts
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your financial accounts
            </p>
          </div>
          <Button size="sm" className="w-full sm:w-auto">
            <Plus className="mr-2 size-4" />
            Add Account
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <span className="text-muted-foreground">Loading...</span>
                ) : (
                  formatCurrency(totalBalance, currencyCode)
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Across all accounts
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAccounts}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Currently tracking
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading accounts...
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No accounts yet. Add your first account to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => {
                  const Icon = getAccountIcon(account.type)
                  const balance =
                    account.balance ?? Number(account.initialBalance)
                  const isNegative = balance < 0
                  const transactionCount = account.totalTransactions ?? 0
                  const lastTransaction = formatLastTransaction(
                    account.lastTransactionDate
                  )

                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                          <Icon className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {transactionCount} transaction
                            {transactionCount !== 1 ? 's' : ''} • Last:{' '}
                            {lastTransaction}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${isNegative ? 'text-destructive' : ''}`}
                          >
                            {formatCurrency(balance, currencyCode)}
                          </p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {account.type.toLowerCase()}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Account</DropdownMenuItem>
                            <DropdownMenuItem>
                              View Transactions
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
