'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Calendar } from 'lucide-react'
import { ReportCard } from '@/components/reports/report-card'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ReportPeriod } from '@prisma/client'

export default function ReportsPage() {
  const router = useRouter()
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
  const [period, setPeriod] = useState<
    'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
  >('MONTHLY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: reports, isLoading, refetch } = trpc.report.list.useQuery({})

  const generateReport = trpc.report.generate.useMutation({
    onSuccess: async (report) => {
      toast.success('Report generation started')
      setIsGenerateDialogOpen(false)

      // Trigger async generation
      try {
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: report.id }),
        })

        if (!response.ok) {
          throw new Error('Failed to start report generation')
        }
      } catch (error) {
        console.error('Error triggering report generation:', error)
        toast.error('Failed to start report generation')
      }

      // Refetch reports and poll for completion
      refetch()
      pollForCompletion(report.id)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create report')
    },
  })

  const pollForCompletion = (reportId: string) => {
    const interval = setInterval(async () => {
      const { data } = await trpc.report.getById.useQuery({ id: reportId })
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
        clearInterval(interval)
        refetch()
        if (data.status === 'COMPLETED') {
          router.push(`/reports/${reportId}`)
        }
      }
    }, 2000)

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000)
  }

  useEffect(() => {
    if (period !== 'CUSTOM') {
      const today = new Date()
      const start = new Date(today)
      const end = new Date(today)

      switch (period) {
        case 'WEEKLY':
          start.setDate(today.getDate() - 7)
          break
        case 'MONTHLY':
          start.setMonth(today.getMonth() - 1)
          break
        case 'QUARTERLY':
          start.setMonth(today.getMonth() - 3)
          break
        case 'YEARLY':
          start.setFullYear(today.getFullYear() - 1)
          break
      }

      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])
    }
  }, [period])

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      toast.error('Please select date range')
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('End date must be after start date')
      return
    }

    generateReport.mutate({
      period,
      startDate,
      endDate,
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground">
              Analyze your financial data and trends
            </p>
          </div>
          <Button onClick={() => setIsGenerateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading reports...</p>
            </div>
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                id={report.id}
                period={report.period}
                startDate={new Date(report.startDate)}
                endDate={new Date(report.endDate)}
                status={report.status}
                metrics={report.metrics}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate your first report to analyze your financial data
              </p>
              <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
              <DialogDescription>
                Select a time period to generate a financial report
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Period</Label>
                <Select
                  value={period}
                  onValueChange={(value) => setPeriod(value as ReportPeriod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={period !== 'CUSTOM'}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsGenerateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generateReport.isPending}
              >
                {generateReport.isPending ? 'Generating...' : 'Generate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
