// convex/studyMaterials.ts
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { authComponent } from "./auth"
import { internal } from "./_generated/api"

async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx)
  if (!authUser) {
    throw new Error("Not authenticated")
  }
  return authUser
}

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await getAuthUser(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

// Create study material and trigger processing
export const createStudyMaterial = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    title: v.string(),
    type: v.string(),
    fileId: v.optional(v.id("_storage")),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    // Create material record
    const materialId = await ctx.db.insert("studyMaterials", {
      revisionSetId: args.revisionSetId,
      title: args.title,
      type: args.type,
      fileId: args.fileId,
      fileSize: args.fileSize,
      authId,
      processedStatus: "pending",
      uploadedAt: Date.now(),
    })

    // Trigger async document processing if file exists
    if (args.fileId) {
      await ctx.scheduler.runAfter(0, internal.documentProcessing.processDocument, {
        materialId,
        fileId: args.fileId,
      })
    }

    return materialId
  },
})

// Get materials for revision set
export const getMaterialsByRevisionSet = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db
      .query("studyMaterials")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()
  },
})

// Delete study material
export const deleteStudyMaterial = mutation({
  args: { materialId: v.id("studyMaterials") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const material = await ctx.db.get(args.materialId)
    if (!material || material.authId !== authId) {
      throw new Error("Material not found or unauthorized")
    }

    if (material.fileId) {
      await ctx.storage.delete(material.fileId)
    }

    await ctx.db.delete(args.materialId)
    return { success: true }
  },
})

// Get file URL for download
export const getFileUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      const url = await ctx.storage.getUrl(args.fileId)
      return url
    } catch (error) {
      throw new Error("Failed to get file URL")
    }
  },
})

// Get material by ID
export const getMaterialById = query({
  args: { materialId: v.id("studyMaterials") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.materialId)
  },
})

// Get revision set ID for a material
export const getMaterialRevisionSet = query({
  args: { materialId: v.id("studyMaterials") },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.materialId)
    return material?.revisionSetId
  },
})

// Retry processing for failed materials
export const retryProcessing = mutation({
  args: { materialId: v.id("studyMaterials") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const material = await ctx.db.get(args.materialId)
    if (!material || material.authId !== authId) {
      throw new Error("Material not found or unauthorized")
    }

    if (!material.fileId) {
      throw new Error("No file to process")
    }

    // Update status to pending
    await ctx.db.patch(args.materialId, {
      processedStatus: "pending",
    })

    // Trigger processing again
    await ctx.scheduler.runAfter(0, internal.documentProcessing.processDocument, {
      materialId: args.materialId,
      fileId: material.fileId,
    })

    return { success: true }
  },
})
