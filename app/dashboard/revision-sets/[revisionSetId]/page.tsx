"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Lightbulb,
  Brain,
  Target,
  MessageSquare,
  Upload,
  File,
  Plus,
  Trash2,
  Loader,
  Sparkles,
  Send,
  BookOpen,
  FileText,
  HelpCircle,
} from "lucide-react"
import BackButton from "@/components/back-button"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { authClient } from "@/lib/auth-client"

export default function RevisionSetPage() {
  const params = useParams()
  const router = useRouter()
  const revisionSetParam = params.revisionSetId as string
  const isValidId = /^[a-z0-9]+$/.test(revisionSetParam) && revisionSetParam.length >= 20
  const [activeTab, setActiveTab] = useState("materials")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const revisionSetById = useQuery(
    api.revisionSets.getRevisionSetWithContent,
    isValidId ? { revisionSetId: revisionSetParam as any } : "skip"
  )
  const revisionSetBySlug = useQuery(
    api.revisionSets.getRevisionSetWithContentBySlug,
    !isValidId ? { slug: revisionSetParam } : "skip"
  )
  const revisionSet = revisionSetById || revisionSetBySlug

  const { data: session } = authClient.useSession()
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const generateUploadUrl = useMutation(api.studyMaterials.generateUploadUrl)
  const createMaterial = useMutation(api.studyMaterials.createStudyMaterial)
  const deleteMaterial = useMutation(api.studyMaterials.deleteStudyMaterial)
  const materials = useQuery(
    api.studyMaterials.getMaterialsByRevisionSet,
    revisionSet?._id ? { revisionSetId: revisionSet._id as any } : "skip"
  )

  // AI Actions (new RAG-based)
  const generateQuizAI = useAction(api.aiAgents.generateQuiz)
  const generateFlashcardsAI = useAction(api.aiAgents.generateFlashcards)
  const generateNotesAI = useAction(api.aiAgents.generateNotes)
  const generateEssayAI = useAction(api.aiAgents.generateEssay)
  const chatWithTutorAI = useAction(api.aiAgents.chatWithTutor)

  // Mutations for creating content
  const createQuizMutation = useMutation(api.quizzes.createQuizForRevisionSet)
  const createFlashcardsMutation = useMutation(api.flashcards.createFlashcard)
  const createNoteMutation = useMutation(api.smartNotes.createSmartNote)

  // State for different tabs
  const [quizTopic, setQuizTopic] = useState("")
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)
  const [flashcardTopic, setFlashcardTopic] = useState("")
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false)
  const [notesTopic, setNotesTopic] = useState("")
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
  const [tutorMessage, setTutorMessage] = useState("")
  const [tutorMessages, setTutorMessages] = useState<Array<{ role: string; content: string }>>([])
  const [isTutorLoading, setIsTutorLoading] = useState(false)

  useEffect(() => {
    if (!isValidId && typeof window !== "undefined") {
      router.replace("/dashboard/revision-sets")
    }
  }, [isValidId, router])

  // Early returns AFTER all hooks
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files
    if (!files) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const validTypes = [
          "text/plain",
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ]

        if (
          !validTypes.includes(file.type) &&
          !file.name.endsWith(".txt") &&
          !file.name.endsWith(".pdf") &&
          !file.name.endsWith(".docx") &&
          !file.name.endsWith(".doc")
        ) {
          toast.error(`${file.name}: Unsupported file type. Please upload PDF, DOCX, or TXT files.`)
          continue
        }

        const postUrl = await generateUploadUrl()
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })

        if (!result.ok) {
          throw new Error("Failed to upload file")
        }

        const { storageId } = await result.json()

        await createMaterial({
          revisionSetId: revisionSet._id as any,
          title: file.name,
          type: file.type.includes("pdf")
            ? "pdf"
            : file.type.includes("word") || file.name.includes(".doc")
              ? "document"
              : file.type.includes("text")
                ? "text"
                : "document",
          fileId: storageId,
          fileSize: file.size,
        })

        toast.success(`${file.name} uploaded! Processing...`)
      }
      setUploadDialogOpen(false)
    } catch (error: any) {
      console.error("Upload error:", error)
      const errorMessage = error?.message || "Failed to upload file"
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!quizTopic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsGeneratingQuiz(true)
    try {
      const questions = await generateQuizAI({
        revisionSetId: revisionSet._id as any,
        topic: quizTopic,
        count: 5,
        difficulty: "medium",
        apiKey: userProfile?.preferences?.aiApiKey,
      })

      await createQuizMutation({
        revisionSetId: revisionSet._id as any,
        title: `Quiz: ${quizTopic}`,
        questions: questions,
        difficulty: "medium",
        generatedBy: userProfile?.preferences?.aiProvider || "openai",
      })

      toast.success(`Generated ${questions.length} quiz questions!`)
      setQuizTopic("")
    } catch (error: any) {
      console.error("Quiz generation error:", error)
      const errorMessage = error?.message || "Failed to generate quiz"
      if (errorMessage.includes("API key")) {
        toast.error("Please configure your OpenAI API key in settings or Convex environment variables")
      } else if (errorMessage.includes("No relevant content")) {
        toast.error("No documents found. Please upload and process documents first.")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsGeneratingQuiz(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    if (!flashcardTopic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsGeneratingFlashcards(true)
    try {
      const flashcards = await generateFlashcardsAI({
        revisionSetId: revisionSet._id as any,
        topic: flashcardTopic,
        count: 10,
        apiKey: userProfile?.preferences?.aiApiKey,
      })

      // Create flashcards in database
      for (const card of flashcards) {
        await createFlashcardsMutation({
          revisionSetId: revisionSet._id as any,
          front: card.front,
          back: card.back,
          difficulty: card.difficulty as any,
        })
      }

      toast.success(`Generated ${flashcards.length} flashcards!`)
      setFlashcardTopic("")
    } catch (error: any) {
      console.error("Flashcard generation error:", error)
      const errorMessage = error?.message || "Failed to generate flashcards"
      if (errorMessage.includes("API key")) {
        toast.error("Please configure your OpenAI API key in settings or Convex environment variables")
      } else if (errorMessage.includes("No relevant content")) {
        toast.error("No documents found. Please upload and process documents first.")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsGeneratingFlashcards(false)
    }
  }

  const handleGenerateNotes = async () => {
    if (!notesTopic.trim()) {
      toast.error("Please enter a topic")
      return
    }

    setIsGeneratingNotes(true)
    try {
      const notes = await generateNotesAI({
        revisionSetId: revisionSet._id as any,
        topic: notesTopic,
        style: "comprehensive",
        apiKey: userProfile?.preferences?.aiApiKey,
      })

      await createNoteMutation({
        revisionSetId: revisionSet._id as any,
        title: `Notes: ${notesTopic}`,
        content: notes,
        generatedBy: userProfile?.preferences?.aiProvider || "openai",
      })

      toast.success("Notes generated successfully!")
      setNotesTopic("")
    } catch (error: any) {
      console.error("Notes generation error:", error)
      const errorMessage = error?.message || "Failed to generate notes"
      if (errorMessage.includes("API key")) {
        toast.error("Please configure your OpenAI API key in settings or Convex environment variables")
      } else if (errorMessage.includes("No relevant content")) {
        toast.error("No documents found. Please upload and process documents first.")
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  const handleSendTutorMessage = async () => {
    if (!tutorMessage.trim()) return

    const userMsg = { role: "user", content: tutorMessage }
    setTutorMessages((prev) => [...prev, userMsg])
    setTutorMessage("")
    setIsTutorLoading(true)

    try {
      const response = await chatWithTutorAI({
        revisionSetId: revisionSet._id as any,
        messages: [...tutorMessages, userMsg],
        apiKey: userProfile?.preferences?.aiApiKey,
      })

      setTutorMessages((prev) => [...prev, { role: "assistant", content: response }])
    } catch (error: any) {
      console.error("Tutor chat error:", error)
      const errorMessage = error?.message || "Failed to get tutor response"
      if (errorMessage.includes("API key")) {
        toast.error("Please configure your OpenAI API key in settings or Convex environment variables")
      } else {
        toast.error(errorMessage)
      }
      // Remove the user message if it failed
      setTutorMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsTutorLoading(false)
    }
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

          {/* Main Content - Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
              <TabsTrigger value="materials">
                <Upload className="w-4 h-4 mr-2" />
                Materials
              </TabsTrigger>
              <TabsTrigger value="notes">
                <Lightbulb className="w-4 h-4 mr-2" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="flashcards">
                <Brain className="w-4 h-4 mr-2" />
                Flashcards
              </TabsTrigger>
              <TabsTrigger value="quizzes">
                <Target className="w-4 h-4 mr-2" />
                Quizzes
              </TabsTrigger>
              <TabsTrigger value="tutor">
                <MessageSquare className="w-4 h-4 mr-2" />
                Tutor
              </TabsTrigger>
              <TabsTrigger value="essays">
                <FileText className="w-4 h-4 mr-2" />
                Essays
              </TabsTrigger>
              <TabsTrigger value="exercises">
                <HelpCircle className="w-4 h-4 mr-2" />
                Exercises
              </TabsTrigger>
              <TabsTrigger value="papers">
                <File className="w-4 h-4 mr-2" />
                Papers
              </TabsTrigger>
              <TabsTrigger value="progress">
                <BookOpen className="w-4 h-4 mr-2" />
                Progress
              </TabsTrigger>
            </TabsList>

            {/* Materials Tab */}
            <TabsContent value="materials" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Study Materials</h2>
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>

                {materials && materials.length > 0 ? (
                  <div className="space-y-2">
                    {materials.map((material) => (
                      <Card key={material._id} className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{material.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {material.type} • {material.processedStatus}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm("Delete this material?")) {
                              await deleteMaterial({ materialId: material._id })
                              toast.success("Material deleted")
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No materials uploaded yet</p>
                    <Button onClick={() => setUploadDialogOpen(true)} className="mt-4">
                      Upload Your First Document
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Smart Notes</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter topic..."
                      value={notesTopic}
                      onChange={(e) => setNotesTopic(e.target.value)}
                      className="w-48"
                    />
                    <Button onClick={handleGenerateNotes} disabled={isGeneratingNotes}>
                      {isGeneratingNotes ? (
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate
                    </Button>
                  </div>
                </div>

                {revisionSet.notes && revisionSet.notes.length > 0 ? (
                  <div className="space-y-4">
                    {revisionSet.notes.map((note) => (
                      <Card key={note._id} className="p-4">
                        <h3 className="font-semibold mb-2">{note.title}</h3>
                        <div className="prose prose-sm max-w-none">{note.content}</div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No notes generated yet</p>
                    <p className="text-sm mt-2">Upload documents and generate AI notes</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Flashcards Tab */}
            <TabsContent value="flashcards" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Flashcards</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter topic..."
                      value={flashcardTopic}
                      onChange={(e) => setFlashcardTopic(e.target.value)}
                      className="w-48"
                    />
                    <Button onClick={handleGenerateFlashcards} disabled={isGeneratingFlashcards}>
                      {isGeneratingFlashcards ? (
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate
                    </Button>
                  </div>
                </div>

                {revisionSet.flashcards && revisionSet.flashcards.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {revisionSet.flashcards.map((card) => (
                      <Card key={card._id} className="p-4">
                        <div className="space-y-2">
                          <div className="font-semibold border-b pb-2">{card.front}</div>
                          <div className="text-sm text-muted-foreground">{card.back}</div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No flashcards created yet</p>
                    <p className="text-sm mt-2">Generate flashcards from your documents</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Quizzes Tab */}
            <TabsContent value="quizzes" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Quizzes</h2>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter topic..."
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                      className="w-48"
                    />
                    <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz}>
                      {isGeneratingQuiz ? (
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate
                    </Button>
                  </div>
                </div>

                {revisionSet.quizzes && revisionSet.quizzes.length > 0 ? (
                  <div className="space-y-4">
                    {revisionSet.quizzes.map((quiz) => (
                      <Card key={quiz._id} className="p-4">
                        <h3 className="font-semibold mb-4">{quiz.title}</h3>
                        <div className="space-y-3">
                          {quiz.questions.map((q, idx) => (
                            <div key={idx} className="border-l-2 pl-4">
                              <p className="font-medium">{q.question}</p>
                              <div className="mt-2 space-y-1">
                                {q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="text-sm">
                                    {optIdx === q.correctAnswer ? (
                                      <span className="text-green-600 font-semibold">✓ {opt}</span>
                                    ) : (
                                      <span className="text-muted-foreground">• {opt}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No quizzes generated yet</p>
                    <p className="text-sm mt-2">Generate quizzes from your documents</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Tutor Tab */}
            <TabsContent value="tutor" className="space-y-4">
              <Card className="p-6 h-[600px] flex flex-col">
                <h2 className="text-2xl font-bold mb-4">AI Tutor</h2>
                <ScrollArea className="flex-1 mb-4 pr-4">
                  <div className="space-y-4">
                    {tutorMessages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Start a conversation with your AI tutor</p>
                        <p className="text-sm mt-2">Ask questions about your study materials</p>
                      </div>
                    ) : (
                      tutorMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <Card
                            className={`p-3 max-w-[80%] ${
                              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </Card>
                        </div>
                      ))
                    )}
                    {isTutorLoading && (
                      <div className="flex justify-start">
                        <Card className="p-3 bg-muted">
                          <Loader className="w-4 h-4 animate-spin" />
                        </Card>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask a question..."
                    value={tutorMessage}
                    onChange={(e) => setTutorMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendTutorMessage()
                      }
                    }}
                  />
                  <Button onClick={handleSendTutorMessage} disabled={isTutorLoading || !tutorMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </TabsContent>

            {/* Essays Tab */}
            <TabsContent value="essays" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Essay Builder</h2>
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Essay generation coming soon</p>
                </div>
              </Card>
            </TabsContent>

            {/* Exercises Tab */}
            <TabsContent value="exercises" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Practice Exercises</h2>
                <div className="text-center py-12 text-muted-foreground">
                  <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Practice exercises coming soon</p>
                </div>
              </Card>
            </TabsContent>

            {/* Papers Tab */}
            <TabsContent value="papers" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Past Papers</h2>
                <div className="text-center py-12 text-muted-foreground">
                  <File className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Past papers coming soon</p>
                </div>
              </Card>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-4">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Progress & Analytics</h2>
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Progress tracking coming soon</p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Study Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Supported formats: PDF, DOCX, DOC, TXT
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
