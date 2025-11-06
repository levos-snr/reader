import { action } from "./_generated/server"
import { authComponent } from "./auth"
import { v } from "convex/values"
import { api } from "./_generated/api"

async function getAuthUser(ctx: any) {
  const authUser = await authComponent.getAuthUser(ctx)
  if (!authUser) {
    throw new Error("Not authenticated")
  }
  return authUser
}

async function getUserPreferences(ctx: any): Promise<any> {
  const authUser = await authComponent.getAuthUser(ctx)
  if (!authUser) {
    return {}
  }
  // Use runQuery to call the query function instead of direct db access
  const user = await ctx.runQuery(api.users.getCurrentUserProfile, {})
  return user?.preferences || {}
}

async function callOpenAIChat({ apiKey, messages, maxTokens = 2000, temperature = 0.7, model }: { apiKey: string; messages: Array<{ role: string; content: string }>; maxTokens?: number; temperature?: number; model?: string }) {
  const usedModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini"
  
  // Validate API key
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("OpenAI API key is missing or invalid")
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: usedModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })
  
  if (!resp.ok) {
    let errorMessage = `OpenAI API error (${resp.status})`
    try {
      const errorData = await resp.json()
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage
      }
    } catch {}
    
    if (resp.status === 429) {
      throw new Error(`Rate limit exceeded: ${errorMessage}. Please wait a moment and try again, or check your OpenAI account limits.`)
    } else if (resp.status === 401) {
      throw new Error(`Invalid API key: ${errorMessage}. Please check your OpenAI API key in settings.`)
    } else if (resp.status === 403) {
      throw new Error(`Access forbidden: ${errorMessage}. Your API key may not have access to this model.`)
    } else {
      throw new Error(errorMessage)
    }
  }
  
  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens || 0,
  }
}

async function callAnthropic({ apiKey, messages, maxTokens = 2000, temperature = 0.7 }: { apiKey: string; messages: Array<{ role: string; content: string }>; maxTokens?: number; temperature?: number }) {
  // Convert messages to Anthropic format (system + user/assistant)
  const systemMessage = messages.find(m => m.role === "system")?.content || ""
  const conversationMessages = messages.filter(m => m.role !== "system").map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }))

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      temperature,
      system: systemMessage || undefined,
      messages: conversationMessages,
    }),
  })
  if (!resp.ok) {
    throw new Error(`Anthropic error: ${resp.status}`)
  }
  const data = await resp.json()
  return {
    content: data.content?.[0]?.text || "",
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
  }
}

async function callGrok({ apiKey, messages, maxTokens = 2000, temperature = 0.7 }: { apiKey: string; messages: Array<{ role: string; content: string }>; maxTokens?: number; temperature?: number }) {
  const resp = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-beta",
      messages: messages.map(m => ({ role: m.role === "system" ? "user" : m.role, content: m.content })),
      max_tokens: maxTokens,
      temperature,
    }),
  })
  if (!resp.ok) {
    throw new Error(`Grok error: ${resp.status}`)
  }
  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens,
  }
}

async function callEmbedAI({ apiKey, messages, maxTokens = 2000, temperature = 0.7 }: { apiKey: string; messages: Array<{ role: string; content: string }>; maxTokens?: number; temperature?: number }) {
  const resp = await fetch("https://api.embed.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "embed-ai-v1", messages, max_tokens: maxTokens, temperature }),
  })
  if (!resp.ok) return null
  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens,
  }
}

// OpenRouter (free-tier friendly via community models)
async function callOpenRouter({ apiKey, messages, maxTokens = 2000, temperature = 0.7, model }: { apiKey: string; messages: Array<{ role: string; content: string }>; maxTokens?: number; temperature?: number; model?: string }) {
  // Use a robust default that always resolves on OpenRouter
  const usedModel = model || process.env.OPENROUTER_MODEL || "openrouter/auto"
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "GizmoReader",
    },
    body: JSON.stringify({
      model: usedModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })
  if (!resp.ok) {
    let msg = `OpenRouter error: ${resp.status}`
    try {
      const j = await resp.json()
      if (j?.error?.message) msg = j.error.message
    } catch {}
    throw new Error(msg)
  }
  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content || "",
    tokensUsed: data.usage?.total_tokens,
  }
}

