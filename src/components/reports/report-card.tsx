'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'
import { ReportStatus, ReportPeriod } from '@/lib/types'
import Link from 'next/link'
// import { trpc } from '@/lib/trpc/client'

interface ReportCardProps {
  id: string
  period: ReportPeriod
  startDate: Date
  endDate: Date
  status: ReportStatus
  metrics?: {
    totalIncome?: number
    totalExpenses?: number
    netChange?: number
  } | null
}

const statusColors: Record<ReportStatus, string> = {
  PENDING: 'bg-gray-500',
  GENERATING: 'bg-indigo-500',
  COMPLETED: 'bg-emerald-500',
  FAILED: 'bg-red-700',
}

const statusLabels: Record<ReportStatus, string> = {
  PENDING: 'Pending',
  GENERATING: 'Generating',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
}

const periodLabels: Record<ReportPeriod, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
  CUSTOM: 'Custom',
}

export function ReportCard({
  id,
  period,
  startDate,
  endDate,
  status,
}: ReportCardProps) {
  // const { data: preference } = trpc.preference.get.useQuery()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {periodLabels[period]} Report
          </CardTitle>
          <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(startDate), 'MMM d')} -{' '}
              {format(new Date(endDate), 'MMM d, yyyy')}
            </span>
          </div>

          {status === 'COMPLETED' && (
            <Link href={`/reports/${id}`}>
              <Button variant="outline" className="w-full" size="sm">
                View Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}

          {status === 'GENERATING' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Generating report...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
