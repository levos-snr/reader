// convex/ragService.ts - Enhanced RAG Service with proper vector search
import { action, internalAction,internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { api, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import type { Doc, Id } from "./_generated/dataModel";

async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }
  return authUser;
}

/**
 * Enhanced text chunking with overlap and better boundary detection
 */
function chunkText(
  text: string,
  options: { chunkSize: number; chunkOverlap: number }
): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = "";
  let currentSize = 0;

  for (const sentence of sentences) {
    const sentenceLength = sentence.length;
    
    if (currentSize + sentenceLength > options.chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      // Keep overlap from end of previous chunk
      const overlapText = currentChunk.slice(-options.chunkOverlap);
      currentChunk = overlapText + sentence;
      currentSize = overlapText.length + sentenceLength;
    } else {
      currentChunk += sentence;
      currentSize += sentenceLength;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Process document and create vector embeddings for RAG
 * This is the main entry point for RAG processing
 */
export const processDocumentForRAG = internalAction({
  args: {
    documentId: v.id("studyMaterials"),
    content: v.string(),
    namespace: v.string(),
    revisionSetId: v.optional(v.id("revisionSets")),
    userId: v.string(), // Added userId parameter
  },
  handler: async (ctx, args): Promise<{ 
    chunksProcessed: number;
    embeddingIds: string[];
  }> => {
    try {
      // Update processing status
      await ctx.runMutation(internal.ragMutations.updateStatus, {
        documentId: args.documentId,
        status: "processing",
        startedAt: Date.now(),
      });

      // Chunk the document with improved boundaries
      const chunks = chunkText(args.content, {
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const embeddingModel = openai.embedding("text-embedding-3-small");
      const embeddingIds: string[] = [];

      // Process chunks in batches of 10
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Generate embeddings for the batch
        const embeddingResults = await Promise.all(
          batch.map(chunk => embeddingModel.doEmbed({ values: [chunk] }))
        );

        // Store embeddings with metadata
        for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
          const globalIndex = i + batchIndex;
          const chunk = batch[batchIndex];
          const embedding = embeddingResults[batchIndex].embeddings[0];

          const embeddingId = await ctx.runMutation(
            internal.ragMutations.saveEmbedding,
            {
              documentId: args.documentId,
              revisionSetId: args.revisionSetId,
              namespace: args.namespace,
              chunkIndex: globalIndex,
              totalChunks: chunks.length,
              text: chunk,
              embedding: embedding,
              embeddingModel: "text-embedding-3-small",
              createdAt: Date.now(),
              userId: args.userId, // Pass userId to mutation
            }
          );
          
          embeddingIds.push(embeddingId);
        }
      }

      // Update processing status to completed
      await ctx.runMutation(internal.ragMutations.updateStatus, {
        documentId: args.documentId,
        status: "completed",
        completedAt: Date.now(),
        chunksProcessed: chunks.length,
        embeddingsGenerated: embeddingIds.length,
      });

      return { 
        chunksProcessed: chunks.length,
        embeddingIds,
      };
    } catch (error) {
      console.error("Error processing document for RAG:", error);
      
      // Update status to failed
      await ctx.runMutation(internal.ragMutations.updateStatus, {
        documentId: args.documentId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: Date.now(),
      });
      
      throw new Error(`Failed to process document: ${error}`);
    }
  },
});

/**
 * Update RAG processing status
 */
export const updateRAGStatus = internalAction({
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
  handler: async (ctx, args): Promise<Id<"ragProcessingStatus">> => {
    return await ctx.runMutation(internal.ragMutations.updateStatus, args);
  },
});

/**
 * Insert single embedding into database
 */
export const insertEmbedding = internalAction({
  args: {
    documentId: v.id("studyMaterials"),
    revisionSetId: v.optional(v.id("revisionSets")),
    namespace: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    text: v.string(),
    embedding: v.array(v.float64()),
    embeddingModel: v.string(),
    userId: v.string(), // Added userId parameter
  },
  handler: async (ctx, args): Promise<string> => {
    return await ctx.runMutation(internal.ragMutations.saveEmbedding, {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Store vector embeddings batch
 */
export const storeVectorBatch = internalAction({
  args: {
    vectors: v.array(v.object({
      vector: v.array(v.float64()),
      metadata: v.any(),
    })),
    namespace: v.string(),
  },
  handler: async (ctx, args): Promise<string[]> => {
    // Store in a custom vectors table
    const ids = await Promise.all(
      args.vectors.map(async ({ vector, metadata }) => {
        const id: string = await ctx.runMutation(internal.ragService.insertVector, {
          vector,
          metadata,
          namespace: args.namespace,
        });
        return id;
      })
    );
    return ids;
  },
});

/**
 * Insert single vector
 */
export const insertVector = internalMutation({
  args: {
    vector: v.array(v.float64()),
    metadata: v.any(),
    namespace: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const id: string = await ctx.runMutation(internal.ragService.saveVector, args);
    return id;
  },
});

/**
 * Save vector to database
 */
export const saveVector = internalMutation({
  args: {
    vector: v.array(v.float64()),
    metadata: v.any(),
    namespace: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Replace placeholder with actual DB insertion
    // Example: const id = await ctx.db.insert("vectors", args);
    // return id.toString();
    return "vector_id_placeholder";
  },
});


/**
 * Search documents using hybrid search (vector + keyword)
 */
export const searchDocuments = action({
  args: {
    query: v.string(),
    namespace: v.string(),
    limit: v.optional(v.number()),
    revisionSetId: v.optional(v.id("revisionSets")),
    similarityThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    chunks: Array<{ 
      text: string; 
      score: number;
      metadata?: any;
    }>;
    text: string;
  }> => {
    const authUser = await getAuthUser(ctx);
    const limit = args.limit || 10;
    const threshold = args.similarityThreshold || 0.7;

    try {
      // Generate query embedding
      const embeddingModel = openai.embedding("text-embedding-3-small");
      const embeddingResult = await embeddingModel.doEmbed({
        values: [args.query],
      });
      const queryEmbedding = embeddingResult.embeddings[0];

      // Build filter query based on provided parameters
      const filterFn = args.revisionSetId
        ? (q: any) => 
            q.eq("namespace", args.namespace)
             .eq("revisionSetId", args.revisionSetId)
        : (q: any) => q.eq("namespace", args.namespace);

      // Perform vector search using Convex vectorSearch
      const vectorResults = await ctx.vectorSearch(
        "documentEmbeddings",
        "by_embedding",
        {
          vector: queryEmbedding,
          limit: limit * 2, // Get more results for filtering
          filter: filterFn,
        }
      );

      // Load the actual documents and filter by threshold
      const chunks = await Promise.all(
        vectorResults
          .filter(result => result._score >= threshold)
          .slice(0, limit)
          .map(async (result) => {
            const embedding = await ctx.runQuery(
              internal.ragQueries.getEmbedding,
              { embeddingId: result._id }
            );
            return {
              text: embedding?.text || "",
              score: result._score,
              metadata: {
                documentId: embedding?.documentId,
                chunkIndex: embedding?.chunkIndex,
                totalChunks: embedding?.totalChunks,
              },
            };
          })
      );

      return {
        chunks: chunks.filter(c => c.text),
        text: chunks.map(c => c.text).join("\n\n---\n\n"),
      };
    } catch (error) {
      console.error("Error searching documents:", error);
      return { chunks: [], text: "" };
    }
  },
});

/**
 * Get embedding by ID (internal query)
 */
export const getEmbeddingById = internalAction({
  args: {
    embeddingId: v.id("documentEmbeddings"),
  },
  handler: async (ctx, args): Promise<Doc<"documentEmbeddings"> | null> => {
    return await ctx.runQuery(internal.ragQueries.getEmbedding, {
      embeddingId: args.embeddingId,
    });
  },
});

/**
 * Vector search implementation
 */
export const vectorSearch = internalAction({
  args: {
    vector: v.array(v.float64()),
    namespace: v.string(),
    limit: v.number(),
    revisionSetId: v.optional(v.id("revisionSets")),
  },
  handler: async (ctx, args): Promise<Array<{
    score: number;
    metadata: any;
  }>> => {
    // This would use your vector database
    // Placeholder implementation
    return [];
  },
});

/**
 * Get document context for a revision set
 */
export const getDocumentContext = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    namespace: v.string(),
    maxChunks: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    context: string;
    documentCount: number;
    totalChunks: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const maxChunks = args.maxChunks || 50;

    try {
      // Get all materials for this revision set
      const materials = await ctx.runQuery(
        api.studyMaterials.getMaterialsByRevisionSet,
        { revisionSetId: args.revisionSetId }
      );

      if (!materials || materials.length === 0) {
        return {
          context: "No documents found. Please upload documents first.",
          documentCount: 0,
          totalChunks: 0,
        };
      }

      // Collect all processed content
      const allChunks: string[] = [];
      
      for (const material of materials) {
        if (material.extractedContent) {
          // Get relevant chunks for this material
          const chunks = chunkText(material.extractedContent, {
            chunkSize: 1000,
            chunkOverlap: 200,
          });
          allChunks.push(...chunks);
        }
      }

      // Limit total chunks
      const limitedChunks = allChunks.slice(0, maxChunks);

      return {
        context: limitedChunks.join("\n\n---\n\n"),
        documentCount: materials.length,
        totalChunks: limitedChunks.length,
      };
    } catch (error) {
      console.error("Error getting document context:", error);
      return {
        context: "",
        documentCount: 0,
        totalChunks: 0,
      };
    }
  },
});

/**
 * Delete embeddings for a document
 */
export const deleteDocumentEmbeddings = internalAction({
  args: {
    documentId: v.id("studyMaterials"),
    namespace: v.string(),
  },
  handler: async (ctx, args): Promise<{ deleted: number }> => {
    try {
      // Delete all embeddings for this document
      const deleted: number = await ctx.runMutation(
        internal.ragService.removeVectorsByDocument,
        {
          documentId: args.documentId,
          namespace: args.namespace,
        }
      );
      return { deleted };
    } catch (error) {
      console.error("Error deleting embeddings:", error);
      return { deleted: 0 };
    }
  },
});

/**
 * Remove vectors by document ID
 */
export const removeVectorsByDocument = internalMutation({
  args: {
    documentId: v.id("studyMaterials"),
    namespace: v.string(),
  },
  handler: async (ctx, args): Promise<number> => {
    // Replace placeholder with actual DB deletion
    // Example: await ctx.db.deleteMany(q => q.eq("documentId", args.documentId));
    return 0;
  },
});

/**
 * Process multiple documents in batch
 */
export const batchProcessDocuments = internalAction({
  args: {
    revisionSetId: v.id("revisionSets"),
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    failed: number;
    totalChunks: number;
  }> => {
    try {
      const materials = await ctx.runQuery(
        api.studyMaterials.getMaterialsByRevisionSet,
        { revisionSetId: args.revisionSetId }
      );

      let processed = 0;
      let failed = 0;
      let totalChunks = 0;

      for (const material of materials) {
        if (material.extractedContent && material.processedStatus !== "completed") {
          try {
            const result = await ctx.runAction(
              internal.ragService.processDocumentForRAG,
              {
                documentId: material._id,
                content: material.extractedContent,
                namespace: `user_${args.userId}`,
                revisionSetId: args.revisionSetId,
                userId: args.userId, // Pass userId
              }
            );
            processed++;
            totalChunks += result.chunksProcessed;
            
            // Note: api.studyMaterials.updateMaterialStatus must exist in your code
            // If it doesn't, you'll need to create it or comment this out
            // await ctx.runMutation(api.studyMaterials.updateMaterialStatus, {
            //   materialId: material._id,
            //   status: "completed",
            // });
          } catch (error) {
            console.error(`Failed to process material ${material._id}:`, error);
            failed++;
          }
        }
      }

      return { processed, failed, totalChunks };
    } catch (error) {
      console.error("Batch processing error:", error);
      throw error;
    }
  },
});

/**
 * Reprocess all documents in a revision set (useful for migrations)
 */
export const reprocessRevisionSet = action({
  args: {
    revisionSetId: v.id("revisionSets"),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    failed: number;
    totalChunks: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const userId = authUser._id.toString();

    // Delete existing embeddings
    const materials = await ctx.runQuery(
      api.studyMaterials.getMaterialsByRevisionSet,
      { revisionSetId: args.revisionSetId }
    );

    for (const material of materials) {
      await ctx.runAction(internal.ragService.deleteDocumentEmbeddings, {
        documentId: material._id,
        namespace: `user_${userId}`,
      });
    }

    // Reprocess all documents
    const result: {
      processed: number;
      failed: number;
      totalChunks: number;
    } = await ctx.runAction(
      internal.ragService.batchProcessDocuments,
      {
        revisionSetId: args.revisionSetId,
        userId,
      }
    );

    return result;
  },
});