function resolveProvider(preferences: any) {
  const provider = (preferences?.aiProvider || process.env.DEFAULT_AI_PROVIDER || "openrouter").toLowerCase()
  return provider
}

// Unified AI call function that routes to the correct provider
async function callAIProvider({ 
  provider, 
  apiKey, 
  messages, 
  maxTokens = 2000, 
  temperature = 0.7 
}: { 
  provider: string; 
  apiKey: string; 
  messages: Array<{ role: string; content: string }>; 
  maxTokens?: number; 
  temperature?: number 
}) {
  // Validate API key exists
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API key is required but was not provided. Please add your API key in settings.")
  }

  const normalizedProvider = provider.toLowerCase()
  
  switch (normalizedProvider) {
    case "openrouter":
      return await callOpenRouter({ apiKey, messages, maxTokens, temperature })
    case "openai":
      return await callOpenAIChat({ apiKey, messages, maxTokens, temperature })
    case "anthropic":
    case "claude":
      return await callAnthropic({ apiKey, messages, maxTokens, temperature })
    case "grok":
    case "xai":
      return await callGrok({ apiKey, messages, maxTokens, temperature })
    default:
      // Default to OpenRouter if unknown provider
      return await callOpenRouter({ apiKey, messages, maxTokens, temperature })
  }
}

// Generate SmartNotes using selected provider
export const generateNotes = action({
  args: {
    content: v.string(),
    style: v.optional(v.string()), // detailed, concise, bullets
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

    const prompt = `As an expert educational assistant, create ${args.style || "detailed"} study notes from the following content. 
Include key concepts, definitions, important points, and a summary. Format it clearly for easy studying:\n\n${args.content}`

    try {
      const preferences = await getUserPreferences(ctx)
      const provider = resolveProvider(preferences)
      const apiKey = args.apiKey || preferences.aiApiKey || 
        (provider === "openai" ? process.env.OPENAI_API_KEY : 
         provider === "openrouter" ? process.env.OPENROUTER_API_KEY :
         provider === "anthropic" || provider === "claude" ? process.env.ANTHROPIC_API_KEY :
         provider === "grok" || provider === "xai" ? process.env.GROK_API_KEY :
         process.env.EMBEDAI_API_KEY)

      if (!apiKey) {
        throw new Error("No API key found. Please add your OpenAI API key in settings.")
      }

      return await callAIProvider({ 
        provider, 
        apiKey, 
        messages: [{ role: "user", content: prompt }], 
        maxTokens: 2000, 
        temperature: 0.7 
      })
    } catch (error: any) {
      console.error("AI generation error:", error)
      const errorMessage = error?.message || "Failed to generate notes"
      
      // Throw user-actionable errors
      if (errorMessage.includes("API key") || errorMessage.includes("Rate limit") || errorMessage.includes("Invalid")) {
        throw new Error(errorMessage)
      }
      
      // Fallback for unexpected errors
      return {
        content: `# Study Notes\n\n## Overview\nBased on your content, here are the key concepts:\n\n## Key Concepts\n- Main Topic: Core concept explanation\n- Important Points: Key details to remember\n- Applications: Real-world uses\n\n## Summary\n⚠️ ${errorMessage}\n\nAdd your AI API key (OpenAI recommended) in settings for enhanced AI-generated content.`,
        tokensUsed: 0,
      }
    }
  },
})

