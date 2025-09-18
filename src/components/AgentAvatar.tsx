import React, { useState } from 'react'
import { cn } from '@src/lib/utils'

interface AgentAvatarProps {
  agentName: string
  personalityTraits?: string[]
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Generate avatar based on agent name and traits
const generateAvatarStyle = (name: string, traits: string[] = []) => {
  // Create a simple hash from the name
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  
  // Define color palettes based on personality traits
  const colorPalettes = {
    helpful: { bg: 'bg-blue-500', text: 'text-white' },
    creative: { bg: 'bg-purple-500', text: 'text-white' },
    analytical: { bg: 'bg-green-500', text: 'text-white' },
    professional: { bg: 'bg-gray-600', text: 'text-white' },
    supportive: { bg: 'bg-pink-500', text: 'text-white' },
    precise: { bg: 'bg-indigo-500', text: 'text-white' },
    educational: { bg: 'bg-orange-500', text: 'text-white' },
    ethical: { bg: 'bg-teal-500', text: 'text-white' },
    default: { bg: 'bg-slate-500', text: 'text-white' }
  }

  // Pick color based on primary trait or default
  const primaryTrait = traits[0]?.toLowerCase() as keyof typeof colorPalettes
  const colors = colorPalettes[primaryTrait] || colorPalettes.default

  // Generate initials
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return { colors, initials }
}

// Pre-defined agent icons (you can expand this)
const agentIcons = {
  'Assistant': '🤖',
  'Creative Writer': '✍️',
  'Code Assistant': '💻',
  'Data Analyst': '📊',
  'Customer Service': '🎧',
  'Tutor': '🎓',
  'Researcher': '🔬',
  'Designer': '🎨'
}

export function AgentAvatar({ 
  agentName, 
  personalityTraits = [], 
  size = 'md', 
  className 
}: AgentAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const { colors, initials } = generateAvatarStyle(agentName, personalityTraits)
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  // Check if we have a predefined icon
  const agentIcon = agentIcons[agentName as keyof typeof agentIcons]

  // Try to load a profile image first (you can implement custom image URLs later)
  const profileImageUrl = `/agent-avatars/${agentName.toLowerCase().replace(/\s+/g, '-')}.png`

  return (
    <div className={cn(
      'relative flex items-center justify-center rounded-full font-medium shadow-sm ring-2 ring-white',
      sizeClasses[size],
      colors.bg,
      colors.text,
      className
    )}>
      {!imageError && (
        <img
          src={profileImageUrl}
          alt={`${agentName} avatar`}
          className="w-full h-full rounded-full object-cover"
          onError={() => setImageError(true)}
          onLoad={() => setImageError(false)}
        />
      )}
      
      {imageError && (
        <>
          {agentIcon ? (
            <span className="text-lg" role="img" aria-label={agentName}>
              {agentIcon}
            </span>
          ) : (
            <span className="font-semibold">
              {initials}
            </span>
          )}
        </>
      )}
      
      {/* Online indicator */}
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
    </div>
  )
}

// Larger avatar variant for agent selection
export function AgentAvatarLarge({ 
  agentName, 
  personalityTraits = [], 
  description,
  isSelected = false,
  onClick
}: {
  agentName: string
  personalityTraits?: string[]
  description?: string
  isSelected?: boolean
  onClick?: () => void
}) {
  const { colors, initials } = generateAvatarStyle(agentName, personalityTraits)
  const agentIcon = agentIcons[agentName as keyof typeof agentIcons]

  return (
    <div 
      className={cn(
        'flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
        'hover:bg-gray-50 hover:shadow-sm',
        isSelected ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-white'
      )}
      onClick={onClick}
    >
      <div className={cn(
        'relative flex items-center justify-center w-12 h-12 rounded-full font-medium shadow-sm ring-2 ring-white',
        colors.bg,
        colors.text
      )}>
        {agentIcon ? (
          <span className="text-xl" role="img" aria-label={agentName}>
            {agentIcon}
          </span>
        ) : (
          <span className="font-semibold text-base">
            {initials}
          </span>
        )}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{agentName}</h3>
        {description && (
          <p className="text-sm text-gray-500 truncate">{description}</p>
        )}
        {personalityTraits.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {personalityTraits.slice(0, 3).map((trait) => (
              <span
                key={trait}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
              >
                {trait}
              </span>
            ))}
            {personalityTraits.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                +{personalityTraits.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}