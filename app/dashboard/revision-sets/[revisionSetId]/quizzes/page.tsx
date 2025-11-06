"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Loader, Sparkles, Play, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import BackButton from "@/components/back-button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function QuizzesPage() {
  const params = useParams()
  const router = useRouter()
  const revisionSetId = params.revisionSetId as string

  const [isGenerating, setIsGenerating] = useState(false)
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [genOpen, setGenOpen] = useState(false)
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [questionCount, setQuestionCount] = useState([20])
  const [difficulty, setDifficulty] = useState("medium")
  const [timeLimit, setTimeLimit] = useState([30])
  const [types, setTypes] = useState<{ mcq: boolean; tf: boolean; short: boolean }>({ mcq: true, tf: true, short: false })

  const quizzes = useQuery(api.quizzes.getQuizzesByRevisionSet, {
    revisionSetId: revisionSetId as any,
  })
  const materials = useQuery(api.studyMaterials.getMaterialsByRevisionSet, { revisionSetId: revisionSetId as any })
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const { data: session } = authClient.useSession()

  const createQuiz = useMutation(api.quizzes.createQuizForRevisionSet)
  const deleteQuiz = useMutation(api.quizzes.deleteQuiz)
  const recordAttempt = useMutation(api.quizzes.recordQuizAttempt)
  const generateQuizAI = useAction(api.aiActions.generateQuiz)
  const recordStudyActivity = useMutation(api.streaks.recordStudyActivity)

  const handleGenerateQuiz = async (difficulty = "medium") => {
    setIsGenerating(true)
    try {
      const selected = (materials || []).filter((m) => selectedMaterialIds.includes(m._id))
      
      if (selected.length === 0) {
        toast.error("Please select at least one material")
        return
      }

      const count = Math.max(5, Math.min(50, questionCount[0]))

      // Get content from selected materials
      const content = selected
        .map((m) => m.extractedContent || m.title || "No content available")
        .join("\n\n")

      // Get API key from user preferences
      const apiKey = userProfile?.preferences?.aiApiKey

      // Generate quiz questions using AI
      const sampleQuestions = await generateQuizAI({
        content,
        count,
        difficulty,
        apiKey,
      })

      await createQuiz({
        revisionSetId: revisionSetId as any,
        title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz (${count} Qs)`,
        questions: sampleQuestions,
        difficulty: difficulty,
        generatedBy: (userProfile?.preferences?.aiProvider || "openrouter") as any,
      })
      toast.success("Quiz generated successfully!")
      await recordStudyActivity({ activityType: "quiz", revisionSetId: revisionSetId as any })
      setGenOpen(false)
      setSelectedMaterialIds([])
    } catch (error: any) {
      console.error("Quiz generation error:", error)
      const errorMessage = error?.message || "Failed to generate quiz. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (confirm("Delete this quiz?")) {
      try {
        await deleteQuiz({ quizId: quizId as any })
        toast.success("Quiz deleted")
      } catch (error) {
        toast.error("Failed to delete quiz")
      }
    }
  }

  const handleSubmitQuiz = async (quiz: any) => {
    const correctAnswers = quiz.questions.filter((q: any, idx: number) => answers[idx] === q.correctAnswer).length
    const score = Math.round((correctAnswers / quiz.questions.length) * 100)

    try {
      await recordAttempt({
        quizId: quiz._id,
        revisionSetId: revisionSetId as any,
        answers: quiz.questions.map((q: any, idx: number) => ({
          questionId: q.questionId,
          selectedAnswer: answers[idx] || -1,
          isCorrect: answers[idx] === q.correctAnswer,
        })),
        score: score,
        timeSpent: 600, // Placeholder for time
      })
      setShowResults(true)
      toast.success(`Quiz complete! Score: ${score}%`)
      await recordStudyActivity({ activityType: "quiz", revisionSetId: revisionSetId as any })
    } catch (error) {
      toast.error("Failed to submit quiz")
    }
  }

  if (quizzes === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Loading quizzes...</p>
        </div>
      </div>
    )
  }

  const currentQuiz = quizzes.find((q) => q._id === currentQuizId)

  if (currentQuiz && !showResults) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{currentQuiz.title}</h1>
          <Button
            variant="outline"
            onClick={() => {
              setCurrentQuizId(null)
              setAnswers({})
              setShowResults(false)
            }}
          >
            Back to Quizzes
          </Button>
        </div>

        <div className="space-y-6">
          {currentQuiz.questions.map((question: any, idx: number) => (
            <Card key={idx} className="p-6 bg-card border-border">
              <p className="font-semibold mb-4">
                {idx + 1}. {question.question}
              </p>
              <div className="space-y-2">
                {question.options.map((option: string, optIdx: number) => (
                  <label
                    key={optIdx}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer border border-transparent hover:border-border transition"
                  >
                    <input
                      type="radio"
                      name={`question-${idx}`}
                      value={optIdx}
                      checked={answers[idx] === optIdx}
                      onChange={() => setAnswers({ ...answers, [idx]: optIdx })}
                      className="w-4 h-4"
                    />
                    <span className="text-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <Button onClick={() => handleSubmitQuiz(currentQuiz)} size="lg" className="w-full">
          Submit Quiz
        </Button>
      </div>
    )
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
                <h1 className="text-3xl font-bold">QuizCraft</h1>
                <p className="text-muted-foreground">Practice with AI-generated quizzes</p>
              </div>
            </div>
        <div className="flex gap-2">
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <Button onClick={() => setGenOpen(true)} disabled={isGenerating} className="bg-gradient-primary">
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Quiz"}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Practice Quiz</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block text-sm">Select materials</Label>
                  <div className="max-h-44 overflow-auto space-y-2 border rounded-md p-3">
                    {(materials || []).map((m) => (
                      <label key={m._id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedMaterialIds.includes(m._id as any)}
                          onCheckedChange={(c) =>
                            setSelectedMaterialIds((prev) =>
                              c ? [...prev, m._id as any] : prev.filter((id) => id !== (m._id as any)),
                            )
                          }
                        />
                        <span className="truncate">{m.title}</span>
                      </label>
                    ))}
                    {materials && materials.length === 0 && (
                      <p className="text-xs text-muted-foreground">No materials uploaded yet.</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block text-sm">Number of questions</Label>
                    <div className="px-1">
                      <Slider value={questionCount} onValueChange={setQuestionCount} min={5} max={50} step={5} />
                      <p className="text-xs text-muted-foreground mt-2">{questionCount[0]} questions</p>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-2 block text-sm">Time limit (minutes)</Label>
                    <div className="px-1">
                      <Slider value={timeLimit} onValueChange={setTimeLimit} min={10} max={60} step={10} />
                      <p className="text-xs text-muted-foreground mt-2">{timeLimit[0]} minutes</p>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Question types</Label>
                    <div className="space-y-2 border rounded-md p-3">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={types.mcq} onCheckedChange={(c) => setTypes((t) => ({ ...t, mcq: !!c }))} />
                        Multiple Choice
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={types.tf} onCheckedChange={(c) => setTypes((t) => ({ ...t, tf: !!c }))} />
                        True / False
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={types.short} onCheckedChange={(c) => setTypes((t) => ({ ...t, short: !!c }))} />
                        Short Answer
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button onClick={() => handleGenerateQuiz(difficulty)} disabled={isGenerating}>
                  {isGenerating ? "Generating..." : "Generate Quiz"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quizzes List */}
      {quizzes.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border">
          <p className="text-muted-foreground mb-4">No quizzes yet</p>
          <Button onClick={() => handleGenerateQuiz()} className="bg-gradient-primary">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate First Quiz
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz._id} className="p-6 bg-card border-border hover:border-primary/50 transition">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-foreground">{quiz.title}</h3>
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded capitalize">
                      {quiz.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {quiz.questions.length} questions • {quiz.timeLimit} minutes
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setCurrentQuizId(quiz._id)
                      setAnswers({})
                      setShowResults(false)
                    }}
                    className="bg-gradient-primary"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteQuiz(quiz._id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
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