// Generate Flashcards using selected provider
export const generateFlashcards = action({
  args: {
    content: v.string(),
    count: v.number(),
    difficulty: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

    const prompt = `Create ${args.count} educational flashcards from the following content. 
Format as JSON array with "front" and "back" fields. Make questions clear and answers comprehensive.
Difficulty level: ${args.difficulty || "medium"}\n\n${args.content}`

    try {
      const preferences = await getUserPreferences(ctx)
      const provider = resolveProvider(preferences)
      const apiKey = args.apiKey || preferences.aiApiKey || 
        (provider === "openai" ? process.env.OPENAI_API_KEY : 
         provider === "openrouter" ? process.env.OPENROUTER_API_KEY :
         provider === "anthropic" || provider === "claude" ? process.env.ANTHROPIC_API_KEY :
         provider === "grok" || provider === "xai" ? process.env.GROK_API_KEY :
         process.env.EMBEDAI_API_KEY)

      if (apiKey) {
        const result = await callAIProvider({ 
          provider, 
          apiKey, 
          messages: [{ role: "user", content: prompt }], 
          maxTokens: 3000, 
          temperature: 0.5 
        })
        const content = result.content || ""
        if (content) {
          try {
            const jsonMatch = content.match(/\[[\s\S]*\]/)
            if (jsonMatch) {
              return JSON.parse(jsonMatch[0])
            }
          } catch {}
        }
      }

      // Fallback template cards
      return Array.from({ length: Math.min(args.count, 5) }).map((_, i) => ({
        front: `Question ${i + 1}: What is a key concept from this material?`,
        back: `Answer ${i + 1}: This is an important concept that explains the main topic. Add your API key for more detailed flashcards.`,
      }))
    } catch (error) {
      console.error("Flashcard generation error:", error)
      return Array.from({ length: Math.min(args.count, 5) }).map((_, i) => ({
        front: `Question ${i + 1}: What is a key concept from this material?`,
        back: `Answer ${i + 1}: This is an important concept that explains the main topic. Add your API key for more detailed flashcards.`,
      }))
    }
  },
})

// Generate Quiz using selected provider
export const generateQuiz = action({
  args: {
    content: v.string(),
    count: v.number(),
    difficulty: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

    const prompt = `Create ${args.count} multiple-choice practice test questions from the following content.
Return ONLY valid JSON (no backticks) as an array of objects with keys: "question" (string), "options" (array of 4 strings), "correctAnswer" (0-3), "explanation" (string).
Difficulty: ${args.difficulty || "medium"}\n\n${args.content}`

    try {
      const preferences = await getUserPreferences(ctx)
      const provider = resolveProvider(preferences)
      const apiKey = args.apiKey || preferences.aiApiKey || 
        (provider === "openai" ? process.env.OPENAI_API_KEY : 
         provider === "openrouter" ? process.env.OPENROUTER_API_KEY :
         provider === "anthropic" || provider === "claude" ? process.env.ANTHROPIC_API_KEY :
         provider === "grok" || provider === "xai" ? process.env.GROK_API_KEY :
         process.env.EMBEDAI_API_KEY)

      if (!apiKey) {
        throw new Error("No API key found. Please add your OpenAI API key in settings.")
      }

      const result = await callAIProvider({ 
        provider, 
        apiKey, 
        messages: [{ role: "user", content: prompt }], 
        maxTokens: 3000, 
        temperature: 0.3 
      })
      const content = result.content || ""
      if (content) {
        // 1) Try strict JSON array extraction
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            if (Array.isArray(parsed) && parsed.length > 0) return parsed
          }
        } catch {}

        // 2) Try to parse a numbered/text list fallback like:
        // 1. Question ...\nOption A ...\nOption B ... etc.
        try {
          const lines = content.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean)
          const questions: any[] = []
          let i = 0
          while (i < lines.length) {
            const qMatch = lines[i].match(/^\d+\.?\s*(.*)$/)
            if (qMatch) {
              const questionText = qMatch[1] || lines[i]
              const opts: string[] = []
              let j = i + 1
              while (j < lines.length && opts.length < 4) {
                const optMatch = lines[j].match(/^(?:Option\s+)?([A-D])[:.)]?\s*(.*)$/i)
                if (optMatch) {
                  const optText = optMatch[2] || optMatch[1]
                  opts.push(optText || `Option ${String.fromCharCode(65 + opts.length)}`)
                  j++
                } else if (/^[A-D][:.)]/i.test(lines[j])) {
                  // Fallback for variants like "A) text"
                  const text = lines[j].replace(/^[A-D][:.)]\s*/i, "")
                  opts.push(text || `Option ${String.fromCharCode(65 + opts.length)}`)
                  j++
                } else if (/^Option\s+[A-D]/i.test(lines[j])) {
                  const text = lines[j].replace(/^Option\s+[A-D][:.)]?\s*/i, "")
                  opts.push(text || `Option ${String.fromCharCode(65 + opts.length)}`)
                  j++
                } else {
                  break
                }
              }
              while (opts.length < 4) {
                opts.push(`Option ${String.fromCharCode(65 + opts.length)}`)
              }
              questions.push({
                questionId: `q${questions.length + 1}`,
                question: questionText.replace(/^\d+\.?\s*/, "").trim() || `Question ${questions.length + 1}`,
                options: opts,
                correctAnswer: 0,
                explanation: "",
                difficulty: args.difficulty || "medium",
              })
              i = j
              continue
            }
            i++
          }
          if (questions.length > 0) return questions
        } catch {}
      }

      // If we got content but couldn't parse it, return structured fallback
      throw new Error("Failed to parse AI response. Please try again.")
    } catch (error: any) {
      console.error("Quiz generation error:", error)
      const errorMessage = error?.message || "Failed to generate quiz"
      
      // Don't return fallback if it's a user-actionable error
      if (errorMessage.includes("API key") || errorMessage.includes("Rate limit") || errorMessage.includes("Invalid")) {
        throw new Error(errorMessage)
      }
      
      // Fallback template questions for unexpected errors
      return Array.from({ length: Math.min(args.count, 5) }).map((_, i) => ({
        questionId: `q${i + 1}`,
        question: `Question ${i + 1}: What is a key concept?`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: i % 4,
        explanation: `Explanation for question ${i + 1}. ${errorMessage}`,
        difficulty: args.difficulty || "medium",
      }))
    }
  },
})

