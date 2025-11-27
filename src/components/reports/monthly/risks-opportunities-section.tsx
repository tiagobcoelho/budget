import { AlertTriangle, Lightbulb } from 'lucide-react'
import { HighlightCard } from './highlight-card'

interface RisksOpportunitiesSectionProps {
  risks: Array<{ title: string; description: string }>
  opportunities: Array<{ title: string; description: string }>
}

export function RisksOpportunitiesSection({
  risks,
  opportunities,
}: RisksOpportunitiesSectionProps) {
  if (!risks.length && !opportunities.length) {
    return null
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <HighlightCard
        title="Risks to watch"
        icon={<AlertTriangle className="size-4 text-destructive" />}
        items={risks.map((risk) => ({
          title: risk.title,
          body: risk.description,
        }))}
      />
      <HighlightCard
        title="Opportunities"
        icon={<Lightbulb className="size-4 text-primary" />}
        items={opportunities.map((opportunity) => ({
          title: opportunity.title,
          body: opportunity.description,
        }))}
      />
    </section>
  )
}
