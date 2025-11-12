import { nextJsHandler } from "@convex-dev/better-auth/nextjs";

// The handler automatically uses the Convex auth setup
// Add timeout and error handling
const handler = nextJsHandler();

export const GET = async (req: Request) => {
  try {
    return await handler.GET(req);
  } catch (error: any) {
    console.error("Auth GET error:", error);
    // Return a proper error response instead of crashing
    return new Response(
      JSON.stringify({ error: "Authentication error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const POST = async (req: Request) => {
  try {
    return await handler.POST(req);
  } catch (error: any) {
    console.error("Auth POST error:", error);
    // Return a proper error response instead of crashing
    return new Response(
      JSON.stringify({ error: "Authentication error", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
