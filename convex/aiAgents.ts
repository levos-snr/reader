// convex/aiAgents.ts - Enhanced AI Agents with RAG capabilities
import { openai, createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod/v3";
import { api, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Base Agent Configuration
 */
interface AgentConfig {
  name: string;
  instructions: string;
  apiKey?: string;
  provider?: "openai" | "anthropic" | "openrouter";
  temperature?: number;
  maxTokens?: number;
}

/**
 * Create a specialized agent for document-based tasks
 */
export function createDocumentAgent(
  ctx: ActionCtx,
  config: AgentConfig & {
    revisionSetId: Id<"revisionSets">;
    userId: string;
  }
) {
  const { revisionSetId, userId, ...agentConfig } = config;

  // Tool for searching document context
  const searchDocuments = {
    description: "Search through uploaded documents to find relevant content",
    parameters: z.object({
      query: z.string().describe("What to search for in the documents"),
      limit: z.number().optional().describe("Maximum number of results"),
    }),
    execute: async (args: { query: string; limit?: number }) => {
      const results = await ctx.runAction(api.ragService.searchDocuments, {
        query: args.query,
        namespace: `user_${userId}`,
        revisionSetId,
        limit: args.limit || 5,
      });
      return results.text;
    },
  };

  // Tool for getting full document context
  const getDocumentContext = {
    description: "Get all available context from uploaded documents",
    parameters: z.object({}),
    execute: async () => {
      const context = await ctx.runAction(api.ragService.getDocumentContext, {
        revisionSetId,
        namespace: `user_${userId}`,
      });
      return context.context;
    },
  };

  return {
    config: agentConfig,
    tools: {
      searchDocuments,
      getDocumentContext,
    },
  };
}

/**
 * SmartNotes Agent - Generates comprehensive study notes
 */
export async function createSmartNotesAgent(
  ctx: ActionCtx,
  revisionSetId: Id<"revisionSets">,
  userId: string,
  apiKey?: string,
  provider: "openai" | "anthropic" | "openrouter" = "openai"
) {
  const baseAgent = createDocumentAgent(ctx, {
    name: "SmartNotes Agent",
    instructions: `You are an expert educational assistant specialized in creating comprehensive study notes.

Your task:
1. Search through the user's uploaded documents to find all relevant content
2. Create well-structured, detailed study notes that include:
   - Clear section headings and organization
   - Key concepts with thorough explanations
   - Important definitions and terminology
   - Examples and applications where relevant
   - Summary sections for each major topic
3. Format notes in clear markdown with proper hierarchy
4. Ensure all information comes from the uploaded documents
5. If information is missing, clearly indicate what needs to be added

Always search documents first before generating notes. Create notes that are:
- Comprehensive yet concise
- Easy to understand and study from
- Well-organized with clear structure
- Focused on key learning objectives`,
    revisionSetId,
    userId,
    apiKey,
    provider,
    temperature: 0.7,
    maxTokens: 3000,
  });

  return baseAgent;
}

/**
 * Flashcards Agent - Generates effective flashcards
 */
export async function createFlashcardsAgent(
  ctx: ActionCtx,
  revisionSetId: Id<"revisionSets">,
  userId: string,
  apiKey?: string,
  provider: "openai" | "anthropic" | "openrouter" = "openai"
) {
  const baseAgent = createDocumentAgent(ctx, {
    name: "Flashcards Agent",
    instructions: `You are an expert at creating educational flashcards from study materials.

Your task:
1. Search through the user's documents to find key concepts
2. Create flashcards with:
   - Clear, concise questions on the front
   - Comprehensive but focused answers on the back
   - Focus on important facts, definitions, concepts, and relationships
   - Appropriate difficulty level for the target audience
3. Ensure flashcards test understanding, not just memorization
4. Base ALL flashcards on content from the uploaded documents

Guidelines:
- Front: Ask one clear question or prompt
- Back: Provide a complete but concise answer
- Avoid ambiguous questions
- Include context when necessary
- Focus on the most important concepts`,
    revisionSetId,
    userId,
    apiKey,
    provider,
    temperature: 0.6,
    maxTokens: 2000,
  });

  return baseAgent;
}

/**
 * Quiz Agent - Generates assessment questions
 */
export async function createQuizAgent(
  ctx: ActionCtx,
  revisionSetId: Id<"revisionSets">,
  userId: string,
  apiKey?: string,
  provider: "openai" | "anthropic" | "openrouter" = "openai"
) {
  const baseAgent = createDocumentAgent(ctx, {
    name: "Quiz Agent",
    instructions: `You are an expert at creating educational quiz questions from study materials.

Your task:
1. Search through the user's documents to find key content
2. Create multiple-choice questions with:
   - Clear, unambiguous questions
   - 4 plausible answer options (A, B, C, D)
   - One definitively correct answer
   - Detailed explanations for why the correct answer is right
   - Difficulty appropriate to the material
3. Questions should test understanding, not just recall
4. All questions must be based on the uploaded document content

Question Quality Standards:
- Test conceptual understanding
- Avoid trick questions
- Make all distractors plausible
- Provide educational explanations
- Cover different aspects of the material`,
    revisionSetId,
    userId,
    apiKey,
    provider,
    temperature: 0.5,
    maxTokens: 3000,
  });

  return baseAgent;
}

/**
 * Practice Exercises Agent - Generates practice problems
 */
export async function createPracticeAgent(
  ctx: ActionCtx,
  revisionSetId: Id<"revisionSets">,
  userId: string,
  apiKey?: string,
  provider: "openai" | "anthropic" | "openrouter" = "openai"
) {
  const baseAgent = createDocumentAgent(ctx, {
    name: "Practice Exercises Agent",
    instructions: `You are an expert at creating practice exercises from study materials.

Your task:
1. Search through the user's documents to find relevant problems and examples
2. Create practice exercises with:
   - Clear problem statements
   - Step-by-step solutions
   - Helpful hints for students who are stuck
   - Appropriate difficulty levels
   - Connection to concepts in the documents
3. Exercises should help students apply what they've learned
4. Base all exercises on document content and concepts

Exercise Structure:
- Problem: Clear, complete problem statement
- Solution: Detailed step-by-step solution
- Hints: Progressive hints that guide without giving away the answer
- Difficulty: Appropriate challenge level
- Topic: Related topic/concept from materials`,
    revisionSetId,
    userId,
    apiKey,
    provider,
    temperature: 0.6,
    maxTokens: 2500,
  });

  return baseAgent;
}

/**
 * Past Papers Agent - Finds and analyzes similar past papers
 */
export async function createPastPapersAgent(
  ctx: ActionCtx,
  revisionSetId: Id<"revisionSets">,
  userId: string,
  apiKey?: string,
  provider: "openai" | "anthropic" | "openrouter" = "openai"
) {
  // Tool for searching past papers specifically
  const searchPastPapers = {
    description: "Search through uploaded past papers to find similar or related content",
    parameters: z.object({
      query: z.string().describe("What to search for in past papers"),
      limit: z.number().optional().describe("Maximum number of results"),
    }),
    execute: async (args: { query: string; limit?: number }) => {
      const results = await ctx.runAction(api.ragService.searchDocuments, {
        query: args.query,
        namespace: `user_${userId}_pastpapers`,
        revisionSetId,
        limit: args.limit || 5,
      });
      return results.text;
    },
  };

  return {
    config: {
      name: "Past Papers Agent",
      instructions: `You are an expert at analyzing past papers and finding similar exam questions.

Your task:
1. Search through the user's uploaded past papers
2. Identify similar or related questions
3. Provide analysis including:
   - Similar topics and concepts tested
   - Difficulty comparison
   - Common patterns and themes
   - Study recommendations based on patterns
   - Key areas to focus on

Analysis Guidelines:
- Compare question types and formats
- Identify recurring themes
- Note difficulty progression
- Highlight important concepts
- Provide actionable study advice`,
      apiKey,
      provider,
      temperature: 0.7,
      maxTokens: 2500,
    },
    tools: {
      searchPastPapers,
    },
  };
}

/**
 * Master Tutor Agent - General purpose educational assistant
 */
export async function createTutorAgent(
  ctx: ActionCtx,
  revisionSetId: Id<"revisionSets">,
  userId: string,
  apiKey?: string,
  provider: "openai" | "anthropic" | "openrouter" = "openai"
) {
  const baseAgent = createDocumentAgent(ctx, {
    name: "AI Tutor",
    instructions: `You are an intelligent, encouraging educational assistant named "Gizmo".

Your role:
1. Help students understand concepts from their study materials
2. Answer questions clearly and comprehensively
3. Provide study guidance and learning strategies
4. Search documents when needed for accurate information
5. Break down complex topics into understandable parts
6. Encourage critical thinking and deeper understanding

Teaching Approach:
- Be patient and supportive
- Use analogies and examples to clarify concepts
- Check for understanding
- Encourage questions
- Adapt explanations to the student's level
- Reference the study materials when appropriate
- Foster independent learning`,
    revisionSetId,
    userId,
    apiKey,
    provider,
    temperature: 0.8,
    maxTokens: 2000,
  });

  return baseAgent;
}

/**
 * Document Analyzer Agent - Processes and extracts information from documents
 */
export async function createDocumentAnalyzerAgent(
  ctx: ActionCtx,
  apiKey?: string,
  provider: "openai" | "anthropic" | "openrouter" = "openai"
) {
  return {
    config: {
      name: "Document Analyzer",
      instructions: `You are an expert at analyzing and extracting information from documents.

Your task:
1. Read and understand document content
2. Extract key information:
   - Main topics and themes
   - Important concepts and definitions
   - Key facts and data
   - Structure and organization
3. Identify:
   - Subject area and difficulty level
   - Learning objectives
   - Prerequisites
   - Key takeaways
4. Provide:
   - Summary of content
   - Recommendations for study
   - Suggestions for related materials

Analysis should be:
- Thorough and accurate
- Well-organized
- Actionable for students
- Based solely on document content`,
      apiKey,
      provider,
      temperature: 0.5,
      maxTokens: 3000,
    },
    tools: {},
  };
}
