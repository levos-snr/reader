import { Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createTool } from "@convex-dev/agent";
import { z } from "zod/v3";
import { usageHandler } from "./rate";
import { api } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";

/**
 * Create a specialized agent for a specific task
 */
export function createSpecializedAgent(
  ctx: ActionCtx,
  config: {
    name: string;
    instructions: string;
    apiKey?: string;
    provider?: "openai" | "anthropic" | "openrouter";
    tools?: Record<string, any>;
  }
) {
  const { name, instructions, apiKey, provider = "openai", tools = {} } = config;

  let languageModel;
  let textEmbeddingModel;

  if (provider === "anthropic") {
    const client = apiKey
      ? createAnthropic({ apiKey })
      : createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
    languageModel = client("claude-3-5-sonnet-20241022");
    // Anthropic doesn't have embeddings, use OpenAI for embeddings
    textEmbeddingModel = openai.embedding("text-embedding-3-small");
  } else if (provider === "openrouter" && apiKey) {
    // For OpenRouter, we'll use OpenAI SDK with custom base URL
    const client = createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    languageModel = client.chat("openrouter/auto");
    textEmbeddingModel = client.embedding("text-embedding-3-small");
  } else {
    const client = apiKey ? createOpenAI({ apiKey }) : openai;
    languageModel = client.chat("gpt-4o-mini");
    textEmbeddingModel = client.embedding("text-embedding-3-small");
  }

  return new Agent(components.agent, {
    name,
    languageModel,
    textEmbeddingModel,
    instructions,
    tools,
    usageHandler,
    maxSteps: 5,
  });
}

/**
 * SmartNotes Agent - Generates comprehensive study notes from documents
 */
export function createNotesAgent(
  ctx: ActionCtx,
  apiKey?: string,
  provider?: "openai" | "anthropic" | "openrouter"
) {
  const searchContextTool = createTool({
    description:
      "Search through uploaded documents to find relevant content for generating notes",
    args: z.object({
      query: z.string().describe("What to search for in the documents"),
      revisionSetId: z.string().describe("The revision set ID"),
    }),
    handler: async (ctx, args): Promise<string> => {
      const authUser = await ctx.runQuery(api.auth.getCurrentUser);
      if (!authUser) throw new Error("Not authenticated");

      const searchResults = await ctx.runAction(api.ragService.searchDocuments, {
        query: args.query,
        namespace: `user_${authUser._id}`,
        revisionSetId: args.revisionSetId as any,
        limit: 5,
      });

      return searchResults.chunks
        .map((chunk: { text: string }) => chunk.text)
        .join("\n\n---\n\n");
    },
  });

  return createSpecializedAgent(ctx, {
    name: "SmartNotes Agent",
    instructions: `You are an expert educational assistant specialized in creating comprehensive study notes.

Your task:
1. Search through the user's uploaded documents to find relevant content
2. Create well-structured, detailed study notes that include:
   - Key concepts and definitions
   - Important points and explanations
   - Examples and applications
   - Summary sections
3. Format notes in clear markdown with proper headings
4. Ensure all information comes from the user's documents
5. If information is missing, clearly indicate what needs to be added

Use the searchContext tool to find relevant content from documents before generating notes.`,
    apiKey,
    provider,
    tools: { searchContext: searchContextTool },
  });
}

/**
 * Flashcards Agent - Generates flashcards from document content
 */
export function createFlashcardsAgent(
  ctx: ActionCtx,
  apiKey?: string,
  provider?: "openai" | "anthropic" | "openrouter"
) {
  const searchContextTool = createTool({
    description:
      "Search through uploaded documents to find content for creating flashcards",
    args: z.object({
      query: z.string().describe("Topic or concept to search for"),
      revisionSetId: z.string().describe("The revision set ID"),
    }),
    handler: async (ctx, args): Promise<string> => {
      const authUser = await ctx.runQuery(api.auth.getCurrentUser);
      if (!authUser) throw new Error("Not authenticated");

      const searchResults = await ctx.runAction(api.ragService.searchDocuments, {
        query: args.query,
        namespace: `user_${authUser._id}`,
        revisionSetId: args.revisionSetId as any,
        limit: 3,
      });

      return searchResults.chunks
        .map((chunk: { text: string }) => chunk.text)
        .join("\n\n");
    },
  });

  return createSpecializedAgent(ctx, {
    name: "Flashcards Agent",
    instructions: `You are an expert at creating educational flashcards from study materials.

Your task:
1. Search through the user's documents to find key concepts
2. Create flashcards with:
   - Clear, concise questions on the front
   - Comprehensive answers on the back
   - Focus on important facts, definitions, and concepts
3. Ensure flashcards are based ONLY on the document content
4. Return flashcards as a JSON array with "front" and "back" fields

Use the searchContext tool to find relevant content before creating flashcards.`,
    apiKey,
    provider,
    tools: { searchContext: searchContextTool },
  });
}

