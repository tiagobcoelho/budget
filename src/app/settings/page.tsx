'use client'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Bell,
  Palette,
  Database,
  Shield,
  LogOut,
  Wallet,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useClerk } from '@clerk/nextjs'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { data: pref } = trpc.preference.get.useQuery()
  const { signOut } = useClerk()
  const utils = trpc.useUtils()
  const { theme: currentTheme, setTheme: setNextTheme } = useTheme()

  const [budgetStartDay, setBudgetStartDay] = useState<number>(
    (pref?.budgetStartDay as number | undefined) ?? 1
  )
  const [dateFormat, setDateFormat] = useState<'MDY' | 'DMY' | 'YMD'>(
    (pref?.dateFormat as 'MDY' | 'DMY' | 'YMD') || 'MDY'
  )

  const updatePreference = trpc.preference.update.useMutation({
    onSuccess: () => {
      toast.success('Preferences updated successfully')
      utils.preference.get.invalidate()
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update preferences')
    },
  })

  const handleBudgetStartDayChange = (value: number) => {
    const day = Math.max(1, Math.min(31, value))
    setBudgetStartDay(day)
    updatePreference.mutate({ budgetStartDay: day })
  }

  const handleThemeChange = (value: string) => {
    const themeValue = value.toLowerCase() as 'light' | 'dark' | 'system'
    // Update next-themes immediately for instant UI change
    setNextTheme(themeValue)
    // Save to database for persistence
    updatePreference.mutate({
      theme: value.toUpperCase() as 'LIGHT' | 'DARK' | 'SYSTEM',
    })
  }

  const handleDateFormatChange = (value: string) => {
    const formatValue = value.toUpperCase() as 'MDY' | 'DMY' | 'YMD'
    setDateFormat(formatValue)
    updatePreference.mutate({ dateFormat: formatValue })
  }
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and application preferences
          </p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5" />
              <CardTitle>Profile Settings</CardTitle>
            </div>
            <CardDescription>
              Update your personal information and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" defaultValue="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" defaultValue="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                defaultValue="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select
                defaultValue={(
                  pref?.defaultCurrencyCode || 'USD'
                ).toLowerCase()}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usd">USD ($)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="jpy">JPY (¥)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="size-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Budget Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you&apos;re close to your budget limit
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Transaction Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts for new transactions
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Monthly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Get monthly financial summary reports
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Budget Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="size-5" />
              <CardTitle>Budget Settings</CardTitle>
            </div>
            <CardDescription>Configure your budget preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budgetStartDay">Budget Start Day</Label>
              <Input
                id="budgetStartDay"
                type="number"
                min={1}
                max={31}
                value={budgetStartDay}
                onChange={(e) =>
                  handleBudgetStartDayChange(parseInt(e.target.value) || 1)
                }
              />
              <p className="text-sm text-muted-foreground">
                What day of the month should your budgets start? (e.g., if you
                get paid on the 15th, budgets might start on the 15th). All
                budgets are monthly and will follow this start day.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="size-5" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize the look and feel of the application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={currentTheme || 'system'}
                onValueChange={handleThemeChange}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={dateFormat.toLowerCase()}
                onValueChange={handleDateFormatChange}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="size-5" />
              <CardTitle>Data & Privacy</CardTitle>
            </div>
            <CardDescription>
              Manage your data and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
              >
                <Database className="mr-2 size-4" />
                Export All Data
              </Button>
              <Separator />
              <Button
                variant="outline"
                className="w-full justify-start bg-transparent"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 size-4" />
                Log Out
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive bg-transparent"
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
