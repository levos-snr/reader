import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * Process document after upload - extract text and add to RAG
 */
export const processDocumentAfterUpload = internalAction({
  args: {
    materialId: v.id("studyMaterials"),
    revisionSetId: v.id("revisionSets"),
    authId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; reason?: string }> => {
    // Get the material
    const material = await ctx.runQuery(api.studyMaterials.getMaterialById, {
      materialId: args.materialId,
    });

    if (!material || !material.extractedContent) {
      return { success: false, reason: "No content extracted" };
    }

    // Process document for RAG - use internal API since it's an internalAction
    await ctx.runAction(internal.ragService.processDocumentForRAG, {
      documentId: args.materialId,
      content: material.extractedContent,
      namespace: `user_${args.authId}`,
      userId: args.authId, // Add this line

    });

    return { success: true };
  },
});
