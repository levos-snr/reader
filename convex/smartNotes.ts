import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { authComponent } from "./auth"

async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx)
  if (!authUser) {
    throw new Error("Not authenticated")
  }
  return authUser
}

// Create smart notes (AI-generated or manual)
export const createSmartNote = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    materialId: v.optional(v.id("studyMaterials")),
    title: v.string(),
    content: v.string(),
    tags: v.optional(v.array(v.string())),
    generatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db.insert("smartNotes", {
      revisionSetId: args.revisionSetId,
      materialId: args.materialId,
      title: args.title,
      content: args.content,
      tags: args.tags || [],
      generatedBy: args.generatedBy,
      authId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Get notes for revision set
export const getNotesByRevisionSet = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db
      .query("smartNotes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .order("desc")
      .collect()
  },
})

// Update smart note
export const updateSmartNote = mutation({
  args: {
    noteId: v.id("smartNotes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const note = await ctx.db.get(args.noteId)
    if (!note || note.authId !== authId) {
      throw new Error("Note not found or unauthorized")
    }

    const updateData: any = {}
    if (args.title !== undefined) updateData.title = args.title
    if (args.content !== undefined) updateData.content = args.content
    if (args.tags !== undefined) updateData.tags = args.tags
    updateData.updatedAt = Date.now()

    await ctx.db.patch(args.noteId, updateData)
    return await ctx.db.get(args.noteId)
  },
})

// Delete smart note
export const deleteSmartNote = mutation({
  args: { noteId: v.id("smartNotes") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const note = await ctx.db.get(args.noteId)
    if (!note || note.authId !== authId) {
      throw new Error("Note not found or unauthorized")
    }

    await ctx.db.delete(args.noteId)
    return { success: true }
  },
})

