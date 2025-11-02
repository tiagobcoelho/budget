import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function AIToolsPage() {
  return (
    <div className="space-y-6 mt-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Tools</h1>
        <p className="text-muted-foreground">
          Explore and use powerful AI tools for your workflows
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Tools</CardTitle>
          <CardDescription>AI-powered tools and utilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            AI tools coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