// Chat with AI Tutor using selected provider
export const chatWithTutor = action({
  args: {
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    context: v.optional(v.string()), // Revision set context
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ content: string; tokensUsed: number }> => {
    await getAuthUser(ctx)

    const systemPromptBase = `You are an intelligent educational assistant named "Gizmo" for GizmoReader. 
Help students understand concepts, answer questions, and provide study guidance. 
Be encouraging, clear, and educational.`

    try {
      const preferences = await getUserPreferences(ctx)
      const provider = resolveProvider(preferences)
      const userProfile: any = await ctx.runQuery(api.users.getCurrentUserProfile, {})
      const apiKey = args.apiKey || preferences.aiApiKey || 
        (provider === "openai" ? process.env.OPENAI_API_KEY : 
         provider === "openrouter" ? process.env.OPENROUTER_API_KEY :
         provider === "anthropic" || provider === "claude" ? process.env.ANTHROPIC_API_KEY :
         provider === "grok" || provider === "xai" ? process.env.GROK_API_KEY :
         process.env.EMBEDAI_API_KEY)

      if (!apiKey) {
        return {
          content: `I'd love to help, but I need an API key to provide AI responses.\n\n**Please add your AI API key in Settings (OpenRouter recommended):**\n1. Go to Settings\n2. Choose "OpenRouter" as provider\n3. Paste your OpenRouter key (sk-or-...)\n4. Save and try again\n\nI can help explain concepts, answer questions, and provide study tips once configured!`,
          tokensUsed: 0,
        }
      }

      const systemPrompt: string = `${systemPromptBase}
${userProfile?.name ? `\n\nStudent: ${userProfile.name}` : ""}
${preferences?.subjectsOfInterest ? `\nPreferences: subjects=${(preferences.subjectsOfInterest || []).join(", ")}` : ""}
${args.context ? `\n\nContext from student's materials: ${args.context}` : ""}`

      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
        ...args.messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      ]
      return await callAIProvider({ provider, apiKey, messages, maxTokens: 2000, temperature: 0.8 })
    } catch (error: any) {
      console.error("Chat error:", error)
      const errorMessage = error?.message || "Unknown error occurred"
      
      // Provide helpful error messages based on error type
      if (errorMessage.includes("Rate limit") || errorMessage.includes("quota") || errorMessage.includes("exceeded your current quota")) {
        return {
          content: `⚠️ **Quota/Rate Limit Issue**\n\n${errorMessage}\n\n**This error usually means:**\n1. **Payment Method Required**: Even with budget set, you may need to add/verify a payment method\n2. **Account Verification**: New accounts may need verification before API access\n3. **Soft Limits**: Some accounts have $0 spend limits until payment method is verified\n\n**How to fix:**\n1. Go to https://platform.openai.com/account/billing\n2. Add or verify your payment method\n3. Check if your account needs verification\n4. Wait a few minutes after updating billing\n5. Try again\n\n**If budget shows $0 spent:** This typically means your account needs payment method verification, not that you've hit spending limits.`,
          tokensUsed: 0,
        }
      } else if (errorMessage.includes("Invalid API key") || errorMessage.includes("401")) {
        return {
          content: `🔑 **API Key Issue**\n\n${errorMessage}\n\n**Please check:**\n1. Your API key is correct in settings\n2. The key hasn't expired\n3. The key has sufficient credits\n\nUpdate your API key in Settings and try again.`,
          tokensUsed: 0,
        }
      } else if (errorMessage.includes("API key")) {
        return {
          content: `🔑 **API Key Required**\n\n${errorMessage}\n\nPlease add your AI API key in Settings (OpenRouter sk-or-... recommended).`,
          tokensUsed: 0,
        }
      }
      
      return {
        content: `❌ **Error**: ${errorMessage}\n\n**Troubleshooting:**\n- Check your API key in settings\n- Verify your internet connection\n- Wait a moment and try again\n- Contact support if the issue persists`,
        tokensUsed: 0,
      }
    }
  },
})

