import React, { useState, useRef, useCallback } from 'react'
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/outline'
import { cn } from '@src/lib/utils'

interface MessageInputProps {
  onSendMessage: (content: string) => void
  isLoading?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

export function MessageInput({
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  maxLength = 4000,
  className
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const lineHeight = 24 // approximate line height in pixels
      const maxRows = 6
      const minRows = 1
      
      const newRows = Math.max(minRows, Math.min(maxRows, Math.ceil(scrollHeight / lineHeight)))
      setRows(newRows)
      textarea.style.height = `${Math.min(scrollHeight, lineHeight * maxRows)}px`
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setMessage(value)
      adjustTextareaHeight()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const trimmedMessage = message.trim()
    if (trimmedMessage && !isLoading) {
      onSendMessage(trimmedMessage)
      setMessage('')
      setRows(1)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Handle pasted content (could add image paste support here)
    const pastedText = e.clipboardData.getData('text')
    if (message.length + pastedText.length > maxLength) {
      e.preventDefault()
      const remainingLength = maxLength - message.length
      const truncatedText = pastedText.substring(0, remainingLength)
      setMessage(prev => prev + truncatedText)
    }
  }

  return (
    <div className={cn(
      'border-t border-gray-200 bg-white px-4 py-3',
      className
    )}>
      <div className="flex items-end space-x-3">
        {/* Additional actions button */}
        <button
          type="button"
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Attach files (coming soon)"
        >
          <PlusIcon className="w-5 h-5" />
        </button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            className={cn(
              'w-full resize-none border-0 bg-gray-50 rounded-2xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors',
              'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent'
            )}
            style={{
              minHeight: '48px',
              maxHeight: '144px'
            }}
            disabled={isLoading}
          />
          
          {/* Character counter */}
          {message.length > maxLength * 0.8 && (
            <div className="absolute bottom-1 left-4 text-xs text-gray-400">
              {message.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className={cn(
            'flex-shrink-0 p-3 rounded-full transition-all duration-200',
            message.trim() && !isLoading
              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
          title={message.trim() ? 'Send message (Enter)' : 'Type a message to send'}
        >
          <PaperAirplaneIcon 
            className={cn(
              'w-5 h-5',
              isLoading ? 'animate-pulse' : ''
            )} 
          />
        </button>
      </div>

      {/* Helpful hint */}
      <div className="mt-2 text-xs text-gray-400 text-center">
        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Shift+Enter</kbd> for new line
      </div>
    </div>
  )
}

// Enhanced message input with additional features
export function MessageInputEnhanced({
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  maxLength = 4000,
  className,
  suggestions = []
}: MessageInputProps & {
  suggestions?: string[]
}) {
  const [message, setMessage] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setMessage(value)
      // Auto-resize logic here (similar to above)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === '/' && message === '') {
      setShowSuggestions(true)
    }
  }

  const handleSend = () => {
    const trimmedMessage = message.trim()
    if (trimmedMessage && !isLoading) {
      onSendMessage(trimmedMessage)
      setMessage('')
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-40 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2">Suggested prompts:</div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end space-x-3">
          <button
            type="button"
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setShowSuggestions(!showSuggestions)}
            title="Show suggestions"
          >
            <PlusIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full resize-none border-0 bg-gray-50 rounded-2xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              style={{
                minHeight: '48px',
                maxHeight: '144px'
              }}
              disabled={isLoading}
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className={cn(
              'flex-shrink-0 p-3 rounded-full transition-all duration-200',
              message.trim() && !isLoading
                ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}