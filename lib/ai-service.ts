/**
 * AI Service - Abstracts multiple AI providers (OpenAI, Claude, etc.)
 * For educational purposes, prioritizing educational AI models
 */

export type AIProvider = "openai" | "claude" | "gemini" | "anthropic";

export interface AIConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
}

export class AIService {
  private apiKey: string;
  private provider: AIProvider;

  constructor(provider: AIProvider = "openai") {
    this.provider = provider;
    // Get API key from environment variables
    this.apiKey = this.getApiKey(provider);
  }

  private getApiKey(provider: AIProvider): string {
    switch (provider) {
      case "openai":
        return process.env.OPENAI_API_KEY || "";
      case "claude":
        return process.env.ANTHROPIC_API_KEY || "";
      case "gemini":
        return process.env.GOOGLE_AI_API_KEY || "";
      default:
        return "";
    }
  }

  /**
   * Generate educational notes from content
   */
  async generateNotes(content: string, config?: AIConfig): Promise<AIResponse> {
    const provider = config?.provider || this.provider;
    const prompt = `As an expert educational assistant, please create comprehensive study notes from the following content. 
    Include key concepts, definitions, important points, and a summary. Format it clearly for easy studying:\n\n${content}`;

    return this.generateText(prompt, {
      ...config,
      provider,
      temperature: config?.temperature || 0.7,
    });
  }

  /**
   * Generate flashcards from content
   */
  async generateFlashcards(
    content: string,
    count: number = 10,
    config?: AIConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || this.provider;
    const prompt = `Create ${count} educational flashcards from the following content. 
    Format as JSON array with "front" and "back" fields. Make questions clear and answers comprehensive:\n\n${content}`;

    return this.generateText(prompt, {
      ...config,
      provider,
      temperature: config?.temperature || 0.5,
    });
  }

  /**
   * Generate practice test questions
   */
  async generateTestQuestions(
    content: string,
    count: number = 10,
    config?: AIConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || this.provider;
    const prompt = `Create ${count} multiple-choice practice test questions from the following content.
    Format as JSON array with "question", "options" (4 options), "correctAnswer" (0-3), and "explanation".
    Make questions challenging but fair:\n\n${content}`;

    return this.generateText(prompt, {
      ...config,
      provider,
      temperature: config?.temperature || 0.3,
    });
  }

  /**
   * Tutor/Explain a topic
   */
  async tutorMe(
    topic: string,
    context?: string,
    config?: AIConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || this.provider;
    const prompt = context
      ? `As an expert tutor, explain "${topic}" in the context of: ${context}. 
      Use simple language, examples, and analogies. Make it engaging and easy to understand.`
      : `As an expert tutor, explain "${topic}" in simple, engaging terms with examples and analogies.`;

    return this.generateText(prompt, {
      ...config,
      provider,
      temperature: config?.temperature || 0.8,
    });
  }

  /**
   * Chat with AI assistant
   */
  async chat(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    config?: AIConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || this.provider;
    const systemMessage = `You are an intelligent educational assistant named "StudyBot" for RevisionHub. 
    Help students understand concepts, answer questions, and provide study guidance. 
    Be encouraging, clear, and educational.`;

    return this.generateChat([
      { role: "system", content: systemMessage },
      ...messages,
    ], config);
  }

  /**
   * Generate audio transcript summary
   */
  async generateAudioTranscript(
    transcript: string,
    config?: AIConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || this.provider;
    const prompt = `Summarize the following transcript in a clear, concise way suitable for audio recap. 
    Highlight key points and main ideas:\n\n${transcript}`;

    return this.generateText(prompt, {
      ...config,
      provider,
      temperature: config?.temperature || 0.6,
    });
  }

  /**
   * Grade essay with feedback
   */
  async gradeEssay(
    essay: string,
    rubric?: string,
    config?: AIConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || this.provider;
    const rubricText = rubric
      ? `Use this rubric: ${rubric}\n\n`
      : `Use standard essay grading criteria: content, organization, clarity, grammar.\n\n`;

    const prompt = `Grade the following essay and provide detailed feedback. ${rubricText}
    Rate on a scale of 0-100. Provide specific feedback on strengths and areas for improvement:\n\n${essay}`;

    return this.generateText(prompt, {
      ...config,
      provider,
      temperature: config?.temperature || 0.3,
    });
  }

  /**
   * Core text generation method
   */
  private async generateText(
    prompt: string,
    config?: AIConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || this.provider;

    switch (provider) {
      case "openai":
        return this.generateOpenAI(prompt, config);
      case "claude":
        return this.generateClaude(prompt, config);
      default:
        throw new Error(`Provider ${provider} not implemented`);
    }
  }

  /**
   * Core chat generation method
   */
  private async generateChat(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    config?: AIConfig
  ): Promise<AIResponse> {
    const provider = config?.provider || this.provider;

    switch (provider) {
      case "openai":
        return this.chatOpenAI(messages, config);
      case "claude":
        return this.chatClaude(messages, config);
      default:
        throw new Error(`Provider ${provider} not implemented`);
    }
  }

  /**
   * OpenAI Implementation
   */
  private async generateOpenAI(
    prompt: string,
    config?: AIConfig
  ): Promise<AIResponse> {
    const model = config?.model || "gpt-4o-mini"; // Educational-friendly model

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.getApiKey("openai")}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens || 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || "",
        provider: "openai",
        model,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      console.error("OpenAI generation error:", error);
      throw error;
    }
  }

  private async chatOpenAI(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    config?: AIConfig
  ): Promise<AIResponse> {
    const model = config?.model || "gpt-4o-mini";

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.getApiKey("openai")}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: config?.temperature || 0.7,
          max_tokens: config?.maxTokens || 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || "",
        provider: "openai",
        model,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      console.error("OpenAI chat error:", error);
      throw error;
    }
  }

  /**
   * Claude/Anthropic Implementation
   */
  private async generateClaude(
    prompt: string,
    config?: AIConfig
  ): Promise<AIResponse> {
    const model = config?.model || "claude-3-5-sonnet-20241022";

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.getApiKey("claude"),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: config?.maxTokens || 2000,
          temperature: config?.temperature || 0.7,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.content[0]?.text || "",
        provider: "claude",
        model,
        tokensUsed: data.usage?.output_tokens,
      };
    } catch (error) {
      console.error("Claude generation error:", error);
      throw error;
    }
  }

  private async chatClaude(
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    config?: AIConfig
  ): Promise<AIResponse> {
    const model = config?.model || "claude-3-5-sonnet-20241022";

    try {
      // Filter system messages for Claude
      const claudeMessages = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        }));

      const systemPrompt = messages.find((msg) => msg.role === "system")?.content || "";

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.getApiKey("claude"),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: config?.maxTokens || 2000,
          temperature: config?.temperature || 0.7,
          system: systemPrompt || undefined,
          messages: claudeMessages,
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.content[0]?.text || "",
        provider: "claude",
        model,
        tokensUsed: data.usage?.output_tokens,
      };
    } catch (error) {
      console.error("Claude chat error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();

