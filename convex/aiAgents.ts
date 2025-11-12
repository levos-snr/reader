// convex/aiAgents.ts
// Fresh AI Agents with RAG (Retrieval-Augmented Generation)
// All agents use document context from vector search

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Base RAG Agent - Retrieves context before generation
 */
async function getRAGContext(
  ctx: any,
  revisionSetId: string,
  query: string,
  limit: number = 5
): Promise<string> {
  try {
    const chunks = await ctx.runAction(api.aiPipeline.retrieveRelevantChunks, {
      revisionSetId: revisionSetId as any,
      query,
      limit,
    });

    if (!chunks || chunks.length === 0) {
      return "";
    }

    return chunks.map((chunk: any) => chunk.text).join("\n\n---\n\n");
  } catch (error: any) {
    console.error("RAG context retrieval failed:", error);
    // Return empty string if RAG fails - agents can still work without context
    return "";
  }
}

/**
 * Quiz Generation Agent
 * Generates quiz questions from document content using RAG
 */
export const generateQuiz = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    topic: v.optional(v.string()),
    count: v.optional(v.number()),
    difficulty: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const topic = args.topic || "the document content";
    const count = args.count || 5;
    const difficulty = args.difficulty || "medium";
    const apiKey = args.apiKey || (process as any).env?.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("No AI API key configured. Please set OPENAI_API_KEY in Convex environment variables or provide it in your user preferences.");
    }

    // Retrieve relevant context using RAG
    const context = await getRAGContext(ctx, args.revisionSetId, topic, 5);

    // If no context found, still allow generation but warn user
    if (!context || context.trim().length < 50) {
      console.warn("No relevant content found via RAG, proceeding without document context");
    }

    const systemPrompt = `You are an expert quiz creator. Generate ${count} high-quality ${difficulty} quiz questions from the provided document content.

Rules:
- Create multiple choice questions with exactly 4 options
- Only one correct answer per question
- Include clear explanations
- Test understanding, not just memorization
- Questions should be relevant to the provided content
- Difficulty: ${difficulty}

Return ONLY valid JSON array in this format:
[
  {
    "questionId": "q1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is correct",
    "difficulty": "${difficulty}"
  }
]`;

    const userPrompt = context && context.trim().length >= 50
      ? `Generate ${count} ${difficulty} quiz questions from this document content about "${topic}":

${context.slice(0, 12000)}`
      : `Generate ${count} ${difficulty} quiz questions about "${topic}". Create questions that test understanding of key concepts.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse JSON
      let questions;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        questions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch (parseError) {
        throw new Error("Failed to parse quiz questions. Please try again.");
      }

      // Validate and sanitize
      const validQuestions = questions
        .filter((q: any) => q.question && q.options && q.options.length >= 2)
        .map((q: any, index: number) => ({
          questionId: q.questionId || `q${index + 1}`,
          question: q.question,
          options: q.options.slice(0, 4),
          correctAnswer: Math.min(q.correctAnswer || 0, q.options.length - 1),
          explanation: q.explanation || "Check your study materials for more details.",
          difficulty: q.difficulty || difficulty,
        }));

      if (validQuestions.length === 0) {
        throw new Error("No valid questions generated. Please try again.");
      }

      return validQuestions;
    } catch (error: any) {
      throw new Error(error.message || "Failed to generate quiz");
    }
  },
});

/**
 * Flashcard Generation Agent
 * Creates flashcards from document content using RAG
 */
export const generateFlashcards = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    topic: v.optional(v.string()),
    count: v.optional(v.number()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const topic = args.topic || "key concepts";
    const count = args.count || 10;
    const apiKey = args.apiKey || (process as any).env?.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("No AI API key configured. Please set OPENAI_API_KEY in Convex environment variables or provide it in your user preferences.");
    }

    // Retrieve relevant context
    const context = await getRAGContext(ctx, args.revisionSetId, topic, 5);

    // If no context found, still allow generation but warn user
    if (!context || context.trim().length < 50) {
      console.warn("No relevant content found via RAG, proceeding without document context");
    }

    const systemPrompt = `You are an expert at creating flashcards for effective learning. Generate ${count} high-quality flashcards from the provided document content.

Rules:
- Front: Clear, concise question or term (1-2 lines)
- Back: Detailed but digestible answer or definition (3-5 lines)
- Focus on key concepts and important facts
- Vary card types (definitions, concepts, processes, examples)

Return ONLY valid JSON array:
[
  {
    "front": "Question or term",
    "back": "Answer or definition",
    "difficulty": "easy|medium|hard"
  }
]`;

    const userPrompt = context && context.trim().length >= 50
      ? `Generate ${count} flashcards from this document content about "${topic}":

${context.slice(0, 12000)}`
      : `Generate ${count} flashcards about "${topic}". Create cards that cover key concepts and definitions.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate flashcards");
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      let flashcards;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        flashcards = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch (parseError) {
        throw new Error("Failed to parse flashcards");
      }

      return flashcards.map((card: any) => ({
        front: card.front,
        back: card.back,
        difficulty: card.difficulty || "medium",
      }));
    } catch (error: any) {
      throw new Error(error.message || "Failed to generate flashcards");
    }
  },
});

/**
 * Notes Generation Agent
 * Creates comprehensive study notes from document content using RAG
 */
