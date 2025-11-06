import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";

// Type guard to check if we have a valid auth user
function isValidAuthUser(user: any): user is { userId?: string; _id: any; email: string; name: string } {
  return user && typeof user === 'object' && '_id' in user;
}

// Helper function to get authId from Better Auth user
function getAuthId(authUser: any): string {
  return authUser.userId || authUser._id.toString();
}

// Helper function to get auth user safely
async function getAuthUserSafe(ctx: any) {
  try {
    const result = await authComponent.getAuthUser(ctx);
    
    if (!result || !isValidAuthUser(result)) {
      return null;
    }
    
    return result;
  } catch (error) {
    console.log("Auth check failed:", error);
    return null;
  }
}

// OPTIMIZED: Check if user is admin by authId (no slow auth call)
export const isAdminByAuthId = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    const appUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
    
    return appUser?.role === "admin";
  },
});

// Check if current user is admin (uses slow auth call)
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await getAuthUserSafe(ctx);
    if (!authUser) return false;
    
    const authId = getAuthId(authUser);
    
    // Check role from app's user table
    const appUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    
    return appUser?.role === "admin";
  },
});

// Get all users from your app's user table (admin only)
export const getAllUsers = query({
  args: {
    limit: v.optional(v.number()),
    skip: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const authUser = await getAuthUserSafe(ctx);
    if (!authUser) throw new Error("Not authenticated");
    
    const authId = getAuthId(authUser);
    
    const currentUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    
    if (currentUser?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    
    // Get all users from your app's user table
    const allUsers = await ctx.db.query("user").order("desc").collect();
    
    const limit = args.limit || 50;
    const skip = args.skip || 0;
    
    return {
      users: allUsers.slice(skip, skip + limit),
      total: allUsers.length,
      limit,
      skip,
    };
  },
});

// Update user role in your app's user table (admin only)
export const updateUserRole = mutation({
  args: {
    authId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const authUser = await getAuthUserSafe(ctx);
    if (!authUser) throw new Error("Not authenticated");
    
    const currentAuthId = getAuthId(authUser);
    
    const currentUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", currentAuthId))
      .first();
    
    if (currentUser?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    
    // Don't allow admins to remove their own admin role
    if (args.authId === currentAuthId && args.role !== "admin") {
      throw new Error("Cannot remove your own admin role");
    }
    
    // Find user in your app's user table
    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
    
    if (!user) {
      throw new Error("User not found in app's user table");
    }
    
    // Update role in your app's user table
    await ctx.db.patch(user._id, {
      role: args.role,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Ban/unban user in your app's user table (admin only)
export const updateUserBanStatus = mutation({
  args: {
    authId: v.string(),
    banned: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const authUser = await getAuthUserSafe(ctx);
    if (!authUser) throw new Error("Not authenticated");
    
    const currentAuthId = getAuthId(authUser);
    
    const currentUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", currentAuthId))
      .first();
    
    if (currentUser?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    
    // Don't allow admins to ban themselves
    if (args.authId === currentAuthId) {
      throw new Error("Cannot ban yourself");
    }
    
    // Find user in your app's user table
    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Update ban status in your app's user table
    await ctx.db.patch(user._id, {
      banned: args.banned,
      updatedAt: Date.now(),
    });
    
    // If banning, also delete all user sessions
    if (args.banned) {
      const sessions = await ctx.db
        .query("session")
        .withIndex("by_authId", (q) => q.eq("authId", args.authId))
        .collect();
      
      for (const session of sessions) {
        await ctx.db.delete(session._id);
      }
    }
    
    return { success: true };
  },
});

// Delete user from your app (admin only) - DANGEROUS
export const deleteUser = mutation({
  args: {
    authId: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin
    const authUser = await getAuthUserSafe(ctx);
    if (!authUser) throw new Error("Not authenticated");
    
    const currentAuthId = getAuthId(authUser);
    
    const currentUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", currentAuthId))
      .first();
    
    if (currentUser?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    
    // Don't allow admins to delete themselves
    if (args.authId === currentAuthId) {
      throw new Error("Cannot delete yourself");
    }
    
    // Find user in your app's user table
    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Delete user's sessions
    const sessions = await ctx.db
      .query("session")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    
    // Delete user's courses
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .collect();
    for (const course of courses) {
      // Delete course materials
      const materials = await ctx.db
        .query("materials")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      for (const material of materials) {
        await ctx.db.delete(material._id);
      }
      
      // Delete course quizzes
      const quizzes = await ctx.db
        .query("quizzes")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .collect();
      for (const quiz of quizzes) {
        await ctx.db.delete(quiz._id);
      }
      
      await ctx.db.delete(course._id);
    }
    
    // Delete user from your app's user table
    await ctx.db.delete(user._id);
    
    return { success: true };
  },
});

// Get user details by authId (admin only)
export const getUserDetails = query({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    // Verify admin
    const authUser = await getAuthUserSafe(ctx);
    if (!authUser) throw new Error("Not authenticated");
    
    const currentAuthId = getAuthId(authUser);
    
    const currentUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", currentAuthId))
      .first();
    
    if (currentUser?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    
    // Get user from your app's user table
    const user = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
    
    if (!user) throw new Error("User not found");
    
    // Get user's sessions
    const sessions = await ctx.db
      .query("session")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .collect();
    
    // Get user's courses
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .collect();
    
    return {
      user,
      sessions,
      coursesCount: courses.length,
    };
  },
});

// Search users in your app's user table (admin only)
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    // Verify admin
    const authUser = await getAuthUserSafe(ctx);
    if (!authUser) throw new Error("Not authenticated");
    
    const authId = getAuthId(authUser);
    
    const currentUser = await ctx.db
      .query("user")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    
    if (currentUser?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    
    const users = await ctx.db.query("user").collect();
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(args.query.toLowerCase()) ||
        user.name.toLowerCase().includes(args.query.toLowerCase())
    );
  },
});
