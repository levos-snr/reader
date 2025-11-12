"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Loader, Sparkles, Play, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react"
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
  const [questionCount, setQuestionCount] = useState([10])
  const [difficulty, setDifficulty] = useState("medium")
  const [timeLimit, setTimeLimit] = useState([30])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [startTime, setStartTime] = useState<number>(Date.now())

  const quizzes = useQuery(api.quizzes.getQuizzesByRevisionSet, {
    revisionSetId: revisionSetId as any,
  })
  const materials = useQuery(api.studyMaterials.getMaterialsByRevisionSet, { 
    revisionSetId: revisionSetId as any 
  })
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const { data: session } = authClient.useSession()

  const createQuiz = useMutation(api.quizzes.createQuizForRevisionSet)
  const deleteQuiz = useMutation(api.quizzes.deleteQuiz)
  const recordAttempt = useMutation(api.quizzes.recordQuizAttempt)
  const generateQuizAI = useAction(api.aiActions.generateQuiz)
  const recordStudyActivity = useMutation(api.streaks.recordStudyActivity)

  const handleGenerateQuiz = async () => {
    if (selectedMaterialIds.length === 0) {
      toast.error("Please select at least one material")
      return
    }

    setIsGenerating(true)
    try {
      const selected = (materials || []).filter((m) => selectedMaterialIds.includes(m._id))
      const count = Math.max(5, Math.min(50, questionCount[0]))

      // Get content from selected materials
      const content = selected
        .map((m) => {
          if (m.extractedContent) {
            return m.extractedContent
          }
          return `Material: ${m.title}\nType: ${m.type}\nNo text content extracted yet.`
        })
        .join("\n\n---\n\n")

      if (content.length < 50) {
        toast.error("Not enough content in selected materials. Please upload materials with text content.")
        setIsGenerating(false)
        return
      }

      // Get API key from user preferences
      const apiKey = userProfile?.preferences?.aiApiKey

      // Generate quiz questions using AI
      const questions = await generateQuizAI({
        content,
        count,
        difficulty,
        apiKey,
      })

      await createQuiz({
        revisionSetId: revisionSetId as any,
        title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz - ${count} Questions`,
        questions: questions,
        difficulty: difficulty,
        timeLimit: timeLimit[0],
        generatedBy: (userProfile?.preferences?.aiProvider || "openrouter") as any,
      })

      toast.success("Quiz generated successfully!")
      await recordStudyActivity({ 
        activityType: "quiz", 
        revisionSetId: revisionSetId as any 
      })
      
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

  const handleStartQuiz = (quiz: any) => {
    setCurrentQuizId(quiz._id)
    setAnswers({})
    setShowResults(false)
    setCurrentQuestion(0)
    setStartTime(Date.now())
  }

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    setAnswers({
      ...answers,
      [questionIndex]: answerIndex,
    })
  }

  const handleSubmitQuiz = async (quiz: any) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)
    const correctAnswers = quiz.questions.filter(
      (q: any, idx: number) => answers[idx] === q.correctAnswer
    ).length
    const score = Math.round((correctAnswers / quiz.questions.length) * 100)

    try {
      await recordAttempt({
        quizId: quiz._id,
        revisionSetId: revisionSetId as any,
        answers: quiz.questions.map((q: any, idx: number) => ({
          questionId: q.questionId || `q${idx}`,
          selectedAnswer: answers[idx] !== undefined ? answers[idx] : -1,
          isCorrect: answers[idx] === q.correctAnswer,
          timeSpent: 0,
        })),
        score: score,
        timeSpent: timeSpent,
      })
      
      setShowResults(true)
      toast.success(`Quiz complete! Score: ${score}%`)
      
      await recordStudyActivity({ 
        activityType: "quiz", 
        revisionSetId: revisionSetId as any 
      })
    } catch (error) {
      toast.error("Failed to submit quiz")
    }
  }

  const calculateResults = (quiz: any) => {
    const correct = quiz.questions.filter(
      (q: any, i: number) => answers[i] === q.correctAnswer
    ).length
    const total = quiz.questions.length
    const percentage = Math.round((correct / total) * 100)

    return {
      correct,
      total,
      incorrect: total - correct,
      percentage,
      passed: percentage >= 70,
    }
  }

  if (quizzes === undefined || materials === undefined) {
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

  // Quiz Taking View
  if (currentQuiz && !showResults) {
    const question = currentQuiz.questions[currentQuestion]
    const progress = ((currentQuestion + 1) / currentQuiz.questions.length) * 100

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{currentQuiz.title}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    Question {currentQuestion + 1} of {currentQuiz.questions.length}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm("Exit quiz? Your progress will be lost.")) {
                    setCurrentQuizId(null)
                    setAnswers({})
                    setShowResults(false)
                    setCurrentQuestion(0)
                  }
                }}
              >
                Exit
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Question Card */}
            <Card className="p-6 sm:p-8 bg-card border-border">
              <h3 className="text-xl font-semibold mb-6">{question.question}</h3>

              <div className="space-y-3">
                {question.options.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(currentQuestion, index)}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      answers[currentQuestion] === index
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion] === index
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {answers[currentQuestion] === index && (
                          <div className="w-3 h-3 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex gap-4">
              {currentQuestion > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                >
                  Previous
                </Button>
              )}

              {currentQuestion < currentQuiz.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="flex-1"
                  disabled={answers[currentQuestion] === undefined}
                >
                  Next Question
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubmitQuiz(currentQuiz)}
                  className="flex-1 bg-gradient-primary"
                  disabled={Object.keys(answers).length !== currentQuiz.questions.length}
                >
                  Submit Quiz
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Results View
  if (currentQuiz && showResults) {
    const results = calculateResults(currentQuiz)

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="space-y-6">
            {/* Results Header */}
            <div className="text-center">
              <div
                className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                  results.passed ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {results.passed ? (
                  <CheckCircle className="w-10 h-10 text-green-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-600" />
                )}
              </div>

              <h1 className="text-3xl font-bold mb-2">Quiz Complete!</h1>
              <p className="text-xl text-muted-foreground">
                You scored{" "}
                <span className="font-bold text-primary">{results.percentage}%</span>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 text-center bg-card border-border">
                <div className="text-3xl font-bold text-green-600">{results.correct}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </Card>
              <Card className="p-4 text-center bg-card border-border">
                <div className="text-3xl font-bold text-red-600">{results.incorrect}</div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </Card>
              <Card className="p-4 text-center bg-card border-border">
                <div className="text-3xl font-bold text-primary">{results.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </Card>
            </div>

            {/* Question Review */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Review Answers</h2>
              {currentQuiz.questions.map((question: any, index: number) => {
                const userAnswer = answers[index]
                const isCorrect = userAnswer === question.correctAnswer

                return (
                  <Card
                    key={index}
                    className={`p-6 border-2 ${
                      isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold mb-2">{question.question}</p>
                        <div className="text-sm space-y-1">
                          {userAnswer !== undefined && !isCorrect && (
                            <p className="text-red-700">
                              Your answer:{" "}
                              <span className="font-semibold">
                                {question.options[userAnswer]}
                              </span>
                            </p>
                          )}
                          <p className="text-green-700">
                            Correct answer:{" "}
                            <span className="font-semibold">
                              {question.options[question.correctAnswer]}
                            </span>
                          </p>
                          {question.explanation && (
                            <p className="text-muted-foreground italic mt-2">
                              {question.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentQuizId(null)
                  setAnswers({})
                  setShowResults(false)
                  setCurrentQuestion(0)
                }}
                className="flex-1"
              >
                Back to Quizzes
              </Button>
              <Button
                onClick={() => {
                  setAnswers({})
                  setShowResults(false)
                  setCurrentQuestion(0)
                  setStartTime(Date.now())
                }}
                className="flex-1 bg-gradient-primary"
              >
                Retake Quiz
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Quiz List View
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          <BackButton fallbackHref={`/dashboard/revision-sets/${revisionSetId}`} />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/revision-sets/${revisionSetId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">QuizCraft</h1>
                <p className="text-muted-foreground">
                  Practice with AI-generated quizzes
                </p>
              </div>
            </div>

            <Button
              onClick={() => setGenOpen(true)}
              disabled={isGenerating}
              className="bg-gradient-primary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Quiz"}
            </Button>
          </div>

          {/* Quiz List */}
          {quizzes.length === 0 ? (
            <Card className="p-12 text-center bg-card border-border">
              <p className="text-muted-foreground mb-4">No quizzes yet</p>
              <Button onClick={() => setGenOpen(true)} className="bg-gradient-primary">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate First Quiz
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz) => (
                <Card
                  key={quiz._id}
                  className="p-6 bg-card border-border hover:border-primary/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-foreground">
                          {quiz.title}
                        </h3>
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
                        onClick={() => handleStartQuiz(quiz)}
                        className="bg-gradient-primary"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteQuiz(quiz._id)}
                      >
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

      {/* Generate Quiz Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate AI-Powered Quiz</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Material Selection */}
            <div>
              <Label className="mb-2 block text-sm">
                Select Study Materials
              </Label>
              <div className="max-h-44 overflow-auto space-y-2 border rounded-md p-3">
                {(materials || []).map((m) => (
                  <label
                    key={m._id}
                    className="flex items-center gap-2 text-sm hover:bg-muted p-2 rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedMaterialIds.includes(m._id as any)}
                      onCheckedChange={(c) =>
                        setSelectedMaterialIds((prev) =>
                          c
                            ? [...prev, m._id as any]
                            : prev.filter((id) => id !== (m._id as any))
                        )
                      }
                    />
                    <span className="truncate">{m.title}</span>
                    {m.processedStatus === "completed" && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </label>
                ))}
                {materials && materials.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No materials uploaded yet. Upload materials first.
                  </p>
                )}
              </div>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Number of Questions */}
              <div>
                <Label className="mb-2 block text-sm">Number of Questions</Label>
                <div className="px-1">
                  <Slider
                    value={questionCount}
                    onValueChange={setQuestionCount}
                    min={5}
                    max={30}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {questionCount[0]} questions
                  </p>
                </div>
              </div>

              {/* Difficulty */}
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

              {/* Time Limit */}
              <div className="sm:col-span-2">
                <Label className="mb-2 block text-sm">Time Limit (minutes)</Label>
                <div className="px-1">
                  <Slider
                    value={timeLimit}
                    onValueChange={setTimeLimit}
                    min={10}
                    max={60}
                    step={10}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {timeLimit[0]} minutes
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateQuiz}
              disabled={isGenerating || selectedMaterialIds.length === 0}
              className="bg-gradient-primary"
            >
              {isGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Quiz
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
