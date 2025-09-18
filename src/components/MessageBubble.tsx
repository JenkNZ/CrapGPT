import React from 'react'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { User, Bot, Clock, Eye } from 'lucide-react'
import { AgentAvatar } from './AgentAvatar'
import { cn } from '../lib/utils'

interface MessageBubbleProps {
  message: {
    id: number
    content: string
    role: 'user' | 'agent'
    images?: string[]
    createdAt: string
    isStreaming?: boolean
    agent?: {
      id: number
      name: string
      personalityTraits: string[]
    }
    metadata?: string
  }
  user?: {
    name?: string
    avatar?: string
  }
  className?: string
}

export function MessageBubble({ message, user, className }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAgent = message.role === 'agent'
  const isStreaming = message.isStreaming || false

  // Parse metadata if it exists
  let metadata = null
  if (message.metadata) {
    try {
      metadata = JSON.parse(message.metadata)
    } catch (e) {
      console.warn('Failed to parse message metadata:', e)
    }
  }

  return (
    <div className={cn(
      "flex gap-3 mb-6",
      isUser ? "justify-end" : "justify-start",
      className
    )}>
      {/* Agent Avatar - shown on left for agent messages */}
      {isAgent && (
        <div className="flex-shrink-0">
          <AgentAvatar 
            name={message.agent?.name || 'Assistant'} 
            size="sm"
          />
        </div>
      )}

      {/* Message Content */}
      <div className={cn(
        "flex flex-col space-y-2 max-w-[70%]",
        isUser ? "items-end" : "items-start"
      )}>
        {/* Agent Name and Traits */}
        {isAgent && message.agent && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span className="font-medium">{message.agent.name}</span>
            {message.agent.personalityTraits && message.agent.personalityTraits.length > 0 && (
              <div className="flex space-x-1">
                {message.agent.personalityTraits.slice(0, 2).map((trait, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {trait}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <Card className={cn(
          "relative",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          isStreaming && "animate-pulse border-primary/50"
        )}>
          <CardContent className="p-4">
            {/* Text Content */}
            {message.content && (
              <div className={cn(
                "prose prose-sm max-w-none",
                isUser ? "prose-invert" : "prose-slate"
              )}>
                <p className="whitespace-pre-wrap leading-relaxed mb-0">
                  {message.content}
                  {isStreaming && <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />}
                </p>
              </div>
            )}

            {/* Images */}
            {message.images && message.images.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.images.map((imageUrl, index) => (
                  <div key={index} className="relative">
                    <img
                      src={imageUrl}
                      alt={`Generated image ${index + 1}`}
                      className="max-w-full h-auto rounded-md border"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Streaming Indicator */}
            {isStreaming && !message.content && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs">AI is thinking...</span>
              </div>
            )}
          </CardContent>

          {/* Message Timestamp and Metadata */}
          <div className={cn(
            "absolute -bottom-5 text-xs text-muted-foreground",
            isUser ? "right-0" : "left-0"
          )}>
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3" />
              <span>
                {new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              
              {/* Show provider info for agent messages */}
              {isAgent && metadata?.provider && (
                <>
                  <span>•</span>
                  <span className="text-xs opacity-70">
                    {metadata.provider}
                  </span>
                </>
              )}
              
              {isStreaming && (
                <>
                  <span>•</span>
                  <span className="text-primary text-xs">streaming</span>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* User Avatar - shown on right for user messages */}
      {isUser && (
        <div className="flex-shrink-0">
          <AgentAvatar 
            name={user?.name || 'User'} 
            imageUrl={user?.avatar}
            size="sm"
            fallbackIcon={User}
          />
        </div>
      )}
    </div>
  )
}