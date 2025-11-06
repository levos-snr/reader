"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Search, Calendar, BookOpen, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useMutation } from "convex/react"

export default function RevisionSetsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const revisionSets = useQuery(api.revisionSets.getUserRevisionSets)
  const deleteSet = useMutation(api.revisionSets.deleteRevisionSet)

  const filteredSets = (revisionSets ?? []).filter((set) => (set.title ?? "").toLowerCase().includes(searchTerm.toLowerCase()))

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this revision set?")) {
      await deleteSet({ revisionSetId: id })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Revision Sets</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">Organize and manage your study materials</p>
          </div>
          <Button 
            className="w-full sm:w-auto"
            onClick={() => {
              // Trigger create dialog from header
              const event = new CustomEvent('openCreateDialog')
              window.dispatchEvent(event)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Set
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search revision sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Revision Sets Grid */}
        {filteredSets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredSets.map((set) => (
              <Card key={set._id} className="p-4 sm:p-6 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                <Link href={`/dashboard/revision-sets/${set._id}`} className="block">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-foreground truncate">{set.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{set.subject || "General"}</p>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: set.color || "#3b82f6" }}
                    />
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2">
                    {set.description || "No description"}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-foreground">{set.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
                        style={{ width: `${set.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{set.materialsCount || 0} materials</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{set.examDate ? new Date(set.examDate).toLocaleDateString() : "No exam"}</span>
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                    <Link href={`/dashboard/revision-sets/${set._id}`}>Study</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      handleDelete(set._id)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 sm:p-16 text-center border-border bg-card">
            <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
              {searchTerm ? "No revision sets found" : "No revision sets yet"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              {searchTerm ? "Try a different search term" : "Create your first revision set to get started"}
            </p>
            <Link href="/dashboard/study-sets">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create First Set
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  )
}

