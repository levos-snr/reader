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

// Create a new revision set (GizmoReader specific)
export const createRevisionSet = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    examDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
    coverImage: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const baseSlug = args.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")

    let slug = baseSlug || "untitled"
    // Ensure uniqueness per user by appending short suffix if needed
    const existing = await ctx.db
      .query("revisionSets")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .collect()
    const existingSlugs = new Set(existing.map((r: any) => r.slug))
    let suffix = 0
    while (existingSlugs.has(slug)) {
      suffix += 1
      slug = `${baseSlug}-${suffix}`
    }

    return await ctx.db.insert("revisionSets", {
      title: args.title,
      slug,
      description: args.description,
      subject: args.subject,
      examDate: args.examDate,
      tags: args.tags || [],
      color: args.color || "#0ea5e9",
      coverImage: args.coverImage,
      authId,
      progress: 0,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Get user's revision sets
export const getUserRevisionSets = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    let query_ = ctx.db.query("revisionSets").withIndex("by_authId", (q) => q.eq("authId", authId))

    if (args.status) {
      query_ = ctx.db
        .query("revisionSets")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .filter((q) => q.eq(q.field("authId"), authId))
    }

    return await query_.order("desc").collect()
  },
})

// Get revision set by ID
export const getRevisionSetById = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return revisionSet
  },
})

export const getRevisionSetBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const candidates = await ctx.db
      .query("revisionSets")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .collect()
    const revisionSet = candidates[0]
    if (!revisionSet) {
      throw new Error("Revision set not found or unauthorized")
    }
    return revisionSet
  },
})

// Update revision set
export const updateRevisionSet = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    subject: v.optional(v.string()),
    examDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    color: v.optional(v.string()),
    progress: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    const updateData: any = {}
    if (args.title !== undefined) updateData.title = args.title
    if (args.description !== undefined) updateData.description = args.description
    if (args.subject !== undefined) updateData.subject = args.subject
    if (args.examDate !== undefined) updateData.examDate = args.examDate
    if (args.tags !== undefined) updateData.tags = args.tags
    if (args.color !== undefined) updateData.color = args.color
    if (args.progress !== undefined) updateData.progress = args.progress
    if (args.status !== undefined) updateData.status = args.status
    updateData.updatedAt = Date.now()

    await ctx.db.patch(args.revisionSetId, updateData)
    return await ctx.db.get(args.revisionSetId)
  },
})

// Delete revision set
export const deleteRevisionSet = mutation({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    // Delete all related data
    const materials = await ctx.db
      .query("studyMaterials")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    for (const material of materials) {
      await ctx.db.delete(material._id)
    }

    const notes = await ctx.db
      .query("smartNotes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    for (const note of notes) {
      await ctx.db.delete(note._id)
    }

    const flashcards = await ctx.db
      .query("flashcards")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    for (const flashcard of flashcards) {
      await ctx.db.delete(flashcard._id)
    }

    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    for (const quiz of quizzes) {
      await ctx.db.delete(quiz._id)
    }

    await ctx.db.delete(args.revisionSetId)
    return { success: true }
  },
})

// Get revision set with all content
export const getRevisionSetWithContent = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    const materials = await ctx.db
      .query("studyMaterials")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    const notes = await ctx.db
      .query("smartNotes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    const flashcards = await ctx.db
      .query("flashcards")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    const exercises = await ctx.db
      .query("practiceExercises")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()

    return {
      ...revisionSet,
      materials,
      notes,
      flashcards,
      quizzes,
      exercises,
      stats: {
        materialsCount: materials.length,
        notesCount: notes.length,
        flashcardsCount: flashcards.length,
        quizzesCount: quizzes.length,
        exercisesCount: exercises.length,
      },
    }
  },
})

export const getRevisionSetWithContentBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const candidates = await ctx.db
      .query("revisionSets")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .collect()
    const revisionSet = candidates[0]
    if (!revisionSet) {
      throw new Error("Revision set not found or unauthorized")
    }

    const materials = await ctx.db
      .query("studyMaterials")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", revisionSet._id))
      .collect()
    const notes = await ctx.db
      .query("smartNotes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", revisionSet._id))
      .collect()
    const flashcards = await ctx.db
      .query("flashcards")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", revisionSet._id))
      .collect()
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", revisionSet._id))
      .collect()
    const exercises = await ctx.db
      .query("practiceExercises")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", revisionSet._id))
      .collect()

    return {
      ...revisionSet,
      materials,
      notes,
      flashcards,
      quizzes,
      exercises,
      stats: {
        materialsCount: materials.length,
        notesCount: notes.length,
        flashcardsCount: flashcards.length,
        quizzesCount: quizzes.length,
        exercisesCount: exercises.length,
      },
    }
  },
})

