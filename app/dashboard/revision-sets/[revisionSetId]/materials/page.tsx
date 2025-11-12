"use client"

import type React from "react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, File, Trash2, Download, Loader, ArrowLeft, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"
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
  const retryProcessing = useMutation(api.studyMaterials.retryProcessing)

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.currentTarget.files
      if (!files) return

      setIsUploading(true)
      try {
        for (const file of Array.from(files)) {
          // Validate file type
          const validTypes = [
            "text/plain",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
          ]
          
          if (!validTypes.includes(file.type) && 
              !file.name.endsWith(".txt") && 
              !file.name.endsWith(".pdf") && 
              !file.name.endsWith(".docx") && 
              !file.name.endsWith(".doc")) {
            toast.error(`${file.name}: Unsupported file type. Please upload PDF, DOCX, or TXT files.`)
            continue
          }

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

          // Create material record in database (this will trigger processing)
          await createMaterial({
            revisionSetId: revisionSetId as any,
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

          toast.success(`${file.name} uploaded! Processing text...`)
          await recordStudyActivity({ 
            activityType: "material", 
            revisionSetId: revisionSetId as any 
          })
        }
      } catch (error) {
        toast.error("Failed to upload file")
        console.error(error)
      } finally {
        setIsUploading(false)
        // Clear input
        event.target.value = ""
      }
    },
    [generateUploadUrl, createMaterial, revisionSetId, recordStudyActivity],
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

  const handleRetry = async (materialId: string) => {
    try {
      await retryProcessing({ materialId: materialId as any })
      toast.success("Processing restarted")
    } catch (error: any) {
      toast.error(error.message || "Failed to retry processing")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "processing":
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Ready"
      case "processing":
        return "Processing..."
      case "failed":
        return "Failed"
      default:
        return "Pending"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200"
      case "processing":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "failed":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
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
              <p className="text-muted-foreground">
                Upload PDF, DOCX, or TXT files. Text will be extracted automatically.
              </p>
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
                  <p className="font-semibold text-foreground mb-1">
                    {isUploading ? "Uploading..." : "Drag and drop files here"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse (PDF, DOCX, TXT)
                  </p>
                </div>
                {isUploading && <Loader className="w-4 h-4 animate-spin text-primary" />}
              </div>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
            </label>
          </Card>

          {/* Processing Info */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Upload your study materials (PDF, DOCX, or TXT)</li>
                  <li>Text is automatically extracted in the background</li>
                  <li>Once "Ready", you can generate quizzes from the content</li>
                  <li>If extraction fails, click retry to process again</li>
                </ol>
              </div>
            </div>
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
                    className="p-4 bg-card border-border hover:border-primary/50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <File className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-foreground">
                            {material.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{material.type}</span>
                            <span>•</span>
                            <span>{(material.fileSize! / 1024 / 1024).toFixed(2)} MB</span>
                            {material.extractedContent && (
                              <>
                                <span>•</span>
                                <span>{material.extractedContent.length} chars</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div
                          className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(
                            material.processedStatus || "pending"
                          )}`}
                        >
                          {getStatusIcon(material.processedStatus || "pending")}
                          <span className="text-xs font-semibold">
                            {getStatusText(material.processedStatus || "pending")}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0 ml-4">
                        {material.processedStatus === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(material._id)}
                            title="Retry processing"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(material._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Show preview for completed materials */}
                    {material.processedStatus === "completed" && material.extractedContent && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">Content preview:</p>
                        <p className="text-sm text-foreground line-clamp-2">
                          {material.extractedContent.substring(0, 200)}...
                        </p>
                      </div>
                    )}

                    {/* Show error message for failed materials */}
                    {material.processedStatus === "failed" && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-red-600">
                          Failed to extract text. The file may be image-only or corrupted. Try uploading a different version or retry processing.
                        </p>
                      </div>
                    )}
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
