'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRight,
  Plus,
  Wallet,
  PiggyBank,
  CreditCard,
  TrendingUp,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

const PRESET_ACCOUNTS = [
  {
    id: 'current',
    name: 'Current Account',
    icon: Wallet,
    description: 'Day-to-day spending',
    type: 'CASH' as const,
  },
  {
    id: 'savings',
    name: 'Savings Account',
    icon: PiggyBank,
    description: 'Emergency fund & goals',
    type: 'SAVINGS' as const,
  },
  {
    id: 'credit',
    name: 'Credit Card',
    icon: CreditCard,
    description: 'Credit purchases',
    type: 'CREDIT' as const,
  },
  {
    id: 'investment',
    name: 'Investment Account',
    icon: TrendingUp,
    description: 'Long-term growth',
    type: 'INVESTMENT' as const,
  },
]

const accountSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['CASH', 'SAVINGS', 'INVESTMENT', 'CREDIT', 'OTHER']),
})

const accountsFormSchema = z.object({
  accounts: z.array(accountSchema).min(1, 'Please select at least one account'),
  customAccountName: z.string().optional(),
  customAccountType: z
    .enum(['CASH', 'SAVINGS', 'INVESTMENT', 'CREDIT', 'OTHER'])
    .optional(),
})

type AccountsFormValues = z.infer<typeof accountsFormSchema>

interface StepAccountsProps {
  onComplete: () => void
}

