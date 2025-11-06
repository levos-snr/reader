"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Plus, Target } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useState } from "react"

export default function SchedulerPage() {
  const { data: session } = authClient.useSession()
  const authId = session?.user?.id
  const revisionSets = useQuery(api.revisionSets.getUserRevisionSets)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Revision Scheduler</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <Card className="lg:col-span-2 p-6 border-border bg-card">
            <h2 className="text-xl font-semibold mb-4">Study Calendar</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="font-semibold text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square border border-border rounded-lg p-2 hover:bg-muted transition cursor-pointer"
                  >
                    <div className="text-xs font-medium text-foreground mb-1">{i + 1}</div>
                    <div className="space-y-1">
                      {/* Session dots would go here */}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Upcoming Sessions */}
          <Card className="p-6 border-border bg-card">
            <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
            <div className="space-y-3">
              {revisionSets && revisionSets.length > 0 ? (
                revisionSets.slice(0, 5).map((set) => (
                  <div key={set._id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{set.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {set.examDate ? new Date(set.examDate).toLocaleDateString() : "No exam date"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No revision sets yet. Create one to start scheduling!</p>
              )}
            </div>
            <Button className="w-full mt-4" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Generate Study Plan
            </Button>
          </Card>
        </div>

        {/* Exam Dates */}
        <Card className="mt-6 p-6 border-border bg-card">
          <h2 className="text-xl font-semibold mb-4">Exam Dates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {revisionSets && revisionSets.length > 0 ? (
              revisionSets
                .filter((set) => set.examDate)
                .map((set) => (
                  <div key={set._id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">{set.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(set.examDate).toLocaleDateString()} ({Math.ceil((set.examDate - Date.now()) / (1000 * 60 * 60 * 24))} days)
                    </p>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-foreground col-span-3">No exams scheduled yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

