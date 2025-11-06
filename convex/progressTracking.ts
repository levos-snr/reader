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

// Record daily progress
export const recordDailyProgress = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    flashcardsReviewed: v.optional(v.number()),
    quizzesCompleted: v.optional(v.number()),
    exercisesSolved: v.optional(v.number()),
    studyTimeMinutes: v.optional(v.number()),
    performanceScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    // Check if entry exists for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    const existingProgress = await ctx.db
      .query("progressTracking")
      .withIndex("by_auth", (q) => q.eq("authId", authId))
      .filter((q) => q.and(q.eq(q.field("revisionSetId"), args.revisionSetId), q.eq(q.field("date"), todayTimestamp)))
      .first()

    if (existingProgress) {
      // Update existing progress
      return await ctx.db.patch(existingProgress._id, {
        flashcardsReviewed: (existingProgress.flashcardsReviewed || 0) + (args.flashcardsReviewed || 0),
        quizzesCompleted: (existingProgress.quizzesCompleted || 0) + (args.quizzesCompleted || 0),
        exercisesSolved: (existingProgress.exercisesSolved || 0) + (args.exercisesSolved || 0),
        studyTimeMinutes: (existingProgress.studyTimeMinutes || 0) + (args.studyTimeMinutes || 0),
        performanceScore: args.performanceScore || existingProgress.performanceScore,
      })
    }

    // Create new progress entry
    return await ctx.db.insert("progressTracking", {
      authId,
      revisionSetId: args.revisionSetId,
      date: todayTimestamp,
      flashcardsReviewed: args.flashcardsReviewed || 0,
      quizzesCompleted: args.quizzesCompleted || 0,
      exercisesSolved: args.exercisesSolved || 0,
      studyTimeMinutes: args.studyTimeMinutes || 0,
      performanceScore: args.performanceScore || 0,
    })
  },
})

// Get weekly progress
export const getWeeklyProgress = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgoTimestamp = today.getTime() - 7 * 24 * 60 * 60 * 1000

    const progressEntries = await ctx.db
      .query("progressTracking")
      .withIndex("by_auth", (q) => q.eq("authId", authId))
      .filter((q) =>
        q.and(q.eq(q.field("revisionSetId"), args.revisionSetId), q.gte(q.field("date"), weekAgoTimestamp)),
      )
      .collect()

    return progressEntries
  },
})

// Get overall stats for revision set
export const getRevisionSetStats = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    const progressEntries = await ctx.db
      .query("progressTracking")
      .withIndex("by_auth", (q) => q.eq("authId", authId))
      .filter((q) => q.eq(q.field("revisionSetId"), args.revisionSetId))
      .collect()

    const totalFlashcardsReviewed = progressEntries.reduce((sum, entry) => sum + (entry.flashcardsReviewed || 0), 0)
    const totalQuizzesCompleted = progressEntries.reduce((sum, entry) => sum + (entry.quizzesCompleted || 0), 0)
    const totalExercisesSolved = progressEntries.reduce((sum, entry) => sum + (entry.exercisesSolved || 0), 0)
    const totalStudyTimeMinutes = progressEntries.reduce((sum, entry) => sum + (entry.studyTimeMinutes || 0), 0)
    const averageScore =
      progressEntries.length > 0
        ? progressEntries.reduce((sum, entry) => sum + (entry.performanceScore || 0), 0) / progressEntries.length
        : 0

    return {
      totalFlashcardsReviewed,
      totalQuizzesCompleted,
      totalExercisesSolved,
      totalStudyTimeMinutes,
      averageScore: Math.round(averageScore),
      daysActive: progressEntries.length,
    }
  },
})

