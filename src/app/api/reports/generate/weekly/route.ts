import { createPeriodicReportHandler } from '@/app/api/reports/generate/utils/create-periodic-report-handler'
import { ReportPeriod } from '@prisma/client'
import { generateReport as generateWeeklyReport } from '@/services/report-generation.service/weekly'

export const POST = createPeriodicReportHandler({
  period: ReportPeriod.WEEKLY,
  label: 'Weekly report',
  generateReport: generateWeeklyReport,
})
