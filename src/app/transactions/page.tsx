'use client'
import { useMemo } from 'react'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { TransactionList } from '@/components/transactions/transactions-list'

export default function TransactionsPage() {
  const router = useRouter()
  const [accountFilter, setAccountFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState<string>('')
  const [fromDate, setFromDate] = React.useState<string>('')
  const [toDate, setToDate] = React.useState<string>('')
  const [showAdvancedFilters, setShowAdvancedFilters] =
    React.useState<boolean>(false)

  const { data: accounts = [] } = trpc.account.list.useQuery()
  const { data: categories = [] } = trpc.category.list.useQuery()
  const { data } = trpc.transaction.list.useQuery({
    limit: 100,
    from: fromDate ? fromDate : undefined,
    to: toDate ? toDate : undefined,
    fromAccountId: accountFilter !== 'all' ? accountFilter : undefined,
    toAccountId: accountFilter !== 'all' ? accountFilter : undefined,
    type:
      typeFilter !== 'all'
        ? (typeFilter.toUpperCase() as 'EXPENSE' | 'INCOME')
        : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    q: searchQuery || undefined,
  })

  // Extract transaction IDs from the query results
  const transactionIds = useMemo(() => {
    return data?.items?.map((transaction) => transaction.id) || []
  }, [data?.items])
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              View and manage all your transactions
            </p>
          </div>
          <Button onClick={() => router.push('/transactions/add')}>
            <Plus className="mr-2 size-4" />
            Add Transaction
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Search and Type Filter */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? (
                  <>
                    <ChevronUp className="size-4" />
                    Hide Advanced Filters
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-4" />
                    Show Advanced Filters
                  </>
                )}
              </Button>

              {showAdvancedFilters && (
                <div className="space-y-3 border-t pt-3">
                  {/* Category and Account Filters */}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Select
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={accountFilter}
                      onValueChange={setAccountFilter}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Filters */}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <Input
                        type="date"
                        placeholder="From date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="date"
                        placeholder="To date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardContent className="pt-6">
            {transactionIds.length > 0 ? (
              <TransactionList
                transactionIds={transactionIds}
                itemsPerPage={10}
              />
            ) : (
              <p className="text-center text-muted-foreground">
                No transactions found
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