export function StepAccounts({ onComplete }: StepAccountsProps) {
  const utils = trpc.useUtils()
  const { data: preference } = trpc.preference.get.useQuery()
  const { data: existingAccounts } = trpc.account.list.useQuery()
  const updateStep = trpc.user.updateOnboardingStep.useMutation()

  const deleteAccounts = trpc.account.deleteBulk.useMutation({
    onSuccess: () => {
      // Invalidate and refetch accounts list
      utils.account.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete accounts')
    },
  })

  const saveAccounts = trpc.account.createBulk.useMutation({
    onSuccess: () => {
      // Invalidate and refetch accounts list
      utils.account.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save accounts')
    },
  })

  // Merge existing accounts and default accounts into a deduplicated set
  const initialAccounts = useMemo(() => {
    const accountsMap = new Map<
      string,
      {
        id?: string
        name: string
        type: 'CASH' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT' | 'OTHER'
      }
    >()

    // Add existing accounts first (with their IDs)
    existingAccounts?.forEach((acc) => {
      const key = `${acc.name}-${acc.type}`
      accountsMap.set(key, { id: acc.id, name: acc.name, type: acc.type })
    })

    // Add default preset accounts (they won't overwrite existing ones with same key)
    PRESET_ACCOUNTS.forEach((acc) => {
      const key = `${acc.name}-${acc.type}`
      if (!accountsMap.has(key)) {
        accountsMap.set(key, { name: acc.name, type: acc.type })
      }
    })

    return Array.from(accountsMap.values())
  }, [existingAccounts])

  // Initialize selected accounts state with default accounts
  const [allAccounts, setAllAccounts] =
    useState<AccountsFormValues['accounts']>(initialAccounts)

  const form = useForm<AccountsFormValues>({
    resolver: zodResolver(accountsFormSchema),
    defaultValues: {
      accounts: initialAccounts,
      customAccountName: '',
      customAccountType: 'OTHER',
    },
  })

  const selectedAccounts = form.watch('accounts')
  const customAccountName = form.watch('customAccountName')
  const customAccountType = form.watch('customAccountType')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [errors, setErrors] = useState<string>('')

  // Map preset accounts to actual account data
  const getPresetAccountData = (presetId: string) => {
    const preset = PRESET_ACCOUNTS.find((a) => a.id === presetId)
    if (!preset) return null

    // Check if this account exists in allAccounts
    const existing = allAccounts.find(
      (acc) =>
        acc.type === preset.type &&
        (acc.name === preset.name ||
          acc.name === 'Current / Checking' ||
          acc.name === 'Current Account')
    )

    return existing || { name: preset.name, type: preset.type }
  }

  const handleToggleAccount = (presetId: string) => {
    const accountData = getPresetAccountData(presetId)
    if (!accountData) return

    const exists = selectedAccounts.some(
      (acc) =>
        acc.type === accountData.type &&
        (acc.name === accountData.name ||
          (accountData.type === 'CASH' &&
            (acc.name === 'Current / Checking' ||
              acc.name === 'Current Account')))
    )

    if (exists) {
      form.setValue(
        'accounts',
        selectedAccounts.filter(
          (acc) =>
            !(
              acc.type === accountData.type &&
              (acc.name === accountData.name ||
                (accountData.type === 'CASH' &&
                  (acc.name === 'Current / Checking' ||
                    acc.name === 'Current Account')))
            )
        )
      )
    } else {
      // Find the account in allAccounts to preserve its ID if it exists
      const accountInAllAccounts = allAccounts.find(
        (acc) =>
          acc.type === accountData.type &&
          (acc.name === accountData.name ||
            (accountData.type === 'CASH' &&
              (acc.name === 'Current / Checking' ||
                acc.name === 'Current Account')))
      )
      form.setValue('accounts', [
        ...selectedAccounts,
        accountInAllAccounts || accountData,
      ])
    }
  }

  const isPresetSelected = (presetId: string) => {
    const accountData = getPresetAccountData(presetId)
    if (!accountData) return false

    return selectedAccounts.some(
      (acc) =>
        acc.type === accountData.type &&
        (acc.name === accountData.name ||
          (accountData.type === 'CASH' &&
            (acc.name === 'Current / Checking' ||
              acc.name === 'Current Account')))
    )
  }

  const addCustomAccount = () => {
    if (!customAccountName?.trim()) {
      return
    }

    const exists = selectedAccounts.find(
      (acc) => acc.name.toLowerCase() === customAccountName.trim().toLowerCase()
    )
    if (exists) {
      toast.error('Account already added')
      return
    }

    const newAccount = {
      name: customAccountName.trim(),
      type: customAccountType || 'OTHER',
    }

    setAllAccounts((prev) => [...prev, newAccount])
    form.setValue('accounts', [...selectedAccounts, newAccount])
    form.setValue('customAccountName', '')
    setIsDialogOpen(false)
  }

  const customAccounts = selectedAccounts.filter(
    (acc) =>
      !PRESET_ACCOUNTS.some(
        (preset) =>
          preset.type === acc.type &&
          (preset.name === acc.name ||
            (preset.type === 'CASH' &&
              (acc.name === 'Current / Checking' ||
                acc.name === 'Current Account')))
      )
  )

  const handleSubmit = () => {
    // Validate that at least one account is selected
    if (selectedAccounts.length === 0) {
      setErrors('Please select or create at least one account')
      return
    }
    setErrors('')

    const defaultCurrency = preference?.defaultCurrencyCode ?? 'USD'

    // Create a set of selected account keys for comparison
    const selectedAccountKeys = new Set(
      selectedAccounts.map((acc) => `${acc.name}-${acc.type}`)
    )

    // Find accounts to delete (exist in backend but not in selectedAccounts)
    const accountsToDelete =
      existingAccounts?.filter(
        (acc) => !selectedAccountKeys.has(`${acc.name}-${acc.type}`)
      ) || []

    // Find accounts to create (in selectedAccounts but no ID)
    const newAccounts = selectedAccounts.filter((acc) => !acc.id)

    // If nothing changed, just advance step
    if (accountsToDelete.length === 0 && newAccounts.length === 0) {
      updateStep.mutate(
        { step: 3 },
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

    // Helper function to handle step update and completion
    const handleComplete = () => {
      updateStep.mutate(
        { step: 3 },
        {
          onSuccess: () => {
            toast.success('Accounts updated')
            onComplete()
          },
          onError: (error) => {
            toast.error(error.message || 'Failed to update step')
          },
        }
      )
    }

    // Delete accounts that were deselected
    if (accountsToDelete.length > 0) {
      const accountIdsToDelete = accountsToDelete.map((acc) => acc.id)
      deleteAccounts.mutate(accountIdsToDelete)
    }

    if (newAccounts.length > 0) {
      // Only new accounts to create
      saveAccounts.mutate(
        newAccounts.map((account) => ({
          name: account.name,
          type: account.type,
          currencyCode: defaultCurrency,
        }))
      )
    }

    handleComplete()
  }

  // Update allAccounts when initialAccounts changes (when existingAccounts loads)
  useEffect(() => {
    setAllAccounts(initialAccounts)

    if (existingAccounts && existingAccounts.length > 0) {
      form.setValue(
        'accounts',
        existingAccounts.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
        }))
      )
      return
    }

    if (!existingAccounts || existingAccounts.length === 0) {
      form.setValue('accounts', initialAccounts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAccounts, initialAccounts])

  return (
    <Form {...form}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Set up your accounts
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the accounts you want to track
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {PRESET_ACCOUNTS.map((account) => {
              const Icon = account.icon
              const isSelected = isPresetSelected(account.id)
              return (
                <Card
                  key={account.id}
                  className={`cursor-pointer border-2 p-4 transition-all hover:border-primary/50 ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => handleToggleAccount(account.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleAccount(account.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <h3 className="font-medium text-foreground">
                          {account.name}
                        </h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {account.description}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {customAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">
                Custom Accounts
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {customAccounts.map((account, index) => (
                  <Card
                    key={index}
                    className="border-2 border-accent/50 bg-accent/5 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-accent" />
                      <span className="font-medium text-foreground">
                        {account.name}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full gap-2 sm:w-auto bg-transparent"
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add Custom Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Account</DialogTitle>
                <DialogDescription>
                  Create a custom account to track your finances
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <FormLabel htmlFor="accountName">Account Name</FormLabel>
                  <FormField
                    control={form.control}
                    name="customAccountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            id="accountName"
                            placeholder="e.g., PayPal, Cash"
                            {...field}
                            disabled={saveAccounts.isPending}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addCustomAccount()
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel htmlFor="accountType">Account Type</FormLabel>
                  <FormField
                    control={form.control}
                    name="customAccountType"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={saveAccounts.isPending}
                        >
                          <FormControl>
                            <SelectTrigger id="accountType">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="SAVINGS">Savings</SelectItem>
                            <SelectItem value="INVESTMENT">
                              Investment
                            </SelectItem>
                            <SelectItem value="CREDIT">Credit</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  onClick={addCustomAccount}
                  className="w-full"
                  disabled={saveAccounts.isPending}
                >
                  Add Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {errors && <p className="text-sm text-destructive">{errors}</p>}
        </div>

        <div className="flex items-center justify-between pt-4">
          {/* Back button will be handled by parent layout */}
          <Button
            onClick={handleSubmit}
            size="lg"
            className="ml-auto gap-2"
            disabled={saveAccounts.isPending || deleteAccounts.isPending}
          >
            {saveAccounts.isPending || deleteAccounts.isPending
              ? 'Saving...'
              : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Form>
  )
}
