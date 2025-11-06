import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const onCreateUser = internalMutation({
  args: {
    user: v.object({
      id: v.string(),
      email: v.string(),
      name: v.string(),
      image: v.optional(v.string()),
      emailVerified: v.boolean(),
    }),
  },
  handler: async (ctx, { user }) => {
    await ctx.db.insert("user", {
      authId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const onUpdateUser = internalMutation({
  args: {
    user: v.object({
      id: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { user }) => {
    const existingUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", user.id))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        ...(user.email && { email: user.email }),
        ...(user.name && { name: user.name }),
        ...(user.image !== undefined && { image: user.image }),
        updatedAt: Date.now(),
      });
    }
  },
});

export const onDeleteUser = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", userId))
      .first();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});
