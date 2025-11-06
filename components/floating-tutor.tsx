"use client"

import { useState, useEffect, useRef } from "react"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader, MessageSquare, X, Minimize2 } from "lucide-react"
import { toast } from "sonner"
import { usePathname } from "next/navigation"

export default function FloatingTutor() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Extract revisionSetId from pathname if we're on a revision set page
  const revisionSetIdMatch = pathname.match(/\/revision-sets\/([a-z0-9]+)/)
  const revisionSetId = revisionSetIdMatch ? revisionSetIdMatch[1] : null

  const createChat = useMutation(api.tutorChat.createTutorChat)
  const addMessage = useMutation(api.tutorChat.addChatMessage)
  const chatMessages = useQuery(
    api.tutorChat.getChatMessages,
    chatId && revisionSetId ? { chatId: chatId as any } : "skip"
  )
  const userProfile = useQuery(api.users.getCurrentUserProfile)
  const materials = useQuery(
    api.studyMaterials.getMaterialsByRevisionSet,
    revisionSetId ? { revisionSetId: revisionSetId as any } : "skip"
  )
  const revisionSet = useQuery(
    api.revisionSets.getRevisionSetById,
    revisionSetId ? { revisionSetId: revisionSetId as any } : "skip"
  )
  const chatWithTutorAI = useAction(api.aiActions.chatWithTutor)

  useEffect(() => {
    // Initialize chat only if we have a revisionSetId and the chat is open
    // Don't require chatId for the chat to work - it can work without saving to DB
    if (isOpen && !chatId && revisionSetId) {
      const initChat = async () => {
        try {
          const newChatId = await createChat({ revisionSetId: revisionSetId as any })
          setChatId(newChatId)
        } catch (error) {
          console.error("Failed to create chat, continuing without persistence:", error)
          // Chat will still work, just won't save to database
        }
      }
      initChat()
    }
  }, [revisionSetId, chatId, isOpen, createChat])

  useEffect(() => {
    if (chatMessages && chatMessages.length > 0) {
      setMessages(chatMessages.map((msg) => ({ role: msg.role, content: msg.content })))
    } else if (chatMessages && chatMessages.length === 0 && (chatId || isOpen)) {
      if (messages.length === 0) {
        setMessages([
          {
            role: "assistant",
            content: revisionSetId
              ? `Hello! I'm your AI tutor for "${revisionSet?.title || "this revision set"}". How can I help you today?`
              : "Hello! I'm your AI tutor. How can I help you today?",
          },
        ])
      }
    }
  }, [chatMessages, chatId, revisionSetId, revisionSet, isOpen])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen, isMinimized])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    const newMessages = [...messages, { role: "user", content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // Create chat if it doesn't exist and we have a revisionSetId
      let currentChatId = chatId
      if (!currentChatId && revisionSetId) {
        try {
          currentChatId = await createChat({ revisionSetId: revisionSetId as any })
          setChatId(currentChatId)
        } catch (error) {
          console.error("Failed to create chat, continuing without saving:", error)
        }
      }

      // Save user message if we have a chat
      if (currentChatId && revisionSetId) {
        try {
          await addMessage({
            chatId: currentChatId as any,
            role: "user",
            content: userMessage,
          })
        } catch (error) {
          console.error("Failed to save message:", error)
        }
      }

      const context = materials && materials.length > 0
        ? `Revision Set: ${revisionSet?.title || "Untitled"}\n\nMaterials:\n${materials.map(m => `- ${m.title}: ${m.extractedContent?.substring(0, 200) || "No content"}`).join("\n")}`
        : undefined

      const apiKey = userProfile?.preferences?.aiApiKey

      const result = await chatWithTutorAI({
        messages: newMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        context,
        apiKey,
      })

      const aiResponse = result.content

      // Save assistant message if we have a chat
      if (currentChatId && revisionSetId) {
        try {
          await addMessage({
            chatId: currentChatId as any,
            role: "assistant",
            content: aiResponse,
            aiProvider: (userProfile?.preferences?.aiProvider || "openrouter") as any,
            tokensUsed: result.tokensUsed,
          })
        } catch (error) {
          console.error("Failed to save assistant message:", error)
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: aiResponse }])
    } catch (error) {
      console.error("Chat error:", error)
      toast.error("Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg z-50"
        size="icon"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col border-border bg-card shadow-2xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Tutor</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setIsOpen(false)
              setIsMinimized(false)
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {!isMinimized && (
        <>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((message, idx) => (
              <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <Loader className="w-4 h-4 animate-spin text-primary" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask your tutor..."
                disabled={isLoading}
                className="bg-background border-border text-foreground"
              />
              <Button onClick={handleSendMessage} disabled={isLoading} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

