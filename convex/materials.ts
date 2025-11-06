import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createMaterial = mutation({
  args: {
    title: v.string(),
    courseId: v.id("courses"),
    userId: v.string(),
    content: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("materials", {
      title: args.title,
      courseId: args.courseId,
      authId: args.userId,
      content: args.content,
      type: args.type,
      createdAt: Date.now(),
    });
  },
});

export const getCourseMaterials = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("materials")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .order("desc")
      .collect();
  },
});

export const deleteMaterial = mutation({
  args: { materialId: v.id("materials") },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.materialId);
  },
});
