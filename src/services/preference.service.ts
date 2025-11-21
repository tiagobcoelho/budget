import { db } from '@/db'

export class PreferenceService {
  static async get(userId: string) {
    return db.userPreference.findUnique({ where: { userId } })
  }

  static async upsert(
    userId: string,
    data: {
      defaultCurrencyCode?: string
      theme?: 'LIGHT' | 'DARK' | 'SYSTEM'
      dateFormat?: 'MDY' | 'DMY' | 'YMD'
      budgetStartDay?: number // Day of month (1-31) when budgets start
      budgetAlerts?: boolean
      transactionNotifications?: boolean
      monthlyReports?: boolean
      emailNotifications?: boolean
    }
  ) {
    const existing = await this.get(userId)
    if (!existing) {
      return db.userPreference.create({
        data: {
          userId,
          defaultCurrencyCode: data.defaultCurrencyCode ?? 'USD',
          theme: data.theme ?? 'DARK',
          dateFormat: data.dateFormat ?? 'MDY',
          budgetStartDay: data.budgetStartDay ?? 1,
          budgetAlerts: data.budgetAlerts ?? true,
          transactionNotifications: data.transactionNotifications ?? true,
          monthlyReports: data.monthlyReports ?? true,
          emailNotifications: data.emailNotifications ?? false,
        },
      })
    }
    return db.userPreference.update({
      where: { userId },
      data: {
        ...('defaultCurrencyCode' in data
          ? { defaultCurrencyCode: data.defaultCurrencyCode }
          : {}),
        ...('theme' in data ? { theme: data.theme } : {}),
        ...('dateFormat' in data ? { dateFormat: data.dateFormat } : {}),
        ...('budgetStartDay' in data
          ? {
              budgetStartDay: Math.max(
                1,
                Math.min(31, data.budgetStartDay ?? 1)
              ),
            }
          : {}),
        ...('budgetAlerts' in data ? { budgetAlerts: data.budgetAlerts } : {}),
        ...('transactionNotifications' in data
          ? { transactionNotifications: data.transactionNotifications }
          : {}),
        ...('monthlyReports' in data
          ? { monthlyReports: data.monthlyReports }
          : {}),
        ...('emailNotifications' in data
          ? { emailNotifications: data.emailNotifications }
          : {}),
        updatedAt: new Date(),
      },
    })
  }
}
