/**
 * Normalize the start date of a monthly budget period based on the user's budget start day.
 * Uses the budgetStartDay (1-31) to determine when the period starts.
 * Handles edge cases like months with fewer days than the start day.
 */
export function normalizePeriodStart(
  referenceDate: Date,
  budgetStartDay: number = 1
): Date {
  const date = new Date(referenceDate)
  date.setHours(0, 0, 0, 0)

  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  // If the reference date is before the start day of the current month,
  // the period starts on the start day of the previous month
  if (day < budgetStartDay) {
    // Go to previous month
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    // Get the last day of the previous month
    const lastDayOfPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
    // Use the minimum of budgetStartDay and the last day of the previous month
    const startDay = Math.min(budgetStartDay, lastDayOfPrevMonth)
    return new Date(prevYear, prevMonth, startDay)
  } else {
    // Period starts on the start day of the current month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
    const startDay = Math.min(budgetStartDay, lastDayOfMonth)
    return new Date(year, month, startDay)
  }
}

/**
 * Calculate the start and end dates of a monthly budget period.
 * Uses budgetStartDay to determine period boundaries.
 */
export function calculatePeriodBounds(
  referenceDate: Date,
  budgetStartDay: number = 1
): { start: Date; end: Date } {
  const start = normalizePeriodStart(referenceDate, budgetStartDay)

  // End date is the day before the start day of the next period
  const nextPeriodStart = normalizePeriodStart(
    new Date(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    budgetStartDay
  )
  const end = new Date(nextPeriodStart)
  end.setDate(end.getDate() - 1)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

/**
 * Calculate the week number (1-4) within a month for a given date.
 * Week 1: Days 1-7, Week 2: Days 8-14, Week 3: Days 15-21, Week 4: Days 22-31
 */
export function getWeekNumberInMonth(date: Date): number {
  const dayOfMonth = date.getDate()
  const weekNumber = Math.ceil(dayOfMonth / 7)
  // Cap at 4 weeks
  return Math.min(weekNumber, 4)
}

/**
 * Convert a number to its ordinal form (1st, 2nd, 3rd, 4th, etc.)
 */
function toOrdinal(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) {
    return `${num}st`
  }
  if (j === 2 && k !== 12) {
    return `${num}nd`
  }
  if (j === 3 && k !== 13) {
    return `${num}rd`
  }
  return `${num}th`
}

export function formatPeriodLabel(startDate: Date): string {
  return startDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format a report label based on its period type.
 * For weekly reports, returns "Xst week of Y" format (e.g., "1st week of January").
 * For other periods, uses the standard period label.
 */
export function formatReportLabel(
  startDate: Date,
  period: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'
): string {
  if (period === 'WEEKLY') {
    const weekNumber = getWeekNumberInMonth(startDate)
    const monthName = startDate.toLocaleDateString('en-US', {
      month: 'long',
    })
    return `${toOrdinal(weekNumber)} week of ${monthName}`
  }

  return formatPeriodLabel(startDate)
}
