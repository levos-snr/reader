"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, BarChart3, Target, Award } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"

export default function AnalyticsPage() {
  const { data: session } = authClient.useSession()
  const authId = session?.user?.id || null
  const dashboardStats = useQuery(api.dashboard.getDashboardStats, authId ? { authId } : "skip")

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Study Time</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats?.hoursSpent || 0}h</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats?.averageScore || 0}%</p>
              </div>
              <Target className="w-8 h-8 text-secondary" />
            </div>
          </Card>

          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tests Completed</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats?.completedTests || 0}</p>
              </div>
              <Award className="w-8 h-8 text-accent" />
            </div>
          </Card>

          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Materials Reviewed</p>
                <p className="text-2xl font-bold text-foreground">{dashboardStats?.materialsReviewed || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </Card>
        </div>

        <Card className="p-6 border-border bg-card">
          <h2 className="text-xl font-bold mb-4">Study Overview</h2>
          <p className="text-muted-foreground">Detailed analytics and insights coming soon...</p>
        </Card>
      </div>
    </div>
  )
}

