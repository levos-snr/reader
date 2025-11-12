import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { authComponent } from "./auth"

// Type guard to check if we have a valid auth user
function isValidAuthUser(
  user: any,
): user is { userId?: string; _id: any; email: string; name: string; image?: string } {
  return user && typeof user === "object" && "_id" in user
}

// Helper function to get authId from Better Auth user
function getAuthId(authUser: any): string {
  // Better Auth uses userId field, fallback to _id
  return authUser.userId || authUser._id?.toString() || authUser.id || "";
}

// Manually sync current user to app's user table
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const authUser = await authComponent.getAuthUser(ctx)

      if (!authUser || !isValidAuthUser(authUser)) {
        console.log("No authenticated user found")
        return null
      }

      const authId = getAuthId(authUser)

      // Check if user already exists in app's table
      const existingUser = await ctx.db
        .query("user")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .first()

      if (!existingUser) {
        // Create user in app's user table
        const newUser = await ctx.db.insert("user", {
          authId: authId,
          email: authUser.email,
          name: authUser.name,
          image: authUser.image || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })

        console.log("User synced:", newUser)
        return { synced: true, userId: newUser }
      } else {
        // Update existing user
        await ctx.db.patch(existingUser._id, {
          email: authUser.email,
          name: authUser.name,
          image: authUser.image || undefined,
          updatedAt: Date.now(),
        })

        console.log("User updated:", existingUser._id)
        return { synced: true, userId: existingUser._id }
      }
    } catch (error) {
      console.error("Error syncing user:", error)
      return null
    }
  },
})

// Get current user from app's table
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    try {
      const authUser = await authComponent.getAuthUser(ctx)

      if (!authUser || !isValidAuthUser(authUser)) return null

      const authId = getAuthId(authUser)

      return await ctx.db
        .query("user")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .first()
    } catch (error) {
      console.error("Error getting user profile:", error)
      return null
    }
  },
})

// OPTIMIZED: Get user role by authId (pass from client to avoid slow auth call)
export const getUserRoleByAuthId = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    try {
      // Use index directly - much faster than sequential queries
      const appUser = await ctx.db
        .query("user")
        .withIndex("by_authId", (q) => q.eq("authId", args.authId))
        .first()

      // Return immediately with proper defaults
      if (!appUser) {
        return {
          role: "user",
          banned: false,
          user: null,
        }
      }

      return {
        role: appUser.role || "user",
        banned: appUser.banned || false,
        user: appUser,
      }
    } catch (error) {
      console.error("Error getting user role:", error)
      return {
        role: "user",
        banned: false,
        user: null,
      }
    }
  },
})

// DEPRECATED: Use getUserRoleByAuthId instead - keeping for backward compatibility
export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    try {
      const authUser = await authComponent.getAuthUser(ctx)

      if (!authUser || !isValidAuthUser(authUser)) return null

      const authId = getAuthId(authUser)

      const appUser = await ctx.db
        .query("user")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .first()

      return {
        role: appUser?.role || "user",
        banned: appUser?.banned || false,
        user: appUser,
      }
    } catch (error) {
      console.error("Error getting user role:", error)
      return null
    }
  },
})

// Get user by ID (using authId string)
export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.userId))
      .first()
  },
})

// Get user by email from app's table
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first()
  },
})

// Update user profile
export const updateUserProfile = mutation({
  args: {
    userId: v.string(), // authId
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    displayUsername: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updateData } = args

    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return await ctx.db.patch(user._id, {
      ...updateData,
      updatedAt: Date.now(),
    })
  },
})

// Update onboarding status
export const updateOnboardingStatus = mutation({
  args: {
    userId: v.string(), // authId
    onboarded: v.optional(v.boolean()),
    onboardingStep: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return await ctx.db.patch(user._id, {
      ...(args.onboarded !== undefined && { onboarded: args.onboarded }),
      ...(args.onboardingStep !== undefined && {
        onboardingStep: args.onboardingStep,
      }),
      updatedAt: Date.now(),
    })
  },
})

