import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { authComponent } from "./auth"
import { api } from "./_generated/api";

async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx)
  if (!authUser) {
    throw new Error("Not authenticated")
  }
  return authUser
}

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    await getAuthUser(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

// Create study material
export const createStudyMaterial = mutation({
  args: {
    revisionSetId: v.id("revisionSets"),
    title: v.string(),
    type: v.string(),
    fileId: v.optional(v.id("_storage")),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    const materialId = await ctx.db.insert("studyMaterials", {
      revisionSetId: args.revisionSetId,
      title: args.title,
      type: args.type,
      fileId: args.fileId,
      fileSize: args.fileSize,
      authId,
      processedStatus: "pending",
      uploadedAt: Date.now(),
    })

    // Best-effort text extraction for PDFs/images/docs so AI features have content
    // Uses OpenAI (or OpenRouter) if keys are configured; otherwise leaves as pending
    try {
      if (args.fileId) {
        const fileUrl = await ctx.storage.getUrl(args.fileId)
        if (fileUrl) {
          // Choose provider by env; prefer OpenAI
          const openaiKey = process.env.OPENAI_API_KEY
          const openrouterKey = process.env.OPENROUTER_API_KEY

          let extractedText: string | null = null

          if (openaiKey) {
            // Send URL to GPT-4o to extract plain text summary/content
            const resp = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openaiKey}`,
              },
              body: JSON.stringify({
                model: process.env.OPENAI_MODEL || "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content:
                      "You extract readable study text from files. Return ONLY clean plain text without markdown, no headings repeated, no images.",
                  },
                  {
                    role: "user",
                    content: `Extract the main textual content from this file for study purposes. If it's an image or scanned PDF, perform OCR. File: ${fileUrl}`,
                  },
                ],
                max_tokens: 3500,
                temperature: 0,
              }),
            })
            if (resp.ok) {
              const data = await resp.json()
              extractedText = data.choices?.[0]?.message?.content?.toString() || null
            }
          } else if (openrouterKey) {
            const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openrouterKey}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "GizmoReader",
              },
              body: JSON.stringify({
                model: process.env.OPENROUTER_MODEL || "openrouter/auto",
                messages: [
                  {
                    role: "system",
                    content:
                      "You extract readable study text from files. Return ONLY clean plain text without markdown, no headings repeated, no images.",
                  },
                  {
                    role: "user",
                    content: `Extract the main textual content from this file for study purposes. If it's an image or scanned PDF, perform OCR. File: ${fileUrl}`,
                  },
                ],
                max_tokens: 3500,
                temperature: 0,
              }),
            })
            if (resp.ok) {
              const data = await resp.json()
              extractedText = data.choices?.[0]?.message?.content?.toString() || null
            }
          }

          if (extractedText && extractedText.trim().length > 0) {
            await ctx.db.patch(materialId, {
              extractedContent: extractedText.slice(0, 100000),
              processedStatus: "completed",
            })
          } else {
            await ctx.db.patch(materialId, { processedStatus: "failed" })
          }
        }
      }
    } catch (e) {
      // Non-fatal: leave as pending/failed; UI will still allow manual usage
      try {
        await ctx.db.patch(materialId, { processedStatus: "failed" })
      } catch {}
    }

    return materialId
  },
})

// Get materials for revision set
export const getMaterialsByRevisionSet = query({
  args: { revisionSetId: v.id("revisionSets") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const revisionSet = await ctx.db.get(args.revisionSetId)
    if (!revisionSet || revisionSet.authId !== authId) {
      throw new Error("Revision set not found or unauthorized")
    }

    return await ctx.db
      .query("studyMaterials")
      .withIndex("by_revisionSet", (q) => q.eq("revisionSetId", args.revisionSetId))
      .collect()
  },
})

// Delete study material
export const deleteStudyMaterial = mutation({
  args: { materialId: v.id("studyMaterials") },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx)
    const authId = authUser._id.toString()

    const material = await ctx.db.get(args.materialId)
    if (!material || material.authId !== authId) {
      throw new Error("Material not found or unauthorized")
    }

    if (material.fileId) {
      await ctx.storage.delete(material.fileId)
    }

    await ctx.db.delete(args.materialId)
    return { success: true }
  },
})

// Get file URL for download
export const getFileUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      const url = await ctx.storage.getUrl(args.fileId)
      return url
    } catch (error) {
      throw new Error("Failed to get file URL")
    }
  },
})

// Get material by ID
export const getMaterialById = query({
  args: { materialId: v.id("studyMaterials") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.materialId);
  },
});

// Get revision set ID for a material
export const getMaterialRevisionSet = query({
  args: { materialId: v.id("studyMaterials") },
  handler: async (ctx, args) => {
    const material = await ctx.db.get(args.materialId);
    return material?.revisionSetId;
  },
});

