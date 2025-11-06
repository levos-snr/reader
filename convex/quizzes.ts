import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { authComponent } from "./auth"

export const createQuiz = mutation({
  args: {
    title: v.string(),
    courseId: v.id("courses"),
    userId: v.string(),
    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("quizzes", {
      title: args.title,
      courseId: args.courseId,
      authId: args.userId,
      questions: args.questions,
      createdAt: Date.now(),
      updatedAt: Date.now(), // Added missing updatedAt field
    })
  },
})

export const getCourseQuizzes = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .order("desc")
      .collect()
  },
})

export const deleteQuiz = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.quizId)
  },
})

export const createQuizForRevisionSet = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    title: v.string(),
    questions: v.array(
      v.object({
        questionId: v.string(),
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()),
        difficulty: v.optional(v.string()),
      }),
    ),
    difficulty: v.optional(v.string()),
    timeLimit: v.optional(v.number()),
    generatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) throw new Error("Not authenticated")
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db.insert("quizzes", {
      revisionSetId: args.revisionSetId,
      title: args.title,
      questions: args.questions,
      difficulty: args.difficulty || "medium",
      timeLimit: args.timeLimit || 30,
      generatedBy: args.generatedBy,
      authId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

export const getQuizzesByRevisionSet = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) throw new Error("Not authenticated")
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db
      .query("quizzes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()
  },
})

export const recordQuizAttempt = mutation({
  args: {
    quizId: v.id("quizzes"),
    revisionSetId: v.id("revisionSets"),
    answers: v.array(
      v.object({
        questionId: v.string(),
        selectedAnswer: v.number(),
        isCorrect: v.boolean(),
        timeSpent: v.optional(v.number()),
      }),
    ),
    score: v.number(),
    timeSpent: v.number(),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) throw new Error("Not authenticated")
    const authId = authUser._id.toString()

    return await ctx.db.insert("quizAttempts", {
      quizId: args.quizId,
      revisionSetId: args.revisionSetId,
      authId,
      answers: args.answers,
      score: args.score,
      timeSpent: args.timeSpent,
      completedAt: Date.now(),
    })
  },
})

export const getQuizAttempts = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) throw new Error("Not authenticated")
    const authId = authUser._id.toString()

    return await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .filter((q) => q.eq(q.field("authId"), authId))
      .order("desc")
      .collect()
  },
})
