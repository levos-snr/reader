import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";
import { UserSync } from "@/components/user-sync";
import { OnboardingGuard } from "@/components/onboarding-guard";

export const metadata: Metadata = {
  title: "GizmoRevivor - Transform Your Exam Preparation",
  description:
    "The ultimate learning management system designed specifically for exam success. Smart revision, personalized study paths, and AI-powered insights.",
  keywords: [
    "learning",
    "exam preparation",
    "study",
    "revision",
    "LMS",
    "education",
    "AI",
    "Kenya learning platform",
  ],
  authors: [{ name: "Lewis Odero" }],
  openGraph: {
    title: "StudyFlow - Transform Your Exam Preparation",
    description:
      "The ultimate learning management system designed specifically for exam success.",
    url: "https://gizmoreader.com",
    siteName: "Gizmoreader",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification tokens here
    // google: "your-google-verification-token",
    // yandex: "your-yandex-verification-token",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <UserSync />

          <div className="grid grid-rows-[auto_1fr] h-svh">

            <OnboardingGuard>{children}</OnboardingGuard>
          </div>
        </Providers>
      </body>
    </html>
  );
}
