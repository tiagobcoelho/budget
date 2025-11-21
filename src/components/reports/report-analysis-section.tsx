import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ReportAnalysisSectionProps {
  summary?: string[] | null
  insights?: string[] | null
  suggestions?: string[] | null
  title?: string
  className?: string
}

export function ReportAnalysisSection({
  summary,
  insights,
  suggestions,
  title = 'Report Analysis',
  className,
}: ReportAnalysisSectionProps) {
  if (
    (!summary || summary.length === 0) &&
    (!insights || insights.length === 0) &&
    (!suggestions || suggestions.length === 0)
  ) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <Card>
        <CardContent className="space-y-4">
          {!!summary?.length && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Summary</h3>
              <ul className="list-decimal list-inside space-y-2 rounded-md text-sm">
                {summary.map((item) => (
                  <li key={item} className="rounded-md bg-muted p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!insights?.length && (
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Insights</h3>
              <ul className="list-decimal list-inside space-y-2 rounded-md text-sm leading-relaxed">
                {insights.map((item) => (
                  <li key={item} className="rounded-md bg-muted p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!suggestions?.length && (
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Suggestions</h3>
              <ul className="list-decimal list-inside space-y-2 rounded-md text-sm leading-relaxed">
                {suggestions.map((item) => (
                  <li key={item} className="rounded-md bg-muted p-4">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
