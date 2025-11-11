// convex/aiActionsWithRAG.ts - Complete AI Actions with RAG integration
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { api, internal } from "./_generated/api";
import { generateText, generateObject } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
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

function getLanguageModel(apiKey: string, provider: string) {
  const normalizedProvider = provider.toLowerCase();
  
  if (normalizedProvider === "anthropic" || normalizedProvider === "claude") {
    const client = createAnthropic({ apiKey });
    return client("claude-3-5-sonnet-20241022");
  } else if (normalizedProvider === "openrouter") {
    const client = createOpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    return client.chat("openrouter/auto");
  } else {
    const client = createOpenAI({ apiKey });
    return client.chat("gpt-4o-mini");
  }
}

/**
 * Generate SmartNotes with RAG
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
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

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

    try {
      const model = getLanguageModel(apiKey, provider);

      // Get document context with RAG
      const documentContext = await ctx.runAction(
        api.ragService.getDocumentContext,
        {
          revisionSetId: args.revisionSetId,
          namespace: `user_${userId}`,
        }
      );

      if (!documentContext.context) {
        throw new Error("No documents found. Please upload documents first.");
      }

      const prompt = `Generate ${args.style || "detailed"} study notes from the uploaded documents.

Available document context:
${documentContext.context}

Create comprehensive notes that:
1. Cover all key concepts from the documents
2. Include clear definitions and explanations
3. Organize information with proper headings and structure
4. Add summaries where appropriate
5. Highlight important points and relationships

Format in clear markdown with proper hierarchy.`;

      const result = await generateText({
        model,
        prompt,
        maxOutputTokens: 3000, // Changed from maxTokens to maxOutputTokens
        temperature: 0.7,
      });

      return {
        content: result.text,
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Notes generation error:", error);
      throw new Error(
        error?.message || "Failed to generate notes with RAG"
      );
    }
  },
});

/**
 * Generate Flashcards with RAG
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
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

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

    try {
      const model = getLanguageModel(apiKey, provider);

      // Get document context with RAG
      const documentContext = await ctx.runAction(
        api.ragService.getDocumentContext,
        {
          revisionSetId: args.revisionSetId,
          namespace: `user_${userId}`,
        }
      );

      if (!documentContext.context) {
        throw new Error("No documents found. Please upload documents first.");
      }

      const prompt = `Create ${args.count} educational flashcards from the following document content.

Document Content:
${documentContext.context}

Difficulty level: ${args.difficulty || "medium"}

Generate flashcards that:
1. Focus on the most important concepts
2. Have clear, concise questions on the front
3. Provide comprehensive answers on the back
4. Test understanding, not just memorization
5. Are appropriate for the specified difficulty level

Return ONLY a JSON array with no markdown formatting, with this exact structure:
[
  {"front": "Question 1", "back": "Answer 1"},
  {"front": "Question 2", "back": "Answer 2"}
]`;

      const result = await generateObject({
        model,
        prompt,
        schema: z.object({
          flashcards: z.array(
            z.object({
              front: z.string(),
              back: z.string(),
            })
          ),
        }),
        temperature: 0.6,
      });

      return {
        flashcards: result.object.flashcards.slice(0, args.count),
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Flashcard generation error:", error);
      throw new Error(
        error?.message || "Failed to generate flashcards with RAG"
      );
    }
  },
});

/**
 * Generate Quiz with RAG
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
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

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

    try {
      const model = getLanguageModel(apiKey, provider);

      // Get document context with RAG
      const documentContext = await ctx.runAction(
        api.ragService.getDocumentContext,
        {
          revisionSetId: args.revisionSetId,
          namespace: `user_${userId}`,
        }
      );

      if (!documentContext.context) {
        throw new Error("No documents found. Please upload documents first.");
      }

      const prompt = `Create ${args.count} multiple-choice quiz questions from the following document content.

Document Content:
${documentContext.context}

Difficulty: ${args.difficulty || "medium"}

Generate questions that:
1. Test understanding of key concepts
2. Have clear, unambiguous questions
3. Include 4 plausible answer options
4. Have one definitively correct answer
5. Provide detailed explanations

Return ONLY valid JSON with this structure:
{
  "questions": [
    {
      "questionId": "q1",
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct",
      "difficulty": "${args.difficulty || "medium"}"
    }
  ]
}`;

      const result = await generateObject({
        model,
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
        temperature: 0.5,
      });

      return {
        questions: result.object.questions.slice(0, args.count),
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      throw new Error(error?.message || "Failed to generate quiz with RAG");
    }
  },
});

/**
 * Generate Practice Exercises with RAG
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
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

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

    try {
      const model = getLanguageModel(apiKey, provider);

      // Get document context with RAG
      const documentContext = await ctx.runAction(
        api.ragService.getDocumentContext,
        {
          revisionSetId: args.revisionSetId,
          namespace: `user_${userId}`,
        }
      );

      if (!documentContext.context) {
        throw new Error("No documents found. Please upload documents first.");
      }

      const prompt = `Create ${args.count} practice exercises from the following document content.

Document Content:
${documentContext.context}

Difficulty: ${args.difficulty || "medium"}

Generate exercises that:
1. Help students practice key concepts
2. Include clear problem statements
3. Provide step-by-step solutions
4. Offer progressive hints
5. Are based on document content

Return valid JSON with this structure:
{
  "exercises": [
    {
      "question": "Problem statement",
      "solution": "Step-by-step solution",
      "hints": ["Hint 1", "Hint 2"],
      "difficulty": "${args.difficulty || "medium"}",
      "topic": "Related topic"
    }
  ]
}`;

      const result = await generateObject({
        model,
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
        temperature: 0.6,
      });

      return {
        exercises: result.object.exercises.slice(0, args.count),
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Exercise generation error:", error);
      throw new Error(
        error?.message || "Failed to generate exercises with RAG"
      );
    }
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
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

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

    try {
      const model = getLanguageModel(apiKey, provider);

      // Search for similar past papers
      const searchResults = await ctx.runAction(
        api.ragService.searchDocuments,
        {
          query: args.query,
          namespace: `user_${userId}_pastpapers`,
          revisionSetId: args.revisionSetId,
          limit: 10,
        }
      );

      if (!searchResults.text) {
        return {
          analysis: "No past papers found. Please upload past papers first.",
          tokensUsed: 0,
        };
      }

      const prompt = `Analyze the following past papers and find similarities based on this query: ${args.query}

Past Papers Content:
${searchResults.text}

Provide analysis including:
1. Similar papers found and their relevance
2. Common topics and patterns
3. Difficulty analysis
4. Study recommendations
5. Key patterns to focus on

Format your analysis in clear markdown.`;

      const result = await generateText({
        model,
        prompt,
        maxOutputTokens: 2500, // Changed from maxTokens
        temperature: 0.7,
      });

      return {
        analysis: result.text,
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Past paper analysis error:", error);
      throw new Error(
        error?.message || "Failed to analyze past papers with RAG"
      );
    }
  },
});

/**
 * Chat with AI Tutor using RAG for context
 */
