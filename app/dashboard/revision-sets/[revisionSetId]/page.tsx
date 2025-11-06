"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Lightbulb, Brain, Target, MessageSquare, Upload, File } from "lucide-react"
import Link from "next/link"
import BackButton from "@/components/back-button"

export default function RevisionSetPage() {
  const params = useParams()
  const router = useRouter()
  const revisionSetParam = params.revisionSetId as string
  const isValidId = /^[a-z0-9]+$/.test(revisionSetParam) && revisionSetParam.length >= 20

  const revisionSetById = useQuery(
    api.revisionSets.getRevisionSetWithContent,
    isValidId ? { revisionSetId: revisionSetParam as any } : "skip"
  )
  const revisionSetBySlug = useQuery(
    api.revisionSets.getRevisionSetWithContentBySlug,
    !isValidId ? { slug: revisionSetParam } : "skip"
  )
  const revisionSet = revisionSetById || revisionSetBySlug

  useEffect(() => {
    if (!isValidId && typeof window !== "undefined") {
      router.replace("/dashboard/revision-sets")
    }
  }, [isValidId, router])

  if (!revisionSetById && !revisionSetBySlug) return null

  if (revisionSet === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 rounded-full border-4 border-border border-t-primary animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading revision set...</p>
        </div>
      </div>
    )
  }

  if (!revisionSet) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Revision set not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          <BackButton fallbackHref="/dashboard/revision-sets" />
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{revisionSet.title}</h1>
              {revisionSet.description && <p className="text-muted-foreground">{revisionSet.description}</p>}
            </div>
          </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Materials</p>
          <p className="text-2xl font-bold text-primary">{revisionSet.stats?.materialsCount || 0}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="text-2xl font-bold text-secondary">{revisionSet.stats?.notesCount || 0}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Flashcards</p>
          <p className="text-2xl font-bold text-accent">{revisionSet.stats?.flashcardsCount || 0}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-sm text-muted-foreground">Quizzes</p>
          <p className="text-2xl font-bold text-primary">{revisionSet.stats?.quizzesCount || 0}</p>
        </Card>
      </div>

      {/* Main Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/materials`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <Upload className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-1">Study Materials</h3>
            <p className="text-sm text-muted-foreground">Upload and manage your study materials</p>
          </Card>
        </Link>

        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/notes`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <Lightbulb className="w-8 h-8 text-secondary mb-3" />
            <h3 className="font-semibold text-lg mb-1">SmartNotes</h3>
            <p className="text-sm text-muted-foreground">AI-generated revision notes</p>
          </Card>
        </Link>

        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/flashcards`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <Brain className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-semibold text-lg mb-1">Flashcards</h3>
            <p className="text-sm text-muted-foreground">Create and study flashcards</p>
          </Card>
        </Link>

        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/quizzes`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <Target className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-1">Quizzes</h3>
            <p className="text-sm text-muted-foreground">Practice with AI-generated quizzes</p>
          </Card>
        </Link>

        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/tutor`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <MessageSquare className="w-8 h-8 text-secondary mb-3" />
            <h3 className="font-semibold text-lg mb-1">AI Tutor</h3>
            <p className="text-sm text-muted-foreground">Chat with your personalized AI tutor</p>
          </Card>
        </Link>

        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/progress`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <Target className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-semibold text-lg mb-1">Analytics</h3>
            <p className="text-sm text-muted-foreground">Track your progress and performance</p>
          </Card>
        </Link>

        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/past-papers`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <File className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-lg mb-1">Past Papers</h3>
            <p className="text-sm text-muted-foreground">Upload and practice with past exam papers</p>
          </Card>
        </Link>

        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/exercises`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <Target className="w-8 h-8 text-secondary mb-3" />
            <h3 className="font-semibold text-lg mb-1">Practice Exercises</h3>
            <p className="text-sm text-muted-foreground">Solve problems and check your solutions</p>
          </Card>
        </Link>

        <Link href={`/dashboard/revision-sets/${revisionSet.slug || revisionSet._id}/essay`}>
          <Card className="p-6 hover:border-primary/50 cursor-pointer transition bg-card border-border">
            <File className="w-8 h-8 text-accent mb-3" />
            <h3 className="font-semibold text-lg mb-1">Essay Builder</h3>
            <p className="text-sm text-muted-foreground">Create structured essays with AI assistance</p>
          </Card>
        </Link>
      </div>
        </div>
      </div>
    </div>
  )
}

