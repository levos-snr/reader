import { query, mutation, internalAction } from "./_generated/server"
import { v } from "convex/values"
import { components, internal } from "./_generated/api"
import { saveMessage, listUIMessages, vStreamArgs, syncStreams } from "@convex-dev/agent"
import { agentWithOpenAIApiKey } from "./agents"
import { authComponent } from "./auth"

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: v.object({ cursor: v.optional(v.string()), numItems: v.number() }),
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: { cursor: args.paginationOpts.cursor ?? null, numItems: args.paginationOpts.numItems },
    })
    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    })
    return { ...paginated, streams }
  },
})

export const sendMessage = mutation({
  args: { threadId: v.string(), prompt: v.string(), apiKey: v.optional(v.string()) },
  handler: async (ctx, { threadId, prompt, apiKey }) => {
    const authUser = await authComponent.getAuthUser(ctx)
    const userId = authUser?._id?.toString()
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      prompt,
      userId,
    })
    await ctx.scheduler.runAfter(0, internal.chatAgent.generateResponseAsync, {
      threadId,
      promptMessageId: messageId,
      apiKey,
    })
  },
})

export const generateResponseAsync = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string(), apiKey: v.optional(v.string()) },
  handler: async (ctx, { threadId, promptMessageId, apiKey }) => {
    const agent = agentWithOpenAIApiKey(apiKey || process.env.OPENAI_API_KEY || "")
    const { thread } = await agent.continueThread(ctx, { threadId })
    await thread.generateText({ promptMessageId })
  },
})


