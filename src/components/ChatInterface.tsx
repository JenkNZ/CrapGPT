import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useAction } from '@wasp-lang/auth/client'
import { useAuth } from '@wasp-lang/auth/client'
import { 
  getChatSessions, 
  getChatMessages, 
  getAgents 
} from '../queries'
import { 
  createChatSession, 
  sendChatMessage 
} from '../actions'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ScrollArea } from './ui/scroll-area'
import { Textarea } from './ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { 
  Bot,
  User,
  MessageCircle,
  Plus,
  Send,
  Loader2,
  Settings,
  Menu,
  History,
  Zap,
  Building2,
  ChevronDown
} from 'lucide-react'
import { cn } from '../lib/utils'

interface ChatSession {
  id: number
  title: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  messages?: any[]
}

interface Agent {
  id: number
  name: string
  description: string
  personalityTraits: string[]
  defaultProvider: string
  defaultModel: string
  isActive: boolean
}

interface ChatMessage {
  id: number
  role: 'user' | 'agent'
  content: string
  images?: string[]
  isStreaming?: boolean
  createdAt: string
  agent?: {
    id: number
    name: string
    personalityTraits: string[]
  }
  metadata?: any
}

export function ChatInterface({ className }: { className?: string }) {
  const { data: user } = useAuth()
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Queries
  const { data: sessions, isLoading: sessionsLoading } = useQuery(getChatSessions)
  const { data: agents, isLoading: agentsLoading } = useQuery(getAgents)
  const { 
    data: messages, 
    isLoading: messagesLoading
  } = useQuery(
    getChatMessages, 
    { sessionId: selectedSession?.id },
    { enabled: !!selectedSession?.id }
  )

  // Actions
  const createSessionAction = useAction(createChatSession)
  const sendMessageAction = useAction(sendChatMessage)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [inputMessage])

  // Auto-select first session or create new one
  useEffect(() => {
    if (sessions && sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0])
    }
  }, [sessions, selectedSession])

  const startNewChat = async () => {
    try {
      const newSession = await createSessionFn({ title: 'New Chat' })
      setSelectedSession(newSession)
      await refetchSessions()
      setShowSidebar(false)
    } catch (error) {
      console.error('Failed to create new chat session:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedAgent || !selectedSession || isLoading) return

    setIsLoading(true)
    
    try {
      await sendMessageFn({
        sessionId: selectedSession.id,
        content,
        agentName: selectedAgent.name
      })
      
      // Refresh messages to show the new ones
      await refetchMessages()
      await refetchSessions() // Update session list with new timestamps
      
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSessionSelect = (session: ChatSession) => {
    setSelectedSession(session)
    setShowSidebar(false)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <ChatBubbleLeftEllipsisIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Please sign in</h3>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to start chatting with AI agents
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full bg-gray-50', className)}>
      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:w-64',
        showSidebar ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={startNewChat}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="New chat"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Sessions */}
          <div className="flex-1 overflow-y-auto">
            {sessions && sessions.length > 0 ? (
              <div className="p-2 space-y-1">
                {sessions.map((session: ChatSession) => (
                  <button
                    key={session.id}
                    onClick={() => handleSessionSelect(session)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-colors',
                      selectedSession?.id === session.id
                        ? 'bg-blue-50 text-blue-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <div className="font-medium truncate">{session.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-500">
                  <ChatBubbleLeftEllipsisIcon className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No chats yet</p>
                  <button
                    onClick={startNewChat}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Start your first chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop for mobile sidebar */}
      {showSidebar && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" 
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
            >
              <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
            </button>
            
            <div className="flex-1">
              <h1 className="font-semibold text-gray-900">
                {selectedSession?.title || 'Chat'}
              </h1>
              {selectedAgent && (
                <p className="text-sm text-gray-500">
                  with {selectedAgent.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Chat header right side */}
            <a
              href="/connections"
              className="text-[#39FF14] font-medium hover:opacity-80"
              rel="noopener noreferrer"
              target="_blank"
            >
              Connections
            </a>

            {/* Agent Selector */}
            {agents && (
              <AgentSelectorCompact
                agents={agents}
                selectedAgent={selectedAgent}
                onAgentChange={setSelectedAgent}
                className="w-64"
              />
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white">
          {selectedSession ? (
            <>
              {messages && messages.length > 0 ? (
                <div className="space-y-1">
                  {messages.map((message: ChatMessage, index: number) => (
                    <ChatBubble
                      key={message.id}
                      message={message}
                      isLatest={index === messages.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ChatBubbleLeftEllipsisIcon className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Ask me anything! I'm here to help with questions, creative projects, coding, and more.
                    </p>
                    {selectedAgent && (
                      <div className="text-sm text-gray-400">
                        Currently chatting with <span className="font-medium">{selectedAgent.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Typing indicator when loading */}
              {isLoading && selectedAgent && (
                <TypingIndicator agentName={selectedAgent.name} />
              )}

              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <ChatBubbleLeftEllipsisIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a chat or start a new one
                </h3>
                <button
                  onClick={startNewChat}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Chat
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedSession && selectedAgent && (
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            placeholder={`Message ${selectedAgent.name}...`}
          />
        )}
      </div>
    </div>
  )
}