"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { BookOpen, Brain, Zap, ArrowRight, Sparkles, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"
import Header from "@/components/header";

export default function HomePage() {
  const router = useRouter()

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Summaries",
      description: "Generate intelligent summaries from your course materials with advanced AI",
    },
    {
      icon: Zap,
      title: "Quick Quiz Generation",
      description: "Create comprehensive quizzes in seconds to test your understanding",
    },
    {
      icon: BookOpen,
      title: "Course Organization",
      description: "Organize and manage all your courses in one centralized platform",
    },
    {
      icon: BarChart3,
      title: "Progress Analytics",
      description: "Monitor your learning progress with detailed analytics and insights",
    },
  ]

  const stats = [
    { stat: "50K+", label: "Active Students" },
    { stat: "1M+", label: "Materials Processed" },
    { stat: "4.9★", label: "Average Rating" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />
      

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 sm:space-y-8 mb-12 sm:mb-16">
            <div className="inline-block">
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border bg-card/50 backdrop-blur flex items-center gap-2">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-foreground">AI-Powered Learning Revolution</span>
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-balance leading-tight">
              Master Your Courses with
              <span className="text-gradient-primary ml-2 inline-block">Smart Revision</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance leading-relaxed px-4 sm:px-0">
              Transform your course materials into personalized learning tools. Generate summaries, quizzes, and
              revision guides powered by cutting-edge AI. Study smarter, not harder.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="flex items-center gap-2 w-full sm:w-auto bg-gradient-primary text-white shadow-lg hover:shadow-xl transition-smooth"
                >
                  Start Learning Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-border hover:bg-card transition-smooth bg-transparent"
              >
                View Demo
              </Button>
            </div>

            {/* Animated background blobs */}
            <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none overflow-hidden">
              <div className="absolute top-20 left-1/4 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-primary rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
              <div className="absolute top-40 right-1/4 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-balance px-4 sm:px-0">
              Powerful Features for Smart Students
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
              Everything you need to excel in your studies, all in one platform
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, idx) => (
              <Card
                key={idx}
                className="group hover:border-primary/50 hover:shadow-lg transition-smooth p-4 sm:p-6 bg-background/50 backdrop-blur border border-border hover:bg-card/50"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-gradient-primary group-hover:text-white transition-smooth">
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="font-bold text-base sm:text-lg mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 sm:mb-12 px-4 sm:px-0">
            Trusted by Thousands of Students
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {stats.map((item, idx) => (
              <Card
                key={idx}
                className="p-6 sm:p-8 bg-card/50 border border-border backdrop-blur hover:border-primary/50 transition-smooth"
              >
                <p className="text-3xl sm:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                  {item.stat}
                </p>
                <p className="text-sm sm:text-base text-muted-foreground">{item.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-card/50 border-y border-border">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-balance">Ready to Transform Your Learning?</h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Join thousands of students using RevisionHub to ace their exams
          </p>
          <Link href="/dashboard">
            <Button
              size="lg"
              className="flex items-center gap-2 mx-auto bg-gradient-primary text-white shadow-lg hover:shadow-xl transition-smooth"
            >
              Start Your Free Trial
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 sm:py-12 px-4 sm:px-6 lg:px-8 bg-background/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "Updates"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers"],
              },
              {
                title: "Legal",
                links: ["Privacy", "Terms", "Cookies"],
              },
              {
                title: "Support",
                links: ["Help Center", "Contact", "Status"],
              },
            ].map((col, idx) => (
              <div key={idx}>
                <h3 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">{col.title}</h3>
                <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  {col.links.map((link, i) => (
                    <li key={i}>
                      <Link href="#" className="hover:text-foreground transition">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-6 sm:pt-8 text-center text-xs sm:text-sm text-muted-foreground">
            <p>&copy; 2025 RevisionHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
