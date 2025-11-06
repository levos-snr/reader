"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import BackButton from "@/components/back-button"
import { Loader, TrendingUp, BookOpen, Brain, Target } from "lucide-react"

export default function ProgressPage() {
  const params = useParams()
  const revisionSetId = params.revisionSetId as string

  const stats = useQuery(api.progressTracking.getRevisionSetStats, {
    revisionSetId: revisionSetId as any,
  })

  const weeklyProgress = useQuery(api.progressTracking.getWeeklyProgress, {
    revisionSetId: revisionSetId as any,
  })

  if (stats === undefined || weeklyProgress === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const totalSeconds = stats.totalStudyTimeMinutes * 60
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return (
    <div className="space-y-8">
      <BackButton fallbackHref={`/dashboard/revision-sets/${revisionSetId}`} />
      <div>
        <h1 className="text-3xl font-bold mb-2">Progress Analytics</h1>
        <p className="text-muted-foreground">Track your study progress and performance</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Study Time</p>
              <p className="text-3xl font-bold text-primary">
                {hours}h {minutes}m
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-primary/20" />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Flashcards Reviewed</p>
              <p className="text-3xl font-bold text-secondary">{stats.totalFlashcardsReviewed}</p>
            </div>
            <Brain className="w-8 h-8 text-secondary/20" />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Quizzes Completed</p>
              <p className="text-3xl font-bold text-accent">{stats.totalQuizzesCompleted}</p>
            </div>
            <Target className="w-8 h-8 text-accent/20" />
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Average Score</p>
              <p className="text-3xl font-bold text-primary">{stats.averageScore}%</p>
            </div>
            <BookOpen className="w-8 h-8 text-primary/20" />
          </div>
        </Card>
      </div>

      {/* Weekly Breakdown */}
      <Card className="p-6 bg-card border-border">
        <h2 className="text-lg font-semibold mb-4">Weekly Activity</h2>
        <div className="space-y-3">
          {weeklyProgress && weeklyProgress.length > 0 ? (
            weeklyProgress.map((day, idx) => {
              const dayName = new Date(day.date).toLocaleDateString("en-US", {
                weekday: "long",
              })
              return (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground w-24">{dayName}</span>
                  <div className="flex-1 h-8 bg-muted rounded-lg mx-4 relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary rounded-lg transition-all"
                      style={{
                        width: `${Math.min(((day.studyTimeMinutes || 0) / 120) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-20 text-right">{day.studyTimeMinutes}m</span>
                </div>
              )
            })
          ) : (
            <p className="text-muted-foreground text-center py-4">No activity data yet</p>
          )}
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6 bg-gradient-primary text-white border-0">
        <h2 className="text-lg font-semibold mb-3">Study Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm opacity-90">Days Active</p>
            <p className="text-2xl font-bold">{stats.daysActive}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Total Exercises</p>
            <p className="text-2xl font-bold">{stats.totalExercisesSolved}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

