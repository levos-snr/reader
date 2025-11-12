// convex/aiPipeline.ts
// Fresh AI Pipeline: Document Processing → Chunking → Embedding → RAG → Generation

import { internalAction, internalMutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * STEP 1: Document Processing & Text Extraction
 * Enhanced document parser with better PDF/DOCX support
 */
export const processDocument = internalAction({
  args: {
    materialId: v.id("studyMaterials"),
    fileId: v.id("_storage"),
  },
  handler: async (ctx: any, args: { materialId: any; fileId: any }) => {
    try {
      // Update status
      await ctx.runMutation(internal.aiPipeline.updateProcessingStatus, {
        materialId: args.materialId,
        status: "processing",
      });

      // Get file
      const fileUrl = await ctx.storage.getUrl(args.fileId);
      if (!fileUrl) throw new Error("File not found");

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "";

      let extractedText = "";

      // Extract text based on file type
      if (contentType.includes("text/plain") || fileUrl.includes(".txt")) {
        extractedText = new TextDecoder().decode(arrayBuffer);
      } else if (contentType.includes("application/pdf") || fileUrl.includes(".pdf")) {
        extractedText = await extractTextFromPDF(arrayBuffer);
      } else if (
        contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
        fileUrl.includes(".docx")
      ) {
        extractedText = await extractTextFromDOCX(arrayBuffer);
      } else {
        extractedText = new TextDecoder().decode(arrayBuffer);
      }

      // Clean text
      extractedText = cleanExtractedText(extractedText);

      if (!extractedText || extractedText.length < 10) {
        throw new Error("No readable text content found");
      }

      // Save extracted content
      await ctx.runMutation(internal.aiPipeline.saveExtractedContent, {
        materialId: args.materialId,
        extractedContent: extractedText,
      });

      // STEP 2: Trigger chunking and embedding
      await ctx.scheduler.runAfter(0, internal.aiPipeline.chunkAndEmbedDocument, {
        materialId: args.materialId,
      });

      return { success: true, textLength: extractedText.length };
    } catch (error: any) {
      await ctx.runMutation(internal.aiPipeline.updateProcessingStatus, {
        materialId: args.materialId,
        status: "failed",
      });
      throw new Error(error.message || "Failed to process document");
    }
  },
});

/**
 * STEP 2: Chunk Document & Generate Embeddings
 * Splits text into chunks and creates vector embeddings for RAG
 */
export const chunkAndEmbedDocument = internalAction({
  args: {
    materialId: v.id("studyMaterials"),
  },
  handler: async (ctx: any, args: { materialId: any }) => {
    try {
      const material = await ctx.runQuery(internal.aiPipeline.getMaterial, {
        materialId: args.materialId,
      });

      if (!material || !material.extractedContent) {
        throw new Error("Material or content not found");
      }

      // Update RAG status
      await ctx.runMutation(internal.aiPipeline.updateRAGStatus, {
        documentId: args.materialId,
        status: "processing",
      });

      // Chunk the text (512-1024 tokens per chunk, ~2000-4000 chars)
      const chunks = chunkText(material.extractedContent, {
        chunkSize: 2000,
        chunkOverlap: 200,
      });

      // Process embeddings in batches to avoid timeouts (5 at a time)
      const batchSize = 5;
      let processedCount = 0;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        // Generate embeddings for batch
        const batchEmbeddings = await Promise.all(
          batch.map((chunk, batchIndex) =>
            generateEmbedding(
              chunk.text,
              args.materialId,
              material.revisionSetId,
              i + batchIndex,
              chunks.length,
              material.authId
            )
          )
        );

        // Store embeddings in Convex
        for (const embedding of batchEmbeddings) {
          await ctx.runMutation(internal.aiPipeline.storeEmbedding, embedding);
        }

        processedCount += batch.length;
        
        // Update progress periodically
        if (processedCount % 10 === 0 || processedCount === chunks.length) {
          await ctx.runMutation(internal.aiPipeline.updateRAGStatus, {
            documentId: args.materialId,
            status: "processing",
            chunksProcessed: processedCount,
            embeddingsGenerated: processedCount,
          });
        }
      }

      // Mark as completed
      await ctx.runMutation(internal.aiPipeline.updateRAGStatus, {
        documentId: args.materialId,
        status: "completed",
        chunksProcessed: chunks.length,
        embeddingsGenerated: chunks.length,
      });

      return { success: true, chunksCount: chunks.length };
    } catch (error: any) {
      await ctx.runMutation(internal.aiPipeline.updateRAGStatus, {
        documentId: args.materialId,
        status: "failed",
      });
      throw error;
    }
  },
});

