import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function ChatPage() {
  return (
    <div className="space-y-6 mt-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">AI Chat</h1>
        <p className="text-muted-foreground">
          Interact with AI assistants and manage your conversations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chat Interface</CardTitle>
          <CardDescription>Your AI-powered chat assistant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            Chat interface coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
