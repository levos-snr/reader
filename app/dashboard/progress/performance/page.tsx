"use client"

import { Card } from "@/components/ui/card"
import { Award, TrendingUp } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"

export default function PerformancePage() {
  const { data: session } = authClient.useSession()
  const authId = session?.user?.id || null
  const dashboardStats = useQuery(api.dashboard.getDashboardStats, authId ? { authId } : "skip")
  const bestPerformance = useQuery(api.dashboard.getBestPerformance, authId ? { authId } : "skip")

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Performance</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Average Score</p>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{dashboardStats?.averageScore || 0}%</p>
          </Card>

          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Best Performance</p>
              <Award className="w-5 h-5 text-secondary" />
            </div>
            {bestPerformance?.score ? (
              <>
                <p className="text-3xl font-bold text-primary mb-1">{bestPerformance.score}%</p>
                <p className="text-sm text-muted-foreground">{bestPerformance.testTitle}</p>
              </>
            ) : (
              <p className="text-3xl font-bold text-muted-foreground">N/A</p>
            )}
          </Card>
        </div>

        <Card className="p-6 border-border bg-card">
          <h2 className="text-xl font-bold mb-4">Performance Trends</h2>
          <p className="text-muted-foreground">Detailed performance metrics and trends coming soon...</p>
        </Card>
      </div>
    </div>
  )
}

