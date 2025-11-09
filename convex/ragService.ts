import { components } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { api, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";

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
  handler: async (ctx, args): Promise<{ chunksProcessed: number }> => {
    // Chunk the document content
    const chunks = chunkText(args.content, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // Generate embeddings for chunks
    const embeddingModel = openai.embedding("text-embedding-3-small");
    
    // Add chunks to RAG with metadata
    const chunkEntries = await Promise.all(
      chunks.map(async (chunk, i) => {
        const embeddingResult = await embeddingModel.doEmbed({
          values: [chunk],
        });
        
        // Access embeddings array from result
        const embedding = embeddingResult.embeddings[0];
        
        return {
          content: {
            text: chunk,
            metadata: {
              documentId: args.documentId,
              chunkIndex: i,
              totalChunks: chunks.length,
            },
          },
          embedding: embedding,
        };
      })
    );

    // Insert chunks in batches using runMutation
    // Use entryId that includes namespace for filtering
    const batchSize = 10;
    for (let i = 0; i < chunkEntries.length; i += batchSize) {
      const batch = chunkEntries.slice(i, i + batchSize);
      await ctx.runMutation(rag.chunks.insert, {
        entryId: `${args.namespace}:${args.documentId}_entry`,
        startOrder: i,
        chunks: batch,
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
  handler: async (ctx, args): Promise<{
    chunks: Array<{ text: string; metadata?: any }>;
    text: string;
  }> => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Generate embedding for query
    const embeddingModel = openai.embedding("text-embedding-3-small");
    const embeddingResult = await embeddingModel.doEmbed({
      values: [args.query],
    });
    
    // Access embeddings array from result
    const queryEmbedding = embeddingResult.embeddings[0];

    // Search RAG using runAction - rag.search is an object with a search property
    // Use filters to filter by namespace (encoded in entryId)
    const searchResults = await ctx.runAction(rag.search.search, {
      namespace: args.namespace,
      embedding: queryEmbedding,
      limit: args.limit || 10,
      modelId: "text-embedding-3-small",
      filters: [
        { name: "entryId", value: args.namespace },
      ],
    });

    // Filter by revisionSetId if provided
    if (args.revisionSetId) {
      const filteredChunks: Array<{ text: string; metadata?: any }> = [];
      
      // Use entries instead of chunks
      for (const entry of searchResults.entries) {
        const docId = entry.metadata?.documentId;
        if (!docId) continue;
        
        const revisionSetId = await ctx.runQuery(
          api.studyMaterials.getMaterialRevisionSet,
          {
            materialId: docId as any,
          }
        );
        
        if (revisionSetId === args.revisionSetId) {
          filteredChunks.push({
            text: entry.metadata?.text || "",
            metadata: entry.metadata,
          });
        }
      }
      
      return {
        chunks: filteredChunks,
        text: filteredChunks.map((c) => c.text).join("\n\n"),
      };
    }

    // Use entries instead of chunks
    return {
      chunks: searchResults.entries.map((entry: any) => ({
        text: entry.metadata?.text || "",
        metadata: entry.metadata,
      })),
      text: searchResults.entries.map((entry: any) => entry.metadata?.text || "").join("\n\n"),
    };
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
  handler: async (ctx, args): Promise<{
    context: string;
    documentCount: number;
    totalChunks: number;
  }> => {
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
    const embeddingModel = openai.embedding("text-embedding-3-small");
    
    for (const material of materials) {
      if (material.extractedContent) {
        const queryText = material.extractedContent.substring(0, 100);
        const embeddingResult = await embeddingModel.doEmbed({
          values: [queryText],
        });
        
        // Access embeddings array from result
        const queryEmbedding = embeddingResult.embeddings[0];

        const searchResults = await ctx.runAction(rag.search.search, {
          namespace: args.namespace,
          embedding: queryEmbedding,
          limit: 50,
          modelId: "text-embedding-3-small",
          filters: [
            { name: "entryId", value: args.namespace },
          ],
        });

        // Filter entries that belong to this material - use entries instead of chunks
        const materialChunks = searchResults.entries
          .filter(
            (entry: any) =>
              entry.metadata?.documentId === material._id.toString()
          )
          .map((entry: any) => entry.metadata?.text || "");

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
