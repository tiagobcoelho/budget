'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type OpportunityPeriod = 'MONTHLY' | 'WEEKLY'

type ReportOpportunity = {
  startDate: string
  endDate: string
  transactionCount: number
}

type ReportOpportunities = {
  weekly?: ReportOpportunity | null
  monthly: ReportOpportunity[]
}

type GenerateOpportunityParams = {
  period: OpportunityPeriod
  startDate: string
  endDate: string
}

interface RequiredActionsAlertProps {
  reportOpportunities?: ReportOpportunities | null
  opportunitiesLoading?: boolean
  onGenerateOpportunity?: (
    params: GenerateOpportunityParams
  ) => void | Promise<void>
  isOpportunityPending?: (
    period: OpportunityPeriod,
    startDate: string
  ) => boolean
  showTransactionAlert?: boolean
  lastTransactionDaysAgo?: number
  className?: string
  variant?: 'card' | 'inline'
}

const hasOpportunities = (reportOpportunities?: ReportOpportunities | null) => {
  if (!reportOpportunities) return false
  return (
    (reportOpportunities.weekly !== null &&
      reportOpportunities.weekly !== undefined) ||
    (reportOpportunities.monthly?.length ?? 0) > 0
  )
}

const formatOpportunityLabel = (startDate: string, endDate: string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const monthFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const yearFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
  })
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear()
  const sameYear = start.getFullYear() === end.getFullYear()

  if (sameMonth) {
    return `${monthFormatter.format(start)} – ${end.getDate()}`
  }

  if (sameYear) {
    return `${monthFormatter.format(start)} – ${monthFormatter.format(end)}`
  }

  return `${monthFormatter.format(start)} ${yearFormatter.format(
    start
  )} – ${monthFormatter.format(end)} ${yearFormatter.format(end)}`
}

export function RequiredActionsAlert({
  reportOpportunities,
  opportunitiesLoading = false,
  onGenerateOpportunity,
  isOpportunityPending,
  showTransactionAlert = false,
  lastTransactionDaysAgo,
  className,
  variant = 'card',
}: RequiredActionsAlertProps) {
  const shouldShowOpportunities = hasOpportunities(reportOpportunities)
  const shouldShowTransactionReminder =
    showTransactionAlert &&
    lastTransactionDaysAgo !== undefined &&
    lastTransactionDaysAgo >= 2

  if (!shouldShowOpportunities && !shouldShowTransactionReminder) {
    return null
  }

  const monthlyOpportunities = reportOpportunities?.monthly ?? []
  const weeklyOpportunity =
    reportOpportunities?.weekly &&
    Object.keys(reportOpportunities.weekly).length > 0
      ? reportOpportunities.weekly
      : null

  const opportunitySection = shouldShowOpportunities ? (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-primary">
          Reports ready to generate
        </p>
        <p className="text-sm text-muted-foreground">
          {opportunitiesLoading
            ? 'Checking for available reports...'
            : 'All transactions are reconciled — generate insights with one tap.'}
        </p>
      </div>

      {monthlyOpportunities.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Monthly
          </p>
          <div className="space-y-2">
            {monthlyOpportunities.map((opportunity) => (
              <div
                key={`monthly-${opportunity.startDate}`}
                className="rounded-lg border border-primary/10 bg-background/70 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {formatOpportunityLabel(
                        opportunity.startDate,
                        opportunity.endDate
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Covers{' '}
                      {new Date(opportunity.startDate).toLocaleDateString()} –{' '}
                      {new Date(opportunity.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {opportunity.transactionCount} transactions reviewed
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      onGenerateOpportunity?.({
                        period: 'MONTHLY',
                        startDate: opportunity.startDate,
                        endDate: opportunity.endDate,
                      })
                    }
                    disabled={isOpportunityPending?.(
                      'MONTHLY',
                      opportunity.startDate
                    )}
                  >
                    Generate monthly report
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {weeklyOpportunity && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Weekly
          </p>
          <div className="rounded-lg border border-primary/10 bg-background/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary">
                  {formatOpportunityLabel(
                    weeklyOpportunity.startDate,
                    weeklyOpportunity.endDate
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Covers{' '}
                  {new Date(weeklyOpportunity.startDate).toLocaleDateString()} –{' '}
                  {new Date(weeklyOpportunity.endDate).toLocaleDateString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {weeklyOpportunity.transactionCount} transactions reviewed
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  onGenerateOpportunity?.({
                    period: 'WEEKLY',
                    startDate: weeklyOpportunity.startDate,
                    endDate: weeklyOpportunity.endDate,
                  })
                }
                disabled={isOpportunityPending?.(
                  'WEEKLY',
                  weeklyOpportunity.startDate
                )}
              >
                Generate weekly report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null

  const transactionSection = shouldShowTransactionReminder ? (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="size-5 shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium text-amber-600 dark:text-amber-500">
            Time to update your budget
          </p>
          <p className="mb-3 text-sm text-muted-foreground">
            You haven&apos;t added transactions in {lastTransactionDaysAgo}{' '}
            days. Add them now to keep your budget accurate.
          </p>
          <Button
            size="sm"
            asChild
            variant="outline"
            className="border-amber-500/30 hover:bg-amber-500/10"
          >
            <Link href="/transactions?mode=add">Add Transactions</Link>
          </Button>
        </div>
      </div>
    </div>
  ) : null

  if (variant === 'card') {
    return (
      <Card className={cn('border-primary/30 bg-primary/5', className)}>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Required actions</p>
              <p className="text-xs text-muted-foreground">
                Stay on track by keeping reports and transactions up to date.
              </p>
            </div>
          </div>
          {shouldShowOpportunities && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Report opportunities
              </p>
              <div className="space-y-4">{opportunitySection}</div>
            </div>
          )}
          {shouldShowTransactionReminder && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-amber-600">
                Budget upkeep
              </p>
              {transactionSection}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {shouldShowOpportunities && (
        <div className="space-y-2">{opportunitySection}</div>
      )}
      {shouldShowTransactionReminder && transactionSection}
    </div>
  )
}
