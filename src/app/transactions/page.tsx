'use client'
import { useMemo, useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { TransactionsTabs } from '@/components/transactions/transactions-tabs'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function TransactionsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const isAddModeInUrl = useMemo(
    () => searchParams.get('mode') === 'add',
    [searchParams]
  )
  const defaultShowAdd = isAddModeInUrl
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false)
  const [showAddPanel, setShowAddPanel] = useState<boolean>(defaultShowAdd)

  useEffect(() => {
    setShowAddPanel((prev) => (prev === isAddModeInUrl ? prev : isAddModeInUrl))
  }, [isAddModeInUrl])

  useEffect(() => {
    if (showAddPanel === isAddModeInUrl) return
    const params = new URLSearchParams(searchParamsString)
    if (showAddPanel) {
      params.set('mode', 'add')
    } else {
      params.delete('mode')
    }
    const queryString = params.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    })
  }, [isAddModeInUrl, pathname, router, searchParamsString, showAddPanel])

  const handleToggleAddPanel = useCallback(() => {
    setShowAddPanel((prev) => !prev)
  }, [])

  const { data: accounts = [] } = trpc.account.list.useQuery()
  const { data: categories = [] } = trpc.category.list.useQuery()
  const transactionFilters = useMemo(
    () => ({
      from: fromDate || undefined,
      to: toDate || undefined,
      fromAccountId: accountFilter !== 'all' ? accountFilter : undefined,
      toAccountId: accountFilter !== 'all' ? accountFilter : undefined,
      type:
        typeFilter !== 'all'
          ? (typeFilter.toUpperCase() as 'EXPENSE' | 'INCOME')
          : undefined,
      categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
      q: searchQuery || undefined,
    }),
    [fromDate, toDate, accountFilter, typeFilter, categoryFilter, searchQuery]
  )

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
          <Button
            variant={showAddPanel ? 'outline' : 'default'}
            onClick={handleToggleAddPanel}
          >
            {showAddPanel ? (
              <>
                <Search className="mr-2 size-4" />
                Back to Filters
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Add Transaction
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        {showAddPanel ? (
          <Card>
            <CardHeader className="gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Add transactions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload a bank statement or add entries manually
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddPanel(false)}
              >
                <Search className="mr-2 size-4" />
                Back to filters
              </Button>
            </CardHeader>
            <CardContent>
              <TransactionsTabs />
            </CardContent>
          </Card>
        ) : (
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
        )}

        {/* Transactions List */}
        <Card>
          <CardContent className="pt-6">
            <TransactionList filters={transactionFilters} itemsPerPage={10} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