/**
 * Quizzes Agent - Generates quiz questions from documents
 */
export function createQuizzesAgent(
  ctx: ActionCtx,
  apiKey?: string,
  provider?: "openai" | "anthropic" | "openrouter"
) {
  const searchContextTool = createTool({
    description:
      "Search through uploaded documents to find content for quiz questions",
    args: z.object({
      query: z.string().describe("Topic to search for quiz content"),
      revisionSetId: z.string().describe("The revision set ID"),
    }),
    handler: async (ctx, args): Promise<string> => {
      const authUser = await ctx.runQuery(api.auth.getCurrentUser);
      if (!authUser) throw new Error("Not authenticated");

      const searchResults = await ctx.runAction(api.ragService.searchDocuments, {
        query: args.query,
        namespace: `user_${authUser._id}`,
        revisionSetId: args.revisionSetId as any,
        limit: 5,
      });

      return searchResults.chunks
        .map((chunk: { text: string }) => chunk.text)
        .join("\n\n");
    },
  });

  return createSpecializedAgent(ctx, {
    name: "Quizzes Agent",
    instructions: `You are an expert at creating educational quiz questions from study materials.

Your task:
1. Search through the user's documents to find relevant content
2. Create multiple-choice questions with:
   - Clear, unambiguous questions
   - 4 plausible answer options
   - One correct answer
   - Detailed explanations for the correct answer
3. Questions should test understanding, not just recall
4. Return questions as a JSON array with: question, options (array), correctAnswer (0-3), explanation

Use the searchContext tool to find relevant content before creating questions.`,
    apiKey,
    provider,
    tools: { searchContext: searchContextTool },
  });
}

/**
 * Practice Exercises Agent - Generates practice problems from documents
 */
export function createPracticeExercisesAgent(
  ctx: ActionCtx,
  apiKey?: string,
  provider?: "openai" | "anthropic" | "openrouter"
) {
  const searchContextTool = createTool({
    description:
      "Search through uploaded documents to find content for practice exercises",
    args: z.object({
      query: z.string().describe("Topic or concept for practice exercises"),
      revisionSetId: z.string().describe("The revision set ID"),
    }),
    handler: async (ctx, args): Promise<string> => {
      const authUser = await ctx.runQuery(api.auth.getCurrentUser);
      if (!authUser) throw new Error("Not authenticated");

      const searchResults = await ctx.runAction(api.ragService.searchDocuments, {
        query: args.query,
        namespace: `user_${authUser._id}`,
        revisionSetId: args.revisionSetId as any,
        limit: 5,
      });

      return searchResults.chunks
        .map((chunk: { text: string }) => chunk.text)
        .join("\n\n");
    },
  });

  return createSpecializedAgent(ctx, {
    name: "Practice Exercises Agent",
    instructions: `You are an expert at creating practice exercises from study materials.

Your task:
1. Search through the user's documents to find relevant problems and examples
2. Create practice exercises with:
   - Clear problem statements
   - Step-by-step solutions
   - Hints for struggling students
   - Difficulty levels
3. Exercises should be based on the document content
4. Return exercises as a JSON array with: question, solution, hints (array), difficulty

Use the searchContext tool to find relevant content before creating exercises.`,
    apiKey,
    provider,
    tools: { searchContext: searchContextTool },
  });
}

/**
 * Past Papers Agent - Finds and analyzes similar past papers
 */
export function createPastPapersAgent(
  ctx: ActionCtx,
  apiKey?: string,
  provider?: "openai" | "anthropic" | "openrouter"
) {
  const searchPastPapersTool = createTool({
    description:
      "Search through uploaded past papers to find similar or related papers",
    args: z.object({
      query: z.string().describe("What to search for in past papers"),
      revisionSetId: z.string().describe("The revision set ID"),
    }),
    handler: async (ctx, args): Promise<string> => {
      const authUser = await ctx.runQuery(api.auth.getCurrentUser);
      if (!authUser) throw new Error("Not authenticated");

      const searchResults = await ctx.runAction(api.ragService.searchDocuments, {
        query: args.query,
        namespace: `user_${authUser._id}_pastpapers`,
        revisionSetId: args.revisionSetId as any,
        limit: 5,
      });

      return searchResults.chunks
        .map((chunk: { text: string }) => chunk.text)
        .join("\n\n");
    },
  });

  return createSpecializedAgent(ctx, {
    name: "Past Papers Agent",
    instructions: `You are an expert at analyzing past papers and finding similar exam questions.

Your task:
1. Search through the user's uploaded past papers
2. Identify similar or related questions
3. Provide analysis including:
   - Similar topics and concepts
   - Difficulty comparison
   - Study recommendations
   - Key patterns
4. Help students understand what to focus on based on past papers

Use the searchPastPapers tool to find relevant past papers.`,
    apiKey,
    provider,
    tools: { searchPastPapers: searchPastPapersTool },
  });
}
