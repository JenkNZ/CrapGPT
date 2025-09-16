import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@wasp-lang/auth/client'
import { Button } from './components/ui/button'
import { ChatMessage } from './components/ChatMessage'
import { AgentSelector } from './components/AgentSelector'
import { MessageInput } from './components/MessageInput'
import { Sidebar } from './components/Sidebar'
import { useQuery } from '@wasp-lang/react-query'
import { getConversations, getMessages, getAgents } from './queries'
import { sendMessage, createConversation } from './actions'
import { Menu, Send, Bot } from 'lucide-react'
import './index.css'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
}

interface Agent {
  id: number
  name: string
  description: string
  personality: string
  tools: string[]
  model: string
  provider: string
  isActive: boolean
}

export function MainPage() {
  const { data: user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Queries
  const { data: conversations } = useQuery(getConversations, {})
  const { data: agents } = useQuery(getAgents, {})
  
  const { data: conversationMessages } = useQuery(
    getMessages, 
    { conversationId: currentConversationId },
    { enabled: !!currentConversationId }
  )

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Set default agent when agents load
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      const defaultAgent = agents.find((agent: Agent) => agent.name === 'Assistant') || agents[0]
      setSelectedAgent(defaultAgent)
    }
  }, [agents, selectedAgent])

  // Load conversation messages when conversation changes
  useEffect(() => {
    if (conversationMessages) {
      const formattedMessages = conversationMessages.map((msg: any) => ({
        id: msg.id.toString(),
        content: msg.content,
        role: msg.role as 'user' | 'assistant' | 'system',
        timestamp: new Date(msg.createdAt)
      }))
      setMessages(formattedMessages)
    }
  }, [conversationMessages])

  const handleSendMessage = async (content: string) => {
    if (!user || !selectedAgent) return

    try {
      let conversationId = currentConversationId

      // Create new conversation if none exists
      if (!conversationId) {
        const newConversation = await createConversation({
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          userId: user.id
        })
        conversationId = newConversation.id
        setCurrentConversationId(conversationId)
      }

      // Add user message to UI immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      setIsStreaming(true)

      // Send message and get response
      const response = await sendMessage({
        content,
        conversationId,
        agentId: selectedAgent.id
      })

      // Replace temp user message and add assistant response
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== userMessage.id),
        {
          id: response.userMessage.id.toString(),
          content: response.userMessage.content,
          role: 'user',
          timestamp: new Date(response.userMessage.createdAt)
        },
        {
          id: response.assistantMessage.id.toString(),
          content: response.assistantMessage.content,
          role: 'assistant',
          timestamp: new Date(response.assistantMessage.createdAt)
        }
      ])

    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
    } finally {
      setIsStreaming(false)
    }
  }

  const startNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([])
  }

  const selectConversation = (conversationId: number) => {
    setCurrentConversationId(conversationId)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Bot className="h-16 w-16 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-display">GPT Clone</h1>
            <p className="text-body text-muted-foreground">
              Please sign in to start chatting with AI agents
            </p>
          </div>
          <div className="space-y-3">
            <Button asChild>
              <a href="/login">Sign In</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations || []}
        onNewConversation={startNewConversation}
        onSelectConversation={selectConversation}
        currentConversationId={currentConversationId}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center space-x-2">
                <Bot className="h-6 w-6 text-primary" />
                <h1 className="text-title font-semibold">GPT Clone</h1>
              </div>
            </div>

            <AgentSelector
              agents={agents || []}
              selectedAgent={selectedAgent}
              onSelectAgent={setSelectedAgent}
            />
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center space-y-4 py-12">
                <div className="flex justify-center">
                  <Bot className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-headline text-muted-foreground">
                    Start a conversation
                  </h2>
                  <p className="text-body text-muted-foreground">
                    {selectedAgent 
                      ? `Chat with ${selectedAgent.name} - ${selectedAgent.description}`
                      : 'Select an agent and start chatting'
                    }
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  agent={message.role === 'assistant' ? selectedAgent : undefined}
                />
              ))
            )}
            
            {isStreaming && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4 max-w-3xl">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-4xl mx-auto p-4">
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={isStreaming || !selectedAgent}
              placeholder={
                selectedAgent 
                  ? `Message ${selectedAgent.name}...`
                  : 'Select an agent to start chatting...'
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}