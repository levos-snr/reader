import { Agent } from "@convex-dev/agent"
import { components } from "./_generated/api"
import { openai, createOpenAI } from "@ai-sdk/openai"
import { usageHandler } from "./rate"

// Default agent using env OPENAI_API_KEY
export const studyAgent = new Agent(components.agent, {
  name: "Study Agent",
  languageModel: openai.chat("gpt-4o-mini"),
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  usageHandler,
})

// Build an agent bound to a specific per-user API key
export function agentWithOpenAIApiKey(apiKey: string) {
  const client = createOpenAI({ apiKey })
  return new Agent(components.agent, {
    name: "Study Agent (User Key)",
    languageModel: client.chat("gpt-4o-mini"),
    textEmbeddingModel: client.embedding("text-embedding-3-small"),
    usageHandler,
  })
}


