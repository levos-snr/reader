"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { usePermissions } from "@/hooks/use-permissions"
import UserMenu from "@/components/user-menu"
import { BookOpen, Menu, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "./mode-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { navigationLinks, type NavigationLink } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMutation } from "convex/react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Listen for custom event to open create dialog
  useEffect(() => {
    const handleOpenDialog = () => {
      setCreateDialogOpen(true)
    }
    window.addEventListener("openCreateDialog", handleOpenDialog)
    return () => {
      window.removeEventListener("openCreateDialog", handleOpenDialog)
    }
  }, [])
  const [formData, setFormData] = useState({ title: "", description: "", subject: "", examDate: "", color: "#0ea5e9" })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const generateUploadUrl = useMutation(api.studyMaterials.generateUploadUrl as any)
  const [isCreating, setIsCreating] = useState(false)
  const user = useQuery(api.auth.getCurrentUser)
  const { isAdmin } = usePermissions()
  const createRevisionSet = useMutation(api.revisionSets.createRevisionSet)

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error("Revision set title is required")
      return
    }

    setIsCreating(true)
    try {
      // Optional cover upload
      let coverImageId: string | undefined = undefined
      if (coverFile) {
        const uploadUrl = await generateUploadUrl()
        const res = await fetch(uploadUrl as string, { method: "POST", body: coverFile })
        if (!res.ok) throw new Error("Cover upload failed")
        const { storageId } = await res.json()
        coverImageId = storageId
      }

      const revisionSetId = await createRevisionSet({
        title: formData.title,
        description: formData.description,
        subject: formData.subject || undefined,
        examDate: formData.examDate ? new Date(formData.examDate).getTime() : undefined,
        color: formData.color,
        coverImage: coverImageId as any,
      })
      toast.success("Revision set created successfully!")
      setFormData({ title: "", description: "", subject: "", examDate: "", color: "#0ea5e9" })
      setCoverFile(null)
      setCreateDialogOpen(false)
      router.push(`/dashboard/revision-sets/${revisionSetId}`)
    } catch (error) {
      toast.error("Failed to create revision set")
    } finally {
      setIsCreating(false)
    }
  }

  const filteredLinks = navigationLinks.filter((link: NavigationLink) => {
    if (link.hideWhenAuthenticated && user) {
      return false
    }

    if (link.requiresAuth && !user) {
      return false
    }

    if (link.requiresAdmin && !isAdmin) {
      return false
    }

    return true
  })

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") {
      return true
    }
    if (path !== "/dashboard" && pathname.startsWith(path)) {
      return true
    }
    return false
  }

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={cn(mobile ? "flex flex-col space-y-1" : "hidden md:flex items-center gap-1")}>
      {filteredLinks.map((link) => {
        const Icon = link.icon
        const active = isActive(link.to)

        return (
          <Link key={link.to} href={link.to}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-sm font-medium transition-colors",
                mobile ? "w-full justify-start" : "",
                active ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
              onClick={() => mobile && setMobileMenuOpen(false)}
            >
              {Icon && <Icon className="w-4 h-4 mr-2" />}
              {link.label}
            </Button>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-14 px-4 max-w-full">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
          <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-background" />
          </div>
          <span className="font-semibold text-sm text-foreground hidden sm:inline">GizmoReader</span>
        </Link>

        {/* Center - Navigation */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <NavLinks />
        </div>

        {/* Create Set Button - Desktop only */}
        {user && (
          <div className="hidden md:flex items-center justify-between gap-2 flex">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  className="h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                  title="Create new revision set"
                >
                  <span className="text-lg font-semibold">+</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Revision Set</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateSet} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Biology 101 Final Exam"
                      className="bg-background border-border text-foreground"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Description (Optional)</label>
                    <Input
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Brief description of this revision set"
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">Subject</Label>
                      <Select value={formData.subject} onValueChange={(v) => setFormData({ ...formData, subject: v })}>
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Biology">Biology</SelectItem>
                          <SelectItem value="Chemistry">Chemistry</SelectItem>
                          <SelectItem value="Physics">Physics</SelectItem>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="History">History</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">Exam Date (Optional)</Label>
                      <Input
                        type="date"
                        value={formData.examDate}
                        onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">Color</Label>
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-9 w-16 p-1 bg-background border-border"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-foreground mb-2 block">Cover Image (Optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                        className="bg-background border-border text-foreground"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isCreating} className="flex-1">
                      {isCreating ? "Creating..." : "Create Revision Set"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* User Menu */}
          <UserMenu />

          {/* Desktop Mode Toggle */}
          <div className="hidden md:block">
            <ModeToggle />
          </div>

          {/* Notifications */}
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
          </Link>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px] bg-background border-border p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-background" />
                    </div>
                    <span className="font-semibold text-sm">GizmoReader</span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <NavLinks mobile />
                </div>

                <div className="mt-auto pt-4 border-t border-border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Theme</span>
                    <ModeToggle />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

