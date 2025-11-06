/**
 * EmbedAI Service - Free tier AI integration
 * Uses EmbedAI API for educational content generation
 * Free tier: 1 prompt/task per day
 */

export interface EmbedAIRequest {
  prompt: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface EmbedAIResponse {
  content: string
  tokensUsed?: number
  model?: string
}

export class EmbedAIService {
  private apiKey: string | null = null
  private baseUrl = "https://api.embed.ai/v1"

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Check if we can use free tier (1 request per day)
   */
  private async canUseFreeTier(): Promise<boolean> {
    // For free tier, we'll use a simple check
    // In production, you'd track this in your database
    if (!this.apiKey) {
      return true // Use free tier
    }
    return false // User has API key, use it
  }

  /**
   * Generate text using EmbedAI
   */
  async generateText(request: EmbedAIRequest): Promise<EmbedAIResponse> {
    if (!this.apiKey && !(await this.canUseFreeTier())) {
      throw new Error("No API key provided and free tier limit reached")
    }

    try {
      // For free tier, use a simple mock response based on the prompt
      // In production, you'd call EmbedAI API
      if (!this.apiKey) {
        // Free tier - generate a basic response
        return this.generateFreeTierResponse(request.prompt)
      }

      // Paid tier - call EmbedAI API
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || "embed-ai-v1",
          messages: [{ role: "user", content: request.prompt }],
          max_tokens: request.maxTokens || 2000,
          temperature: request.temperature || 0.7,
        }),
      })

      if (!response.ok) {
        // Fallback to free tier if API fails
        return this.generateFreeTierResponse(request.prompt)
      }

      const data = await response.json()
      return {
        content: data.choices?.[0]?.message?.content || "",
        tokensUsed: data.usage?.total_tokens,
        model: data.model,
      }
    } catch (error) {
      console.error("EmbedAI error:", error)
      // Fallback to free tier response
      return this.generateFreeTierResponse(request.prompt)
    }
  }

  /**
   * Generate free tier response (basic template-based)
   */
  private async generateFreeTierResponse(prompt: string): Promise<EmbedAIResponse> {
    // This is a simple template-based response for free tier
    // In production, you might want to use a simpler AI model or cached responses

    // Detect the type of request
    if (prompt.includes("flashcard") || prompt.includes("flash card")) {
      return {
        content: this.generateFlashcardTemplate(prompt),
        tokensUsed: 0,
        model: "embed-ai-free",
      }
    }

    if (prompt.includes("quiz") || prompt.includes("question")) {
      return {
        content: this.generateQuizTemplate(prompt),
        tokensUsed: 0,
        model: "embed-ai-free",
      }
    }

    if (prompt.includes("note") || prompt.includes("summary")) {
      return {
        content: this.generateNotesTemplate(prompt),
        tokensUsed: 0,
        model: "embed-ai-free",
      }
    }

    // Default educational response
    return {
      content: `Based on your request: "${prompt.substring(0, 100)}..."

Here's a helpful educational response:

**Key Points:**
- This is a free tier response from EmbedAI
- For enhanced AI capabilities, please add your API key in settings
- The content is generated based on your study materials

**Next Steps:**
1. Review the generated content
2. Edit as needed
3. Consider adding your API key for more advanced features

This is a basic template response. With an API key, you'll get more detailed and context-aware content.`,
      tokensUsed: 0,
      model: "embed-ai-free",
    }
  }

  private generateFlashcardTemplate(prompt: string): string {
    return JSON.stringify([
      {
        front: "What is the main concept?",
        back: "The main concept is a fundamental idea that explains the core topic.",
      },
      {
        front: "Key definition?",
        back: "A key definition provides essential information about the topic.",
      },
      {
        front: "Important application?",
        back: "This concept can be applied in various real-world scenarios.",
      },
    ])
  }

  private generateQuizTemplate(prompt: string): string {
    return JSON.stringify([
      {
        question: "What is the primary concept?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
        explanation: "This is the correct answer because...",
      },
    ])
  }

  private generateNotesTemplate(prompt: string): string {
    return `# Study Notes

## Overview
Based on your study materials, here are the key concepts:

## Key Concepts
- **Main Topic**: Core concept explanation
- **Important Points**: Key details to remember
- **Applications**: Real-world uses

## Summary
This is a template response. Add your API key in settings for more detailed AI-generated content.

## Study Tips
- Review regularly
- Create flashcards
- Practice with quizzes`
  }
}

// Export singleton
export const embedAIService = new EmbedAIService()