// Analyze past paper and generate solutions
export const analyzePastPaper = action({
  args: {
    pastPaperTitle: v.string(),
    pastPaperContent: v.optional(v.string()), // Extracted text from PDF if available
    questions: v.optional(v.array(v.string())), // Specific questions to analyze
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

    const prompt = `You are an expert educational assistant helping a student analyze a past paper exam.
    
Past Paper: ${args.pastPaperTitle}
${args.pastPaperContent ? `\nContent:\n${args.pastPaperContent.substring(0, 2000)}` : ""}
${args.questions && args.questions.length > 0 ? `\n\nSpecific Questions to Analyze:\n${args.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}` : ""}

Please provide:
1. A comprehensive analysis of the past paper
2. Key topics and concepts covered
3. Difficulty assessment
4. Study recommendations
5. If questions are provided, detailed solutions and explanations

Format your response clearly with sections and bullet points.`

    try {
      const preferences = await getUserPreferences(ctx)
      const provider = resolveProvider(preferences)
      const apiKey = args.apiKey || preferences.aiApiKey || 
        (provider === "openai" ? process.env.OPENAI_API_KEY : 
         provider === "openrouter" ? process.env.OPENROUTER_API_KEY :
         provider === "anthropic" || provider === "claude" ? process.env.ANTHROPIC_API_KEY :
         provider === "grok" || provider === "xai" ? process.env.GROK_API_KEY :
         process.env.EMBEDAI_API_KEY)

      if (apiKey) {
        return await callAIProvider({ 
          provider, 
          apiKey, 
          messages: [{ role: "user", content: prompt }], 
          maxTokens: 4000, 
          temperature: 0.7 
        })
      }

      return {
        content: `# Past Paper Analysis\n\n## Overview\nThis is a fallback response. Add your AI API key (OpenRouter recommended) in Settings for detailed AI analysis.\n\n## Key Topics\n- Main topics covered in the paper\n- Important concepts to review\n\n## Study Recommendations\n- Focus areas based on the paper structure\n- Suggested revision materials`,
        tokensUsed: 0,
      }
    } catch (error) {
      console.error("Past paper analysis error:", error)
      return {
        content: `# Past Paper Analysis\n\n## Overview\nThis is a fallback response. Add your AI API key (OpenRouter recommended) in Settings for detailed AI analysis.\n\n## Key Topics\n- Main topics covered in the paper\n- Important concepts to review\n\n## Study Recommendations\n- Focus areas based on the paper structure\n- Suggested revision materials`,
        tokensUsed: 0,
      }
    }
  },
})

