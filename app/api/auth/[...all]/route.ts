import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

// The handler automatically uses the Convex auth setup
export const { GET, POST } = nextJsHandler();