export const generateNotes = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    topic: v.optional(v.string()),
    style: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const topic = args.topic || "the document content";
    const style = args.style || "comprehensive";
    const apiKey = args.apiKey || (process as any).env?.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("No AI API key configured. Please set OPENAI_API_KEY in Convex environment variables or provide it in your user preferences.");
    }

    // Retrieve relevant context
    const context = await getRAGContext(ctx, args.revisionSetId, topic, 8);

    // If no context found, still allow generation but warn user
    if (!context || context.trim().length < 50) {
      console.warn("No relevant content found via RAG, proceeding without document context");
    }

    const systemPrompt = `You are an expert note-taker. Create comprehensive, well-structured study notes from the provided document content.

Format your notes with:
- Clear headings and subheadings
- Key concepts highlighted
- Important definitions
- Bullet points for easy scanning
- Examples where relevant
- Summary section

Use markdown formatting for better readability.
Style: ${style}`;

    const userPrompt = context && context.trim().length >= 50
      ? `Create ${style} study notes from this document content about "${topic}":

${context.slice(0, 15000)}`
      : `Create ${style} study notes about "${topic}". Include key concepts, definitions, and important information.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok) {
        throw new Error("Failed to generate notes");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(error.message || "Failed to generate notes");
    }
  },
});

/**
 * Essay Generation Agent
 * Generates essays from document content using RAG
 */
export const generateEssay = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    prompt: v.string(),
    length: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const length = args.length || "medium";
    const apiKey = args.apiKey || (process as any).env?.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("No AI API key configured. Please set OPENAI_API_KEY in Convex environment variables or provide it in your user preferences.");
    }

    // Retrieve relevant context based on essay prompt
    const context = await getRAGContext(ctx, args.revisionSetId, args.prompt, 8);

    // If no context found, still allow generation but warn user
    if (!context || context.trim().length < 50) {
      console.warn("No relevant content found via RAG, proceeding without document context");
    }

    const lengthMap: Record<string, number> = {
      short: 500,
      medium: 1000,
      long: 2000,
    };

    const systemPrompt = `You are an expert essay writer. Write a well-structured essay based on the provided document content and user prompt.

Requirements:
- Clear introduction with thesis statement
- Well-organized body paragraphs with evidence from the content
- Strong conclusion
- Use information from the provided document content
- Length: approximately ${lengthMap[length] || 1000} words
- Academic writing style
- Proper citations and references to the source material`;

    const userPrompt = context && context.trim().length >= 50
      ? `Write an essay on: "${args.prompt}"

Use this document content as your source:

${context.slice(0, 15000)}`
      : `Write an essay on: "${args.prompt}". Use your knowledge to create a well-structured essay with clear arguments and evidence.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: lengthMap[length] || 2000,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate essay");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(error.message || "Failed to generate essay");
    }
  },
});

/**
 * AI Tutor Chat Agent
 * Answers questions using document context via RAG
 */
export const chatWithTutor = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = args.apiKey || (process as any).env?.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("No AI API key configured. Please set OPENAI_API_KEY in Convex environment variables or provide it in your user preferences.");
    }

    // Get the last user message to retrieve relevant context
    const lastUserMessage = args.messages
      .filter((m) => m.role === "user")
      .slice(-1)[0]?.content || "";

    // Retrieve relevant context
    const context = await getRAGContext(ctx, args.revisionSetId, lastUserMessage, 5);

    const systemPrompt = `You are Gizmo, a friendly and knowledgeable AI tutor. Your role is to:
- Help students understand concepts clearly
- Break down complex topics into simpler parts
- Provide examples and analogies
- Encourage critical thinking
- Be patient and supportive
- Ask clarifying questions when needed

${context && context.trim().length >= 50 ? `\nStudy material context from the documents:\n${context.slice(0, 5000)}` : "\nNote: No specific document context available. Use your general knowledge to help the student."}

Always be encouraging and help students learn effectively. ${context && context.trim().length >= 50 ? "Use the provided document context to give accurate, relevant answers." : "Provide helpful explanations based on your knowledge."}`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, ...args.messages],
          temperature: 0.8,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get tutor response");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get response from AI tutor");
    }
  },
});

/**
 * Question Answering Agent
 * Answers specific questions about the document
 */
export const answerQuestion = action({
  args: {
    revisionSetId: v.id("revisionSets"),
    question: v.string(),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = args.apiKey || (process as any).env?.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("No AI API key configured. Please set OPENAI_API_KEY in Convex environment variables or provide it in your user preferences.");
    }

    // Retrieve relevant context
    const context = await getRAGContext(ctx, args.revisionSetId, args.question, 5);

    // If no context, still try to answer but note it's general knowledge
    if (!context || context.trim().length < 50) {
      console.warn("No relevant content found via RAG, answering with general knowledge");
    }

    const systemPrompt = `You are an expert educational assistant. Answer questions based on the provided document content.

Rules:
- Use only information from the provided context
- If the answer isn't in the context, say so
- Be clear and concise
- Provide examples when helpful
- Cite relevant parts of the document`;

    const userPrompt = context && context.trim().length >= 50
      ? `Question: ${args.question}

Document context:
${context.slice(0, 10000)}`
      : `Question: ${args.question}

Answer this question based on your knowledge.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get answer");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      throw new Error(error.message || "Failed to answer question");
    }
  },
});

