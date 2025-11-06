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

function getAuthId(authUser: any): string {
  return authUser.userId || authUser._id.toString()
}

// Create a past paper
export const createPastPaper = mutation({
  args: {
    revisionSetId: v.optional(v.id("revisionSets")),
    title: v.string(),
    year: v.optional(v.number()),
    examBoard: v.optional(v.string()),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = getAuthId(authUser)

    return await ctx.db.insert("pastPapers", {
      revisionSetId: args.revisionSetId,
      title: args.title,
      year: args.year,
      examBoard: args.examBoard,
      fileId: args.fileId,
      uploadedAt: Date.now(),
      authId: authId,
    })
  },
})

// Get past papers by revision set
export const getPastPapersByRevisionSet = query({
  args: {
    revisionSetId: v.id("revisionSets"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = getAuthId(authUser)

    return await ctx.db
      .query("pastPapers")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .filter((q) => q.eq(q.field("authId"), authId))
      .order("desc")
      .collect()
  },
})

// Get all past papers for a user
export const getAllPastPapers = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthUser(ctx)
    const authId = getAuthId(authUser)

    return await ctx.db
      .query("pastPapers")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .order("desc")
      .collect()
  },
})

// Get a single past paper by ID
export const getPastPaperById = query({
  args: {
    pastPaperId: v.id("pastPapers"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = getAuthId(authUser)

    const pastPaper = await ctx.db.get(args.pastPaperId)
    if (!pastPaper || pastPaper.authId !== authId) {
      return null
    }
    return pastPaper
  },
})

// Delete a past paper
export const deletePastPaper = mutation({
  args: {
    pastPaperId: v.id("pastPapers"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = getAuthId(authUser)

    const pastPaper = await ctx.db.get(args.pastPaperId)
    if (!pastPaper || pastPaper.authId !== authId) {
      throw new Error("Past paper not found or unauthorized")
    }

    // Delete the file from storage
    await ctx.storage.delete(pastPaper.fileId)

    return await ctx.db.delete(args.pastPaperId)
  },
})

// Update past paper (e.g., add solutions, extracted content, questions)
export const updatePastPaper = mutation({
  args: {
    pastPaperId: v.id("pastPapers"),
    title: v.optional(v.string()),
    year: v.optional(v.number()),
    examBoard: v.optional(v.string()),
    solutions: v.optional(v.array(v.string())),
    extractedContent: v.optional(v.string()),
    questions: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.optional(v.string()),
      marks: v.optional(v.number()),
      topic: v.optional(v.string()),
    }))),
    processedStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = getAuthId(authUser)

    const pastPaper = await ctx.db.get(args.pastPaperId)
    if (!pastPaper || pastPaper.authId !== authId) {
      throw new Error("Past paper not found or unauthorized")
    }

    const { pastPaperId, ...updateData } = args
    return await ctx.db.patch(args.pastPaperId, updateData)
  },
})

// Get download URL for a past paper file
export const getPastPaperDownloadUrl = query({
  args: {
    pastPaperId: v.id("pastPapers"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = getAuthId(authUser)

    const pastPaper = await ctx.db.get(args.pastPaperId)
    if (!pastPaper || pastPaper.authId !== authId) {
      throw new Error("Past paper not found or unauthorized")
    }

    return await ctx.storage.getUrl(pastPaper.fileId)
  },
})

