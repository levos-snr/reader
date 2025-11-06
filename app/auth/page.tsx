"use client";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function AuthPage() {
  const [showSignIn, setShowSignIn] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const { data: session } = authClient.useSession();

  useEffect(() => {
    setIsLoading(false);
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10 opacity-30 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-primary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="font-bold text-lg sm:text-xl text-foreground">
                RevisionHub
              </span>
            </Link>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {showSignIn ? "New here?" : "Already have an account?"}
              <button
                onClick={() => setShowSignIn(!showSignIn)}
                className="ml-2 font-semibold text-primary hover:text-primary/80 transition"
              >
                {showSignIn ? "Create account" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-20 sm:pt-24 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

