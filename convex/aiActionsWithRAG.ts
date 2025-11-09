import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { api } from "./_generated/api";
import {
  createNotesAgent,
  createFlashcardsAgent,
  createQuizzesAgent,
  createPracticeExercisesAgent,
  createPastPapersAgent,
} from "./aiAgents";
import { z } from "zod/v3";

async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }
  return authUser;
}

async function getUserPreferences(ctx: any): Promise<any> {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) {
    return {};
  }
  const user = await ctx.runQuery(api.users.getCurrentUserProfile, {});
  return user?.preferences || {};
}

/**
 * Generate SmartNotes using RAG and specialized agent
 */
export const generateNotesWithRAG = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    style: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    content: string;
    threadId: string;
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);

    const provider = (args.provider ||
      preferences.aiProvider ||
      "openai") as "openai" | "anthropic" | "openrouter";

    const apiKey =
      args.apiKey ||
      preferences.aiApiKey ||
      (provider === "openai"
        ? process.env.OPENAI_API_KEY
        : provider === "openrouter"
          ? process.env.OPENROUTER_API_KEY
          : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      throw new Error("API key required. Please add your API key in settings.");
    }

    // Get document context
    const documentContext = await ctx.runAction(api.ragService.getDocumentContext, {
      revisionSetId: args.revisionSetId,
      namespace: `user_${authUser._id}`,
    });

    // Create specialized agent
    const agent = createNotesAgent(ctx, apiKey, provider);

    // Create thread and generate notes
    const { threadId, thread } = await agent.createThread(ctx, {
      userId: authUser._id.toString(),
    });

    const prompt: string = `Generate ${args.style || "detailed"} study notes from the uploaded documents.

Available document context:
${documentContext.context || "No documents found. Please upload documents first."}

Create comprehensive notes that:
1. Cover all key concepts from the documents
2. Include definitions and explanations
3. Organize information clearly
4. Add summaries where appropriate`;

    const result = await thread.generateText({ prompt });

    return {
      content: result.text,
      threadId,
      tokensUsed: result.usage?.totalTokens || 0,
    };
  },
});

/**
 * Generate Flashcards using RAG and specialized agent
 */
export const generateFlashcardsWithRAG = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    count: v.number(),
    difficulty: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    flashcards: Array<{ front: string; back: string }>;
    threadId: string;
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);

    const provider = (args.provider ||
      preferences.aiProvider ||
      "openai") as "openai" | "anthropic" | "openrouter";

    const apiKey =
      args.apiKey ||
      preferences.aiApiKey ||
      (provider === "openai"
        ? process.env.OPENAI_API_KEY
        : provider === "openrouter"
          ? process.env.OPENROUTER_API_KEY
          : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      throw new Error("API key required. Please add your API key in settings.");
    }

    // Create specialized agent
    const agent = createFlashcardsAgent(ctx, apiKey, provider);

    // Create thread
    const { threadId, thread } = await agent.createThread(ctx, {
      userId: authUser._id.toString(),
    });

    const prompt: string = `Create ${args.count} flashcards from the uploaded documents in revision set ${args.revisionSetId}.

Difficulty level: ${args.difficulty || "medium"}

Search through the documents and create flashcards covering the most important concepts.`;

    const result = await thread.generateObject({
      prompt,
      schema: z.object({
        flashcards: z.array(
          z.object({
            front: z.string(),
            back: z.string(),
          })
        ),
      }),
    });

    return {
      flashcards: result.object.flashcards,
      threadId,
      tokensUsed: result.usage?.totalTokens || 0,
    };
  },
});

/**
 * Generate Quiz using RAG and specialized agent
 */