// Get onboarding status by authId (optimized)
export const getOnboardingStatusByAuthId = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("user")
        .withIndex("by_authId", (q) => q.eq("authId", args.authId))
        .first()

      if (!user) {
        return { onboarded: false, onboardingStep: 0 }
      }

      return {
        onboarded: user.onboarded || false,
        onboardingStep: user.onboardingStep || 0,
      }
    } catch (error) {
      console.error("Error getting onboarding status:", error)
      return { onboarded: false, onboardingStep: 0 }
    }
  },
})

// DEPRECATED: Use getOnboardingStatusByAuthId - keeping for backward compatibility
export const getOnboardingStatus = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("user")
        .withIndex("by_authId", (q) => q.eq("authId", args.authId))
        .first()

      if (!user) {
        return { onboarded: false, onboardingStep: 0 }
      }

      return {
        onboarded: user.onboarded || false,
        onboardingStep: user.onboardingStep || 0,
      }
    } catch (error) {
      console.error("Error getting onboarding status:", error)
      return { onboarded: false, onboardingStep: 0 }
    }
  },
})

// Delete user
export const deleteUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    // Delete related sessions
    const sessions = await ctx.db
      .query("session")
      .withIndex("by_authId", (q) => q.eq("authId", args.userId))
      .collect()
    for (const session of sessions) {
      await ctx.db.delete(session._id)
    }

    return await ctx.db.delete(user._id)
  },
})

// List users from app's table
export const listUsers = query({
  args: {
    limit: v.optional(v.number()),
    skip: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10
    const skip = args.skip || 0

    const allUsers = await ctx.db.query("user").order("desc").collect()

    const users = allUsers.slice(skip, skip + limit)
    const total = allUsers.length

    return {
      users,
      total,
      limit,
      skip,
    }
  },
})

// Search users
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("user").collect()
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(args.query.toLowerCase()) ||
        user.name.toLowerCase().includes(args.query.toLowerCase()),
    )
  },
})

export const updateUserPreferences = mutation({
  args: {
    userId: v.string(),
    preferences: v.optional(
      v.object({
        studyGoals: v.optional(v.array(v.string())),
        examTargets: v.optional(v.array(v.string())),
        subjectsOfInterest: v.optional(v.array(v.string())),
        preferredStudyTime: v.optional(v.string()),
        learningStyle: v.optional(v.string()),
        aiProvider: v.optional(v.string()),
        aiApiKey: v.optional(v.string()),
        theme: v.optional(v.string()),
        notificationsEnabled: v.optional(v.boolean()),
        languagePreference: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    // Merge preferences with existing ones to maintain any existing data
    const mergedPreferences = args.preferences 
      ? {
          studyGoals: args.preferences.studyGoals || user.preferences?.studyGoals || [],
          examTargets: args.preferences.examTargets || user.preferences?.examTargets || [],
          subjectsOfInterest: args.preferences.subjectsOfInterest || user.preferences?.subjectsOfInterest || [],
          preferredStudyTime: args.preferences.preferredStudyTime || user.preferences?.preferredStudyTime,
          learningStyle: args.preferences.learningStyle || user.preferences?.learningStyle,
          aiProvider: args.preferences.aiProvider || user.preferences?.aiProvider,
          aiApiKey: args.preferences.aiApiKey || user.preferences?.aiApiKey,
          theme: args.preferences.theme || user.preferences?.theme,
          notificationsEnabled: args.preferences.notificationsEnabled ?? user.preferences?.notificationsEnabled,
          languagePreference: args.preferences.languagePreference || user.preferences?.languagePreference,
        }
      : user.preferences

    return await ctx.db.patch(user._id, {
      preferences: mergedPreferences,
      updatedAt: Date.now(),
    })
  },
})
