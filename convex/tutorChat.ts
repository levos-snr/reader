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

// Create tutor chat session
export const createTutorChat = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db.insert("tutorChats", {
      revisionSetId: args.revisionSetId,
      authId,
      title: args.title || "Chat with AI Tutor",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Add message to chat
export const addChatMessage = mutation({
  args: {
    chatId: v.id("tutorChats"),
    role: v.string(),
    content: v.string(),
    aiProvider: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const chat = await ctx.db.get(args.chatId)
    if (!chat || chat.authId !== authId) {
      throw new Error("Chat not found or unauthorized")
    }

    return await ctx.db.insert("chatMessages", {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      aiProvider: args.aiProvider,
      tokensUsed: args.tokensUsed,
      timestamp: Date.now(),
    })
  },
})

// Get chat messages
export const getChatMessages = query({
  args: { chatId: v.id("tutorChats") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const chat = await ctx.db.get(args.chatId)
    if (!chat || chat.authId !== authId) {
      throw new Error("Chat not found or unauthorized")
    }

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect()
  },
})

// Get user's tutor chats
export const getUserTutorChats = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db
      .query("tutorChats")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .order("desc")
      .collect()
  },
})

// Delete chat
export const deleteTutorChat = mutation({
  args: { chatId: v.id("tutorChats") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const chat = await ctx.db.get(args.chatId)
    if (!chat || chat.authId !== authId) {
      throw new Error("Chat not found or unauthorized")
    }

    // Delete all messages
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect()

    for (const message of messages) {
      await ctx.db.delete(message._id)
    }

    await ctx.db.delete(args.chatId)
    return { success: true }
  },
})

