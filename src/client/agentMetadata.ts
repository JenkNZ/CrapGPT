// Agent metadata system - defines connection requirements for each agent

export type AgentConnectionRequirement = {
  required?: string[]      // Connection types that MUST be present
  optional?: string[]      // Connection types that enhance functionality
  preferred?: string       // Preferred connection type if multiple available
  minScope?: string        // Minimum required scope (read-only, change-safe, admin)
  fallback?: boolean       // Can the agent work without connections?
  description?: string     // Human-readable description of what connections enable
}

export const AGENT_METADATA: Record<string, AgentConnectionRequirement> = {
  // Research agents
  'researcher': {
    optional: ['openops'],
    preferred: 'openops',
    minScope: 'read-only',
    fallback: true,
    description: 'OpenOps connection enables advanced research workflows and automation'
  },
  
  'web-researcher': {
    optional: ['openops', 'custom'],
    preferred: 'openops',
    minScope: 'read-only',
    fallback: true,
    description: 'External connections provide enhanced web scraping and data collection capabilities'
  },

  // Development agents
  'coder': {
    optional: ['arcade'],
    preferred: 'arcade',
    minScope: 'change-safe',
    fallback: true,
    description: 'Arcade connection enables secure code execution and testing in isolated environments'
  },
  
  'code-executor': {
    required: ['arcade'],
    minScope: 'change-safe',
    fallback: false,
    description: 'Requires Arcade connection for safe code execution and testing'
  },

  // Specialized workflow agents
  'openops-executor': {
    required: ['openops'],
    minScope: 'read-only',
    fallback: false,
    description: 'Dedicated OpenOps workflow execution agent - requires OpenOps connection'
  },
  
  'openops-admin': {
    required: ['openops'],
    minScope: 'admin',
    fallback: false,
    description: 'Administrative OpenOps operations - requires admin-level OpenOps connection'
  },

  // Security agents  
  'hexstrike-scanner': {
    required: ['hexstrike'],
    minScope: 'change-safe',
    fallback: false,
    description: 'Security scanning agent - requires HexStrike MCP connection for tool access'
  },
  
  'security-analyst': {
    optional: ['hexstrike', 'openops'],
    preferred: 'hexstrike',
    minScope: 'change-safe',
    fallback: true,
    description: 'Enhanced security analysis with specialized tooling connections'
  },

  // Integration agents
  'mcp-agent': {
    required: ['mcpjungle'],
    minScope: 'read-only', 
    fallback: false,
    description: 'MCP (Model Context Protocol) agent - requires MCPJungle gateway connection'
  },
  
  'tool-orchestrator': {
    optional: ['toolhive', 'hexstrike', 'arcade'],
    minScope: 'change-safe',
    fallback: true,
    description: 'Multi-tool orchestration with various specialized tool connections'
  },

  // General purpose agents (no connections required)
  'assistant': {
    required: [],
    fallback: true,
    description: 'General purpose AI assistant - no external connections required'
  },
  
  'chat-assistant': {
    required: [],
    fallback: true, 
    description: 'Conversational AI assistant - uses built-in LLM providers'
  },
  
  'creative-writer': {
    optional: ['openops'],
    fallback: true,
    description: 'Creative writing assistant with optional workflow automation'
  }
}

// Helper functions
export function getAgentRequirements(agentName: string): AgentConnectionRequirement {
  return AGENT_METADATA[agentName] || { 
    required: [], 
    fallback: true,
    description: 'Unknown agent type'
  }
}

export function doesAgentRequireConnection(agentName: string): boolean {
  const req = getAgentRequirements(agentName)
  return (req.required && req.required.length > 0) || !req.fallback
}

export function getRequiredConnectionTypes(agentName: string): string[] {
  const req = getAgentRequirements(agentName)
  return req.required || []
}

export function getOptionalConnectionTypes(agentName: string): string[] {
  const req = getAgentRequirements(agentName)
  return req.optional || []
}

export function getAllConnectionTypes(agentName: string): string[] {
  const req = getAgentRequirements(agentName)
  return [...(req.required || []), ...(req.optional || [])]
}

export function getPreferredConnectionType(agentName: string): string | null {
  const req = getAgentRequirements(agentName)
  return req.preferred || (req.required && req.required[0]) || null
}

export function getMinimumScope(agentName: string): string {
  const req = getAgentRequirements(agentName)
  return req.minScope || 'read-only'
}

export function canAgentFallback(agentName: string): boolean {
  const req = getAgentRequirements(agentName)
  return req.fallback !== false
}

// Validation helpers
export function validateAgentConnection(
  agentName: string, 
  connection: any
): { valid: boolean; reason?: string } {
  const req = getAgentRequirements(agentName)
  
  if (!connection && req.required && req.required.length > 0) {
    return { 
      valid: false, 
      reason: `Agent requires one of: ${req.required.join(', ')}` 
    }
  }
  
  if (connection) {
    // Check connection type
    const allowedTypes = getAllConnectionTypes(agentName)
    if (allowedTypes.length > 0 && !allowedTypes.includes(connection.type)) {
      return {
        valid: false,
        reason: `Connection type '${connection.type}' not supported. Allowed: ${allowedTypes.join(', ')}`
      }
    }
    
    // Check scope
    const minScope = getMinimumScope(agentName)
    const scopeHierarchy = ['read-only', 'change-safe', 'admin']
    const currentLevel = scopeHierarchy.indexOf(connection.scope)
    const requiredLevel = scopeHierarchy.indexOf(minScope)
    
    if (currentLevel < requiredLevel) {
      return {
        valid: false,
        reason: `Connection scope '${connection.scope}' insufficient. Minimum required: '${minScope}'`
      }
    }
  }
  
  return { valid: true }
}

// UI helper for displaying connection requirements
export function getConnectionRequirementDisplay(agentName: string): {
  title: string
  description: string
  required: string[]
  optional: string[]
  scope: string
  canRun: boolean
} {
  const req = getAgentRequirements(agentName)
  
  return {
    title: req.required && req.required.length > 0 ? 'Connection Required' : 'Connection Optional',
    description: req.description || 'No connection requirements specified',
    required: req.required || [],
    optional: req.optional || [],
    scope: req.minScope || 'read-only',
    canRun: req.fallback !== false
  }
}