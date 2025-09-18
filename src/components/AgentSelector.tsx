import React, { useState } from 'react'
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline'
import { cn } from '@src/lib/utils'
import { AgentAvatar, AgentAvatarLarge } from './AgentAvatar'

interface Agent {
  id: number
  name: string
  description: string
  personalityTraits: string[]
  defaultProvider: string
  defaultModel: string
  isActive: boolean
}

interface AgentSelectorProps {
  agents: Agent[]
  selectedAgent: Agent | null
  onAgentChange: (agent: Agent) => void
  className?: string
}

export function AgentSelector({ 
  agents, 
  selectedAgent, 
  onAgentChange, 
  className 
}: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAgentSelect = (agent: Agent) => {
    onAgentChange(agent)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Selected Agent Display */}
      <button
        type="button"
        className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {selectedAgent && (
            <AgentAvatar
              agentName={selectedAgent.name}
              personalityTraits={selectedAgent.personalityTraits}
              size="sm"
              className="mr-3"
            />
          )}
          <div className="flex-1">
            <span className="block truncate font-medium">
              {selectedAgent?.name || 'Select an Agent'}
            </span>
            {selectedAgent && (
              <span className="block truncate text-xs text-gray-500">
                {selectedAgent.description}
              </span>
            )}
          </div>
        </div>
        <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
          <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Options */}
          <div className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={cn(
                  'relative cursor-default select-none py-2 pl-3 pr-9 hover:bg-gray-50',
                  selectedAgent?.id === agent.id ? 'bg-blue-50' : ''
                )}
                onClick={() => handleAgentSelect(agent)}
              >
                <AgentAvatarLarge
                  agentName={agent.name}
                  personalityTraits={agent.personalityTraits}
                  description={agent.description}
                  isSelected={selectedAgent?.id === agent.id}
                />
                
                {selectedAgent?.id === agent.id && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for mobile or smaller spaces
export function AgentSelectorCompact({ 
  agents, 
  selectedAgent, 
  onAgentChange, 
  className 
}: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAgentSelect = (agent: Agent) => {
    onAgentChange(agent)
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Selected Agent Display */}
      <button
        type="button"
        className="flex items-center space-x-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedAgent && (
          <AgentAvatar
            agentName={selectedAgent.name}
            personalityTraits={selectedAgent.personalityTraits}
            size="sm"
          />
        )}
        <span className="font-medium">
          {selectedAgent?.name || 'Select Agent'}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Options */}
          <div className="absolute right-0 z-20 mt-1 w-80 max-w-md overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="max-h-60 overflow-auto py-1">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    'cursor-pointer px-1',
                    selectedAgent?.id === agent.id ? '' : 'hover:bg-gray-50'
                  )}
                  onClick={() => handleAgentSelect(agent)}
                >
                  <AgentAvatarLarge
                    agentName={agent.name}
                    personalityTraits={agent.personalityTraits}
                    description={agent.description}
                    isSelected={selectedAgent?.id === agent.id}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Agent status indicator
export function AgentStatusBadge({ 
  agent, 
  showProvider = false 
}: { 
  agent: Agent
  showProvider?: boolean 
}) {
  return (
    <div className="flex items-center space-x-2 text-xs text-gray-500">
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        <span>Online</span>
      </div>
      {showProvider && (
        <>
          <span>•</span>
          <span className="capitalize">{agent.defaultProvider}</span>
          <span className="text-gray-400">({agent.defaultModel.split('/').pop()})</span>
        </>
      )}
    </div>
  )
}