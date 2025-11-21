'use client'

import type React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { ArrowRight, Loader2 } from 'lucide-react'

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
]

const userInfoSchema = z.object({
  firstName: z.string().min(1, 'Name is required'),
  lastName: z.string().optional(),
  currency: z.string().length(3, 'Please select a currency'),
  budgetStartDay: z.number().min(1).max(31),
  country: z.string().optional(),
})

type UserInfoFormValues = z.infer<typeof userInfoSchema>

interface StepUserInfoProps {
  onComplete: () => void
  initialData?: {
    firstName?: string | null
    lastName?: string | null
    currency?: string
  }
}

export function StepUserInfo({ onComplete, initialData }: StepUserInfoProps) {
  const { data: user } = trpc.user.me.useQuery()
  const { data: preference } = trpc.preference.get.useQuery()
  const updateProfile = trpc.user.updateProfile.useMutation()
  const updatePreference = trpc.preference.update.useMutation()
  const updateStep = trpc.user.updateOnboardingStep.useMutation()

  const form = useForm<UserInfoFormValues>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      firstName: user?.firstName || initialData?.firstName || '',
      lastName: user?.lastName || initialData?.lastName || '',
      currency:
        preference?.defaultCurrencyCode || initialData?.currency || 'USD',
      budgetStartDay: (preference?.budgetStartDay as number | undefined) ?? 1,
    },
  })

  const onSubmit = async (values: UserInfoFormValues) => {
    // Check if data has changed compared to existing data
    const firstNameChanged =
      (user?.firstName || '').trim() !== values.firstName.trim()
    const lastNameChanged =
      (user?.lastName || '').trim() !== (values.lastName || '').trim()
    const currencyChanged =
      (preference?.defaultCurrencyCode || 'USD') !== values.currency
    const budgetStartDayChanged =
      (preference?.budgetStartDay as number | undefined) ??
      1 !== values.budgetStartDay

    // If nothing changed, just advance step without saving
    if (
      !firstNameChanged &&
      !lastNameChanged &&
      !currencyChanged &&
      !budgetStartDayChanged
    ) {
      updateStep.mutate(
        { step: 2 },
        {
          onSuccess: () => {
            onComplete()
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to update step')
          },
        }
      )
      return
    }

    // Data has changed, save it
    try {
      await Promise.all([
        updateProfile.mutateAsync({
          firstName: values.firstName.trim(),
          lastName: values.lastName?.trim() || undefined,
        }),
        updatePreference.mutateAsync({
          defaultCurrencyCode: values.currency,
          budgetStartDay: values.budgetStartDay,
        }),
      ])
      toast.success('User information saved')
      onComplete()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save user information'
      )
    }
  }

  const isLoading =
    updateProfile.isPending ||
    updatePreference.isPending ||
    updateStep.isPending

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          Let&apos;s get to know you
        </h2>
        <p className="text-lg text-muted-foreground">
          Just a few details to personalize your experience
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="firstName">First Name</FormLabel>
                  <FormControl>
                    <Input
                      id="firstName"
                      placeholder="John"
                      {...field}
                      disabled={isLoading}
                      className={
                        form.formState.errors.firstName
                          ? 'border-destructive'
                          : ''
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="lastName">Last Name</FormLabel>
                  <FormControl>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      {...field}
                      disabled={isLoading}
                      className={
                        form.formState.errors.lastName
                          ? 'border-destructive'
                          : ''
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="currency">Currency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budgetStartDay"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel htmlFor="budgetStartDay">
                    Budget Start Day
                  </FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(value) =>
                      field.onChange(parseInt(value) || 1)
                    }
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger id="budgetStartDay">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(
                        (day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day}
                            {day === 1
                              ? 'st'
                              : day === 2
                                ? 'nd'
                                : day === 3
                                  ? 'rd'
                                  : 'th'}{' '}
                            of each month
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    When should your budget period start each month?
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              size="lg"
              className="gap-2"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
