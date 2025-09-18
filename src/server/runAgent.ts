import { getConnectionById, validateConnectionScope, createConnectionClient } from './connectionRuntime'
import { v4 as uuid } from 'uuid'

// Import your existing utilities
// import { putJson } from './r2' // your R2 helper
// import { llmCallOpenRouter } from './providers/openrouter' // your existing LLM util

export async function runAgent({ 
  userId, 
  agent, 
  input, 
  connectionId 
}: {
  userId: string
  agent: string
  input: any
  connectionId?: string
}) {
  // Get connection if specified
  const conn = await getConnectionById(userId, connectionId)

  // Route by agent type and handle connections appropriately
  switch (agent) {
    case 'researcher':
      return await runResearchAgent(userId, input, conn)
      
    case 'coder':
      return await runCodeAgent(userId, input, conn)
      
    case 'openops-executor':
      return await runOpenOpsAgent(userId, input, conn)
      
    case 'hexstrike-scanner':
      return await runHexStrikeAgent(userId, input, conn)
      
    case 'assistant':
      // Pure LLM assistant doesn't need connections
      return await runAssistantAgent(userId, input)
      
    default:
      throw new Error(`Unknown agent: ${agent}`)
  }
}

async function runResearchAgent(userId: string, input: any, conn: any) {
  // Research agent can work with or without connections
  if (conn && conn.type === 'openops') {
    // Use OpenOps for enhanced research capabilities
    validateConnectionScope(conn, 'read-only')
    const client = createConnectionClient(conn, 'research')
    
    const response = await fetch(`${client.baseURL}/flows/${input.flowId}/run`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({
        ...input.params,
        account: client.defaultAccount
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenOps API error: ${response.status}`)
    }
    
    const result = await response.json()
    const runId = result.id || uuid()
    
    // Store results in R2 (uncomment when R2 helper is available)
    // await putJson(`openops/runs/${runId}/results.json`, result)
    
    return { 
      ok: true, 
      runId, 
      data: result,
      source: 'openops',
      connectionUsed: conn.id
    }
  } else {
    // Fallback to basic research using web search or LLM
    // const research = await llmCallOpenRouter(`Research the following topic: ${input.topic}`)
    
    return { 
      ok: true, 
      data: { 
        text: `Research completed on topic: ${input.topic}`,
        methodology: 'llm-based-research'
      },
      source: 'llm'
    }
  }
}

async function runCodeAgent(userId: string, input: any, conn: any) {
  if (conn && conn.type === 'arcade') {
    // Use Arcade for enhanced code execution
    validateConnectionScope(conn, 'change-safe')
    const client = createConnectionClient(conn, 'execute')
    
    // This would integrate with actual Arcade API
    const mockResult = {
      success: true,
      output: `Code execution completed using Arcade connection`,
      executionTime: '1.2s',
      resources: client.project ? `Project: ${client.project}` : 'Default project'
    }
    
    return { 
      ok: true, 
      data: mockResult,
      source: 'arcade',
      connectionUsed: conn.id
    }
  } else {
    // Local code analysis without external connections
    return { 
      ok: true, 
      data: { 
        text: `Code analysis completed locally for: ${input.code?.substring(0, 100)}...`,
        analysis: 'static-analysis'
      },
      source: 'local'
    }
  }
}

async function runOpenOpsAgent(userId: string, input: any, conn: any) {
  if (!conn || conn.type !== 'openops') {
    throw new Error('OpenOps connection required for this agent')
  }
  
  validateConnectionScope(conn, input.requiredScope || 'read-only')
  const client = createConnectionClient(conn, 'execute')
  
  try {
    const response = await fetch(`${client.baseURL}/flows/${input.flowId}/run`, {
      method: 'POST',
      headers: client.headers,
      body: JSON.stringify({
        parameters: input.parameters || {},
        account: client.defaultAccount || input.account
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenOps execution failed: ${response.status} - ${error}`)
    }
    
    const result = await response.json()
    
    return { 
      ok: true, 
      runId: result.id,
      status: result.status,
      data: result,
      connectionUsed: conn.id,
      scope: conn.scope
    }
  } catch (error) {
    console.error('OpenOps agent error:', error.message)
    throw new Error(`OpenOps agent failed: ${error.message}`)
  }
}

async function runHexStrikeAgent(userId: string, input: any, conn: any) {
  if (!conn || conn.type !== 'hexstrike') {
    throw new Error('HexStrike MCP connection required for security scanning')
  }
  
  validateConnectionScope(conn, 'change-safe') // Security tools need at least change-safe
  const client = createConnectionClient(conn, 'scan')
  
  // Validate tool is in whitelist
  const requestedTool = input.tool
  if (client.toolWhitelist.length > 0 && !client.toolWhitelist.includes(requestedTool)) {
    throw new Error(`Tool '${requestedTool}' not in connection whitelist: ${client.toolWhitelist.join(', ')}`)
  }
  
  try {
    // This would integrate with actual HexStrike MCP server
    const mockScanResult = {
      tool: requestedTool,
      target: input.target,
      results: `Security scan completed using ${requestedTool}`,
      findings: [
        { severity: 'info', description: 'Target responded to scan' },
        { severity: 'low', description: 'Standard security headers detected' }
      ],
      executionTime: Math.floor(Math.random() * 30) + 5, // 5-35 seconds
      connectionId: conn.id
    }
    
    return { 
      ok: true, 
      data: mockScanResult,
      source: 'hexstrike-mcp',
      connectionUsed: conn.id,
      toolsUsed: [requestedTool]
    }
  } catch (error) {
    console.error('HexStrike agent error:', error.message)
    throw new Error(`Security scan failed: ${error.message}`)
  }
}

async function runAssistantAgent(userId: string, input: any) {
  // General purpose assistant doesn't require specific connections
  // Uses your existing LLM providers directly
  
  try {
    // const response = await llmCallOpenRouter(input.prompt)
    const mockResponse = `I'm your AI assistant. You asked: "${input.prompt}". This would be processed by your OpenRouter integration.`
    
    return { 
      ok: true, 
      data: { 
        text: mockResponse,
        model: 'openai/gpt-4o',
        provider: 'openrouter'
      },
      source: 'direct-llm'
    }
  } catch (error) {
    console.error('Assistant agent error:', error.message)
    throw new Error(`Assistant failed: ${error.message}`)
  }
}

// Helper function to get agent requirements
export function getAgentConnectionRequirements(agentName: string) {
  const requirements = {
    'researcher': { 
      optional: ['openops'], 
      preferred: 'openops',
      fallback: true
    },
    'coder': { 
      optional: ['arcade'], 
      preferred: 'arcade',
      fallback: true
    },
    'openops-executor': { 
      required: ['openops'],
      minScope: 'read-only',
      fallback: false
    },
    'hexstrike-scanner': { 
      required: ['hexstrike'],
      minScope: 'change-safe',
      fallback: false
    },
    'assistant': { 
      required: [],
      fallback: true
    }
  }
  
  return requirements[agentName] || { required: [], fallback: true }
}