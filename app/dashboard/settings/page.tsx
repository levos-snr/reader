"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Key, Save, Bell, Clock, Palette } from "lucide-react"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id
  const user = useQuery(api.auth.getCurrentUser)
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const updatePreferences = useMutation(api.users.updateUserPreferences)

  const [apiKey, setApiKey] = useState(userProfile?.preferences?.aiApiKey || "")
  const [aiProvider, setAiProvider] = useState(userProfile?.preferences?.aiProvider || "openrouter")
  const [preferences, setPreferences] = useState({
    notificationsEnabled: userProfile?.preferences?.notificationsEnabled ?? true,
    preferredStudyTime: userProfile?.preferences?.preferredStudyTime || "",
    learningStyle: userProfile?.preferences?.learningStyle || "",
    theme: userProfile?.preferences?.theme || "system",
  })

  useEffect(() => {
    if (userProfile) {
      setApiKey(userProfile.preferences?.aiApiKey || "")
      setAiProvider(userProfile.preferences?.aiProvider || "openrouter")
      setPreferences({
        notificationsEnabled: userProfile.preferences?.notificationsEnabled ?? true,
        preferredStudyTime: userProfile.preferences?.preferredStudyTime || "",
        learningStyle: userProfile.preferences?.learningStyle || "",
        theme: userProfile.preferences?.theme || "system",
      })
    }
  }, [userProfile])

  const handleSave = async () => {
    if (!userId) return

    try {
      await updatePreferences({
        userId,
        preferences: {
          aiApiKey: apiKey,
          aiProvider: aiProvider,
          notificationsEnabled: preferences.notificationsEnabled,
          preferredStudyTime: preferences.preferredStudyTime || undefined,
          learningStyle: preferences.learningStyle || undefined,
          theme: preferences.theme || undefined,
        },
      })
      toast.success("Settings saved successfully!")
    } catch (error) {
      toast.error("Failed to save settings")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* AI Configuration */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">AI Configuration</h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block text-sm">AI Provider</Label>
                <Select value={aiProvider} onValueChange={setAiProvider}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter (Free – Llama 3.1 8B)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT-4, GPT-3.5)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="grok">Grok (xAI)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {aiProvider === "openrouter" && "Free default. Get an API key at openrouter.ai (sk-or-...)"}
                  {aiProvider === "openai" && "Powerful models from OpenAI. Get your API key at platform.openai.com"}
                  {aiProvider === "anthropic" && "Claude models from Anthropic. Get your API key at console.anthropic.com"}
                  {aiProvider === "grok" && "Grok models from xAI. Get your API key at x.ai"}
                </p>
              </div>

              <div>
                <Label className="mb-2 block text-sm">API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    aiProvider === "openrouter" ? "Enter your OpenRouter API key (sk-or-...)" :
                    aiProvider === "openai" ? "Enter your OpenAI API key (sk-...)" :
                    aiProvider === "anthropic" ? "Enter your Anthropic API key (sk-ant-...)" :
                    "Enter your Grok API key"
                  }
                  className="bg-background border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your API key is encrypted and stored securely.
                </p>
                <a
                  href={
                    aiProvider === "openrouter" ? "https://openrouter.ai/keys" :
                    aiProvider === "openai" ? "https://platform.openai.com/api-keys" :
                    aiProvider === "anthropic" ? "https://console.anthropic.com/settings/keys" :
                    "https://x.ai"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline mt-1 block"
                >
                  Get your {aiProvider === "openrouter" ? "OpenRouter" : aiProvider === "openai" ? "OpenAI" : aiProvider === "anthropic" ? "Anthropic" : "Grok"} API key →
                </a>
              </div>

              <Button onClick={handleSave} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </Card>

          {/* Preferences */}
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Preferences</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive study reminders and updates</p>
                </div>
                <Switch
                  checked={preferences.notificationsEnabled}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, notificationsEnabled: checked })}
                />
              </div>

              <div>
                <Label className="mb-2 block text-sm">Preferred Study Time</Label>
                <Select
                  value={preferences.preferredStudyTime}
                  onValueChange={(value) => setPreferences({ ...preferences, preferredStudyTime: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block text-sm">Learning Style</Label>
                <Select
                  value={preferences.learningStyle}
                  onValueChange={(value) => setPreferences({ ...preferences, learningStyle: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual</SelectItem>
                    <SelectItem value="auditory">Auditory</SelectItem>
                    <SelectItem value="reading">Reading/Writing</SelectItem>
                    <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block text-sm">Theme</Label>
                <Select
                  value={preferences.theme}
                  onValueChange={(value) => setPreferences({ ...preferences, theme: value })}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Provider Info */}
          <Card className="p-6 border-border bg-card">
            <h3 className="font-semibold mb-2">AI Provider Information</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {aiProvider === "openrouter" && "OpenRouter provides access to many models with a free community tier. Add your OpenRouter key to start immediately."}
              {aiProvider === "openai" && "OpenAI provides access to GPT-4, GPT-3.5, and other powerful models."}
              {aiProvider === "anthropic" && "Anthropic offers Claude models with excellent reasoning capabilities."}
              {aiProvider === "grok" && "Grok from xAI provides real-time knowledge and conversational AI."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

