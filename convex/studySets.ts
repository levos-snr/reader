import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

// Helper function to get auth user
async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }
  return authUser;
}

// Create a new study set
export const createStudySet = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    const authId = authUser._id.toString();

    return await ctx.db.insert("studySets", {
      title: args.title,
      description: args.description,
      folderId: args.folderId,
      tags: args.tags || [],
      authId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Get user's study sets
export const getUserStudySets = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthUser(ctx);
    const authId = authUser._id.toString();

    const studySets = await ctx.db
      .query("studySets")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .order("desc")
      .collect();

    return studySets;
  },
});

// Get study set by ID
export const getStudySetById = query({
  args: { studySetId: v.id("studySets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    const authId = authUser._id.toString();

    const studySet = await ctx.db.get(args.studySetId);
    if (!studySet || studySet.authId !== authId) {
      throw new Error("Study set not found or unauthorized");
    }

    return studySet;
  },
});

// Update study set
export const updateStudySet = mutation({
  args: {
    studySetId: v.id("studySets"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    folderId: v.optional(v.id("folders")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    const authId = authUser._id.toString();

    const studySet = await ctx.db.get(args.studySetId);
    if (!studySet || studySet.authId !== authId) {
      throw new Error("Study set not found or unauthorized");
    }

    await ctx.db.patch(args.studySetId, {
      ...(args.title && { title: args.title }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.folderId !== undefined && { folderId: args.folderId }),
      ...(args.tags !== undefined && { tags: args.tags }),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.studySetId);
  },
});

// Delete study set
export const deleteStudySet = mutation({
  args: { studySetId: v.id("studySets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    const authId = authUser._id.toString();

    const studySet = await ctx.db.get(args.studySetId);
    if (!studySet || studySet.authId !== authId) {
      throw new Error("Study set not found or unauthorized");
    }

    // Delete related materials using the correct index
    const materials = await ctx.db
      .query("studyMaterials")
      .withIndex("by_studySet", (q) => q.eq("studySetId", args.studySetId))
      .collect();

    for (const material of materials) {
      await ctx.db.delete(material._id);
    }

    await ctx.db.delete(args.studySetId);
    return { success: true };
  },
});

// Get study set statistics
export const getStudySetStats = query({
  args: { studySetId: v.id("studySets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    const authId = authUser._id.toString();

    const studySet = await ctx.db.get(args.studySetId);
    if (!studySet || studySet.authId !== authId) {
      throw new Error("Study set not found or unauthorized");
    }

    const materials = await ctx.db
      .query("studyMaterials")
      .withIndex("by_studySet", (q) => q.eq("studySetId", args.studySetId))
      .collect();

    const notes = await ctx.db
      .query("aiNotes")
      .withIndex("by_studySet", (q) => q.eq("studySetId", args.studySetId))
      .collect();

    const flashcards = await ctx.db
      .query("flashcards")
      .withIndex("by_studySet", (q) => q.eq("studySetId", args.studySetId))
      .collect();

    const tests = await ctx.db
      .query("practiceTests")
      .withIndex("by_studySet", (q) => q.eq("studySetId", args.studySetId))
      .collect();

    return {
      materialsCount: materials.length,
      notesCount: notes.length,
      flashcardsCount: flashcards.length,
      testsCount: tests.length,
    };
  },
});
