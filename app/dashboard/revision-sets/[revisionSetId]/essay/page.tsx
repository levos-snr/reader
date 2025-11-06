"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, Sparkles, Download, Save, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import BackButton from "@/components/back-button"

export default function EssayBuilderPage() {
  const params = useParams()
  const revisionSetId = params.revisionSetId as string
  const [essayTitle, setEssayTitle] = useState("")
  const [essayContent, setEssayContent] = useState("")
  const [wordCount, setWordCount] = useState(0)
  const [targetWordCount, setTargetWordCount] = useState(1500)
  const [essayType, setEssayType] = useState("analytical")
  const [academicLevel, setAcademicLevel] = useState("university")

  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const generateNotesAI = useAction(api.aiActions.generateNotes)

  const handleGenerateOutline = async () => {
    if (!essayTitle.trim()) {
      toast.error("Please enter an essay question or topic")
      return
    }

    try {
      const apiKey = userProfile?.preferences?.aiApiKey
      const result = await generateNotesAI({
        content: `Essay topic: ${essayTitle}\n\nAcademic level: ${academicLevel}\nEssay type: ${essayType}`,
        style: "detailed",
        apiKey,
      })

      // Extract outline from AI response
      setEssayContent(result.content)
      toast.success("Outline generated!")
    } catch (error) {
      console.error("Outline generation error:", error)
      toast.error("Failed to generate outline")
    }
  }

  const handleWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter((word) => word.length > 0)
    setWordCount(words.length)
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
                <h1 className="text-3xl font-bold">Essay Builder</h1>
                <p className="text-muted-foreground">Create and structure your essays with AI assistance</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Essay Configuration */}
          <Card className="p-6 border-border bg-card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="mb-2 block text-sm">Essay Question/Topic</Label>
                <Input
                  value={essayTitle}
                  onChange={(e) => setEssayTitle(e.target.value)}
                  placeholder="e.g., Discuss the process of cellular respiration..."
                  className="bg-background border-border"
                />
              </div>
              <div>
                <Label className="mb-2 block text-sm">Essay Type</Label>
                <Select value={essayType} onValueChange={setEssayType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="argumentative">Argumentative</SelectItem>
                    <SelectItem value="analytical">Analytical</SelectItem>
                    <SelectItem value="descriptive">Descriptive</SelectItem>
                    <SelectItem value="expository">Expository</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block text-sm">Academic Level</Label>
                <Select value={academicLevel} onValueChange={setAcademicLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gcse">GCSE</SelectItem>
                    <SelectItem value="alevel">A-Level</SelectItem>
                    <SelectItem value="university">University</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div>
                <Label className="mb-2 block text-sm">Target Word Count</Label>
                <Input
                  type="number"
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 1500)}
                  className="w-32 bg-background border-border"
                />
              </div>
              <Button onClick={handleGenerateOutline} className="bg-gradient-primary">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Outline
              </Button>
            </div>
          </Card>

          {/* Essay Editor */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Essay</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {wordCount} / {targetWordCount} words
                </span>
                <div
                  className={`w-32 h-2 rounded-full ${
                    wordCount >= targetWordCount * 0.9
                      ? "bg-green-500"
                      : wordCount >= targetWordCount * 0.7
                        ? "bg-yellow-500"
                        : "bg-muted"
                  }`}
                  style={{ width: `${Math.min((wordCount / targetWordCount) * 100, 100)}%` }}
                />
              </div>
            </div>
            <Textarea
              value={essayContent}
              onChange={(e) => {
                setEssayContent(e.target.value)
                handleWordCount(e.target.value)
              }}
              placeholder="Start writing your essay here... Use the outline generator to get started."
              className="min-h-96 bg-background border-border text-foreground font-mono"
            />
          </Card>

          {/* AI Assistance */}
          <Card className="p-6 border-border bg-card">
            <h3 className="font-semibold mb-4">AI Writing Assistance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start">
                <Sparkles className="w-4 h-4 mr-2" />
                Improve Selected Text
              </Button>
              <Button variant="outline" className="justify-start">
                <Sparkles className="w-4 h-4 mr-2" />
                Check Grammar
              </Button>
              <Button variant="outline" className="justify-start">
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Structure
              </Button>
              <Button variant="outline" className="justify-start">
                <Sparkles className="w-4 h-4 mr-2" />
                Suggest Improvements
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

