import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

interface BehaviorPatternsSectionProps {
  behaviorPatterns: Array<{ title: string; description: string }>
}

export function BehaviorPatternsSection({
  behaviorPatterns,
}: BehaviorPatternsSectionProps) {
  if (!behaviorPatterns.length) {
    return null
  }
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Behavior patterns
          </p>
          <h2 className="text-xl font-semibold">What the AI noticed</h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {behaviorPatterns.map((pattern) => (
          <Card key={pattern.title}>
            <CardContent className="space-y-2 p-4">
              <p className="font-medium">{pattern.title}</p>
              <p className="text-sm text-muted-foreground">
                {pattern.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
