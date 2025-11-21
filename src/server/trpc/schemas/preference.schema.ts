import { z } from 'zod'
import { Theme, DateFormat } from '@prisma/client'
// Theme Enum
export const themeSchema = z.nativeEnum(Theme)

// Date Format Enum
export const dateFormatSchema = z.nativeEnum(DateFormat)

// Update Preferences Input
export const updatePreferencesSchema = z.object({
  defaultCurrencyCode: z.string().length(3).optional(),
  theme: themeSchema.optional(),
  dateFormat: dateFormatSchema.optional(),
  budgetStartDay: z.number().min(1).max(31).optional(),
  budgetAlerts: z.boolean().optional(),
  transactionNotifications: z.boolean().optional(),
  monthlyReports: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
})

// Type exports
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