export const chatWithTutorRAG = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ 
    content: string; 
    tokensUsed: number 
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

    const apiKey =
      args.apiKey ||
      preferences.aiApiKey ||
      (provider === "openai"
        ? process.env.OPENAI_API_KEY
        : provider === "openrouter"
        ? process.env.OPENROUTER_API_KEY
        : process.env.ANTHROPIC_API_KEY);

    if (!apiKey) {
      return {
        content: `I'd love to help, but I need an API key to provide AI responses.\n\n**Please add your AI API key in Settings.**`,
        tokensUsed: 0,
      };
    }

    try {
      const model = getLanguageModel(apiKey, provider);

      // Get the user's last question for RAG search
      const lastUserMessage = args.messages
        .slice()
        .reverse()
        .find(m => m.role === "user");

      let relevantContext = "";
      if (lastUserMessage) {
        const searchResults = await ctx.runAction(
          api.ragService.searchDocuments,
          {
            query: lastUserMessage.content,
            namespace: `user_${userId}`,
            revisionSetId: args.revisionSetId,
            limit: 5,
          }
        );
        relevantContext = searchResults.text;
      }

      const systemPrompt = `You are an intelligent, encouraging educational assistant named "Gizmo" for GizmoReader.

Your role:
- Help students understand concepts from their study materials
- Answer questions clearly and comprehensively
- Provide study guidance and learning strategies
- Reference the provided context from their documents when relevant
- Break down complex topics into understandable parts
- Encourage critical thinking

${relevantContext ? `\n\nRelevant context from student's materials:\n${relevantContext}` : ""}`;

      const result = await generateText({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...args.messages.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        temperature: 0.8,
      });

      return {
        content: result.text,
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Chat error:", error);
      return {
        content: `❌ **Error**: ${error?.message || "Unknown error occurred"}`,
        tokensUsed: 0,
      };
    }
  },
});

/**
 * Analyze past paper and generate solutions with RAG
 */
