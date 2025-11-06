"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { CoursesList } from "@/components/courses-list";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function CoursesPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  return (
    <>
      <Authenticated>
        <div className="min-h-screen bg-background">
          
          {/* Main Content */}
          <div className="pt-20 max-w-7xl mx-auto p-6">
            {session?.user?.id && <CoursesList userId={session.user.id} />}
          </div>
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">Not Authenticated</h1>
            <p className="text-muted-foreground">
              Please sign in to manage your courses
            </p>
            <Button onClick={() => router.push("/auth")}>Go to Sign In</Button>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}
