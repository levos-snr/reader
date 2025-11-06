"use client"

import { Card } from "@/components/ui/card"
import { Target, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GoalsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold">Goals</h1>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Set Goal
          </Button>
        </div>

        <Card className="p-8 border-border bg-card">
          <div className="text-center space-y-4">
            <Target className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No goals set yet</h3>
            <p className="text-sm text-muted-foreground">
              Set study goals to track your progress and stay motivated.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Goal
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

