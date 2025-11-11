// convex/ragMutations.ts - Mutations for RAG data
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Update RAG processing status
 */
export const updateStatus = internalMutation({
  args: {
    documentId: v.id("studyMaterials"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    chunksProcessed: v.optional(v.number()),
    embeddingsGenerated: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if status record exists
    const existing = await ctx.db
      .query("ragProcessingStatus")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .first();

    if (existing) {
      // Update existing record - removed updatedAt and createdAt fields
      await ctx.db.patch(existing._id, {
        status: args.status,
        ...(args.startedAt !== undefined && { startedAt: args.startedAt }),
        ...(args.completedAt !== undefined && { completedAt: args.completedAt }),
        ...(args.chunksProcessed !== undefined && { chunksProcessed: args.chunksProcessed }),
        ...(args.embeddingsGenerated !== undefined && { embeddingsGenerated: args.embeddingsGenerated }),
        ...(args.errorMessage !== undefined && { errorMessage: args.errorMessage }),
      });
      return existing._id;
    } else {
      // Create new record - removed createdAt and updatedAt fields
      return await ctx.db.insert("ragProcessingStatus", {
        documentId: args.documentId,
        status: args.status,
        startedAt: args.startedAt || Date.now(),
        completedAt: args.completedAt,
        chunksProcessed: args.chunksProcessed || 0,
        embeddingsGenerated: args.embeddingsGenerated || 0,
        errorMessage: args.errorMessage,
      });
    }
  },
});

/**
 * Save embedding to database
 */
export const saveEmbedding = internalMutation({
  args: {
    documentId: v.id("studyMaterials"),
    revisionSetId: v.optional(v.id("revisionSets")),
    namespace: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    text: v.string(),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    createdAt: v.number(),
    userId: v.string(), // Added userId field as required by schema
  },
  handler: async (ctx, args): Promise<string> => {
    const id = await ctx.db.insert("documentEmbeddings", {
      documentId: args.documentId,
      revisionSetId: args.revisionSetId,
      namespace: args.namespace,
      chunkIndex: args.chunkIndex,
      totalChunks: args.totalChunks,
      text: args.text,
      embedding: args.embedding,
      embeddingModel: args.embeddingModel,
      createdAt: args.createdAt,
      userId: args.userId, // Include userId in insert
    });
    return id;
  },
});
