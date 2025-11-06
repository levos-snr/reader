"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BackButton({ fallbackHref }: { fallbackHref?: string }) {
  const router = useRouter()

  const onClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else if (fallbackHref) {
      router.push(fallbackHref)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="-ml-2 gap-2">
      <ArrowLeft className="w-4 h-4" /> Back
    </Button>
  )
}


