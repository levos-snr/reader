"use client"

import { useParams } from "next/navigation"
import { useState, useCallback } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, File, Trash2, Download, Calendar, GraduationCap, Sparkles, MessageSquare, Brain, Loader, X, Send, Eye, CheckCircle2, XCircle, BookOpen, FileText, Search } from "lucide-react"
import { toast } from "sonner"
import BackButton from "@/components/back-button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function PastPapersPage() {
  const params = useParams()
  const revisionSetId = params.revisionSetId as string
  const [isUploading, setIsUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ title: "", year: "", examBoard: "" })
  const [selectedPaper, setSelectedPaper] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false)
  const [solutionDialogOpen, setSolutionDialogOpen] = useState(false)
  const [discussDialogOpen, setDiscussDialogOpen] = useState(false)
  const [learnDialogOpen, setLearnDialogOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingSolution, setIsGeneratingSolution] = useState(false)
  const [isExtractingQuestions, setIsExtractingQuestions] = useState(false)
  const [analysisResult, setAnalysisResult] = useState("")
  const [solutionResult, setSolutionResult] = useState("")
  const [questionInput, setQuestionInput] = useState("")
  const [userAnswer, setUserAnswer] = useState("")
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({})
  const [discussMessages, setDiscussMessages] = useState<Array<{ role: string; content: string }>>([])
  const [discussInput, setDiscussInput] = useState("")
  const [isDiscussing, setIsDiscussing] = useState(false)
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([])

  const pastPapers = useQuery(api.pastPapers.getPastPapersByRevisionSet, { revisionSetId: revisionSetId as any })
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const pastPaperDetail = useQuery(
    api.pastPapers.getPastPaperById,
    selectedPaper ? { pastPaperId: selectedPaper._id } : "skip"
  )
  const generateUploadUrl = useMutation(api.studyMaterials.generateUploadUrl)
  const createPastPaper = useMutation(api.pastPapers.createPastPaper)
  const deletePastPaper = useMutation(api.pastPapers.deletePastPaper)
  const updatePastPaper = useMutation(api.pastPapers.updatePastPaper)
  const getDownloadUrl = useQuery(
    api.pastPapers.getPastPaperDownloadUrl,
    selectedPaper ? { pastPaperId: selectedPaper._id } : "skip"
  )
  const getFileUrl = useQuery(
    api.studyMaterials.getFileUrl,
    selectedPaper?.fileId ? { fileId: selectedPaper.fileId } : "skip"
  )

  const analyzePastPaperAI = useAction(api.aiActions.analyzePastPaper)
  const generateSolutionAI = useAction(api.aiActions.generatePastPaperSolutions)
  const discussPastPaperAI = useAction(api.aiActions.discussPastPaper)
  const extractQuestionsAI = useAction(api.aiActions.extractQuestionsFromPastPaper)

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0]
      if (!file) return

      if (!uploadForm.title.trim()) {
        toast.error("Please enter a title for the past paper")
        return
      }

      setIsUploading(true)
      try {
        const postUrl = await generateUploadUrl()
        if (!postUrl) {
          throw new Error("Failed to get upload URL")
        }

        const uploadResult = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })

        if (!uploadResult.ok) {
          const errorText = await uploadResult.text()
          console.error("Upload failed:", errorText)
          throw new Error(`Failed to upload file: ${uploadResult.status} ${uploadResult.statusText}`)
        }

        const uploadData = await uploadResult.json()
        const storageId = uploadData.storageId

        if (!storageId) {
          console.error("Upload response:", uploadData)
          throw new Error("Storage ID not returned from upload")
        }

        await createPastPaper({
          revisionSetId: revisionSetId as any,
          title: uploadForm.title,
          year: uploadForm.year ? parseInt(uploadForm.year) : undefined,
          examBoard: uploadForm.examBoard || undefined,
          fileId: storageId,
        })

        toast.success("Past paper uploaded successfully!")
        setUploadForm({ title: "", year: "", examBoard: "" })
        
        if (event.currentTarget) {
          event.currentTarget.value = ""
        }
      } catch (error: any) {
        console.error("Upload error:", error)
        const errorMessage = error?.message || "Failed to upload past paper"
        toast.error(errorMessage)
      } finally {
        setIsUploading(false)
      }
    },
    [generateUploadUrl, createPastPaper, uploadForm, revisionSetId],
  )

  const handleDelete = async (paperId: string) => {
    if (!confirm("Delete this past paper?")) return
    try {
      await deletePastPaper({ pastPaperId: paperId as any })
      toast.success("Past paper deleted")
    } catch (error) {
      toast.error("Failed to delete past paper")
    }
  }

  const handleAnalyze = async () => {
    if (!selectedPaper) return
    setIsAnalyzing(true)
    try {
      const apiKey = userProfile?.preferences?.aiApiKey
      const result = await analyzePastPaperAI({
        pastPaperTitle: selectedPaper.title,
        pastPaperContent: selectedPaper.extractedContent,
        apiKey,
      })
      setAnalysisResult(result.content)
    } catch (error: any) {
      console.error("Analysis error:", error)
      toast.error(error?.message || "Failed to analyze past paper")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleExtractQuestions = async () => {
    if (!selectedPaper) return
    setIsExtractingQuestions(true)
    try {
      const apiKey = userProfile?.preferences?.aiApiKey
      const result = await extractQuestionsAI({
        pastPaperTitle: selectedPaper.title,
        pastPaperContent: selectedPaper.extractedContent || "",
        apiKey,
      })
      if (result.questions) {
        setExtractedQuestions(result.questions)
        // Save to database
        await updatePastPaper({
          pastPaperId: selectedPaper._id,
          questions: result.questions,
        })
        toast.success("Questions extracted successfully!")
      }
    } catch (error: any) {
      console.error("Extraction error:", error)
      toast.error(error?.message || "Failed to extract questions")
    } finally {
      setIsExtractingQuestions(false)
    }
  }

  const handleGenerateSolution = async () => {
    if (!questionInput.trim()) {
      toast.error("Please enter a question")
      return
    }
    setIsGeneratingSolution(true)
    try {
      const apiKey = userProfile?.preferences?.aiApiKey
      const result = await generateSolutionAI({
        question: questionInput,
        subject: selectedPaper?.examBoard,
        apiKey,
      })
      setSolutionResult(result.content)
    } catch (error: any) {
      console.error("Solution generation error:", error)
      toast.error(error?.message || "Failed to generate solution")
    } finally {
      setIsGeneratingSolution(false)
    }
  }

  const handleCheckAnswer = (questionId: string, userAnswer: string) => {
    const question = extractedQuestions.find(q => q.id === questionId)
    if (!question) return
    
    // Simple check - in real app, you'd use AI or pattern matching
    const isCorrect = userAnswer.toLowerCase().trim() === question.answer?.toLowerCase().trim()
    return isCorrect
  }

  const handleDiscuss = async () => {
    if (!discussInput.trim() || isDiscussing) return

    const userMessage = discussInput.trim()
    setDiscussInput("")
    const newMessages = [...discussMessages, { role: "user", content: userMessage }]
    setDiscussMessages(newMessages)
    setIsDiscussing(true)

    try {
      const apiKey = userProfile?.preferences?.aiApiKey
      const result = await discussPastPaperAI({
        messages: newMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        pastPaperContext: selectedPaper ? `Past Paper: ${selectedPaper.title}${selectedPaper.year ? ` (${selectedPaper.year})` : ""}${selectedPaper.examBoard ? ` - ${selectedPaper.examBoard}` : ""}` : undefined,
        apiKey,
      })
      setDiscussMessages((prev) => [...prev, { role: "assistant", content: result.content }])
    } catch (error: any) {
      console.error("Discussion error:", error)
      toast.error(error?.message || "Failed to get response")
    } finally {
      setIsDiscussing(false)
    }
  }

  const handleDownload = async (paper?: any) => {
    const paperToDownload = paper || selectedPaper
    if (!paperToDownload) {
      toast.error("No paper selected")
      return
    }
    
    try {
      // Set selected paper first to trigger query
      if (!selectedPaper || selectedPaper._id !== paperToDownload._id) {
        setSelectedPaper(paperToDownload)
        // Wait a moment for query to update
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      // Try to get download URL
      const downloadUrl = getDownloadUrl
      
      if (downloadUrl) {
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `${paperToDownload.title.replace(/[^a-z0-9]/gi, '_')}.pdf`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Download started")
      } else {
        // Fallback: Try to get file URL directly from storage
        if (paperToDownload.fileId) {
          // Use the file URL query
          const fileUrl = getFileUrl
          if (fileUrl) {
            window.open(fileUrl, '_blank')
            toast.success("Opening PDF in new tab")
          } else {
            // Last resort: construct URL or show error
            toast.error("Unable to get download URL. Please try clicking 'View' first, then download from there.")
          }
        } else {
          toast.error("File ID not available")
        }
      }
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download file. Please try the 'View' button first.")
    }
  }

  const handleViewPaper = (paper: any) => {
    setSelectedPaper(paper)
    setViewDialogOpen(true)
    // Load questions if they exist
    if (paper.questions) {
      setExtractedQuestions(paper.questions)
    }
  }

  if (pastPapers === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          <BackButton fallbackHref={`/dashboard/revision-sets/${revisionSetId}`} />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Past Papers</h1>
              <p className="text-muted-foreground">Upload, analyze, and practice with past exam papers using AI</p>
            </div>
            <Button onClick={() => setUploadForm({ title: "", year: "", examBoard: "" })}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Past Paper
            </Button>
          </div>

          {/* Upload Form */}
          <Card className="p-6 border-border bg-card">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-2 block text-sm">Title *</Label>
                  <Input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., 2023 Biology Final Exam"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm">Year</Label>
                  <Input
                    type="number"
                    value={uploadForm.year}
                    onChange={(e) => setUploadForm({ ...uploadForm, year: e.target.value })}
                    placeholder="2023"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-sm">Exam Board</Label>
                  <Input
                    value={uploadForm.examBoard}
                    onChange={(e) => setUploadForm({ ...uploadForm, examBoard: e.target.value })}
                    placeholder="AQA, Edexcel, OCR..."
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-sm">Upload PDF</Label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            </div>
          </Card>

          {/* Past Papers List */}
          {pastPapers.length === 0 ? (
            <Card className="p-12 text-center bg-card border-border">
              <File className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No past papers uploaded yet</p>
              <p className="text-sm text-muted-foreground mt-1">Upload your first past paper to get started</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pastPapers.map((paper) => (
                <Card key={paper._id} className="p-6 bg-card border-border hover:border-primary/50 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <File className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-lg text-foreground">{paper.title}</h3>
                        {paper.questions && paper.questions.length > 0 && (
                          <Badge variant="secondary">{paper.questions.length} questions</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {paper.year && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{paper.year}</span>
                          </div>
                        )}
                        {paper.examBoard && (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="w-4 h-4" />
                            <span>{paper.examBoard}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewPaper(paper)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPaper(paper)
                          setAnalysisDialogOpen(true)
                        }}
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Analyze
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPaper(paper)
                          setLearnDialogOpen(true)
                          handleViewPaper(paper)
                        }}
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Learn
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPaper(paper)
                          setDiscussDialogOpen(true)
                          setDiscussMessages([
                            {
                              role: "assistant",
                              content: `Hello! I'm here to help you understand "${paper.title}". Ask me anything about this past paper - questions, concepts, or study tips!`,
                            },
                          ])
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Discuss
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(paper)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(paper._id)}
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

      {/* View Paper Dialog - Full Featured */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPaper?.title}</DialogTitle>
          </DialogHeader>
          {selectedPaper && (
            <Tabs defaultValue="view" className="w-full">
              <TabsList>
                <TabsTrigger value="view">View PDF</TabsTrigger>
                <TabsTrigger value="questions">Questions {extractedQuestions.length > 0 && `(${extractedQuestions.length})`}</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="solutions">Solutions</TabsTrigger>
              </TabsList>
              <TabsContent value="view" className="space-y-4">
                {getFileUrl ? (
                  <iframe
                    src={getFileUrl}
                    className="w-full h-[600px] border rounded"
                    title={selectedPaper.title}
                  />
                ) : (
                  <div className="text-center py-12">
                    <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading PDF...</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  {!extractedQuestions.length && (
                    <Button onClick={handleExtractQuestions} disabled={isExtractingQuestions}>
                      {isExtractingQuestions ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extract Questions
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="questions" className="space-y-4">
                {extractedQuestions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No questions extracted yet</p>
                    <Button onClick={handleExtractQuestions} disabled={isExtractingQuestions}>
                      {isExtractingQuestions ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Extracting Questions...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Extract Questions from PDF
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {extractedQuestions.map((q: any, idx: number) => (
                      <Card key={q.id || idx} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">Question {idx + 1}</h4>
                          {q.marks && <Badge>{q.marks} marks</Badge>}
                        </div>
                        <p className="mb-4">{q.question}</p>
                        <div className="space-y-2">
                          <Label>Your Answer</Label>
                          <Textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            className="min-h-24"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setShowAnswer({ ...showAnswer, [q.id || idx]: !showAnswer[q.id || idx] })}
                            >
                              {showAnswer[q.id || idx] ? "Hide" : "Show"} Answer
                            </Button>
                            {userAnswer && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const isCorrect = handleCheckAnswer(q.id || idx, userAnswer)
                                  toast.success(isCorrect ? "Correct! ✓" : "Not quite right. Check the answer below.")
                                }}
                              >
                                Check Answer
                              </Button>
                            )}
                          </div>
                          {showAnswer[q.id || idx] && q.answer && (
                            <Card className="p-4 bg-muted mt-2">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="font-semibold">Answer:</span>
                              </div>
                              <p>{q.answer}</p>
                            </Card>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="content" className="space-y-4">
                {selectedPaper.extractedContent ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap max-h-96 overflow-y-auto p-4 bg-muted rounded">
                      {selectedPaper.extractedContent}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Content extraction not available</p>
                    <p className="text-sm text-muted-foreground mt-2">PDF content will be extracted automatically</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="solutions" className="space-y-4">
                {selectedPaper.solutions && selectedPaper.solutions.length > 0 ? (
                  <div className="space-y-4">
                    {selectedPaper.solutions.map((solution: string, idx: number) => (
                      <Card key={idx} className="p-4">
                        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                          {solution}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No solutions available yet</p>
                    <Button onClick={() => setSolutionDialogOpen(true)}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Solutions
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Analysis Dialog */}
      <Dialog open={analysisDialogOpen} onOpenChange={setAnalysisDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Analysis: {selectedPaper?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!analysisResult ? (
              <div className="text-center py-8">
                <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Start Analysis
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{analysisResult}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAnalysisDialogOpen(false)
              setAnalysisResult("")
            }}>
              Close
            </Button>
            {analysisResult && (
              <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? "Analyzing..." : "Re-analyze"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Solution Generation Dialog */}
      <Dialog open={solutionDialogOpen} onOpenChange={setSolutionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Solution: {selectedPaper?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Enter Question</Label>
              <Textarea
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Paste or type the question here..."
                className="min-h-32"
              />
            </div>
            {solutionResult && (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap">{solutionResult}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSolutionDialogOpen(false)
              setQuestionInput("")
              setSolutionResult("")
            }}>
              Close
            </Button>
            <Button onClick={handleGenerateSolution} disabled={isGeneratingSolution || !questionInput.trim()}>
              {isGeneratingSolution ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Solution
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Learn Mode Dialog */}
      <Dialog open={learnDialogOpen} onOpenChange={setLearnDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Learn Mode: {selectedPaper?.title}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="practice" className="w-full">
            <TabsList>
              <TabsTrigger value="practice">Practice Questions</TabsTrigger>
              <TabsTrigger value="review">Review Answers</TabsTrigger>
              <TabsTrigger value="study">Study Guide</TabsTrigger>
            </TabsList>
            <TabsContent value="practice" className="space-y-4">
              {extractedQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Extract questions first to practice</p>
                  <Button onClick={handleExtractQuestions} disabled={isExtractingQuestions}>
                    Extract Questions
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {extractedQuestions.map((q: any, idx: number) => (
                    <Card key={q.id || idx} className="p-4">
                      <h4 className="font-semibold mb-2">Question {idx + 1}</h4>
                      <p className="mb-4">{q.question}</p>
                      <Textarea
                        placeholder="Write your answer here..."
                        className="min-h-24 mb-2"
                      />
                      <Button size="sm" onClick={() => setShowAnswer({ ...showAnswer, [q.id || idx]: !showAnswer[q.id || idx] })}>
                        {showAnswer[q.id || idx] ? "Hide" : "Show"} Answer
                      </Button>
                      {showAnswer[q.id || idx] && q.answer && (
                        <Card className="p-4 bg-muted mt-2">
                          <p><strong>Answer:</strong> {q.answer}</p>
                        </Card>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="review">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Review your answers and see explanations</p>
              </div>
            </TabsContent>
            <TabsContent value="study">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {analysisResult ? (
                  <div className="whitespace-pre-wrap">{analysisResult}</div>
                ) : (
                  <div className="text-center py-8">
                    <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                      Generate Study Guide
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Discussion Dialog */}
      <Dialog open={discussDialogOpen} onOpenChange={setDiscussDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Discuss: {selectedPaper?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {discussMessages.map((message, idx) => (
              <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                </div>
              </div>
            ))}
            {isDiscussing && (
              <div className="flex justify-start">
                <Loader className="w-4 h-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={discussInput}
              onChange={(e) => setDiscussInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleDiscuss()}
              placeholder="Ask about the past paper..."
              disabled={isDiscussing}
            />
            <Button onClick={handleDiscuss} disabled={isDiscussing || !discussInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDiscussDialogOpen(false)
              setDiscussMessages([])
              setDiscussInput("")
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
