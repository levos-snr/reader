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

// Create flashcard
export const createFlashcard = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    front: v.string(),
    back: v.string(),
    difficulty: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db.insert("flashcards", {
      revisionSetId: args.revisionSetId,
      front: args.front,
      back: args.back,
      difficulty: args.difficulty || "medium",
      tags: args.tags || [],
      authId,
      reviewCount: 0,
      confidenceLevel: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Get flashcards for revision set
export const getFlashcardsByRevisionSet = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db
      .query("flashcards")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()
  },
})

// Update flashcard review
export const updateFlashcardReview = mutation({
  args: {
    flashcardId: v.id("flashcards"),
    confidenceLevel: v.number(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const flashcard = await ctx.db.get(args.flashcardId)
    if (!flashcard || flashcard.authId !== authId) {
      throw new Error("Flashcard not found or unauthorized")
    }

    const nextReviewDate = new Date()
    const daysToAdd = [1, 3, 7, 14, 30][Math.min(args.confidenceLevel - 1, 4)]
    nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd)

    await ctx.db.patch(args.flashcardId, {
      lastReviewed: Date.now(),
      reviewCount: (flashcard.reviewCount || 0) + 1,
      confidenceLevel: args.confidenceLevel,
      nextReviewDate: nextReviewDate.getTime(),
      updatedAt: Date.now(),
    })

    return await ctx.db.get(args.flashcardId)
  },
})

// Delete flashcard
export const deleteFlashcard = mutation({
  args: { flashcardId: v.id("flashcards") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const flashcard = await ctx.db.get(args.flashcardId)
    if (!flashcard || flashcard.authId !== authId) {
      throw new Error("Flashcard not found or unauthorized")
    }

    await ctx.db.delete(args.flashcardId)
    return { success: true }
  },
})