/**
 * STEP 3: RAG Retrieval - Vector Search
 * Retrieves relevant chunks based on query similarity
 */
export const retrieveRelevantChunks = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, args: { revisionSetId: any; query: string; limit?: number }) => {
    try {
      // Generate embedding for query
      const queryEmbedding = await generateQueryEmbedding(args.query);

      // Vector search in Convex
      const results = await ctx.vectorSearch("documentEmbeddings", "by_embedding", {
        vector: queryEmbedding,
        limit: args.limit || 5,
        filter: (q: any) => q.eq("revisionSetId", args.revisionSetId),
      });

      return results.map((result: any) => ({
        text: result.text,
        chunkIndex: result.chunkIndex,
        score: result._score,
      }));
    } catch (error: any) {
      throw new Error(`RAG retrieval failed: ${error.message}`);
    }
  },
});

// ========== HELPER FUNCTIONS ==========

/**
 * Extract text from PDF (enhanced)
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  // For production, use pdf-parse or similar library
  // This is a basic implementation
  const text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
  
  // Extract readable text patterns
  let extracted = "";
  const lines = text.split("\n");
  
  for (const line of lines) {
    const readable = line
      .replace(/[^\x20-\x7E\n\r]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (readable.length > 3) {
      extracted += readable + "\n";
    }
  }

  return extracted || "PDF content extracted (basic parser - consider upgrading for better results)";
}

/**
 * Extract text from DOCX
 */
async function extractTextFromDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
  
  // Extract text from XML tags
  const xmlMatches = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
  
  if (xmlMatches) {
    return xmlMatches
      .map((tag) => {
        const match = tag.match(/>([^<]+)</);
        return match ? match[1] : "";
      })
      .join(" ");
  }

  return text.replace(/[^\x20-\x7E\n]/g, " ").trim();
}

/**
 * Clean extracted text
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "")
    .trim();
}

/**
 * Chunk text into smaller pieces for embedding
 */
function chunkText(
  text: string,
  options: { chunkSize: number; chunkOverlap: number } = { chunkSize: 2000, chunkOverlap: 200 }
): Array<{ text: string; startIndex: number; endIndex: number }> {
  const chunks: Array<{ text: string; startIndex: number; endIndex: number }> = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + options.chunkSize, text.length);
    let chunkText = text.slice(startIndex, endIndex);

    // Try to break at sentence boundaries
    if (endIndex < text.length) {
      const lastPeriod = chunkText.lastIndexOf(".");
      const lastNewline = chunkText.lastIndexOf("\n");
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > options.chunkSize * 0.5) {
        chunkText = text.slice(startIndex, startIndex + breakPoint + 1);
        startIndex = startIndex + breakPoint + 1 - options.chunkOverlap;
      } else {
        startIndex = endIndex - options.chunkOverlap;
      }
    } else {
      startIndex = endIndex;
    }

    if (chunkText.trim().length > 0) {
      chunks.push({
        text: chunkText.trim(),
        startIndex: startIndex - (chunkText.length - (endIndex - startIndex)),
        endIndex: startIndex + chunkText.length,
      });
    }

    if (startIndex >= text.length) break;
  }

  return chunks;
}

/**
 * Generate embedding using OpenAI (or your preferred provider)
 */
