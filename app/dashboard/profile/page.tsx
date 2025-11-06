"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { UserProfile } from "@/components/user-profile";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  return (
    <>
      <Authenticated>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-14 sm:h-16">
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
                <span className="font-bold text-lg sm:text-xl">Profile</span>
                <div className="w-10 sm:w-12"></div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="pt-20 sm:pt-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
            {session?.user?.id && <UserProfile userId={session.user.id} />}
          </div>
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 sm:px-6">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-3xl sm:text-4xl font-bold">Not Authenticated</h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Please sign in to view your profile
            </p>
            <Button onClick={() => router.push("/auth")} size="lg">
              Go to Sign In
            </Button>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}
