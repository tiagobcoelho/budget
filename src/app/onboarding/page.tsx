'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout'
import { StepUserInfo } from '@/components/onboarding/step-user-info'
import { StepAccounts } from '@/components/onboarding/step-accounts'
import { StepCategories } from '@/components/onboarding/step-categories'
import { StepUpload } from '@/components/onboarding/step-upload'
import { StepReport } from '@/components/onboarding/step-report'
import { WelcomeScreen } from '@/components/onboarding/welcome-screen'
import { trpc } from '@/lib/trpc/client'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0) // 0 = welcome screen
  const [isLoading, setIsLoading] = useState(true)

  const { data: stepData, isLoading: isLoadingStep } =
    trpc.user.getOnboardingStep.useQuery()
  const { data: user } = trpc.user.me.useQuery()

  useEffect(() => {
    if (!isLoadingStep && stepData) {
      // If user is already onboarded, redirect to dashboard
      // if (stepData.onboarded) {
      //   router.push('/dashboard')
      //   return
      // }

      // Resume from saved step (skip welcome if already started)
      if (stepData.step > 1) {
        setCurrentStep(stepData.step)
      } else {
        setCurrentStep(0) // Show welcome screen
      }
      setIsLoading(false)
    }
  }, [stepData, isLoadingStep, router])

  const handleStart = () => {
    setCurrentStep(1)
  }

  const handleStepComplete = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep])

  const currentStepComponent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <StepUserInfo
            onComplete={handleStepComplete}
            initialData={{
              firstName: user?.firstName ?? undefined,
              lastName: user?.lastName ?? undefined,
            }}
          />
        )
      case 2:
        return <StepAccounts onComplete={handleStepComplete} />
      case 3:
        return <StepCategories onComplete={handleStepComplete} />
      case 4:
        return <StepUpload onComplete={handleStepComplete} />
      case 5:
        return <StepReport />
      default:
        return null
    }
  }, [currentStep, user, handleStepComplete])

  if (isLoading || isLoadingStep) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show welcome screen
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-background">
        <WelcomeScreen onStart={handleStart} />
      </div>
    )
  }

  return (
    <OnboardingLayout currentStep={currentStep} setStep={setCurrentStep}>
      {currentStepComponent}
    </OnboardingLayout>
  )
}
