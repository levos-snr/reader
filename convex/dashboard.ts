import { query } from "./_generated/server";
import { v } from "convex/values";

// ALL DASHBOARD QUERIES NOW USE DIRECT authId PARAMETER
// This bypasses the slow authComponent.getAuthUser() call

// Get dashboard statistics - OPTIMIZED with authId parameter
export const getDashboardStats = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    const authId = args.authId;

    // Use take() instead of collect() to limit results and improve performance
    const [revisionSets, materials, flashcards, quizzes, quizAttempts] = await Promise.all([
      ctx.db
        .query("revisionSets")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .take(100), // Limit to 100 items
      ctx.db
        .query("studyMaterials")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .take(200),
      ctx.db
        .query("flashcards")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .take(500),
      ctx.db
        .query("quizzes")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .take(200),
      ctx.db
        .query("quizAttempts")
        .withIndex("by_authId", (q) => q.eq("authId", authId))
        .take(500),
    ]);

    // Calculate statistics
    const completedTests = quizAttempts.filter((a) => typeof a.score === 'number').length;
    const totalScores = quizAttempts
      .filter((a) => typeof a.score === 'number')
      .reduce((sum, a) => sum + (a.score as number), 0);
    const averageScore =
      completedTests > 0 ? Math.round(totalScores / completedTests) : 0;

    const flashcardsReviewed = flashcards.filter(
      (f) => (f.reviewCount ?? 0) > 0
    ).length;

    const totalTimeSpent = quizAttempts.reduce((sum, a) => sum + (a.timeSpent ?? 0), 0);
    const hoursSpent = Math.round((totalTimeSpent / 3600) * 10) / 10;

    return {
      totalRevisionSets: revisionSets.length,
      totalMaterials: materials.length,
      totalFlashcards: flashcards.length,
      totalQuizzes: quizzes.length,
      completedTests,
      averageScore,
      flashcardsReviewed,
      hoursSpent: hoursSpent || 0,
      materialsReviewed: materials.length,
    };
  },
});

// Get recent activity - SIMPLIFIED with authId parameter
export const getRecentActivity = query({
  args: { 
    authId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    // Get recent quiz attempts
    const quizAttempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .take(limit);

    const activities = [];

    for (const attempt of quizAttempts) {
      if (typeof attempt.completedAt === "number") {
        const quiz = await ctx.db.get(attempt.quizId);
        if (quiz) {
          activities.push({
            type: "quiz",
            title: quiz.title,
            score: attempt.score,
            date: attempt.completedAt,
          });
        }
      }
    }

    return activities;
  },
});

// Get top subjects - SIMPLIFIED with authId parameter
export const getTopSubjects = query({
  args: { 
    authId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    // Only get revision sets, don't query related data
    const revisionSets = await ctx.db
      .query("revisionSets")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .take(limit);

    // Return revision sets without additional queries
    return revisionSets.map((set, idx) => ({
      name: set.title,
      progress: set.progress ?? 0,
      value: idx + 1,
      revisionSetId: set._id,
    }));
  },
});

// Get weekly progress - SIMPLIFIED with authId parameter
export const getWeeklyProgress = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Get only recent quiz attempts
    const allAttempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .take(50); // Limit to recent 50

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const weeklyData = [];

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * oneDay);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayStartTime = dayStart.getTime();
      const dayEndTime = dayEnd.getTime();

      const testAttempts = allAttempts.filter(
        (attempt) =>
          typeof attempt.completedAt === 'number' && attempt.completedAt >= dayStartTime && attempt.completedAt <= dayEndTime
      );

      const dayProgress = Math.min(
        100,
        testAttempts.length * 20
      );

      const dayIndex = dayStart.getDay();
      const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];

      weeklyData.push({
        day: dayName,
        value: dayProgress,
      });
    }

    return weeklyData;
  },
});

// Get best performance - SIMPLIFIED with authId parameter
export const getBestPerformance = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    // Get only recent completed quiz attempts
    const allAttempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .take(50);

    const completedAttempts = allAttempts.filter((a) => typeof a.completedAt === 'number');

    if (completedAttempts.length === 0) {
      return {
        score: null,
        testTitle: null,
      };
    }

    const highestScoreAttempt = completedAttempts.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    const highestScoreTest = await ctx.db.get(highestScoreAttempt.quizId);

    if (!highestScoreTest) {
      return {
        score: null,
        testTitle: null,
      };
    }

    return {
      score: highestScoreAttempt.score,
      testTitle: highestScoreTest.title,
    };
  },
});
