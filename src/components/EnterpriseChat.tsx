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
import { Input } from './ui/input'
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
  ChevronDown,
  Search,
  MoreVertical,
  Clock,
  Star,
  Archive
} from 'lucide-react'
import { cn } from '../lib/utils'

interface ChatSession {
  id: number
  title: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  messages?: ChatMessage[]
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

export function EnterpriseChat({ className }: { className?: string }) {
  const { data: user } = useAuth()
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Queries
  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery(getChatSessions)
  const { data: agents, isLoading: agentsLoading } = useQuery(getAgents)
  const { 
    data: messages, 
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery(
    getChatMessages, 
    { sessionId: selectedSession?.id },
    { enabled: !!selectedSession?.id }
  )

  // Actions
  const createSessionAction = useAction(createChatSession)
  const sendMessageAction = useAction(sendChatMessage)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Select first agent if none selected
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents.find((agent: Agent) => agent.isActive) || agents[0])
    }
  }, [agents, selectedAgent])

  const startNewChat = async () => {
    try {
      const newSession = await createSessionAction({ title: `New Chat - ${new Date().toLocaleDateString()}` })
      setSelectedSession(newSession)
      await refetchSessions()
    } catch (error) {
      console.error('Failed to create new chat session:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedAgent || !selectedSession || isLoading || !inputMessage.trim()) return

    const messageContent = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)
    
    try {
      await sendMessageAction({
        sessionId: selectedSession.id,
        content: messageContent,
        agentName: selectedAgent.name
      })
      
      await refetchMessages()
      await refetchSessions()
    } catch (error) {
      console.error('Failed to send message:', error)
      setInputMessage(messageContent) // Restore message on error
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const filteredSessions = sessions?.filter((session: ChatSession) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="w-96 border-0 shadow-xl">
          <CardContent className="text-center p-8">
            <div className="p-3 bg-blue-600 rounded-xl w-fit mx-auto mb-4">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to AgentForge</h3>
            <p className="text-gray-600 mb-6">
              Please sign in to start chatting with AI agents
            </p>
            <Button asChild className="w-full">
              <a href="/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex h-screen bg-gray-50', className)}>
      {/* Sidebar */}
      <div className={cn(
        'flex flex-col bg-white border-r border-gray-200 transition-all duration-300',
        showSidebar ? 'w-80' : 'w-16'
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              {showSidebar && <h1 className="text-lg font-semibold text-gray-900">AgentForge</h1>}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          
          {showSidebar && (
            <div className="mt-4 space-y-3">
              <Button onClick={startNewChat} className="w-full" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
        </div>

        {/* Chat Sessions */}
        {showSidebar && (
          <ScrollArea className="flex-1 px-2 py-2">
            {filteredSessions.length > 0 ? (
              <div className="space-y-1">
                {filteredSessions.map((session: ChatSession) => (
                  <Button
                    key={session.id}
                    variant={selectedSession?.id === session.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left p-3 h-auto"
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-start space-x-3">
                      <MessageCircle className="h-4 w-4 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">{session.title}</div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-gray-500">
                  <History className="mx-auto h-12 w-12 mb-4" />
                  <p className="text-sm">No chats found</p>
                  <Button variant="link" onClick={startNewChat} className="mt-2 text-sm">
                    Start your first chat
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        )}

        {/* Sidebar Footer */}
        {showSidebar && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name?.[0] || user.email[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.name || user.email}</div>
                  <div className="text-xs text-gray-500">Enterprise</div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedSession?.title || 'Select a Chat'}
                </h2>
                {selectedAgent && (
                  <p className="text-sm text-gray-500 flex items-center">
                    <Bot className="h-4 w-4 mr-1" />
                    {selectedAgent.name}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {selectedAgent.defaultProvider}
                    </Badge>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" asChild>
                <a href="/connections">
                  <Building2 className="h-4 w-4 mr-2" />
                  Connections
                </a>
              </Button>
              
              {agents && agents.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedAgent?.id || ''}
                    onChange={(e) => {
                      const agent = agents.find((a: Agent) => a.id === parseInt(e.target.value))
                      setSelectedAgent(agent || null)
                    }}
                    className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {agents.map((agent: Agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          {selectedSession ? (
            <>
              {messages && messages.length > 0 ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {messages.map((message: ChatMessage, index: number) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex space-x-4',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'agent' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-3',
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white ml-auto' 
                          : 'bg-gray-100 text-gray-900'
                      )}>
                        <div className="prose prose-sm max-w-none">
                          {message.content.split('\n').map((line, i) => (
                            <p key={i} className={cn(
                              'm-0',
                              message.role === 'user' ? 'text-white' : 'text-gray-900'
                            )}>
                              {line}
                            </p>
                          ))}
                        </div>
                        
                        <div className={cn(
                          'text-xs mt-2 opacity-70',
                          message.role === 'user' ? 'text-white' : 'text-gray-500'
                        )}>
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      
                      {message.role === 'user' && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-gray-100 text-gray-600">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-6">
                      <MessageCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Start the conversation
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Ask me anything! I'm here to help with questions, analysis, creative projects, and more.
                    </p>
                    {selectedAgent && (
                      <Badge variant="secondary">
                        Chatting with {selectedAgent.name}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center space-x-3 max-w-4xl mx-auto">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="p-6 bg-gray-100 rounded-full w-fit mx-auto mb-6">
                  <MessageCircle className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Welcome to AgentForge
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Select a chat from the sidebar or start a new conversation with our AI agents.
                </p>
                <Button onClick={startNewChat}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        {selectedSession && selectedAgent && (
          <div className="border-t border-gray-200 bg-white p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${selectedAgent.name}...`}
                    className="resize-none pr-12 min-h-[44px] max-h-32"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    size="sm"
                    className="absolute right-2 bottom-2 h-8 w-8 p-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span>Powered by AgentForge AI</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}