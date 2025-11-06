"use client"
import type React from "react"
import Sidebar from "@/components/sidebar"
import Header from "@/components/header"
import FloatingTutor from "@/components/floating-tutor"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header - spans full width */}
      <Header />
      
      <div className="flex">
        {/* Fixed Sidebar - only on desktop, positioned below header */}
        <Sidebar />
        
        {/* Main Content - with proper spacing for header and sidebar */}
        <main className="flex-1 md:ml-64 pt-14 min-h-screen w-full">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Floating AI Tutor */}
      <FloatingTutor />
    </div>
  )
}
