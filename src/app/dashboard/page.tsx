import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/db'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  // If user not in DB yet, we can still show the dashboard with Clerk data
  const subscription = user
    ? await db.subscription.findFirst({
        where: { userId: user.id },
      })
    : null

  return (
    <>
      {/* Welcome Section */}
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Welcome back{user ? `, ${user.firstName || user.email}` : ''}!
              </CardTitle>
              <CardDescription>
                Here&apos;s what&apos;s happening with your account
              </CardDescription>
            </div>
            <Badge variant={subscription ? 'default' : 'secondary'}>
              {subscription ? subscription.plan : 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">API Requests</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">Projects</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-muted-foreground">Team Members</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with these common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/dashboard/billing">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <span className="text-2xl mb-2">💳</span>
                <span>Billing</span>
              </Button>
            </Link>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <span className="text-2xl mb-2">⚙️</span>
                <span>Settings</span>
              </Button>
            </Link>
            <Link href="/dashboard/chat">
              <Button variant="outline" className="w-full h-20 flex flex-col">
                <span className="text-2xl mb-2">💬</span>
                <span>AI Chat</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent activity to show
          </div>
        </CardContent>
      </Card>
    </>
  )
}
