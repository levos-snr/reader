import { query } from "./_generated/server";
import { v } from "convex/values";

// SOLUTION 1: Handle optional token with early return
export const getSessionByToken = query({
  args: { 
    sessionToken: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    // Check if token exists before querying
    if (!args.sessionToken) {
      return null;
    }
    
    // At this point, TypeScript knows sessionToken is defined
    const token = args.sessionToken; // Store in variable to help TypeScript
    
    const session = await ctx.db
      .query("session")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();
    
    return session;
  },
});

// SOLUTION 2: Make sessionToken required (RECOMMENDED)
export const getSessionByTokenRequired = query({
  args: { 
    sessionToken: v.string() // Required, not optional
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("session")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    
    return session;
  },
});

// SOLUTION 3: Use type assertion (NOT RECOMMENDED, but works)
export const getSessionByTokenAssertion = query({
  args: { 
    sessionToken: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    if (!args.sessionToken) {
      return null;
    }
    
    const session = await ctx.db
      .query("session")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken!)) // Use non-null assertion
      .first();
    
    return session;
  },
});

// If you have other queries with similar issues, apply the same pattern:
export const getUserByAuthId = query({
  args: { 
    authId: v.string() // Make required
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
  },
});
