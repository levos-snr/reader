"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  BookOpen,
  Sparkles,
  Target,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Calendar,
  Brain,
  Zap,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  const [preferences, setPreferences] = useState({
    studyGoals: [] as string[],
    examTargets: [] as string[],
    subjectsOfInterest: [] as string[],
    preferredStudyTime: "",
    learningStyle: "",
    aiProvider: "openai",
    notificationsEnabled: true,
  })

  const user = useQuery(api.auth.getCurrentUser)
  const updateOnboarding = useMutation(api.users.updateOnboardingStatus)
  const updatePreferences = useMutation(api.users.updateUserPreferences)
  const createFirstRevisionSet = useMutation(api.revisionSets.createRevisionSet)

  const steps = [
    {
      title: "Welcome to GizmoReader!",
      description: "Transform your exam revision with AI-powered learning",
      icon: BookOpen,
    },
    {
      title: "What are your study goals?",
      description: "Select all that apply to help us personalize your experience",
      icon: Target,
    },
    {
      title: "What exams are you targeting?",
      description: "Choose the exam boards and levels you're preparing for",
      icon: CheckCircle,
    },
    {
      title: "Which subjects interest you?",
      description: "Select your main subjects - you can add more later",
      icon: Brain,
    },
    {
      title: "When do you study best?",
      description: "We'll optimize your study schedule and reminders",
      icon: Calendar,
    },
    {
      title: "What's your learning style?",
      description: "Help us tailor content and recommendations",
      icon: Sparkles,
    },
    {
      title: "Choose your AI assistant",
      description: "Select your preferred AI provider for personalized help",
      icon: MessageSquare,
    },
    {
      title: "Ready to start?",
      description: "Let's create your first revision set",
      icon: Zap,
    },
  ]

  const handleNext = async () => {
    if (step === steps.length - 1) {
      try {
        if (user?._id) {
          // Update user preferences
          await updatePreferences({
            userId: user._id.toString(),
            preferences: preferences,
          })

          // Complete onboarding
          await updateOnboarding({
            userId: user._id.toString(),
            onboarded: true,
          })

          toast.success("Welcome to GizmoReader!")
          router.push("/dashboard")
        }
      } catch (error) {
        toast.error("Failed to complete onboarding")
      }
    } else {
      setStep(step + 1)
    }
  }

  const handleSkip = async () => {
    try {
      if (user?._id) {
        await updateOnboarding({
          userId: user._id.toString(),
          onboarded: true,
        })
        router.push("/dashboard")
      }
    } catch (error) {
      toast.error("Failed to skip onboarding")
    }
  }

  const handleGoalToggle = (goal: string) => {
    setPreferences((prev) => ({
      ...prev,
      studyGoals: prev.studyGoals.includes(goal)
        ? prev.studyGoals.filter((g) => g !== goal)
        : [...prev.studyGoals, goal],
    }))
  }

  const handleExamToggle = (exam: string) => {
    setPreferences((prev) => ({
      ...prev,
      examTargets: prev.examTargets.includes(exam)
        ? prev.examTargets.filter((e) => e !== exam)
        : [...prev.examTargets, exam],
    }))
  }

  const handleSubjectToggle = (subject: string) => {
    setPreferences((prev) => ({
      ...prev,
      subjectsOfInterest: prev.subjectsOfInterest.includes(subject)
        ? prev.subjectsOfInterest.filter((s) => s !== subject)
        : [...prev.subjectsOfInterest, subject],
    }))
  }

  const CurrentStepIcon = steps[step].icon

  const studyGoalOptions = [
    { id: "pass-exams", label: "Pass my exams" },
    { id: "master-subject", label: "Master a subject" },
    { id: "improve-grades", label: "Improve my grades" },
    { id: "get-top-marks", label: "Get top marks" },
  ]

  const examOptions = [
    { id: "A-Levels", label: "A-Levels" },
    { id: "IB", label: "IB Programme" },
    { id: "AP", label: "AP Exams" },
    { id: "IGCSE", label: "IGCSE" },
    { id: "GCSE", label: "GCSE" },
  ]

  const subjectOptions = [
    { id: "Mathematics", label: "Mathematics" },
    { id: "Physics", label: "Physics" },
    { id: "Chemistry", label: "Chemistry" },
    { id: "Biology", label: "Biology" },
    { id: "English", label: "English" },
    { id: "History", label: "History" },
    { id: "Economics", label: "Economics" },
  ]

  const studyTimeOptions = [
    { id: "morning", label: "Early Morning (5-8 AM)" },
    { id: "midday", label: "Midday (12-2 PM)" },
    { id: "evening", label: "Evening (4-7 PM)" },
    { id: "night", label: "Late Night (8 PM+)" },
    { id: "flexible", label: "Flexible / Varies" },
  ]

  const learningStyleOptions = [
    { id: "visual", label: "Visual - I learn with diagrams & visuals" },
    { id: "auditory", label: "Auditory - I learn by listening" },
    { id: "kinesthetic", label: "Kinesthetic - I learn by doing" },
    { id: "reading", label: "Reading/Writing - I learn by reading" },
    { id: "mixed", label: "Mixed - All of the above" },
  ]

  const aiProviderOptions = [
    { id: "openai", label: "OpenAI (ChatGPT)" },
    { id: "anthropic", label: "Anthropic (Claude)" },
    { id: "google", label: "Google (Gemini)" },
    { id: "groq", label: "Groq (Fast AI)" },
  ]

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <Card className="w-full max-w-2xl p-6 sm:p-8 md:p-10 border-border bg-card">
        {/* Progress Bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm text-muted-foreground">
              Step {step + 1} of {steps.length}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs sm:text-sm">
              Skip
            </Button>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <CurrentStepIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 text-foreground">{steps[step].title}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">{steps[step].description}</p>
        </div>

        {/* Step Forms */}
        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          {step === 1 && (
            <div className="space-y-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {studyGoalOptions.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => handleGoalToggle(goal.id)}
                  className={`p-3 rounded-lg border-2 transition text-left ${
                    preferences.studyGoals.includes(goal.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{goal.label}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {examOptions.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => handleExamToggle(exam.id)}
                  className={`p-3 rounded-lg border-2 transition text-left ${
                    preferences.examTargets.includes(exam.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{exam.label}</p>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjectOptions.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectToggle(subject.id)}
                  className={`p-3 rounded-lg border-2 transition text-left ${
                    preferences.subjectsOfInterest.includes(subject.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{subject.label}</p>
                </button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              {studyTimeOptions.map((time) => (
                <button
                  key={time.id}
                  onClick={() => setPreferences((p) => ({ ...p, preferredStudyTime: time.id }))}
                  className={`w-full p-3 rounded-lg border-2 transition text-left ${
                    preferences.preferredStudyTime === time.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{time.label}</p>
                </button>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              {learningStyleOptions.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setPreferences((p) => ({ ...p, learningStyle: style.id }))}
                  className={`w-full p-3 rounded-lg border-2 transition text-left ${
                    preferences.learningStyle === style.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{style.label}</p>
                </button>
              ))}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aiProviderOptions.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setPreferences((p) => ({ ...p, aiProvider: provider.id }))}
                  className={`p-4 rounded-lg border-2 transition text-left ${
                    preferences.aiProvider === provider.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-sm font-medium">{provider.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">Powered by advanced AI</p>
                </button>
              ))}
            </div>
          )}

          {step === 7 && (
            <div className="text-center space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                You're all set! Create your first revision set to start learning with AI-powered features.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6">
                <Card className="p-4 border-border bg-card hover:border-primary/50 transition">
                  <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs sm:text-sm font-semibold">SmartNotes</p>
                  <p className="text-xs text-muted-foreground mt-1">AI-generated notes</p>
                </Card>
                <Card className="p-4 border-border bg-card hover:border-primary/50 transition">
                  <Brain className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="text-xs sm:text-sm font-semibold">FlashGen</p>
                  <p className="text-xs text-muted-foreground mt-1">Smart flashcards</p>
                </Card>
                <Card className="p-4 border-border bg-card hover:border-primary/50 transition">
                  <Target className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="text-xs sm:text-sm font-semibold">QuizCraft</p>
                  <p className="text-xs text-muted-foreground mt-1">Practice quizzes</p>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button onClick={handleNext} className="flex items-center gap-2">
            <span>{step === steps.length - 1 ? "Get Started" : "Next"}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}

