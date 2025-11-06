import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { authComponent } from "./auth"

async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx)
  if (!authUser) {
    throw new Error("Not authenticated")
  }
  return authUser
}

// Record study activity for streak tracking
export const recordStudyActivity = mutation({
  args: {
    activityType: v.string(), // "flashcard", "quiz", "note", "material"
    revisionSetId: v.optional(v.id("revisionSets")),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    // Get or create today's activity record
    const existing = await ctx.db
      .query("studyActivity")
      .withIndex("by_authId_date", (q: any) => q.eq("authId", authId).eq("date", todayTimestamp))
      .first()

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        activities: [...(existing.activities || []), args.activityType],
        updatedAt: Date.now(),
      })
    } else {
      // Create new record
      await ctx.db.insert("studyActivity", {
        authId,
        date: todayTimestamp,
        activities: [args.activityType],
        revisionSetId: args.revisionSetId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    // Update user streak
    await updateUserStreak(ctx, authId)
  },
})

// Update user streak based on activity
async function updateUserStreak(ctx: any, authId: string) {
  const user = await ctx.db
    .query("user")
    .withIndex("by_authId", (q: any) => q.eq("authId", authId))
    .first()

  if (!user) return

  // Get all activity dates
  const activities = await ctx.db
    .query("studyActivity")
    .withIndex("by_authId_date", (q: any) => q.eq("authId", authId))
    .order("desc")
    .collect()

  // Calculate current streak
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let checkDate = today.getTime()

  for (const activity of activities) {
    if (activity.date === checkDate) {
      streak++
      checkDate -= 24 * 60 * 60 * 1000 // Previous day
    } else if (activity.date < checkDate) {
      break
    }
  }

  // Update user streak
  const currentStreak = user.streakDays || 0
  if (streak > currentStreak) {
    await ctx.db.patch(user._id, {
      streakDays: streak,
      lastActivityDate: today.getTime(),
      updatedAt: Date.now(),
    })
  }
}

// Get user streak
export const getUserStreak = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) return null

    const authId = authUser._id.toString()

    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q: any) => q.eq("authId", authId))
      .first()

    if (!user) return null

    return {
      streakDays: user.streakDays || 0,
      lastActivityDate: user.lastActivityDate,
    }
  },
})

// Get leaderboard by streak
export const getStreakLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10

    const users = await ctx.db
      .query("user")
      .withIndex("by_authId")
      .collect()

    // Sort by streak and get top users
    const sorted = users
      .filter((u) => (u.streakDays || 0) > 0)
      .sort((a, b) => (b.streakDays || 0) - (a.streakDays || 0))
      .slice(0, limit)

    return sorted.map((user) => ({
      name: user.name,
      email: user.email,
      streakDays: user.streakDays || 0,
    }))
  },
})
