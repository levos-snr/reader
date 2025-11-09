import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import agent from "@convex-dev/agent/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import rag from "@convex-dev/rag/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(agent);
app.use(rateLimiter);
app.use(rag);

export default app;
