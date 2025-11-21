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

export function formatPeriodLabel(startDate: Date): string {
  return startDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}
