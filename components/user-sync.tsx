"use client";
import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export function UserSync() {
  const syncUser = useMutation(api.users.syncCurrentUser);
  const session = authClient.useSession();
  const [hasSynced, setHasSynced] = useState(false);

  useEffect(() => {
    // Only sync once when user session is available
    if (session.data?.user && !hasSynced) {
      console.log("Syncing user:", session.data.user.id);
      
      syncUser()
        .then(() => {
          console.log("User synced successfully");
          setHasSynced(true);
        })
        .catch((error) => {
          console.error("Failed to sync user:", error);
          // Don't block on sync failure
          setHasSynced(true);
        });
    }
  }, [session.data?.user, syncUser, hasSynced]);

  return null;
}

/**
 * Hook to get authId from Better Auth session
 * This is used to pass authId to Convex queries
 */
export function useAuthId() {
  const session = authClient.useSession();
  return session.data?.user?.id || null;
}
