'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  ArrowRight,
  Wallet,
  Tag,
  Receipt,
  TrendingUp,
  Sparkles,
} from 'lucide-react'

interface WelcomeScreenProps {
  onStart: () => void
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const features = [
    {
      icon: Wallet,
      title: 'Set up your accounts',
      description: 'Connect your bank accounts, credit cards, and savings',
    },
    {
      icon: Tag,
      title: 'Organize with categories',
      description: 'Create custom categories for expenses and income',
    },
    {
      icon: Receipt,
      title: 'Import transactions',
      description: 'Upload bank statements or add transactions manually',
    },
    {
      icon: TrendingUp,
      title: 'Get insights',
      description: 'Receive personalized recommendations for your budget',
    },
  ]

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12">
      <div className="mx-auto max-w-2xl text-center">
        {/* Hero section */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Welcome to Budget Planner
        </div>

        <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Let&apos;s set up your budget
        </h1>

        <p className="mb-12 text-pretty text-lg text-muted-foreground md:text-xl">
          We&apos;ll walk you through a few simple steps to personalize your
          budget planner. It takes about 5 minutes, and you can customize
          everything later.
        </p>

        {/* Features grid */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 text-left transition-colors hover:bg-accent/50"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <Button size="lg" onClick={onStart} className="group gap-2 px-8">
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-sm text-muted-foreground">Takes about 5 minutes</p>
        </div>
      </div>
    </div>
  )
}
