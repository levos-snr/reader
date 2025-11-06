"use client";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";

type Resource = "course" | "quiz" | "material" | "user" | "session";
type Permission = {
  [K in Resource]?: string[];
};

export function usePermissions() {
  const { data: session, isPending } = authClient.useSession();
  const [isChecking, setIsChecking] = useState(false);
  
  // Get authId from session - memoize to prevent re-renders
  const authId = useMemo(() => session?.user?.id || null, [session?.user?.id]);
  
  // Only query if we have an authId and session is loaded
  const userRoleData = useQuery(
    api.users.getUserRoleByAuthId,
    !isPending && authId ? { authId } : "skip"
  );

  const hasPermission = async (permissions: Permission): Promise<boolean> => {
    if (!session?.user) return false;
    
    setIsChecking(true);
    try {
      const { data } = await authClient.admin.hasPermission({
        permissions,
      });
      return data?.hasPermission || false;
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const checkRolePermission = (
    permissions: Permission,
    role: string
  ): boolean => {
    return authClient.admin.checkRolePermission({
      permissions,
      role,
    });
  };

  // Use role from Convex app's user table
  const role = userRoleData?.role || "user";
  const isAdmin = role === "admin";
  const isInstructor = role === "instructor" || isAdmin;
  const isUser = !!session?.user;
  const isBanned = userRoleData?.banned || false;

  return {
    hasPermission,
    checkRolePermission,
    isAdmin,
    isInstructor,
    isUser,
    isBanned,
    isChecking,
    role,
    userRoleData,
    isLoading: isPending || (authId && userRoleData === undefined),
  };
}

// Convenience hooks for common permission checks
export function useCanCreateCourse() {
  const { isInstructor, isAdmin } = usePermissions();
  return isInstructor || isAdmin;
}

export function useCanManageUsers() {
  const { isAdmin } = usePermissions();
  return isAdmin;
}
