"use client"

import { Card } from "@/components/ui/card"
import { Bell } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function NotificationsPage() {
  // TODO: Implement notifications query when schema is ready
  // const notifications = useQuery(api.notifications.getNotifications)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>

        <Card className="p-8 border-border bg-card">
          <div className="text-center space-y-4">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No notifications yet</h3>
            <p className="text-sm text-muted-foreground">
              You'll see notifications about your study progress, achievements, and updates here.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