// Generate solutions for past paper questions
export const generatePastPaperSolutions = action({
  args: {
    question: v.string(),
    subject: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

    const prompt = `You are an expert tutor providing detailed solutions to exam questions.

Question: ${args.question}
${args.subject ? `Subject: ${args.subject}` : ""}
${args.difficulty ? `Difficulty: ${args.difficulty}` : ""}

Please provide:
1. A step-by-step solution
2. Clear explanations for each step
3. Alternative approaches if applicable
4. Key concepts tested
5. Common mistakes to avoid

Format your response clearly with numbered steps and explanations.`

    try {
      const preferences = await getUserPreferences(ctx)
      const provider = resolveProvider(preferences)
      const apiKey = args.apiKey || preferences.aiApiKey || 
        (provider === "openai" ? process.env.OPENAI_API_KEY : 
         provider === "anthropic" || provider === "claude" ? process.env.ANTHROPIC_API_KEY :
         provider === "grok" || provider === "xai" ? process.env.GROK_API_KEY :
         process.env.EMBEDAI_API_KEY)

      if (apiKey) {
        return await callAIProvider({ 
          provider, 
          apiKey, 
          messages: [{ role: "user", content: prompt }], 
          maxTokens: 3000, 
          temperature: 0.5 
        })
      }

      return {
        content: `# Solution\n\n## Step-by-Step Solution\n\n1. [Step 1 explanation]\n2. [Step 2 explanation]\n3. [Step 3 explanation]\n\n## Key Concepts\n- Concept 1\n- Concept 2\n\n## Common Mistakes\n- Mistake to avoid\n\n*Add your AI API key (OpenRouter recommended) in Settings for detailed AI-generated solutions.*`,
        tokensUsed: 0,
      }
    } catch (error) {
      console.error("Solution generation error:", error)
      return {
        content: `# Solution\n\n## Step-by-Step Solution\n\n1. [Step 1 explanation]\n2. [Step 2 explanation]\n3. [Step 3 explanation]\n\n## Key Concepts\n- Concept 1\n- Concept 2\n\n## Common Mistakes\n- Mistake to avoid\n\n*Add your AI API key (OpenRouter recommended) in Settings for detailed AI-generated solutions.*`,
        tokensUsed: 0,
      }
    }
  },
})

// Extract questions from past paper
export const extractQuestionsFromPastPaper = action({
  args: {
    pastPaperTitle: v.string(),
    pastPaperContent: v.string(),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

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
Content: ${args.pastPaperContent.substring(0, 4000)}`

    try {
      const preferences = await getUserPreferences(ctx)
      const provider = resolveProvider(preferences)
      const apiKey = args.apiKey || preferences.aiApiKey || 
        (provider === "openai" ? process.env.OPENAI_API_KEY : 
         provider === "anthropic" || provider === "claude" ? process.env.ANTHROPIC_API_KEY :
         provider === "grok" || provider === "xai" ? process.env.GROK_API_KEY :
         process.env.EMBEDAI_API_KEY)

      if (!apiKey) {
        throw new Error("No API key found. Please add your OpenAI API key in settings.")
      }

      const result = await callAIProvider({ 
        provider, 
        apiKey, 
        messages: [{ role: "user", content: prompt }], 
        maxTokens: 4000, 
        temperature: 0.3 
      })
      
      const content = result.content || ""
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const questions = JSON.parse(jsonMatch[0])
          return { questions }
        }
      } catch (parseError) {
        console.error("Failed to parse questions:", parseError)
      }
      
      throw new Error("Failed to extract questions. Please try again.")
    } catch (error: any) {
      console.error("Question extraction error:", error)
      throw new Error(error?.message || "Failed to extract questions")
    }
  },
})

// Chat about past paper (discuss specific questions)
export const discussPastPaper = action({
  args: {
    messages: v.array(v.object({ role: v.string(), content: v.string() })),
    pastPaperContext: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getAuthUser(ctx)

    const systemPrompt = `You are an expert tutor helping a student understand and discuss past paper exam questions. 
Provide clear explanations, study tips, and help them understand the concepts being tested.
${args.pastPaperContext ? `\n\nContext about the past paper:\n${args.pastPaperContext}` : ""}`

    try {
      const preferences = await getUserPreferences(ctx)
      const provider = resolveProvider(preferences)
      const apiKey = args.apiKey || preferences.aiApiKey || 
        (provider === "openai" ? process.env.OPENAI_API_KEY : 
         provider === "anthropic" || provider === "claude" ? process.env.ANTHROPIC_API_KEY :
         provider === "grok" || provider === "xai" ? process.env.GROK_API_KEY :
         process.env.EMBEDAI_API_KEY)

      if (apiKey) {
        const messages = [
          { role: "system", content: systemPrompt },
          ...args.messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        ]
        return await callAIProvider({ provider, apiKey, messages, maxTokens: 2000, temperature: 0.8 })
      }

      return {
        content: `I'd love to help you discuss this past paper! To get detailed AI assistance, please add your AI API key (OpenRouter recommended) in Settings.`,
        tokensUsed: 0,
      }
    } catch (error) {
      console.error("Past paper discussion error:", error)
      return {
        content: `I ran into an issue. Please try again or add a valid AI API key (OpenRouter recommended) in Settings for better assistance.`,
        tokensUsed: 0,
      }
    }
  },
})
