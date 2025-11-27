import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface HighlightCardProps {
  title: string
  icon?: ReactNode
  items: { title: string; body: string }[]
}

export function HighlightCard({ title, icon, items }: HighlightCardProps) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-semibold">{title}</p>
        </div>
        {items.length ? (
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={`${title}-${item.title}`}>
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
