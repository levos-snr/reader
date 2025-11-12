// convex/quizzes.ts
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

// Create quiz for revision set
export const createQuizForRevisionSet = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    title: v.string(),
    questions: v.array(
      v.object({
        questionId: v.optional(v.string()),
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()),
        difficulty: v.optional(v.string()),
      })
    ),
    difficulty: v.optional(v.string()),
    timeLimit: v.optional(v.number()),
    generatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
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
      timeLimit: args.timeLimit,
      generatedBy: args.generatedBy,
      authId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

// Get quizzes for revision set
export const getQuizzesByRevisionSet = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db
      .query("quizzes")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .order("desc")
      .collect()
  },
})

// Delete quiz
export const deleteQuiz = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const quiz = await ctx.db.get(args.quizId)
    if (!quiz || quiz.authId !== authId) {
      throw new Error("Quiz not found or unauthorized")
    }

    await ctx.db.delete(args.quizId)
    return { success: true }
  },
})

// Record quiz attempt
export const recordQuizAttempt = mutation({
  args: {
    quizId: v.id("quizzes"),
    answers: v.array(
      v.object({
        questionId: v.string(),
        selectedAnswer: v.number(),
        isCorrect: v.boolean(),
        timeSpent: v.optional(v.number()),
      })
    ),
    timeSpent: v.number(),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const quiz = await ctx.db.get(args.quizId)
    if (!quiz) {
      throw new Error("Quiz not found")
    }

    const correctCount = args.answers.filter((a) => a.isCorrect).length
    const score = (correctCount / args.answers.length) * 100

    return await ctx.db.insert("quizAttempts", {
      quizId: args.quizId,
      revisionSetId: quiz.revisionSetId,
      authId,
      answers: args.answers,
      score,
      timeSpent: args.timeSpent,
      completedAt: Date.now(),
    })
  },
})