export const generateQuizWithRAG = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    count: v.number(),
    difficulty: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    questions: Array<{
      questionId: string;
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
      difficulty?: string;
    }>;
    threadId: string;
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);

    const provider = (args.provider ||
      preferences.aiProvider ||
      "openai") as "openai" | "anthropic" | "openrouter";

    const apiKey =
      args.apiKey ||
      preferences.aiApiKey ||
      (provider === "openai"
        ? process.env.OPENAI_API_KEY
        : provider === "openrouter"
          ? process.env.OPENROUTER_API_KEY
          : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      throw new Error("API key required. Please add your API key in settings.");
    }

    // Create specialized agent
    const agent = createQuizzesAgent(ctx, apiKey, provider);

    // Create thread
    const { threadId, thread } = await agent.createThread(ctx, {
      userId: authUser._id.toString(),
    });

    const prompt: string = `Create ${args.count} multiple-choice quiz questions from the uploaded documents in revision set ${args.revisionSetId}.

Difficulty: ${args.difficulty || "medium"}

Search through the documents and create questions that test understanding of the key concepts.`;

    const result = await thread.generateObject({
      prompt,
      schema: z.object({
        questions: z.array(
          z.object({
            questionId: z.string(),
            question: z.string(),
            options: z.array(z.string()).length(4),
            correctAnswer: z.number().min(0).max(3),
            explanation: z.string(),
            difficulty: z.string().optional(),
          })
        ),
      }),
    });

    return {
      questions: result.object.questions,
      threadId,
      tokensUsed: result.usage?.totalTokens || 0,
    };
  },
});

/**
 * Generate Practice Exercises using RAG and specialized agent
 */
export const generatePracticeExercisesWithRAG = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    count: v.number(),
    difficulty: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    exercises: Array<{
      question: string;
      solution: string;
      hints: string[];
      difficulty?: string;
      topic?: string;
    }>;
    threadId: string;
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);

    const provider = (args.provider ||
      preferences.aiProvider ||
      "openai") as "openai" | "anthropic" | "openrouter";

    const apiKey =
      args.apiKey ||
      preferences.aiApiKey ||
      (provider === "openai"
        ? process.env.OPENAI_API_KEY
        : provider === "openrouter"
          ? process.env.OPENROUTER_API_KEY
          : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      throw new Error("API key required. Please add your API key in settings.");
    }

    // Create specialized agent
    const agent = createPracticeExercisesAgent(ctx, apiKey, provider);

    // Create thread
    const { threadId, thread } = await agent.createThread(ctx, {
      userId: authUser._id.toString(),
    });

    const prompt: string = `Create ${args.count} practice exercises from the uploaded documents in revision set ${args.revisionSetId}.

Difficulty: ${args.difficulty || "medium"}

Search through the documents and create exercises that help students practice the concepts.`;

    const result = await thread.generateObject({
      prompt,
      schema: z.object({
        exercises: z.array(
          z.object({
            question: z.string(),
            solution: z.string(),
            hints: z.array(z.string()),
            difficulty: z.string().optional(),
            topic: z.string().optional(),
          })
        ),
      }),
    });

    return {
      exercises: result.object.exercises,
      threadId,
      tokensUsed: result.usage?.totalTokens || 0,
    };
  },
});

/**
 * Find similar past papers using RAG
 */
export const findSimilarPastPapers = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    query: v.string(),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    analysis: string;
    threadId: string;
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);

    const provider = (args.provider ||
      preferences.aiProvider ||
      "openai") as "openai" | "anthropic" | "openrouter";

    const apiKey =
      args.apiKey ||
      preferences.aiApiKey ||
      (provider === "openai"
        ? process.env.OPENAI_API_KEY
        : provider === "openrouter"
          ? process.env.OPENROUTER_API_KEY
          : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      throw new Error("API key required. Please add your API key in settings.");
    }

    // Create specialized agent
    const agent = createPastPapersAgent(ctx, apiKey, provider);

    // Create thread
    const { threadId, thread } = await agent.createThread(ctx, {
      userId: authUser._id.toString(),
    });

    const prompt: string = `Find and analyze past papers similar to: ${args.query}

Search through the uploaded past papers and provide:
1. Similar papers found
2. Common topics and patterns
3. Difficulty analysis
4. Study recommendations`;

    const result = await thread.generateText({ prompt });

    return {
      analysis: result.text,
      threadId,
      tokensUsed: result.usage?.totalTokens || 0,
    };
  },
});
