// convex/ragQueries.ts - Queries for reading RAG data
import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

/**
 * Get a single embedding by ID
 */
export const getEmbedding = internalQuery({
  args: {
    embeddingId: v.id("documentEmbeddings"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.embeddingId);
  },
});

/**
 * Get all embeddings for a document
 */
export const getDocumentEmbeddings = query({
  args: {
    documentId: v.id("studyMaterials"),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const embeddings = await ctx.db
      .query("documentEmbeddings")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    // Return summary info, not full embeddings
    return embeddings.map(e => ({
      _id: e._id,
      chunkIndex: e.chunkIndex,
      totalChunks: e.totalChunks,
      textPreview: e.text.substring(0, 100),
      createdAt: e.createdAt,
    }));
  },
});

/**
 * Get RAG statistics for a revision set
 */
export const getRevisionSetRAGStats = query({
  args: {
    revisionSetId: v.id("revisionSets"),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const embeddings = await ctx.db
      .query("documentEmbeddings")
      .withIndex("by_revisionSet", (q) =>
        q.eq("revisionSetId", args.revisionSetId)
      )
      .collect();

    // Get unique documents
    const uniqueDocuments = new Set(
      embeddings.map(e => e.documentId.toString())
    );

    // Get processing statuses
    const materials = await ctx.db
      .query("studyMaterials")
      .withIndex("by_revisionSet", (q) =>
        q.eq("revisionSetId", args.revisionSetId)
      )
      .collect();

    const statuses = await Promise.all(
      materials.map(m =>
        ctx.db
          .query("ragProcessingStatus")
          .withIndex("by_document", (q) => q.eq("documentId", m._id))
          .first()
      )
    );

    const processing = statuses.filter(s => s?.status === "processing").length;
    const completed = statuses.filter(s => s?.status === "completed").length;
    const failed = statuses.filter(s => s?.status === "failed").length;
    const pending = materials.length - (processing + completed + failed);

    return {
      totalDocuments: materials.length,
      documentsWithEmbeddings: uniqueDocuments.size,
      totalChunks: embeddings.length,
      processing,
      completed,
      failed,
      pending,
      readyForRAG: completed > 0,
    };
  },
});

/**
 * Check if a revision set is ready for RAG queries
 */
export const isRevisionSetReady = query({
  args: {
    revisionSetId: v.id("revisionSets"),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const embeddings = await ctx.db
      .query("documentEmbeddings")
      .withIndex("by_revisionSet", (q) =>
        q.eq("revisionSetId", args.revisionSetId)
      )
      .first();

    return {
      ready: embeddings !== null,
      hasEmbeddings: embeddings !== null,
    };
  },
});

/**
 * Get processing status for all materials in a revision set
 */
export const getRevisionSetProcessingStatus = query({
  args: {
    revisionSetId: v.id("revisionSets"),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const materials = await ctx.db
      .query("studyMaterials")
      .withIndex("by_revisionSet", (q) =>
        q.eq("revisionSetId", args.revisionSetId)
      )
      .collect();

    const statusPromises = materials.map(async (material) => {
      const status = await ctx.db
        .query("ragProcessingStatus")
        .withIndex("by_document", (q) => q.eq("documentId", material._id))
        .first();

      return {
        materialId: material._id,
        materialTitle: material.title,
        status: status?.status || "pending",
        chunksProcessed: status?.chunksProcessed || 0,
        embeddingsGenerated: status?.embeddingsGenerated || 0,
        errorMessage: status?.errorMessage,
        completedAt: status?.completedAt,
      };
    });

    return await Promise.all(statusPromises);
  },
});
