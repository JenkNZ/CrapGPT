import React, { useState, useEffect } from 'react'
import { useQuery } from '@wasp/queries'
import listConnectionsQuery from '@wasp/queries/listConnections'

interface AgentRunConfigProps {
  agentName: string
  requiredType?: string
  minScope?: string
  onConnectionSelect: (connectionId: string | null) => void
  onValidationChange: (isValid: boolean) => void
}

export function AgentRunConfig({ 
  agentName, 
  requiredType, 
  minScope = 'read-only',
  onConnectionSelect, 
  onValidationChange 
}: AgentRunConfigProps) {
  const { data: connections, isLoading, error } = useQuery(listConnectionsQuery)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')

  // Filter connections by type and scope
  const eligibleConnections = (connections || []).filter((c: any) => {
    if (!c.active) return false
    if (requiredType && c.type !== requiredType) return false
    
    // Check scope hierarchy: read-only < change-safe < admin
    if (minScope) {
      const scopeHierarchy = ['read-only', 'change-safe', 'admin']
      const currentLevel = scopeHierarchy.indexOf(c.scope)
      const requiredLevel = scopeHierarchy.indexOf(minScope)
      
      if (currentLevel < requiredLevel) return false
    }
    
    return true
  })

  // Auto-validation effect
  useEffect(() => {
    if (!requiredType) {
      // No connection required - always valid
      onValidationChange(true)
      return
    }

    if (eligibleConnections.length === 0) {
      // Required connection type not available
      onValidationChange(false)
      return
    }

    if (selectedConnectionId) {
      // Connection selected
      onValidationChange(true)
      onConnectionSelect(selectedConnectionId)
    } else {
      // Connection required but none selected
      onValidationChange(false)
      onConnectionSelect(null)
    }
  }, [selectedConnectionId, eligibleConnections.length, requiredType, onValidationChange, onConnectionSelect])

  const handleConnectionChange = (connectionId: string) => {
    setSelectedConnectionId(connectionId)
  }

  if (isLoading) {
    return (
      <div className="text-sm text-neutral-400">
        Loading connections...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-400">
        Error loading connections: {String(error)}
      </div>
    )
  }

  if (!requiredType) {
    // Agent doesn't need connections
    return (
      <div className="text-xs text-neutral-500">
        {agentName} runs independently without external connections
      </div>
    )
  }

  if (eligibleConnections.length === 0) {
    return (
      <div className="p-3 border border-yellow-400/30 rounded-lg bg-yellow-950/20">
        <div className="text-sm text-yellow-400 font-semibold">Connection Required</div>
        <div className="text-xs text-yellow-200 mt-1">
          {agentName} requires a <span className="font-mono">{requiredType}</span> connection with at least <span className="font-mono">{minScope}</span> scope.
        </div>
        <button 
          onClick={() => window.open('/connections', '_blank')}
          className="mt-2 text-xs px-2 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300"
        >
          Create Connection
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm">
        <div className="mb-1 text-neutral-300 flex items-center gap-2">
          Connection
          <span className="text-xs px-1 py-0.5 bg-neutral-700 rounded text-neutral-300">
            {requiredType}
          </span>
          {minScope !== 'read-only' && (
            <span className="text-xs px-1 py-0.5 bg-orange-900 rounded text-orange-200">
              min: {minScope}
            </span>
          )}
        </div>
        <select 
          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 outline-none focus:border-[#39FF14]"
          value={selectedConnectionId}
          onChange={(e) => handleConnectionChange(e.target.value)}
        >
          <option value="">Select a connection</option>
          {eligibleConnections.map((c: any) => (
            <option value={c.id} key={c.id}>
              {c.name} • {c.scope} • {c.type}
            </option>
          ))}
        </select>
      </label>

      {selectedConnectionId && (
        <div className="text-xs text-neutral-500">
          ✅ Ready to run {agentName} with selected connection
        </div>
      )}

      {eligibleConnections.length > 0 && (
        <button 
          onClick={() => window.open('/connections', '_blank')}
          className="text-xs text-neutral-400 hover:text-neutral-300"
        >
          + Create another connection
        </button>
      )}
    </div>
  )
}

// Simplified version for quick integration
export function AgentConnectionPicker({ 
  requiredType, 
  onPick 
}: { 
  requiredType: string; 
  onPick: (id: string) => void 
}) {
  const { data } = useQuery(listConnectionsQuery)
  const options = (data || []).filter((c: any) => c.type === requiredType && c.active)

  if (options.length === 0) {
    return (
      <div className="text-sm text-yellow-400">
        No {requiredType} connections available. 
        <a href="/connections" target="_blank" className="ml-1 underline">
          Create one
        </a>
      </div>
    )
  }

  return (
    <label className="text-sm">
      <div className="mb-1 text-neutral-300">Connection</div>
      <select 
        className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2"
        onChange={(e) => onPick(e.target.value)}
      >
        <option value="">Select a connection</option>
        {options.map((c: any) => (
          <option value={c.id} key={c.id}>
            {c.name} • {c.scope}
          </option>
        ))}
      </select>
    </label>
  )
}

export default AgentRunConfig