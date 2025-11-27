import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface WeeklyGuidanceSectionProps {
  potentialIssues?: string[] | null
  recommendedActions?: string[] | null
  className?: string
}

export function WeeklyGuidanceSection({
  potentialIssues,
  recommendedActions,
  className,
}: WeeklyGuidanceSectionProps) {
  if (
    (!potentialIssues || potentialIssues.length === 0) &&
    (!recommendedActions || recommendedActions.length === 0)
  ) {
    return null
  }

  return (
    <section className={cn('grid gap-4 md:grid-cols-2', className)}>
      {!!potentialIssues?.length && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-destructive">
                Potential issues
              </p>
              <p className="text-xs text-muted-foreground">
                The biggest risks spotted this week
              </p>
            </div>
            <ul className="list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">
              {potentialIssues.map((issue, index) => (
                <li key={`${issue}-${index}`} className="ml-4">
                  {issue}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!!recommendedActions?.length && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-primary">
                Recommended actions
              </p>
              <p className="text-xs text-muted-foreground">
                Concrete next steps for the coming week
              </p>
            </div>
            <ul className="list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">
              {recommendedActions.map((action, index) => (
                <li key={`${action}-${index}`} className="ml-4">
                  {action}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
