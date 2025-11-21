'use client'

interface OnboardingLayoutProps {
  currentStep: number
  setStep: (step: number) => void
  children: React.ReactNode
}

export function OnboardingLayout({
  currentStep,
  setStep,
  children,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Step indicators */}
      <div className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between py-4">
            {[
              { id: 1, name: 'Your Info' },
              { id: 2, name: 'Accounts' },
              { id: 3, name: 'Categories' },
              { id: 4, name: 'Transactions' },
              { id: 5, name: 'Report' },
            ].map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      currentStep === step.id
                        ? 'bg-primary text-primary-foreground'
                        : currentStep > step.id
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                    onClick={() => setStep(step.id)}
                  >
                    {step.id}
                  </div>
                  <span
                    className={`hidden text-sm font-medium md:block ${
                      currentStep >= step.id
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < 4 && <div className="mx-2 h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
    </div>
  )
}
