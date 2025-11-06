"use client";

import { authClient } from "@/lib/auth-client";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, Chrome } from "lucide-react";
import { useState } from "react";

export default function SignInForm({
  onSwitchToSignUp,
}: {
  onSwitchToSignUp: () => void;
}) {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await authClient.signIn.email({
          email: value.email,
          password: value.password,
        });

        if (result.user) {
          toast.success("Welcome back!");
          setTimeout(() => {
            router.push("/dashboard");
          }, 100);
        }
      } catch (error: any) {
        toast.error(error.error?.message || error.message || "Sign in failed");
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (error: any) {
      toast.error(error.message || "Google sign in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md p-4 sm:p-6 md:p-8">
      <div className="space-y-2 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome Back</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Sign in to continue learning</p>
      </div>

      {/* Google Sign In Button */}
      <Button
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        variant="outline"
        className="w-full mb-4 sm:mb-6 flex items-center justify-center gap-2 h-10 sm:h-11 bg-transparent border-border hover:bg-card"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Chrome className="w-4 h-4" />
        )}
        <span className="text-sm sm:text-base">Continue with Google</span>
      </Button>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-4 sm:mb-6">
        <div className="flex-1 h-px bg-border"></div>
        <span className="text-xs sm:text-sm text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="flex items-center gap-2 text-sm sm:text-base">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="your@email.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-10 sm:h-11 bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-xs sm:text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="flex items-center gap-2 text-sm sm:text-base">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  placeholder="••••••••"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-10 sm:h-11 bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-xs sm:text-sm text-destructive">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              className="w-full h-10 sm:h-11 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span className="text-sm sm:text-base">Signing In...</span>
                </>
              ) : (
                <span className="text-sm sm:text-base">Sign In</span>
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <div className="mt-4 sm:mt-6 text-center">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button
            variant="link"
            onClick={onSwitchToSignUp}
            className="p-0 h-auto font-semibold text-primary hover:text-primary/80 text-xs sm:text-sm"
          >
            Sign Up
          </Button>
        </p>
      </div>
    </div>
  );
}
