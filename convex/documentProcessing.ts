// convex/documentProcessing.ts
// DEPRECATED: Use aiPipeline.processDocument instead
// This file is kept for backward compatibility but redirects to new pipeline

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Process uploaded document - redirects to new AI pipeline
 */
export const processDocument = internalAction({
  args: {
    materialId: v.id("studyMaterials"),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Redirect to new AI pipeline
    return await ctx.runAction(internal.aiPipeline.processDocument, {
      materialId: args.materialId,
      fileId: args.fileId,
    });
  },
});

/**
 * Legacy function - kept for compatibility
 */
export const processDocumentLegacy = internalAction({
  args: {
    materialId: v.id("studyMaterials"),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      // Update status to processing
      await ctx.runMutation(internal.documentProcessing.updateProcessingStatus, {
        materialId: args.materialId,
        status: "processing",
      });

      // Get file from storage
      const fileUrl = await ctx.storage.getUrl(args.fileId);
      if (!fileUrl) {
        throw new Error("File not found");
      }

      // Download file
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "";

      let extractedText = "";

      // Extract text based on file type
      if (contentType.includes("text/plain") || fileUrl.includes(".txt")) {
        // Plain text file
        extractedText = new TextDecoder().decode(arrayBuffer);
      } else if (contentType.includes("application/pdf") || fileUrl.includes(".pdf")) {
        // PDF file - extract text
        extractedText = await extractTextFromPDF(arrayBuffer);
      } else if (
        contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
        fileUrl.includes(".docx")
      ) {
        // DOCX file - extract text
        extractedText = await extractTextFromDOCX(arrayBuffer);
      } else {
        // Unsupported format - try as text
        extractedText = new TextDecoder().decode(arrayBuffer);
      }

      // Clean and validate extracted text
      extractedText = cleanExtractedText(extractedText);

      if (!extractedText || extractedText.length < 10) {
        throw new Error("No readable text content found in document");
      }

      // Save extracted content to database
      await ctx.runMutation(internal.documentProcessing.saveExtractedContent, {
        materialId: args.materialId,
        extractedContent: extractedText,
        status: "completed",
      });

      return { success: true, textLength: extractedText.length };
    } catch (error: any) {
      console.error("Document processing error:", error);

      // Update status to failed
      await ctx.runMutation(internal.documentProcessing.updateProcessingStatus, {
        materialId: args.materialId,
        status: "failed",
      });

      throw new Error(error.message || "Failed to process document");
    }
  },
});

/**
 * Extract text from PDF files
 * Uses a simple approach - you can enhance with pdf-parse if needed
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  // Convert buffer to string and extract readable text
  const text = new TextDecoder().decode(arrayBuffer);
  
  // PDF text is usually encoded - extract printable characters
  // This is a basic extraction - for better results, use pdf-parse library
  let extracted = "";
  const lines = text.split("\n");
  
  for (const line of lines) {
    // Extract sequences of readable characters
    const readable = line.replace(/[^\x20-\x7E]/g, " ").trim();
    if (readable.length > 3) {
      extracted += readable + "\n";
    }
  }

  return extracted;
}

/**
 * Extract text from DOCX files
 * Extracts XML content from the document
 */
async function extractTextFromDOCX(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // DOCX files are ZIP archives containing XML
    // We'll extract the document.xml content
    const text = new TextDecoder().decode(arrayBuffer);
    
    // Look for text between XML tags
    const xmlContent = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    
    if (xmlContent) {
      return xmlContent
        .map((tag) => {
          const match = tag.match(/>([^<]+)</);
          return match ? match[1] : "";
        })
        .join(" ");
    }

    // Fallback to basic text extraction
    return text.replace(/[^\x20-\x7E\n]/g, " ").trim();
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Failed to extract text from DOCX file");
  }
}

/**
 * Clean extracted text - remove excessive whitespace, special chars, etc.
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\t/g, " ") // Replace tabs with spaces
    .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
    .replace(/ {2,}/g, " ") // Remove excessive spaces
    .replace(/[^\x20-\x7E\n]/g, "") // Remove non-printable characters
    .trim();
}

/**
 * Update processing status
 */
export const updateProcessingStatus = internalMutation({
  args: {
    materialId: v.id("studyMaterials"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.materialId, {
      processedStatus: args.status as any,
    });
  },
});

/**
 * Save extracted content to database
 */
export const saveExtractedContent = internalMutation({
  args: {
    materialId: v.id("studyMaterials"),
    extractedContent: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.materialId, {
      extractedContent: args.extractedContent,
      processedStatus: args.status as any,
    });
  },
});
