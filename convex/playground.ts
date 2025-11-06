import { definePlaygroundAPI } from "@convex-dev/agent"
import { components } from "./_generated/api"
import { studyAgent } from "./agents"

export const {
  isApiKeyValid,
  listAgents,
  listUsers,
  listThreads,
  listMessages,
  createThread,
  generateText,
  fetchPromptContext,
} = definePlaygroundAPI(components.agent, {
  agents: [studyAgent],
})


