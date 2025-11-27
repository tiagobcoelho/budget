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

const userInfoSchema = z
  .object({
    firstName: z.string().min(1, 'Name is required'),
    lastName: z.string().optional(),
    currency: z.string().length(3, 'Please select a currency'),
    budgetStartDay: z.number().min(1).max(31),
    country: z.string().optional(),
    accountType: z.enum(['single', 'couple']),
    partnerFirstName: z.string().optional(),
    partnerLastName: z.string().optional(),
    partnerEmail: z.string().email().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.accountType === 'couple') {
        return (
          data.partnerFirstName &&
          data.partnerFirstName.trim().length > 0 &&
          data.partnerEmail &&
          data.partnerEmail.trim().length > 0
        )
      }
      return true
    },
    {
      message: 'Partner first name and email are required for couples',
      path: ['partnerEmail'],
    }
  )

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
  const createCoupleHousehold = trpc.household.createCouple.useMutation()

  const form = useForm<UserInfoFormValues>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      firstName: user?.firstName || initialData?.firstName || '',
      lastName: user?.lastName || initialData?.lastName || '',
      currency:
        preference?.defaultCurrencyCode || initialData?.currency || 'USD',
      budgetStartDay: (preference?.budgetStartDay as number | undefined) ?? 1,
      accountType: 'single',
      partnerFirstName: '',
      partnerLastName: '',
      partnerEmail: '',
    },
  })

  const accountType = form.watch('accountType')

  const onSubmit = async (values: UserInfoFormValues) => {
    try {
      // Save user profile and preferences
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

      // Create household based on account type
      if (values.accountType === 'couple') {
        // Create couple household with invite
        await createCoupleHousehold.mutateAsync({
          partnerEmail: values.partnerEmail!.trim(),
          partnerFirstName: values.partnerFirstName!.trim(),
          partnerLastName: values.partnerLastName?.trim(),
        })
        toast.success('Couple household created and invite sent')
      } else {
        // Create single household (this will be done automatically when needed)
        // The household will be created when first accessed
      }

      // Advance to next step
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
    updateStep.isPending ||
    createCoupleHousehold.isPending

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
          {/* Account Type Selection */}
          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Account Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="couple">Couple</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Are you managing finances alone or with a partner?
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Partner Info (shown when couple is selected) */}
          {accountType === 'couple' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="text-sm font-semibold">Partner Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="partnerFirstName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="partnerFirstName">
                        Partner First Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="partnerFirstName"
                          placeholder="Jane"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partnerLastName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel htmlFor="partnerLastName">
                        Partner Last Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="partnerLastName"
                          placeholder="Doe"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="partnerEmail"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel htmlFor="partnerEmail">Partner Email</FormLabel>
                    <FormControl>
                      <Input
                        id="partnerEmail"
                        type="email"
                        placeholder="partner@example.com"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll send an invite to this email address
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

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
