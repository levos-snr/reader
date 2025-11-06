"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { authClient } from "@/lib/auth-client"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Loader, Sparkles, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function NotesPage() {
  const params = useParams()
  const revisionSetId = params.revisionSetId as string

  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [newNote, setNewNote] = useState({ title: "", content: "" })
  const [genOpen, setGenOpen] = useState(false)
  const [genStyle, setGenStyle] = useState("detailed")
  const [genProvider, setGenProvider] = useState("openai")
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])

  const notes = useQuery(api.smartNotes.getNotesByRevisionSet, {
    revisionSetId: revisionSetId as any,
  })
  const materials = useQuery(api.studyMaterials.getMaterialsByRevisionSet, { revisionSetId: revisionSetId as any })
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const { data: session } = authClient.useSession()

  const createNote = useMutation(api.smartNotes.createSmartNote)
  const updateNote = useMutation(api.smartNotes.updateSmartNote)
  const deleteNote = useMutation(api.smartNotes.deleteSmartNote)
  const generateNotesAI = useAction(api.aiActions.generateNotes)
  const recordStudyActivity = useMutation(api.streaks.recordStudyActivity)

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      toast.error("Please fill in title and content")
      return
    }

    try {
      await createNote({
        revisionSetId: revisionSetId as any,
        title: newNote.title,
        content: newNote.content,
        generatedBy: "manual",
      })
      await recordStudyActivity({ activityType: "note", revisionSetId: revisionSetId as any })
      toast.success("Note created!")
      setNewNote({ title: "", content: "" })
      setIsCreating(false)
    } catch (error) {
      toast.error("Failed to create note")
    }
  }

  const handleGenerateAINote = async () => {
    setIsGenerating(true)
    try {
      const selected = (materials || []).filter((m) => selectedMaterialIds.includes(m._id))
      
      if (selected.length === 0) {
        toast.error("Please select at least one material")
        return
      }

      // Get content from selected materials (use extractedContent or title as fallback)
      const content = selected
        .map((m) => m.extractedContent || m.title || "No content available")
        .join("\n\n")

      // Get API key from user preferences
      const apiKey = userProfile?.preferences?.aiApiKey

      // Generate notes using AI
      const result = await generateNotesAI({
        content,
        style: genStyle,
        apiKey,
      })

      await createNote({
        revisionSetId: revisionSetId as any,
        title: `AI Notes (${genStyle})`,
        content: result.content,
        generatedBy: (userProfile?.preferences?.aiProvider || "openrouter") as any,
      })
      await recordStudyActivity({ activityType: "note", revisionSetId: revisionSetId as any })
      toast.success("AI notes generated successfully!")
      setGenOpen(false)
    } catch (error: any) {
      console.error("AI generation error:", error)
      const errorMessage = error?.message || "Failed to generate AI notes. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (confirm("Delete this note?")) {
      try {
        await deleteNote({ noteId: noteId as any })
        toast.success("Note deleted")
      } catch (error) {
        toast.error("Failed to delete note")
      }
    }
  }

  if (notes === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/revision-sets/${revisionSetId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">SmartNotes</h1>
                <p className="text-muted-foreground">Create and organize your revision notes</p>
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
                <DialogTitle>Generate SmartNotes</DialogTitle>
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
                    <Label className="mb-2 block text-sm">Note style</Label>
                    <Select value={genStyle} onValueChange={setGenStyle}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Choose style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="bullets">Bullet Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm">AI Provider</Label>
                    <Select value={genProvider} onValueChange={setGenProvider}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Claude</SelectItem>
                        <SelectItem value="google">Gemini</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerateAINote} disabled={isGenerating}>
                  {isGenerating ? "Generating..." : "Generate Notes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsCreating(!isCreating)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="e.g., Chapter 5: Photosynthesis"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Content</label>
              <Textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Write your notes here..."
                className="min-h-64"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateNote}>Create Note</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setNewNote({ title: "", content: "" })
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card className="p-12 text-center bg-card border-border">
          <p className="text-muted-foreground mb-4">No notes yet</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setIsCreating(true)}>Create Note</Button>
            <Button onClick={handleGenerateAINote} variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <Card key={note._id} className="p-6 bg-card border-border hover:border-primary/50 transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-foreground">{note.title}</h3>
                    {note.generatedBy === "ai" && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">AI Generated</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteNote(note._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{note.content}</p>
            </Card>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  )
}

