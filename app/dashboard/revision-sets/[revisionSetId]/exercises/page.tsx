"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Loader, Sparkles, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import BackButton from "@/components/back-button"

export default function ExercisesPage() {
  const params = useParams()
  const revisionSetId = params.revisionSetId as string
  const [isCreating, setIsCreating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [genOpen, setGenOpen] = useState(false)
  const [newExercise, setNewExercise] = useState({ question: "", solution: "", difficulty: "medium", topic: "" })
  const [showSolutions, setShowSolutions] = useState<Record<string, boolean>>({})

  // TODO: Create practiceExercises queries/mutations
  // const exercises = useQuery(api.practiceExercises.getExercisesByRevisionSet, { revisionSetId: revisionSetId as any })
  const materials = useQuery(api.studyMaterials.getMaterialsByRevisionSet, { revisionSetId: revisionSetId as any })
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  
  // const createExercise = useMutation(api.practiceExercises.createExercise)
  // const deleteExercise = useMutation(api.practiceExercises.deleteExercise)
  const generateQuizAI = useAction(api.aiActions.generateQuiz) // Reuse quiz generation for exercises

  const exercises: any[] = [] // Placeholder

  const handleCreateExercise = async () => {
    if (!newExercise.question.trim() || !newExercise.solution.trim()) {
      toast.error("Please fill in question and solution")
      return
    }

    try {
      // TODO: await createExercise({ ... })
      toast.success("Exercise created!")
      setNewExercise({ question: "", solution: "", difficulty: "medium", topic: "" })
      setIsCreating(false)
    } catch (error) {
      toast.error("Failed to create exercise")
    }
  }

  const handleGenerateExercises = async () => {
    setIsGenerating(true)
    try {
      if (materials && materials.length === 0) {
        toast.error("Please upload materials first")
        return
      }

      const content = materials
        ?.map((m) => m.extractedContent || m.title || "")
        .join("\n\n") || ""

      const apiKey = userProfile?.preferences?.aiApiKey

      // Generate practice problems
      const questions = await generateQuizAI({
        content,
        count: 10,
        difficulty: newExercise.difficulty,
        apiKey,
      })

      // Convert quiz questions to exercises
      for (const q of questions.slice(0, 5)) {
        // TODO: await createExercise({ ... })
      }

      toast.success("Practice exercises generated!")
      setGenOpen(false)
    } catch (error) {
      console.error("Exercise generation error:", error)
      toast.error("Failed to generate exercises")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          <BackButton fallbackHref={`/dashboard/revision-sets/${revisionSetId}`} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/revision-sets/${revisionSetId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Practice Exercises</h1>
                <p className="text-muted-foreground">Solve problems and check your solutions</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={genOpen} onOpenChange={setGenOpen}>
                <Button onClick={() => setGenOpen(true)} disabled={isGenerating} className="bg-gradient-primary">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGenerating ? "Generating..." : "Generate with AI"}
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Practice Exercises</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block text-sm">Difficulty</Label>
                      <Select value={newExercise.difficulty} onValueChange={(v) => setNewExercise({ ...newExercise, difficulty: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
                    <Button onClick={handleGenerateExercises} disabled={isGenerating}>
                      {isGenerating ? "Generating..." : "Generate"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={() => setIsCreating(!isCreating)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Exercise
              </Button>
            </div>
          </div>

          {/* Create Form */}
          {isCreating && (
            <Card className="p-6 bg-card border-border">
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block text-sm">Question</Label>
                  <Textarea
                    value={newExercise.question}
                    onChange={(e) => setNewExercise({ ...newExercise, question: e.target.value })}
                    placeholder="Enter the exercise question..."
                    className="min-h-32 bg-background border-border"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm">Solution</Label>
                  <Textarea
                    value={newExercise.solution}
                    onChange={(e) => setNewExercise({ ...newExercise, solution: e.target.value })}
                    placeholder="Enter the solution..."
                    className="min-h-32 bg-background border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block text-sm">Difficulty</Label>
                    <Select value={newExercise.difficulty} onValueChange={(v) => setNewExercise({ ...newExercise, difficulty: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Topic (Optional)</Label>
                    <Input
                      value={newExercise.topic}
                      onChange={(e) => setNewExercise({ ...newExercise, topic: e.target.value })}
                      placeholder="e.g., Algebra"
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateExercise}>Create Exercise</Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Exercises List */}
          {exercises.length === 0 ? (
            <Card className="p-12 text-center bg-card border-border">
              <p className="text-muted-foreground mb-4">No exercises yet</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setIsCreating(true)}>Create Exercise</Button>
                <Button onClick={handleGenerateExercises} variant="outline">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {exercises.map((exercise) => (
                <Card key={exercise._id} className="p-6 bg-card border-border">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded capitalize">
                            {exercise.difficulty || "medium"}
                          </span>
                          {exercise.topic && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              {exercise.topic}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-lg mb-2">{exercise.question}</p>
                      </div>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSolutions({ ...showSolutions, [exercise._id]: !showSolutions[exercise._id] })}
                      >
                        {showSolutions[exercise._id] ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-2" />
                            Hide Solution
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-2" />
                            Show Solution
                          </>
                        )}
                      </Button>
                      {showSolutions[exercise._id] && (
                        <div className="mt-3 p-4 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{exercise.solution}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