export const analyzePastPaperWithRAG = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    pastPaperTitle: v.string(),
    questions: v.optional(v.array(v.string())),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    analysis: string;
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

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

    try {
      const model = getLanguageModel(apiKey, provider);

      // Search for relevant past papers and study materials
      const searchResults = await ctx.runAction(
        api.ragService.searchDocuments,
        {
          query: args.pastPaperTitle,
          namespace: `user_${userId}`,
          revisionSetId: args.revisionSetId,
          limit: 10,
        }
      );

      const prompt = `You are an expert educational assistant helping analyze a past paper exam.

Past Paper: ${args.pastPaperTitle}

${args.questions && args.questions.length > 0 ? `\nSpecific Questions to Analyze:\n${args.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}` : ""}

${searchResults.text ? `\nRelevant context from student's materials:\n${searchResults.text}` : ""}

Provide:
1. A comprehensive analysis of the past paper
2. Key topics and concepts covered
3. Difficulty assessment
4. Study recommendations based on the materials
${args.questions && args.questions.length > 0 ? "5. Detailed solutions and explanations for the questions" : ""}

Format your response in clear markdown with sections and examples.`;

      const result = await generateText({
        model,
        prompt,
        maxOutputTokens: 4000, // Changed from maxTokens
        temperature: 0.7,
      });

      return {
        analysis: result.text,
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Past paper analysis error:", error);
      throw new Error(
        error?.message || "Failed to analyze past paper with RAG"
      );
    }
  },
});

/**
 * Generate solutions for specific past paper questions with RAG
 */
export const generatePastPaperSolutionsWithRAG = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    question: v.string(),
    subject: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    solution: string;
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

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

    try {
      const model = getLanguageModel(apiKey, provider);

      // Search for relevant context
      const searchResults = await ctx.runAction(
        api.ragService.searchDocuments,
        {
          query: args.question,
          namespace: `user_${userId}`,
          revisionSetId: args.revisionSetId,
          limit: 5,
        }
      );

      const prompt = `You are an expert tutor providing detailed solutions to exam questions.

Question: ${args.question}
${args.subject ? `Subject: ${args.subject}` : ""}
${args.difficulty ? `Difficulty: ${args.difficulty}` : ""}

${searchResults.text ? `\nRelevant context from student's materials:\n${searchResults.text}` : ""}

Please provide:
1. A step-by-step solution
2. Clear explanations for each step
3. Alternative approaches if applicable
4. Key concepts tested
5. Common mistakes to avoid

Format your response in clear markdown with numbered steps and explanations.`;

      const result = await generateText({
        model,
        prompt,
        maxOutputTokens: 3000, // Changed from maxTokens
        temperature: 0.5,
      });

      return {
        solution: result.text,
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Solution generation error:", error);
      throw new Error(
        error?.message || "Failed to generate solution with RAG"
      );
    }
  },
});

/**
 * Extract questions from past paper with RAG assistance
 */
export const extractQuestionsFromPastPaperWithRAG = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    pastPaperTitle: v.string(),
    pastPaperContent: v.string(),
    apiKey: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    questions: Array<{
      id: string;
      question: string;
      answer: string | null;
      marks: string | null;
      topic: string | null;
    }>;
    tokensUsed: number;
  }> => {
    const authUser = await getAuthUser(ctx);
    const preferences = await getUserPreferences(ctx);
    const userId = authUser._id.toString();

    const provider = (args.provider || preferences.aiProvider || "openai") as
      | "openai"
      | "anthropic"
      | "openrouter";

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

    try {
      const model = getLanguageModel(apiKey, provider);

      const prompt = `Extract all questions from this past paper exam. Return a JSON array with this structure:
[
  {
    "id": "q1",
    "question": "Full question text here",
    "answer": "Answer if available, otherwise null",
    "marks": "Number of marks if available",
    "topic": "Topic/subject area if identifiable"
  }
]

Past Paper: ${args.pastPaperTitle}
Content: ${args.pastPaperContent.substring(0, 4000)}`;

      const result = await generateObject({
        model,
        prompt,
        schema: z.object({
          questions: z.array(
            z.object({
              id: z.string(),
              question: z.string(),
              answer: z.string().nullable(),
              marks: z.string().nullable(),
              topic: z.string().nullable(),
            })
          ),
        }),
        temperature: 0.3,
      });

      return {
        questions: result.object.questions,
        tokensUsed: result.usage?.totalTokens || 0,
      };
    } catch (error: any) {
      console.error("Question extraction error:", error);
      throw new Error(
        error?.message || "Failed to extract questions with RAG"
      );
    }
  },
});
