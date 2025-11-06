"use client"

import type React from "react"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, File, Trash2, Download, Loader, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import BackButton from "@/components/back-button"

export default function MaterialsPage() {
  const params = useParams()
  const router = useRouter()
  const revisionSetId = params.revisionSetId as string
  const [isUploading, setIsUploading] = useState(false)

  const materials = useQuery(api.studyMaterials.getMaterialsByRevisionSet, {
    revisionSetId: revisionSetId as any,
  })

  const generateUploadUrl = useMutation(api.studyMaterials.generateUploadUrl)
  const createMaterial = useMutation(api.studyMaterials.createStudyMaterial)
  const recordStudyActivity = useMutation(api.streaks.recordStudyActivity)
  const deleteMaterial = useMutation(api.studyMaterials.deleteStudyMaterial)

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files
      if (!files) return

      setIsUploading(true)
      try {
        for (const file of Array.from(files)) {
          // Get upload URL
          const postUrl = await generateUploadUrl()

          // Upload file to Convex storage
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          })

          if (!result.ok) {
            throw new Error("Failed to upload file")
          }

          const { storageId } = await result.json()

          // Create material record in database
          await createMaterial({
            revisionSetId: revisionSetId as any,
            title: file.name,
            type: file.type.includes("pdf") ? "pdf" : file.type.includes("image") ? "image" : "document",
            fileId: storageId,
            fileSize: file.size,
          })

          toast.success(`${file.name} uploaded successfully!`)
          await recordStudyActivity({ activityType: "material", revisionSetId: revisionSetId as any })
        }
      } catch (error) {
        toast.error("Failed to upload file")
        console.error(error)
      } finally {
        setIsUploading(false)
      }
    },
    [generateUploadUrl, createMaterial, revisionSetId],
  )

  const handleDelete = async (materialId: string) => {
    if (confirm("Are you sure you want to delete this material?")) {
      try {
        await deleteMaterial({ materialId: materialId as any })
        toast.success("Material deleted")
      } catch (error) {
        toast.error("Failed to delete material")
      }
    }
  }

  if (materials === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading materials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-6">
          <BackButton fallbackHref={`/dashboard/revision-sets/${revisionSetId}`} />
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/revision-sets/${revisionSetId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">Study Materials</h1>
              <p className="text-muted-foreground">Upload and manage all your study materials</p>
            </div>
          </div>

      {/* Upload Area */}
      <Card className="p-8 border-2 border-dashed border-border hover:border-primary/50 transition bg-card">
        <label className="cursor-pointer block">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Drag and drop files here</p>
              <p className="text-sm text-muted-foreground">or click to browse (PDF, DOCX, images, videos)</p>
            </div>
            {isUploading && <Loader className="w-4 h-4 animate-spin text-primary" />}
          </div>
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif,.mp4,.webm"
          />
        </label>
      </Card>

      {/* Materials List */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          {materials.length} Material{materials.length !== 1 ? "s" : ""}
        </h2>
        {materials.length === 0 ? (
          <Card className="p-8 text-center bg-card border-border">
            <File className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No materials uploaded yet</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {materials.map((material) => (
              <Card
                key={material._id}
                className="p-4 flex items-center justify-between bg-card border-border hover:border-primary/50 transition"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <File className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-foreground">{material.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {material.type} • {(material.fileSize! / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" className="bg-transparent">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(material._id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  )
}

