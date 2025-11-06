"use client"

import { Card } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"

export default function ProgressHistoryPage() {
  const { data: session } = authClient.useSession()
  const authId = session?.user?.id || null
  const recentActivity = useQuery(api.dashboard.getRecentActivity, authId ? { authId, limit: 50 } : "skip")

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Study History</h1>
        </div>

        {recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity, idx) => {
              const hoursAgo = Math.floor((Date.now() - activity.date) / (1000 * 60 * 60))
              const daysAgo = Math.floor(hoursAgo / 24)
              const dateText =
                daysAgo > 0
                  ? `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`
                  : hoursAgo > 0
                    ? `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`
                    : "Just now"

              return (
                <Card key={idx} className="p-4 border-border bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{dateText}</p>
                    </div>
                    {activity.score && (
                      <div className="text-right">
                        <p className="font-bold text-primary">{activity.score}%</p>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="p-8 border-border bg-card">
            <div className="text-center space-y-4">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">No study history yet</h3>
              <p className="text-sm text-muted-foreground">Start studying to see your activity history here.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

