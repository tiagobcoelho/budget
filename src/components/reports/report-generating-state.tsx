'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Sparkles, TrendingUp, BarChart3, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

const generatingSteps = [
  { icon: BarChart3, label: 'Analyzing transactions', duration: 2000 },
  { icon: TrendingUp, label: 'Calculating insights', duration: 2500 },
  { icon: Sparkles, label: 'Generating recommendations', duration: 3000 },
  { icon: Zap, label: 'Finalizing report', duration: 1500 },
]

export function ReportGeneratingState() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let stepProgress = 0
    const stepInterval = setInterval(() => {
      stepProgress += 2
      const step = generatingSteps[currentStep]
      const stepProgressPercent = Math.min(
        (stepProgress / step.duration) * 100,
        100
      )
      setProgress(
        (currentStep / generatingSteps.length) * 100 +
          stepProgressPercent / generatingSteps.length
      )

      if (stepProgress >= step.duration) {
        stepProgress = 0
        if (currentStep < generatingSteps.length - 1) {
          setCurrentStep((prev) => prev + 1)
        } else {
          // Loop back to first step if still generating
          setCurrentStep(0)
        }
      }
    }, 50)

    return () => clearInterval(stepInterval)
  }, [currentStep])

  const currentStepData = generatingSteps[currentStep]
  const CurrentIcon = currentStepData.icon

  return (
    <div className="relative min-h-[500px] overflow-hidden rounded-lg">
      {/* Light rays background */}

      <Card className="relative border-primary/20 bg-background/80 backdrop-blur-sm">
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col items-center justify-center space-y-8 text-center">
            {/* Animated icon */}
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10">
                <CurrentIcon className="size-10 animate-pulse text-primary" />
              </div>
            </div>

            {/* Step indicator */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-foreground">
                {currentStepData.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {generatingSteps.length}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-md space-y-2">
              <Progress
                value={progress}
                className="h-2"
                indicatorClassName="bg-gradient-to-r from-primary to-primary/60"
              />
              <p className="text-xs text-muted-foreground">
                {Math.round(progress)}% complete
              </p>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {generatingSteps.map((step, index) => {
                const StepIcon = step.icon
                const isActive = index === currentStep
                const isCompleted = index < currentStep

                return (
                  <div
                    key={index}
                    className={`flex size-10 items-center justify-center rounded-full transition-all duration-300 ${
                      isActive
                        ? 'scale-110 bg-primary text-primary-foreground shadow-lg'
                        : isCompleted
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <StepIcon className="size-5" />
                  </div>
                )
              })}
            </div>

            {/* Description */}
            <div className="max-w-md space-y-2 pt-4">
              <p className="text-sm text-muted-foreground">
                We&apos;re processing your financial data and generating
                personalized insights. This usually takes 30-60 seconds.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
