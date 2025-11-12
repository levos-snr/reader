// convex/aiActions.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Generate quiz questions from content using AI
export const generateQuiz = action({
  args: {
    content: v.string(),
    count: v.number(),
    difficulty: v.string(),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { content, count, difficulty, apiKey } = args;

    // Use OpenRouter or OpenAI based on available keys
    const openrouterKey = apiKey || process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openrouterKey && !openaiKey) {
      throw new Error("No AI API key configured. Please add your API key in settings.");
    }

    const systemPrompt = `You are an expert quiz creator. Generate ${count} high-quality ${difficulty} quiz questions from the provided content.

Rules:
- Create a mix of question types: multiple choice, true/false, and fill-in-the-blank
- Each question must have exactly 4 options for multiple choice
- Options should be plausible but only one correct
- Include a brief explanation for each answer
- Questions should test understanding, not just memorization
- Use clear, concise language
- Difficulty: ${difficulty}

Return ONLY valid JSON in this exact format:
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

    const userPrompt = `Generate ${count} ${difficulty} quiz questions from this content:\n\n${content.slice(0, 15000)}`;

    try {
      let response;

      if (openaiKey) {
        // Use OpenAI
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
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
        });
      } else {
        // Use OpenRouter
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "GizmoQuiz",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${error}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse JSON response
      let questions;
      try {
        // Try to extract JSON if wrapped in markdown
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          questions = JSON.parse(content);
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        throw new Error("Failed to generate valid quiz questions. Please try again.");
      }

      // Validate and sanitize questions
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
        throw new Error("No valid questions were generated. Please try again.");
      }

      return validQuestions;
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      throw new Error(error.message || "Failed to generate quiz. Please try again.");
    }
  },
});

// Generate notes from content using AI
export const generateNotes = action({
  args: {
    content: v.string(),
    materialTitle: v.string(),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { content, materialTitle, apiKey } = args;

    const openrouterKey = apiKey || process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openrouterKey && !openaiKey) {
      throw new Error("No AI API key configured");
    }

    const systemPrompt = `You are an expert note-taker. Create comprehensive, well-structured study notes from the provided content.

Format your notes with:
- Clear headings and subheadings
- Key concepts highlighted
- Important definitions
- Bullet points for easy scanning
- Examples where relevant

Use markdown formatting for better readability.`;

    const userPrompt = `Create study notes from this material titled "${materialTitle}":\n\n${content.slice(0, 15000)}`;

    try {
      let response;

      if (openaiKey) {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
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
      } else {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "GizmoNotes",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 3000,
          }),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to generate notes");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Notes generation error:", error);
      throw new Error("Failed to generate notes");
    }
  },
});

// Generate flashcards from content using AI
export const generateFlashcards = action({
  args: {
    content: v.string(),
    count: v.number(),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { content, count, apiKey } = args;

    const openrouterKey = apiKey || process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openrouterKey && !openaiKey) {
      throw new Error("No AI API key configured");
    }

    const systemPrompt = `You are an expert at creating flashcards for effective learning. Generate ${count} high-quality flashcards from the provided content.

Rules:
- Front: Clear, concise question or term
- Back: Detailed but digestible answer or definition
- Focus on key concepts and important facts
- Vary the types of cards (definitions, concepts, processes, examples)
- Keep front side brief (1-2 lines)
- Keep back side comprehensive but focused (3-5 lines)

Return ONLY valid JSON in this exact format:
[
  {
    "front": "Question or term",
    "back": "Answer or definition",
    "difficulty": "easy|medium|hard"
  }
]`;

    const userPrompt = `Generate ${count} flashcards from this content:\n\n${content.slice(0, 15000)}`;

    try {
      let response;

      if (openaiKey) {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
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
      } else {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "GizmoFlashcards",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 3000,
          }),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to generate flashcards");
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Parse JSON response
      let flashcards;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          flashcards = JSON.parse(jsonMatch[0]);
        } else {
          flashcards = JSON.parse(content);
        }
      } catch (parseError) {
        throw new Error("Failed to parse flashcards");
      }

      return flashcards.map((card: any) => ({
        front: card.front,
        back: card.back,
        difficulty: card.difficulty || "medium",
      }));
    } catch (error) {
      console.error("Flashcard generation error:", error);
      throw new Error("Failed to generate flashcards");
    }
  },
});

// Chat with AI tutor
export const chatWithTutor = action({
  args: {
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
      })
    ),
    context: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { messages, context, apiKey } = args;

    const openrouterKey = apiKey || process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openrouterKey && !openaiKey) {
      throw new Error("No AI API key configured");
    }

    const systemPrompt = `You are Gizmo, a friendly and knowledgeable AI tutor. Your role is to:
- Help students understand concepts clearly
- Break down complex topics into simpler parts
- Provide examples and analogies
- Encourage critical thinking
- Be patient and supportive
- Ask clarifying questions when needed

${context ? `\nStudy material context:\n${context.slice(0, 5000)}` : ""}

Always be encouraging and help students learn effectively.`;

    try {
      let response;

      if (openaiKey) {
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            temperature: 0.8,
            max_tokens: 1000,
          }),
        });
      } else {
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            "X-Title": "GizmoTutor",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            temperature: 0.8,
            max_tokens: 1000,
          }),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to get tutor response");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Tutor chat error:", error);
      throw new Error("Failed to get response from AI tutor");
    }
  },
});
