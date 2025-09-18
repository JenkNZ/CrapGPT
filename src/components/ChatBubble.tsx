import React, { useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@src/lib/utils'
import { AgentAvatar } from './AgentAvatar'
import { 
  ClipboardDocumentIcon, 
  PhotoIcon,
  SpeakerWaveIcon,
  CheckIcon 
} from '@heroicons/react/24/outline'

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

interface ChatBubbleProps {
  message: ChatMessage
  isLatest?: boolean
}

// Typing indicator component
export function TypingIndicator({ agentName }: { agentName: string }) {
  return (
    <div className="flex space-x-4 p-4">
      <div className="flex-shrink-0">
        <AgentAvatar agentName={agentName} size="md" />
      </div>
      <div className="flex items-center space-x-2 bg-gray-100 rounded-2xl px-4 py-3">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        </div>
        <span className="text-sm text-gray-500">typing...</span>
      </div>
    </div>
  )
}

// User message bubble (left side)
export function UserBubble({ message, isLatest = false }: ChatBubbleProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex space-x-4 p-4 justify-start">
      {/* User avatar placeholder */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
          U
        </div>
      </div>
      
      <div className="flex-1 max-w-4xl">
        <div className="group relative">
          {/* Message content */}
          <div className="bg-blue-500 text-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          
          {/* Message actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -right-2 top-0 flex items-center space-x-1">
            <button
              onClick={handleCopy}
              className="p-1.5 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <CheckIcon className="w-4 h-4 text-green-600" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>
        
        {/* Timestamp */}
        <div className="mt-1 ml-1 text-xs text-gray-500">
          {format(new Date(message.createdAt), 'HH:mm')}
        </div>
      </div>
    </div>
  )
}

// Agent message bubble (right side)
export function AgentBubble({ message, isLatest = false }: ChatBubbleProps) {
  const [copied, setCopied] = useState(false)
  const [imageExpanded, setImageExpanded] = useState<number | null>(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message.content)
      utterance.rate = 0.9
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className="flex space-x-4 p-4 justify-end">
      <div className="flex-1 max-w-4xl">
        <div className="group relative">
          {/* Message content */}
          <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
            {/* Streaming indicator */}
            {message.isStreaming && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse [animation-delay:0.1s]"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                </div>
                <span>Generating response...</span>
              </div>
            )}
            
            {/* Text content */}
            {message.content && (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap break-words mb-0">{message.content}</p>
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
                      className={cn(
                        "rounded-lg shadow-sm cursor-pointer transition-all duration-200",
                        imageExpanded === index ? "max-w-full" : "max-w-sm max-h-64 object-cover"
                      )}
                      onClick={() => setImageExpanded(imageExpanded === index ? null : index)}
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PhotoIcon className="w-5 h-5 text-white drop-shadow-lg" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Message actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -left-2 top-0 flex items-center space-x-1">
            <button
              onClick={handleCopy}
              className="p-1.5 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <CheckIcon className="w-4 h-4 text-green-600" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4 text-gray-600" />
              )}
            </button>
            {message.content && (
              <button
                onClick={handleSpeak}
                className="p-1.5 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Read aloud"
              >
                <SpeakerWaveIcon className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>
        
        {/* Agent info and timestamp */}
        <div className="mt-1 mr-1 flex items-center justify-end space-x-2">
          <div className="text-xs text-gray-500">
            {format(new Date(message.createdAt), 'HH:mm')}
          </div>
          {message.agent && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 font-medium">
                {message.agent.name}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Agent avatar */}
      <div className="flex-shrink-0">
        <AgentAvatar
          agentName={message.agent?.name || 'Agent'}
          personalityTraits={message.agent?.personalityTraits || []}
          size="md"
        />
      </div>
    </div>
  )
}

// Main chat bubble component that routes to appropriate bubble type
export function ChatBubble({ message, isLatest = false }: ChatBubbleProps) {
  if (message.role === 'user') {
    return <UserBubble message={message} isLatest={isLatest} />
  }
  
  return <AgentBubble message={message} isLatest={isLatest} />
}

// Streaming response component for real-time updates
export function StreamingChatBubble({ 
  agentName, 
  personalityTraits = [],
  content = '',
  images = []
}: {
  agentName: string
  personalityTraits?: string[]
  content?: string
  images?: string[]
}) {
  return (
    <div className="flex space-x-4 p-4 justify-end">
      <div className="flex-1 max-w-4xl">
        <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
          {/* Streaming indicator */}
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse [animation-delay:0.1s]"></div>
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
            </div>
            <span>Generating response...</span>
          </div>
          
          {/* Streaming content */}
          {content && (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap break-words mb-0">
                {content}
                <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse"></span>
              </p>
            </div>
          )}
          
          {/* Images */}
          {images.length > 0 && (
            <div className="mt-3 space-y-2">
              {images.map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`Generated image ${index + 1}`}
                  className="rounded-lg shadow-sm max-w-sm max-h-64 object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Agent avatar */}
      <div className="flex-shrink-0">
        <AgentAvatar
          agentName={agentName}
          personalityTraits={personalityTraits}
          size="md"
        />
      </div>
    </div>
  )
}