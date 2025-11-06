"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { Onboarding } from "./onboarding";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Get authId directly from Better Auth session (fast!)
  const { data: session, isPending } = authClient.useSession();
  const authId = session?.user?.id || null;
  
  // Only query onboarding status if we have authId
  const onboardingStatus = useQuery(
    api.users.getOnboardingStatus,
    authId ? { authId } : "skip"
  );

  // Skip onboarding check on auth pages
  const isAuthPage = pathname?.startsWith("/auth");
  const isApiRoute = pathname?.startsWith("/api");

  if (isAuthPage || isApiRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Authenticated>
        {isPending || !authId || onboardingStatus === undefined ? (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin mx-auto"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        ) : onboardingStatus && !onboardingStatus.onboarded ? (
          <Onboarding />
        ) : (
          children
        )}
      </Authenticated>
      <Unauthenticated>{children}</Unauthenticated>
    </>
  );
}
