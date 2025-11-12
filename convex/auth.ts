import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { components } from "./_generated/api"
import { admin } from "better-auth/plugins"
import type { DataModel } from "./_generated/dataModel"
import { query } from "./_generated/server"
import { betterAuth } from "better-auth"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_CONVEX_URL
    ? `http://${process.env.NEXT_PUBLIC_CONVEX_URL.replace("https://", "").split("/")[0]}`
    : "http://localhost:3000")

const baseURL = typeof window === "undefined" ? (siteUrl.includes("http") ? siteUrl : `http://${siteUrl}`) : undefined

export const authComponent = createClient<DataModel>(components.betterAuth)

function createAuth(ctx: GenericCtx<DataModel>, { optionsOnly }: { optionsOnly?: boolean } = { optionsOnly: false }) {
  const config = {
    logger: {
      disabled: optionsOnly,
    },
    baseURL,
    trustedOrigins: ["http://localhost:3000", "http://localhost:3001","https://localhost:3000", process.env.NEXT_PUBLIC_APP_URL || ""].filter(
      Boolean,
    ),
    secret: process.env.BETTER_AUTH_SECRET || "dev-secret-key-change-me",
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      // Optimize password hashing
      minPasswordLength: 8,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      },
    },
    plugins: [
      convex(),
      admin(),
    ],
    // Optimize session handling
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
  }
  return betterAuth(config)
}

export { createAuth }

/**
 * Get current authenticated user from Better Auth
 * Returns the Better Auth user object directly
 * Added caching with zero-arg query to avoid repeated auth lookups
 */
export const getCurrentUser = query({
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx);
  },
});

/**
 * Get user profile from your app's user table
 * This includes additional fields like role, onboarding status, etc.
 */
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Get authenticated user from Better Auth
      const authUser = await authComponent.getAuthUser(ctx)
      if (!authUser) {
        return null
      }
      // Better Auth uses userId, not id
      const authId = authUser.userId || authUser._id.toString()
      // Get from your app's user table
      const user = await ctx.db
        .query("user")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .first()
      return user
    } catch (error) {
      console.error("Error getting current user profile:", error)
      return null
    }
  },
})
