"use client"

import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { authClient } from "@/lib/auth-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader, MessageSquare, X, Minimize2 } from "lucide-react"
import { toast } from "sonner"
import BackButton from "@/components/back-button"

export default function TutorPage() {
  const params = useParams()
  const revisionSetId = params.revisionSetId as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [chatId, setChatId] = useState<string | null>(null)

  const createChat = useMutation(api.tutorChat.createTutorChat)
  const addMessage = useMutation(api.tutorChat.addChatMessage)
  const chatMessages = useQuery(
    api.tutorChat.getChatMessages,
    chatId ? { chatId: chatId as any } : "skip"
  )
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const materials = useQuery(api.studyMaterials.getMaterialsByRevisionSet, { revisionSetId: revisionSetId as any })
  const revisionSet = useQuery(api.revisionSets.getRevisionSetById, { revisionSetId: revisionSetId as any })
  const chatWithTutorAI = useAction(api.aiActions.chatWithTutor)

  useEffect(() => {
    // Initialize chat on mount
    const initChat = async () => {
      try {
        const newChatId = await createChat({ revisionSetId: revisionSetId as any })
        setChatId(newChatId)
      } catch (error) {
        toast.error("Failed to start chat")
      }
    }
    if (!chatId) {
      initChat()
    }
  }, [revisionSetId, createChat, chatId])

  useEffect(() => {
    if (chatMessages && chatMessages.length > 0) {
      setMessages(chatMessages.map((msg) => ({ role: msg.role, content: msg.content })))
    } else if (chatMessages && chatMessages.length === 0 && chatId) {
      // If no messages exist, show welcome message
      setMessages([
        {
          role: "assistant",
          content:
            "Hello! I'm your AI tutor. I'm here to help you understand the concepts in your revision set. What would you like to learn about?",
        },
      ])
    }
  }, [chatMessages, chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || !chatId || isLoading) return

    const userMessage = input.trim()
    setInput("")
    const newMessages = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // Add user message to database
      await addMessage({
        chatId: chatId as any,
        role: "user",
        content: userMessage,
      })

      // Get context from revision set materials
      const context = materials && materials.length > 0
        ? `Revision Set: ${revisionSet?.title || "Untitled"}\n\nMaterials:\n${materials.map(m => `- ${m.title}: ${m.extractedContent?.substring(0, 200) || "No content"}`).join("\n")}`
        : undefined

      // Get API key from user preferences
      const apiKey = userProfile?.preferences?.aiApiKey

      // Get AI response
      const result = await chatWithTutorAI({
        messages: newMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        context,
        apiKey,
      })

      const aiResponse = result.content

      // Add assistant message to database
      await addMessage({
        chatId: chatId as any,
        role: "assistant",
        content: aiResponse,
        aiProvider: (userProfile?.preferences?.aiProvider || "openrouter") as any,
        tokensUsed: result.tokensUsed,
      })

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }])
    } catch (error) {
      console.error("Chat error:", error)
      toast.error("Failed to send message. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-4"><BackButton fallbackHref={`/dashboard/revision-sets/${revisionSetId}`} /></div>
        <Card className="p-8 text-center border-border bg-card">
          <MessageSquare className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-bold mb-2">AI Tutor</h1>
          <p className="text-muted-foreground mb-4">
            The AI Tutor is now available as a floating chat widget in the bottom-right corner.
          </p>
          <p className="text-sm text-muted-foreground">
            Click the chat icon to start a conversation with your AI tutor from anywhere in the app!
          </p>
        </Card>
      </div>
    </div>
  )
}

