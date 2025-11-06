import { createAuthClient } from "better-auth/react"
import { convexClient } from "@convex-dev/better-auth/client/plugins"
import { adminClient } from "better-auth/client/plugins"

const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NEXT_PUBLIC_CONVEX_URL
        ? `http://${process.env.NEXT_PUBLIC_CONVEX_URL.replace("https://", "").split("/")[0]}`
        : "http://localhost:3000");

export const authClient = createAuthClient({
  baseURL,
  plugins: [convexClient(), adminClient()],
})

// Export the useSession hook for convenience
export const { useSession } = authClient;
