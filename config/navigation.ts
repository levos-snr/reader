import { LucideIcon } from "lucide-react";
import {Bell, LayoutDashboard, BookOpen, Shield } from "lucide-react";

export type NavigationLink = {
  to: string;
  label: string;
  icon?: LucideIcon;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  hideWhenAuthenticated?: boolean;
};

// Centralized navigation configuration
// Easy to modify - add/remove links here to update navigation across the app
export const navigationLinks: NavigationLink[] = [
{
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    requiresAuth: true,
  },
  {
    to: "/dashboard/courses",
    label: "Courses",
    icon: BookOpen,
    requiresAuth: true,
  },
  {
    to: "/dashboard/revision-sets",
    label: "Revision Sets",
    icon: BookOpen,
    requiresAuth: true,
  },
  {
    to: "/dashboard/admin",
    label: "Admin",
    icon: Shield,
    requiresAuth: true,
    requiresAdmin: true,
  },
  
] as const;

