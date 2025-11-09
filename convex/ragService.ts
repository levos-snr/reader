import { components } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { api } from "./_generated/api";
import { createTool } from "@convex-dev/agent";
import { z } from "zod/v3";

// Initialize RAG component
const rag = components.rag;

/**
 * Process and chunk documents for RAG
 * This breaks down documents into searchable chunks with embeddings
 */
export const processDocumentForRAG = internalAction({
  args: {
    documentId: v.id("studyMaterials"),
    content: v.string(),
    namespace: v.string(), // User-specific namespace
  },
  handler: async (ctx, args) => {
    // Chunk the document content
    const chunks = chunkText(args.content, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // Add chunks to RAG with metadata
    for (let i = 0; i < chunks.length; i++) {
      await rag.add(ctx, {
        namespace: args.namespace,
        key: `${args.documentId}_chunk_${i}`,
        text: chunks[i],
        metadata: {
          documentId: args.documentId,
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      });
    }

    return { chunksProcessed: chunks.length };
  },
});

/**
 * Search documents using RAG
 */
export const searchDocuments = action({
  args: {
    query: v.string(),
    namespace: v.string(),
    limit: v.optional(v.number()),
    revisionSetId: v.optional(v.id("revisionSets")),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const searchResults = await rag.search(ctx, {
      namespace: args.namespace,
      query: args.query,
      limit: args.limit || 10,
    });

    // Filter by revisionSetId if provided
    if (args.revisionSetId) {
      const filtered = searchResults.chunks.filter((chunk) => {
        const docId = chunk.metadata?.documentId;
        if (!docId) return false;
        // Get document and check revisionSetId
        return ctx.runQuery(api.studyMaterials.getMaterialRevisionSet, {
          materialId: docId as any,
        }).then((revisionSetId) => revisionSetId === args.revisionSetId);
      });
      return { ...searchResults, chunks: filtered };
    }

    return searchResults;
  },
});

/**
 * Get all document content for a revision set
 */
export const getDocumentContext = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Get all materials for this revision set
    const materials = await ctx.runQuery(
      api.studyMaterials.getMaterialsByRevisionSet,
      { revisionSetId: args.revisionSetId }
    );

    // Search for all chunks from these documents
    const allChunks: string[] = [];
    for (const material of materials) {
      if (material.extractedContent) {
        const searchResults = await rag.search(ctx, {
          namespace: args.namespace,
          query: material.extractedContent.substring(0, 100), // Use first 100 chars as query
          limit: 50,
        });

        // Filter chunks that belong to this material
        const materialChunks = searchResults.chunks
          .filter(
            (chunk) =>
              chunk.metadata?.documentId === material._id.toString()
          )
          .map((chunk) => chunk.text);

        allChunks.push(...materialChunks);
      }
    }

    return {
      context: allChunks.join("\n\n"),
      documentCount: materials.length,
      totalChunks: allChunks.length,
    };
  },
});

/**
 * Text chunking utility
 */
function chunkText(
  text: string,
  options: { chunkSize: number; chunkOverlap: number }
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + options.chunkSize, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk.trim());

    if (end >= text.length) break;
    start = end - options.chunkOverlap;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
