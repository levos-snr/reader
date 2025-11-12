// convex/aiFeedback.ts
// Feedback storage for future LLM training

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }
  return authUser;
}

/**
 * Store feedback for AI generation
 */
export const storeFeedback = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    generationType: v.string(),
    generationId: v.optional(v.string()),
    inputContext: v.optional(v.string()),
    output: v.string(),
    userRating: v.optional(v.number()),
    userFeedback: v.optional(v.string()),
    userEdits: v.optional(v.string()),
    wasUseful: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    const authId = authUser._id.toString();

    return await ctx.db.insert("aiFeedback", {
      revisionSetId: args.revisionSetId,
      generationType: args.generationType,
      generationId: args.generationId,
      inputContext: args.inputContext,
      output: args.output,
      userRating: args.userRating,
      userFeedback: args.userFeedback,
      userEdits: args.userEdits,
      wasUseful: args.wasUseful,
      authId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get feedback for a revision set
 */
export const getFeedback = query({
  args: {
    revisionSetId: v.id("revisionSets"),
    generationType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    const authId = authUser._id.toString();

    let query_ = ctx.db
      .query("aiFeedback")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .filter((q) => q.eq(q.field("authId"), authId));

    if (args.generationType) {
      query_ = query_.filter((q) => q.eq(q.field("generationType"), args.generationType));
    }

    return await query_.collect();
  },
});

