"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { File, Upload, Calendar, GraduationCap, Search, Trash2, Download, Loader, Eye, Brain, Sparkles, MessageSquare, Send, CheckCircle2 } from "lucide-react"
import { useState, useCallback } from "react"
import { authClient } from "@/lib/auth-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import BackButton from "@/components/back-button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAction } from "convex/react"

export default function PastPapersPage() {
  const { data: session } = authClient.useSession()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ title: "", year: "", examBoard: "" })
  const [selectedPaper, setSelectedPaper] = useState<any>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [analysis, setAnalysis] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([])
  const [userAnswer, setUserAnswer] = useState("")
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({})
  const [solutionInput, setSolutionInput] = useState("")
  const [solutionResult, setSolutionResult] = useState("")
  const [isGeneratingSolution, setIsGeneratingSolution] = useState(false)
  const [discussMessages, setDiscussMessages] = useState<Array<{ role: string; content: string }>>([])
  const [discussInput, setDiscussInput] = useState("")
  const [isDiscussing, setIsDiscussing] = useState(false)

  const allPastPapers = useQuery(api.pastPapers.getAllPastPapers)
  const generateUploadUrl = useMutation(api.studyMaterials.generateUploadUrl)
  const createPastPaper = useMutation(api.pastPapers.createPastPaper)
  const deletePastPaper = useMutation(api.pastPapers.deletePastPaper)
  const downloadUrl = useQuery(
    api.pastPapers.getPastPaperDownloadUrl,
    selectedPaper?._id ? { pastPaperId: selectedPaper._id as any } : "skip",
  )
  const fileUrl = useQuery(
    api.studyMaterials.getFileUrl,
    selectedPaper?.fileId ? { fileId: selectedPaper.fileId } : "skip",
  )

  // AI Actions (global)
  const analyzePastPaperAI = useAction(api.aiActions.analyzePastPaper)
  const extractQuestionsAI = useAction(api.aiActions.extractQuestionsFromPastPaper)
  const generateSolutionAI = useAction(api.aiActions.generatePastPaperSolutions)
  const discussPastPaperAI = useAction(api.aiActions.discussPastPaper)

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
        // Step 1: Get upload URL
        const postUrl = await generateUploadUrl()
        if (!postUrl) {
          throw new Error("Failed to get upload URL")
        }

        // Step 2: Upload file to Convex storage
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

        // Step 3: Get storage ID from response
        const uploadData = await uploadResult.json()
        const storageId = uploadData.storageId

        if (!storageId) {
          console.error("Upload response:", uploadData)
          throw new Error("Storage ID not returned from upload")
        }

        // Step 4: Create past paper record (no revisionSetId for global papers)
        await createPastPaper({
          title: uploadForm.title,
          year: uploadForm.year ? parseInt(uploadForm.year) : undefined,
          examBoard: uploadForm.examBoard || undefined,
          fileId: storageId,
        })

        toast.success("Past paper uploaded successfully!")
        setUploadForm({ title: "", year: "", examBoard: "" })
        setUploadDialogOpen(false)
        
        // Reset file input
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
    [generateUploadUrl, createPastPaper, uploadForm],
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

  const handleView = (paper: any) => {
    setSelectedPaper(paper)
    setViewDialogOpen(true)
  }

  const handleDownload = async () => {
    if (!selectedPaper) return
    try {
      const href = downloadUrl || fileUrl
      if (!href) {
        toast.error("Download URL not ready. Please wait a moment.")
        return
      }
      const link = document.createElement("a")
      link.href = href
      link.download = `${selectedPaper.title.replace(/[^a-z0-9]/gi, "_")}.pdf`
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      toast.error("Failed to download file")
    }
  }

  // Filter past papers
  const filteredPapers = allPastPapers?.filter((paper) => {
    const matchesSearch = searchTerm === "" || paper.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesYear = filterYear === "" || paper.year?.toString() === filterYear
    return matchesSearch && matchesYear
  }) || []

  if (allPastPapers === undefined) {
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
          <BackButton fallbackHref="/dashboard" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Past Papers</h1>
              <p className="text-muted-foreground">Upload and practice with past exam papers</p>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Past Paper
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-4 border-border bg-card">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search past papers..."
                  className="pl-10 bg-background border-border"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={filterYear === "" ? "all" : filterYear}
                  onValueChange={(v) => setFilterYear(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-40 bg-background border-border">
                    <SelectValue placeholder="Filter by year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2021">2021</SelectItem>
                    <SelectItem value="2020">2020</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Past Papers Grid */}
          {filteredPapers.length === 0 ? (
            <Card className="p-8 text-center border-border bg-card">
              <File className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No past papers yet</p>
              <p className="text-sm text-muted-foreground mt-1">Upload your first past paper to get started</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPapers.map((paper) => (
                <Card key={paper._id} className="p-6 bg-card border-border hover:border-primary/50 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <File className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-lg text-foreground line-clamp-2">{paper.title}</h3>
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
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => handleView(paper)} className="flex-1">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(paper._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Upload Dialog */}
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Past Paper</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block text-sm">Title *</Label>
                  <Input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    placeholder="e.g., 2023 Biology Final Exam"
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* View Dialog */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedPaper?.title}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="view" className="w-full">
                <TabsList>
                  <TabsTrigger value="view">View PDF</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  <TabsTrigger value="questions">Questions</TabsTrigger>
                  <TabsTrigger value="solutions">Solutions</TabsTrigger>
                  <TabsTrigger value="discuss">Discuss</TabsTrigger>
                </TabsList>

                <TabsContent value="view" className="space-y-4">
                  {fileUrl ? (
                    <iframe
                      src={fileUrl}
                      className="w-full h-[600px] border rounded"
                      title={selectedPaper?.title || "Past Paper"}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading PDF...</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
                  <Button
                    onClick={async () => {
                      if (!selectedPaper) return
                      setIsAnalyzing(true)
                      try {
                        const result = await analyzePastPaperAI({
                          pastPaperTitle: selectedPaper.title,
                          pastPaperContent: selectedPaper.extractedContent || "",
                        })
                        setAnalysis(result.content)
                      } catch (e: any) {
                        toast.error(e?.message || "Failed to analyze")
                      } finally {
                        setIsAnalyzing(false)
                      }
                    }}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" /> Run Analysis
                      </>
                    )}
                  </Button>
                  {analysis && (
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap p-4 bg-muted rounded">
                      {analysis}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="questions" className="space-y-4">
                  <Button
                    onClick={async () => {
                      if (!selectedPaper) return
                      setIsExtracting(true)
                      try {
                        const result = await extractQuestionsAI({
                          pastPaperTitle: selectedPaper.title,
                          pastPaperContent: selectedPaper.extractedContent || "",
                        })
                        setExtractedQuestions(result.questions || [])
                      } catch (e: any) {
                        toast.error(e?.message || "Failed to extract questions")
                      } finally {
                        setIsExtracting(false)
                      }
                    }}
                    disabled={isExtracting}
                  >
                    {isExtracting ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" /> Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" /> Extract Questions
                      </>
                    )}
                  </Button>
                  {extractedQuestions.length > 0 && (
                    <div className="space-y-4">
                      {extractedQuestions.map((q: any, idx: number) => (
                        <Card key={q.id || idx} className="p-4">
                          <h4 className="font-semibold mb-2">Question {idx + 1}</h4>
                          <p className="mb-3">{q.question}</p>
                          <Label>Your Answer</Label>
                          <Textarea
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            className="min-h-24 mb-2"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setShowAnswer({ ...showAnswer, [q.id || idx]: !showAnswer[q.id || idx] })}>
                              {showAnswer[q.id || idx] ? "Hide" : "Show"} Answer
                            </Button>
                            {userAnswer && q.answer && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const isCorrect = userAnswer.toLowerCase().trim() === (q.answer || "").toLowerCase().trim()
                                  toast.success(isCorrect ? "Correct!" : "Not quite right — compare with solution")
                                }}
                              >
                                Check
                              </Button>
                            )}
                          </div>
                          {showAnswer[q.id || idx] && q.answer && (
                            <Card className="p-3 bg-muted mt-2">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="font-semibold">Answer</span>
                              </div>
                              <p>{q.answer}</p>
                            </Card>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="solutions" className="space-y-4">
                  <div>
                    <Label>Enter Question</Label>
                    <Textarea
                      value={solutionInput}
                      onChange={(e) => setSolutionInput(e.target.value)}
                      placeholder="Paste or type the question here..."
                      className="min-h-28"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!solutionInput.trim()) return
                        setIsGeneratingSolution(true)
                        try {
                          const result = await generateSolutionAI({ question: solutionInput })
                          setSolutionResult(result.content)
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to generate solution")
                        } finally {
                          setIsGeneratingSolution(false)
                        }
                      }}
                      disabled={isGeneratingSolution || !solutionInput.trim()}
                    >
                      {isGeneratingSolution ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" /> Generate Solution
                        </>
                      )}
                    </Button>
                  </div>
                  {solutionResult && (
                    <Card className="p-4">
                      <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                        {solutionResult}
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="discuss" className="space-y-3">
                  <div className="h-64 overflow-y-auto space-y-3 p-2 border rounded">
                    {discussMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`px-3 py-2 rounded ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                        </div>
                      </div>
                    ))}
                    {isDiscussing && <Loader className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={discussInput}
                      onChange={(e) => setDiscussInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          void (async () => {
                            if (!selectedPaper || !discussInput.trim()) return
                            const newMsgs = [...discussMessages, { role: "user", content: discussInput.trim() }]
                            setDiscussMessages(newMsgs)
                            setDiscussInput("")
                            setIsDiscussing(true)
                            try {
                              const result = await discussPastPaperAI({
                                messages: newMsgs,
                                pastPaperContext: `Past Paper: ${selectedPaper.title}${selectedPaper.year ? ` (${selectedPaper.year})` : ""}${selectedPaper.examBoard ? ` - ${selectedPaper.examBoard}` : ""}`,
                              })
                              setDiscussMessages((prev) => [...prev, { role: "assistant", content: result.content }])
                            } catch (e: any) {
                              toast.error(e?.message || "Failed to get response")
                            } finally {
                              setIsDiscussing(false)
                            }
                          })()
                        }
                      }}
                      placeholder="Ask about this past paper..."
                    />
                    <Button
                      onClick={async () => {
                        if (!selectedPaper || !discussInput.trim()) return
                        const newMsgs = [...discussMessages, { role: "user", content: discussInput.trim() }]
                        setDiscussMessages(newMsgs)
                        setDiscussInput("")
                        setIsDiscussing(true)
                        try {
                          const result = await discussPastPaperAI({
                            messages: newMsgs,
                            pastPaperContext: `Past Paper: ${selectedPaper.title}${selectedPaper.year ? ` (${selectedPaper.year})` : ""}${selectedPaper.examBoard ? ` - ${selectedPaper.examBoard}` : ""}`,
                          })
                          setDiscussMessages((prev) => [...prev, { role: "assistant", content: result.content }])
                        } catch (e: any) {
                          toast.error(e?.message || "Failed to get response")
                        } finally {
                          setIsDiscussing(false)
                        }
                      }}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
          </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
