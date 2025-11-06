"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  Home,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Brain,
  Target,
  FileText,
  Clock,
  Award,
  BookMarked,
  GraduationCap,
  TrendingUp,
  Folder,
  Star,
  Zap,
  Layers,
  Calendar,
  File,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const navigationStructure = [
  {
    type: "section",
    label: "Quick Access",
    items: [],
  },
  {
    type: "group",
    label: "Dashboard",
    icon: Home,
    path: "/dashboard",
    items: [
      { label: "Overview", path: "/dashboard", icon: TrendingUp },
      { label: "Analytics", path: "/dashboard/analytics", icon: Award },
    ],
  },
  {
    type: "group",
    label: "Revision Sets",
    icon: BookOpen,
    path: "/dashboard/revision-sets",
    items: [
      { label: "All Sets", path: "/dashboard/revision-sets", icon: Folder },
      { label: "Favorites", path: "/dashboard/revision-sets/favorites", icon: Star },
    ],
  },
  {
    type: "group",
    label: "AI Learning Tools",
    icon: Zap,
    path: "/dashboard/revision-sets",
    items: [
      { label: "SmartNotes", path: "/dashboard/revision-sets", icon: FileText, feature: "notes", clickable: true },
      { label: "FlashGen", path: "/dashboard/revision-sets", icon: Brain, feature: "flashcards", clickable: true },
      { label: "QuizCraft", path: "/dashboard/revision-sets", icon: Target, feature: "quizzes", clickable: true },
      { label: "Gizmo Tutor", path: "/dashboard/revision-sets", icon: GraduationCap, feature: "tutor", clickable: true },
    ],
  },
  {
    type: "group",
    label: "Progress Tracking",
    icon: TrendingUp,
    path: "/dashboard/progress",
    items: [
      { label: "Study History", path: "/dashboard/progress/history", icon: Clock },
      { label: "Performance", path: "/dashboard/progress/performance", icon: Award },
      { label: "Goals", path: "/dashboard/progress/goals", icon: Target },
    ],
  },
  {
    type: "single",
    label: "Revision Scheduler",
    icon: Calendar,
    path: "/dashboard/scheduler",
  },
  {
    type: "single",
    label: "Past Papers",
    icon: BookMarked,
    path: "/dashboard/past-papers",
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Dashboard", "Revision Sets", "AI Learning Tools"])

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard"
    }
    // For AI Learning Tools, only match exact paths, not all revision-sets paths
    if (path === "/dashboard/revision-sets" && pathname.includes("/revision-sets/")) {
      // Check if we're in a specific revision set feature
      const features = ["/materials", "/notes", "/flashcards", "/quizzes", "/tutor", "/progress"]
      const isFeature = features.some(f => pathname.includes(f))
      return isFeature
    }
    return pathname.startsWith(path)
  }

  // Extract current revisionSetId from path if present
  const match = pathname.match(/\/revision-sets\/([a-z0-9-]+)/i)
  const currentRevisionSetId = match ? match[1] : null

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]))
  }

  const SidebarContent = () => (
    <>
      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navigationStructure.map((item, index) => {
          if (item.type === "section") {
            return (
              <div key={index} className="px-3 mb-1">
                <div className="text-xs font-medium text-muted-foreground px-3 py-2">{item.label}</div>
              </div>
            )
          }

          if (item.type === "single") {
            const Icon = item.icon || Home
            const active = isActive(item.path)

            return (
              <div key={index} className="px-3 mb-1">
                <Link href={item.path} onClick={() => setMobileOpen(false)}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm",
                      active ? "bg-accent text-accent-foreground font-medium" : "text-foreground hover:bg-accent/50",
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </div>
                </Link>
              </div>
            )
          }

          if (item.type === "group") {
            const Icon = item.icon || Home
            const isExpanded = expandedGroups.includes(item.label)
            const isGroupActive = isActive(item.path)

            return (
              <div key={index} className="px-3 mb-2">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-md transition-colors text-sm group",
                    isGroupActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-foreground hover:bg-accent/50",
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>

                {/* Group Items with connecting lines */}
                {isExpanded && item.items && item.items.length > 0 && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-border space-y-0.5">
                    {item.items.map((subItem, subIndex) => {
                      const SubIcon = subItem.icon || Home
                      // For AI Learning Tools items, check if pathname matches the specific feature
                      let subActive = false
                      if (item.label === "AI Learning Tools" && (subItem as any).feature) {
                        // Check if current path matches the specific AI tool feature
                        const feature = (subItem as any).feature
                        subActive = pathname.includes(`/${feature}`)
                      } else {
                        subActive = isActive(subItem.path)
                      }

                      return (
                        <div key={subIndex} className="relative">
                          {/* Horizontal line connector */}
                          <div className="absolute left-0 top-1/2 w-3 h-px bg-border -translate-y-1/2" />

                      {item.label === "AI Learning Tools" ? (
                            <Link
                              href={
                                currentRevisionSetId
                                  ? `/dashboard/revision-sets/${currentRevisionSetId}/${(subItem as any).feature}`
                                  : "/dashboard/revision-sets"
                              }
                              onClick={() => setMobileOpen(false)}
                            >
                            <div
                              className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ml-3 cursor-pointer",
                                subActive
                                  ? "bg-accent text-accent-foreground font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                              )}
                            >
                              <SubIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="flex-1">{subItem.label}</span>
                            </div>
                            </Link>
                          ) : (
                            <Link 
                              href={subItem.path} 
                              onClick={() => setMobileOpen(false)}
                            >
                              <div
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ml-3 cursor-pointer",
                                  subActive
                                    ? "bg-accent text-accent-foreground font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                                )}
                              >
                                <SubIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="flex-1">{subItem.label}</span>
                              </div>
                            </Link>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return null
        })}

        {/* Manage folders link */}
        <div className="mt-6 px-3">
          <button className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-3 h-3" />
            <span>Manage folders</span>
          </button>
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 px-3 py-2 h-auto text-foreground hover:bg-accent/50 rounded-md text-sm"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </Button>

        <Link href="/dashboard/profile">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-3 py-2 h-auto text-foreground hover:bg-accent/50 rounded-md text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Button>
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 bg-background border-r border-border z-40 md:hidden transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Desktop Sidebar - Fixed below header */}
      <aside className="hidden md:flex flex-col fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-64 bg-background border-r border-border z-30">
        <SidebarContent />
      </aside>
    </>
  )
}

