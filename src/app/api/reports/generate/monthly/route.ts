import { createPeriodicReportHandler } from '@/app/api/reports/generate/utils/create-periodic-report-handler'
import { ReportPeriod } from '@prisma/client'
import { generateReport as generateMonthlyReport } from '@/services/report-generation.service/monthly'

export const POST = createPeriodicReportHandler({
  period: ReportPeriod.MONTHLY,
  label: 'Monthly report',
  generateReport: generateMonthlyReport,
})
