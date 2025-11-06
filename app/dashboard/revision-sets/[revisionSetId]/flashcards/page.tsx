"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, Loader, Sparkles, BookOpen, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import BackButton from "@/components/back-button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function FlashcardsPage() {
  const params = useParams()
  const router = useRouter()
  const revisionSetId = params.revisionSetId as string

  const [isCreating, setIsCreating] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [studyMode, setStudyMode] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [newCard, setNewCard] = useState({ front: "", back: "" })
  const [genOpen, setGenOpen] = useState(false)
  const [genCount, setGenCount] = useState([25])
  const [genDifficulty, setGenDifficulty] = useState("mixed")
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])

  const flashcards = useQuery(api.flashcards.getFlashcardsByRevisionSet, {
    revisionSetId: revisionSetId as any,
  })
  const materials = useQuery(api.studyMaterials.getMaterialsByRevisionSet, { revisionSetId: revisionSetId as any })
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const { data: session } = authClient.useSession()

  const createFlashcard = useMutation(api.flashcards.createFlashcard)
  const deleteFlashcard = useMutation(api.flashcards.deleteFlashcard)
  const updateReview = useMutation(api.flashcards.updateFlashcardReview)
  const generateFlashcardsAI = useAction(api.aiActions.generateFlashcards)
  const recordStudyActivity = useMutation(api.streaks.recordStudyActivity)

  const handleGenerateCards = async () => {
    setIsGenerating(true)
    try {
      const selected = (materials || []).filter((m) => selectedMaterialIds.includes(m._id))
      
      if (selected.length === 0) {
        toast.error("Please select at least one material")
        return
      }

      const toGenerate = Math.max(1, Math.min(50, genCount[0]))

      // Get content from selected materials
      const content = selected
        .map((m) => m.extractedContent || m.title || "No content available")
        .join("\n\n")

      // Get API key from user preferences
      const apiKey = userProfile?.preferences?.aiApiKey

      // Generate flashcards using AI
      const aiCards = await generateFlashcardsAI({
        content,
        count: toGenerate,
        difficulty: genDifficulty,
        apiKey,
      })

      // Create flashcards in database
      for (let i = 0; i < aiCards.length; i++) {
        const card = aiCards[i]
        await createFlashcard({
          revisionSetId: revisionSetId as any,
          front: card.front,
          back: card.back,
          difficulty: genDifficulty === "mixed" ? (["easy", "medium", "hard"] as const)[i % 3] : genDifficulty,
        })
      }

      toast.success(`Generated ${aiCards.length} flashcards from selected materials!`)
      await recordStudyActivity({ activityType: "flashcard", revisionSetId: revisionSetId as any })
      setGenOpen(false)
      setSelectedMaterialIds([])
    } catch (error) {
      console.error("Flashcard generation error:", error)
      toast.error("Failed to generate flashcards. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim()) {
      toast.error("Please fill in both sides of the card")
      return
    }

    try {
      await createFlashcard({
        revisionSetId: revisionSetId as any,
        front: newCard.front,
        back: newCard.back,
        difficulty: "medium",
      })
      toast.success("Flashcard created!")
      await recordStudyActivity({ activityType: "flashcard", revisionSetId: revisionSetId as any })
      setNewCard({ front: "", back: "" })
      setIsCreating(false)
    } catch (error) {
      toast.error("Failed to create flashcard")
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (confirm("Delete this flashcard?")) {
      try {
        await deleteFlashcard({ flashcardId: cardId as any })
        toast.success("Flashcard deleted")
      } catch (error) {
        toast.error("Failed to delete flashcard")
      }
    }
  }

  const handleRating = async (confidence: number) => {
    if (flashcards && currentCardIndex < flashcards.length) {
      try {
        await updateReview({
          flashcardId: flashcards[currentCardIndex]._id,
          confidenceLevel: confidence,
        })

        if (currentCardIndex < flashcards.length - 1) {
          setCurrentCardIndex(currentCardIndex + 1)
          setIsFlipped(false)
        } else {
          toast.success("Study session complete!")
          setStudyMode(false)
        }
      } catch (error) {
        toast.error("Failed to record review")
      }
    }
  }

  if (flashcards === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (studyMode && flashcards.length > 0) {
    const card = flashcards[currentCardIndex]
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Study Flashcards</h1>
            <p className="text-muted-foreground">
              Card {currentCardIndex + 1} of {flashcards.length}
            </p>
          </div>
          <Button variant="outline" onClick={() => setStudyMode(false)}>
            Exit Study Mode
          </Button>
        </div>

        {/* Flip Card */}
        <div onClick={() => setIsFlipped(!isFlipped)} className="cursor-pointer h-64 perspective">
          <Card className="h-full p-8 bg-gradient-primary flex items-center justify-center text-white text-center transition-all duration-300 hover:shadow-lg">
            <div>
              <p className="text-sm uppercase tracking-wide opacity-75 mb-2">{isFlipped ? "Answer" : "Question"}</p>
              <p className="text-2xl font-semibold">{isFlipped ? card.back : card.front}</p>
              <p className="text-xs mt-4 opacity-50">Click to flip</p>
            </div>
          </Card>
        </div>

        {/* Rating Buttons */}
        {isFlipped && (
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
              onClick={() => handleRating(1)}
            >
              Hard
            </Button>
            <Button
              variant="outline"
              className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20"
              onClick={() => handleRating(2)}
            >
              Medium
            </Button>
            <Button
              variant="outline"
              className="bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
              onClick={() => handleRating(3)}
            >
              Easy
            </Button>
          </div>
        )}

        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
          />
        </div>
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
                <h1 className="text-3xl font-bold">FlashGen</h1>
                <p className="text-muted-foreground">{flashcards.length} cards ready to study</p>
              </div>
            </div>
        <div className="flex gap-2 flex-wrap">
          {flashcards.length > 0 && (
            <Button onClick={() => setStudyMode(true)} className="bg-gradient-primary">
              <BookOpen className="w-4 h-4 mr-2" />
              Start Study
            </Button>
          )}
          <Dialog open={genOpen} onOpenChange={setGenOpen}>
            <Button onClick={() => setGenOpen(true)} disabled={isGenerating} className="bg-gradient-primary">
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Flashcards</DialogTitle>
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
                    <Label className="mb-2 block text-sm">Number of flashcards</Label>
                    <div className="px-1">
                      <Slider value={genCount} onValueChange={setGenCount} min={5} max={50} step={5} />
                      <p className="text-xs text-muted-foreground mt-2">{genCount[0]} cards</p>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">Difficulty</Label>
                    <Select value={genDifficulty} onValueChange={setGenDifficulty}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerateCards} disabled={isGenerating}>
                  {isGenerating ? "Generating..." : "Generate Cards"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsCreating(!isCreating)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Card
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Question</label>
              <Input
                value={newCard.front}
                onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                placeholder="What is the capital of France?"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Answer</label>
              <Input
                value={newCard.back}
                onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                placeholder="Paris"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateCard}>Create Card</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setNewCard({ front: "", back: "" })
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Cards List */}
      {flashcards.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border">
          <p className="text-muted-foreground mb-4">No flashcards yet</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setIsCreating(true)}>Create Card</Button>
            <Button onClick={handleGenerateCards} className="bg-gradient-primary">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Cards
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {flashcards.map((card, idx) => (
            <Card
              key={card._id}
              className="p-4 flex items-start justify-between bg-card border-border hover:border-primary/50 transition"
            >
              <div className="flex-1">
                <p className="font-medium text-foreground">{card.front}</p>
                <p className="text-sm text-muted-foreground mt-1">{card.back}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                    Reviewed {card.reviewCount || 0} times
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    Confidence: {card.confidenceLevel || 1}/5
                  </span>
                </div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => handleDeleteCard(card._id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

