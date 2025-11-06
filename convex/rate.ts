import { components } from "./_generated/api"
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter"
// No per-user key lookup here to avoid ctx generic mismatch; use a global hook key.

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  tokenUsagePerUser: { kind: "token bucket", period: MINUTE, rate: 2000, capacity: 10000 },
  globalTokenUsage: { kind: "token bucket", period: MINUTE, rate: 100_000 },
})

export const { getRateLimit, getServerTime } = rateLimiter.hookAPI("tokenUsagePerUser", {
  key: "global",
})

export type UsageArgs = {
  usage: { totalTokens?: number }
  userId?: string
}

export async function usageHandler(ctx: any, args: UsageArgs) {
  if (!args.userId || !args.usage?.totalTokens) return
  await rateLimiter.limit(ctx, "tokenUsagePerUser", {
    key: args.userId,
    count: args.usage.totalTokens,
    reserve: true,
  })
}


