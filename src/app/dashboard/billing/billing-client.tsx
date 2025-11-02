'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLANS } from '@/lib/stripe'
import type { Subscription } from '@prisma/client'

type BillingClientProps = {
  subscription: Subscription | undefined
}

export function BillingClient({ subscription }: BillingClientProps) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async (plan: keyof typeof PLANS) => {
    setLoading(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: PLANS[plan] }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing-portal', {
        method: 'POST',
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 mt-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your current subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{subscription.plan}</h3>
                  <p className="text-sm text-muted-foreground">
                    Status:{' '}
                    <Badge
                      variant={
                        subscription.status === 'active'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {subscription.status}
                    </Badge>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Next billing date
                  </p>
                  <p className="font-semibold">
                    {new Date(
                      subscription.stripeCurrentPeriodEnd
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button onClick={handleManageBilling} disabled={loading}>
                {loading ? 'Loading...' : 'Manage Billing'}
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="font-semibold mb-2">Free Plan</h3>
              <p className="text-muted-foreground mb-4">
                You&apos;re currently on the free plan
              </p>
              <Button onClick={() => handleUpgrade('PRO')} disabled={loading}>
                {loading ? 'Loading...' : 'Upgrade to Pro'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(PLANS).map(([key, plan]) => (
              <Card
                key={key}
                className={plan.price > 0 ? 'border-blue-500' : ''}
              >
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.price === 0
                      ? 'Perfect for getting started'
                      : plan.price === 29
                        ? 'For growing businesses'
                        : 'For large organizations'}
                  </CardDescription>
                  <div className="text-2xl font-bold">
                    ${plan.price}
                    {plan.price > 0 && (
                      <span className="text-sm font-normal">/month</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                  {subscription?.plan === plan.name ? (
                    <Button disabled className="w-full">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.price === 0 ? 'outline' : 'default'}
                      onClick={() => handleUpgrade(key as keyof typeof PLANS)}
                      disabled={loading}
                    >
                      {loading
                        ? 'Loading...'
                        : plan.price === 0
                          ? 'Current Plan'
                          : 'Upgrade'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
