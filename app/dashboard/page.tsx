"use client"

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  BookOpen,
  Brain,
  Target,
  Clock,
  FileText,
  Sparkles,
  Calendar,
  Award,
  Plus,
  Search,
  Download,
  Upload,
  Filter,
} from "lucide-react"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"

export default function DashboardPage() {
  const router = useRouter()

  // Get authId directly from Better Auth session (fast!)
  const { data: session, isPending } = authClient.useSession()
  const authId = session?.user?.id || null

  const user = useQuery(api.auth.getCurrentUser)
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const revisionSets = useQuery(api.revisionSets.getUserRevisionSets)
  const dashboardStats = useQuery(api.dashboard.getDashboardStats, authId ? { authId } : "skip")
  const recentActivity = useQuery(api.dashboard.getRecentActivity, authId ? { authId, limit: 3 } : "skip")
  const topSubjects = useQuery(api.dashboard.getTopSubjects, authId ? { authId, limit: 4 } : "skip")
  const weeklyProgress = useQuery(api.dashboard.getWeeklyProgress, authId ? { authId } : "skip")
  const bestPerformance = useQuery(api.dashboard.getBestPerformance, authId ? { authId } : "skip")
  const userStreak = useQuery(api.streaks.getUserStreak)

  const totalRevisionSets = revisionSets?.length || 0

  const studyStats = {
    totalTimeSpent: dashboardStats?.hoursSpent || 0,
    completedTests: dashboardStats?.completedTests || 0,
    averageScore: dashboardStats?.averageScore || 0,
    streakDays: userStreak?.streakDays || userProfile?.streakDays || 0,
    materialsReviewed: dashboardStats?.materialsReviewed || 0,
    flashcardsReviewed: dashboardStats?.flashcardsReviewed || 0,
    improvement: dashboardStats?.averageScore ? Math.max(0, dashboardStats.averageScore - 70) : 0,
  }

  const formattedRecentActivity =
    recentActivity?.map((activity) => {
      const hoursAgo = Math.floor((Date.now() - activity.date) / (1000 * 60 * 60))
      const daysAgo = Math.floor(hoursAgo / 24)
      const dateText =
        daysAgo > 0
          ? `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`
          : hoursAgo > 0
            ? `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`
            : "Just now"

      return {
        type: activity.type,
        title: activity.title,
        score: activity.score,
        date: dateText,
        color: "text-primary",
        icon: Target,
      }
    }) || []

  const formattedTopSubjects =
    topSubjects?.map((subject, idx) => ({
      name: subject.name,
      progress: subject.progress,
      value: subject.value,
      color: idx === 0 ? "bg-primary" : idx === 1 ? "bg-secondary" : idx === 2 ? "bg-accent" : "bg-primary/60",
    })) || []

  const formattedWeeklyProgress = weeklyProgress?.map((day, idx) => ({
    day: day.day,
    value: day.value,
    color: idx % 3 === 0 ? "bg-primary" : idx % 3 === 1 ? "bg-secondary" : "bg-accent",
  })) || [
    { day: "Mon", value: 0, color: "bg-primary" },
    { day: "Tue", value: 0, color: "bg-secondary" },
    { day: "Wed", value: 0, color: "bg-accent" },
    { day: "Thu", value: 0, color: "bg-primary" },
    { day: "Fri", value: 0, color: "bg-secondary" },
    { day: "Sat", value: 0, color: "bg-accent" },
    { day: "Sun", value: 0, color: "bg-primary" },
  ]

  const isLoading = isPending || !authId || dashboardStats === undefined

  return (
    <>
      <Authenticated>
        {isLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin mx-auto"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        ) : totalRevisionSets === 0 ? (
          <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-center">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Hi {user?.name || "there"}! Ready to ace your exams?</h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">Create your first Revision Set to get started.</p>
              </div>
              <Card className="p-8 sm:p-10 border-border bg-card">
                <div className="max-w-xl mx-auto space-y-4">
                  <p className="text-sm text-muted-foreground">A Revision Set groups your materials, notes, flashcards, quizzes, and AI tutor in one place.</p>
                  <Button 
                    size="lg" 
                    className="mt-2"
                    onClick={() => {
                      // Trigger create dialog from header
                      if (typeof window !== "undefined") {
                        const event = new CustomEvent('openCreateDialog')
                        window.dispatchEvent(event)
                        router.push("/dashboard/revision-sets")
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Revision Set
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              {/* Top Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Try searching 'revision sets'..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button variant="outline" size="icon" className="hidden sm:flex bg-transparent">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="hidden sm:flex bg-transparent">
                    <Upload className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs sm:text-sm text-foreground">Last 7 days</span>
                  </div>
                  <Link href="/dashboard/revision-sets">
                    <Button size="sm" className="hidden sm:flex">
                      <Plus className="w-4 h-4 mr-2" />
                      New Revision Set
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Main Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Card className="p-4 sm:p-6 border-border bg-card hover:border-primary/50 transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      +{totalRevisionSets}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{totalRevisionSets}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Revision Sets</p>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 border-border bg-card hover:border-secondary/50 transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-secondary bg-secondary/10 px-2 py-1 rounded">
                      {studyStats.flashcardsReviewed}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{studyStats.flashcardsReviewed}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Flashcards Reviewed</p>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 border-border bg-card hover:border-accent/50 transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                      {studyStats.averageScore}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{studyStats.averageScore}%</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Average Score</p>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 border-border bg-card hover:border-primary/50 transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      {studyStats.streakDays} days
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{studyStats.streakDays}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Study Streak</p>
                  </div>
                </Card>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Study Progress Overview */}
                <Card className="lg:col-span-2 p-4 sm:p-6 border-border bg-card">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Study Progress</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Your learning journey this week</p>
                    </div>
                    <Button variant="outline" size="sm" className="hidden sm:flex bg-transparent">
                      <Filter className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-end justify-between gap-2 h-32 sm:h-40">
                      {formattedWeeklyProgress.map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full relative bg-muted rounded-t overflow-hidden h-full flex items-end">
                            <div
                              className={`w-full ${day.color} rounded-t transition-all duration-300`}
                              style={{ height: `${day.value}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{day.day}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">Total Study Time</p>
                        <p className="text-lg sm:text-xl font-bold text-foreground">{studyStats.totalTimeSpent}h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm text-muted-foreground">Improvement</p>
                        <p className="text-lg sm:text-xl font-bold text-primary">+{studyStats.improvement}%</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Performance Card */}
                <Card className="p-4 sm:p-6 border-border bg-card">
                  <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">Best Performance</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">This week</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {bestPerformance?.score ? (
                      <div className="p-3 bg-muted rounded-lg border border-border">
                        <p className="text-2xl sm:text-3xl font-bold text-primary mb-1">{bestPerformance.score}%</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">{bestPerformance.testTitle}</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted rounded-lg border border-border text-center">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Complete a test to see your best performance
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Completed Tests</span>
                        <span className="font-semibold text-foreground">{studyStats.completedTests}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Materials</span>
                        <span className="font-semibold text-foreground">{studyStats.materialsReviewed}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Bottom Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Recent Activity */}
                <Card className="p-4 sm:p-6 border-border bg-card">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">Recent Activity</h3>
                    <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                      View All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formattedRecentActivity.length > 0 ? (
                      formattedRecentActivity.map((activity, idx) => {
                        const Icon = activity.icon
                        return (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition"
                          >
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm sm:text-base font-semibold text-foreground mb-1">
                                {activity.title}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground">{activity.date}</p>
                            </div>
                            {activity.score && (
                              <div className="text-right">
                                <p className="text-sm sm:text-base font-bold text-primary">{activity.score}%</p>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No recent activity</p>
                        <p className="text-xs mt-1">Start studying to see your activity here</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Top Subjects */}
                <Card className="p-4 sm:p-6 border-border bg-card">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">Top Subjects</h3>
                    <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                      View All
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {formattedTopSubjects.length > 0 ? (
                      formattedTopSubjects.map((subject, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm sm:text-base font-medium text-foreground">{subject.name}</span>
                            <span className="text-xs sm:text-sm font-bold text-muted-foreground">{subject.value}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className={`${subject.color} h-full rounded-full transition-all duration-300`}
                              style={{ width: `${subject.progress}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No subjects yet</p>
                        <p className="text-xs mt-1">Create study sets to track your progress</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 sm:mt-8">
                <Card className="p-4 sm:p-6 border-border bg-card">
                  <h3 className="text-base sm:text-lg font-bold text-foreground mb-4 sm:mb-6">Quick Actions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <Link href="/dashboard/study-sets">
                      <Button
                        variant="outline"
                        className="w-full h-auto flex-col gap-2 py-4 sm:py-6 border-border hover:border-primary/50 hover:bg-muted transition bg-transparent"
                      >
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        <span className="text-xs sm:text-sm">Create Notes</span>
                      </Button>
                    </Link>
                    <Link href="/dashboard/flashcards">
                      <Button
                        variant="outline"
                        className="w-full h-auto flex-col gap-2 py-4 sm:py-6 border-border hover:border-secondary/50 hover:bg-muted transition bg-transparent"
                      >
                        <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
                        <span className="text-xs sm:text-sm">Study Flashcards</span>
                      </Button>
                    </Link>
                    <Link href="/dashboard/tests">
                      <Button
                        variant="outline"
                        className="w-full h-auto flex-col gap-2 py-4 sm:py-6 border-border hover:border-accent/50 hover:bg-muted transition bg-transparent"
                      >
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                        <span className="text-xs sm:text-sm">Practice Test</span>
                      </Button>
                    </Link>
                    <Link href="/dashboard/tutor">
                      <Button
                        variant="outline"
                        className="w-full h-auto flex-col gap-2 py-4 sm:py-6 border-border hover:border-primary/50 hover:bg-muted transition bg-transparent"
                      >
                        <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        <span className="text-xs sm:text-sm">AI Tutor</span>
                      </Button>
                    </Link>
                    <Link href="/dashboard/revision-sets">
                      <Button
                        variant="outline"
                        className="w-full h-auto flex-col gap-2 py-4 sm:py-6 border-border hover:border-primary/50 hover:bg-muted transition bg-transparent"
                      >
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        <span className="text-xs sm:text-sm">View Revision Sets</span>
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </Authenticated>

      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 sm:px-6">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-3xl sm:text-4xl font-bold">Not Authenticated</h1>
            <p className="text-base sm:text-lg text-muted-foreground">Please sign in to access your dashboard</p>
            <Button onClick={() => router.push("/auth")} size="lg">
              Go to Sign In
            </Button>
          </div>
        </div>
      </Unauthenticated>

      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AuthLoading>
    </>
  )
}

