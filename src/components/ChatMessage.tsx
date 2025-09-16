import React from 'react'
import { Avatar, AvatarFallback } from './ui/avatar'
import { User, Bot, Code, Palette, BarChart } from 'lucide-react'
import { cn } from '../lib/utils'

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

interface ChatMessageProps {
  message: Message
  agent?: Agent
}

const getAgentIcon = (agentName?: string) => {
  if (!agentName) return Bot
  
  switch (agentName.toLowerCase()) {
    case 'code assistant':
      return Code
    case 'creative writer':
      return Palette
    case 'data analyst':
      return BarChart
    default:
      return Bot
  }
}

const getAgentColor = (agentName?: string) => {
  if (!agentName) return 'bg-primary'
  
  switch (agentName.toLowerCase()) {
    case 'code assistant':
      return 'bg-green-500'
    case 'creative writer':
      return 'bg-purple-500'
    case 'data analyst':
      return 'bg-blue-500'
    default:
      return 'bg-primary'
  }
}

export function ChatMessage({ message, agent }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const Icon = isUser ? User : getAgentIcon(agent?.name)
  const avatarBg = isUser ? 'bg-secondary' : getAgentColor(agent?.name)

  return (
    <div className={cn(
      'flex gap-4 group',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <Avatar className={cn('h-8 w-8 flex-shrink-0', avatarBg)}>
        <AvatarFallback className={cn(avatarBg, 'text-white border-0')}>
          <Icon className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn(
        'flex flex-col space-y-1',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Message Header */}
        <div className={cn(
          'flex items-center space-x-2 text-xs text-muted-foreground',
          isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
        )}>
          <span className="font-medium">
            {isUser ? 'You' : agent?.name || 'Assistant'}
          </span>
          <span>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {agent && !isUser && (
            <div className="flex items-center space-x-1">
              <span>•</span>
              <span className="capitalize">{agent.provider}</span>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {agent.model}
              </span>
            </div>
          )}
        </div>

        {/* Message Bubble */}
        <div className={cn(
          'rounded-lg px-4 py-2 max-w-3xl break-words',
          isUser 
            ? 'bg-primary text-primary-foreground ml-12' 
            : 'bg-muted mr-12'
        )}>
          <div className="message-content">
            <MessageContent content={message.content} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Multi-line code block
        const code = part.slice(3, -3).trim()
        const lines = code.split('\n')
        const language = lines[0]?.match(/^\w+$/) ? lines.shift() : ''
        const codeContent = lines.join('\n')
        
        return (
          <pre key={index} className="bg-muted/50 p-3 rounded mt-2 mb-2 overflow-x-auto">
            {language && (
              <div className="text-xs text-muted-foreground mb-2 font-medium">
                {language}
              </div>
            )}
            <code className="text-sm">{codeContent}</code>
          </pre>
        )
      } else if (part.startsWith('`') && part.endsWith('`')) {
        // Inline code
        return (
          <code key={index} className="bg-muted/50 px-1.5 py-0.5 rounded text-sm">
            {part.slice(1, -1)}
          </code>
        )
      } else {
        // Regular text with basic formatting
        return (
          <span key={index}>
            {part.split('\n').map((line, lineIndex, lines) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        )
      }
    })
  }

  return <div className="whitespace-pre-wrap">{renderContent(content)}</div>
}