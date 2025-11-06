import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createCourse = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("courses", {
      title: args.title,
      description: args.description,
      authId: args.userId,
      createdAt: Date.now(),
    });
  },
});

export const getUserCourses = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("courses")
      .withIndex("by_authId", (q) => q.eq("authId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getCourseById = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.courseId);
  },
});

export const updateCourse = mutation({
  args: {
    courseId: v.id("courses"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { courseId, ...updateData } = args;
    const course = await ctx.db.get(courseId);
    
    if (!course) {
      throw new Error("Course not found");
    }

    return await ctx.db.patch(courseId, updateData);
  },
});

export const deleteCourse = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await ctx.db.get(args.courseId);
    
    if (!course) {
      throw new Error("Course not found");
    }

    const materials = await ctx.db
      .query("materials")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    
    for (const material of materials) {
      await ctx.db.delete(material._id);
    }

    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    
    for (const quiz of quizzes) {
      await ctx.db.delete(quiz._id);
    }

    return await ctx.db.delete(args.courseId);
  },
});