async function generateEmbedding(
  text: string,
  documentId: string,
  revisionSetId: string | undefined,
  chunkIndex: number,
  totalChunks: number,
  userId: string
): Promise<{
  documentId: string;
  revisionSetId: string | undefined;
  namespace: string;
  chunkIndex: number;
  totalChunks: number;
  text: string;
  embedding: number[];
  embeddingModel: string;
  userId: string;
}> {
  const apiKey = (process as any).env?.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not configured");
    throw new Error("OPENAI_API_KEY not configured. Please set it in your Convex environment variables.");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small", // 1536 dimensions
        input: text.slice(0, 8000), // OpenAI limit
      }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Embedding API error: ${error}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    return {
      documentId: documentId as any,
      revisionSetId: revisionSetId as any,
      namespace: "studyMaterials",
      chunkIndex,
      totalChunks,
      text,
      embedding,
      embeddingModel: "text-embedding-3-small",
      userId,
    };
  } catch (error: any) {
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embedding for query
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const apiKey = (process as any).env?.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not configured");
    throw new Error("OPENAI_API_KEY not configured. Please set it in your Convex environment variables.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query,
    }),
    // Add timeout to prevent hanging
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error("Failed to generate query embedding");
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ========== INTERNAL MUTATIONS ==========

export const updateProcessingStatus = internalMutation({
  args: {
    materialId: v.id("studyMaterials"),
    status: v.string(),
  },
  handler: async (ctx: any, args: { materialId: any; status: string }) => {
    await ctx.db.patch(args.materialId, {
      processedStatus: args.status as any,
    });
  },
});

export const saveExtractedContent = internalMutation({
  args: {
    materialId: v.id("studyMaterials"),
    extractedContent: v.string(),
  },
  handler: async (ctx: any, args: { materialId: any; extractedContent: string }) => {
    await ctx.db.patch(args.materialId, {
      extractedContent: args.extractedContent,
      processedStatus: "completed",
    });
  },
});

export const getMaterial = internalQuery({
  args: {
    materialId: v.id("studyMaterials"),
  },
  handler: async (ctx: any, args: { materialId: any }) => {
    return await ctx.db.get(args.materialId);
  },
});

export const updateRAGStatus = internalMutation({
  args: {
    documentId: v.id("studyMaterials"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    chunksProcessed: v.optional(v.number()),
    embeddingsGenerated: v.optional(v.number()),
  },
  handler: async (ctx: any, args: { documentId: any; status: any; chunksProcessed?: number; embeddingsGenerated?: number }) => {
      const existing = await ctx.db
        .query("ragProcessingStatus")
        .withIndex("by_document", (q: any) => q.eq("documentId", args.documentId))
        .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        chunksProcessed: args.chunksProcessed ?? existing.chunksProcessed,
        embeddingsGenerated: args.embeddingsGenerated ?? existing.embeddingsGenerated,
        completedAt: args.status === "completed" ? Date.now() : undefined,
        startedAt: existing.startedAt || Date.now(),
      });
    } else {
      await ctx.db.insert("ragProcessingStatus", {
        documentId: args.documentId,
        status: args.status,
        chunksProcessed: args.chunksProcessed || 0,
        embeddingsGenerated: args.embeddingsGenerated || 0,
        startedAt: Date.now(),
      });
    }
  },
});

export const storeEmbedding = internalMutation({
  args: {
    documentId: v.id("studyMaterials"),
    revisionSetId: v.optional(v.id("revisionSets")),
    namespace: v.string(),
    chunkIndex: v.number(),
    totalChunks: v.number(),
    text: v.string(),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    userId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.insert("documentEmbeddings", {
      documentId: args.documentId,
      revisionSetId: args.revisionSetId,
      namespace: args.namespace,
      chunkIndex: args.chunkIndex,
      totalChunks: args.totalChunks,
      text: args.text,
      embedding: args.embedding as any,
      embeddingModel: args.embeddingModel,
      userId: args.userId,
      createdAt: Date.now(),
    });
  },
});

