// CrapGPT Connection Registry - Provider-Specific Integrations
// Handles OpenOps, Arcade, HexStrike, MCPJungle, ToolHive with scoped access

import { prisma } from '@wasp-lang/auth/server'
import { r2 } from './r2.js'
import { connectionService } from './connectionService.js'

// Enhanced provider configurations with scopes and capabilities
const PROVIDER_SPECS = {
  openops: {
    name: 'OpenOps',
    description: 'Workflow automation and infrastructure operations',
    scopes: {
      'read-only': {
        label: 'Read Only',
        description: 'View inventory, costs, and resource descriptions',
        actions: ['list', 'describe', 'get-logs']
      },
      'change-safe': {
        label: 'Change Safe',
        description: 'Start/stop instances, rotate keys, apply tags',
        actions: ['list', 'describe', 'get-logs', 'start', 'stop', 'tag', 'rotate-keys']
      },
      'admin': {
        label: 'Admin',
        description: 'Create/update infrastructure, bulk operations',
        actions: ['*']
      }
    },
    configSchema: {
      required: ['apiUrl', 'apiKey'],
      optional: ['defaultAccount', 'roles', 'capabilities'],
      validation: {
        apiUrl: /^https:\/\/api\.openops\.(com|dev|local)/,
        apiKey: /^ap_[A-Za-z0-9_-]{32,}/
      }
    }
  },

  arcade: {
    name: 'Arcade',
    description: 'Compute orchestration and job execution',
    scopes: {
      'compute': {
        label: 'Compute Only',
        description: 'Run jobs and scripts',
        actions: ['jobs.create', 'jobs.list', 'jobs.get', 'jobs.logs']
      },
      'storage': {
        label: 'Compute + Storage',
        description: 'Jobs plus artifact management',
        actions: ['jobs.*', 'artifacts.upload', 'artifacts.download']
      },
      'admin': {
        label: 'Full Access',
        description: 'All Arcade capabilities including project management',
        actions: ['*']
      }
    },
    configSchema: {
      required: ['apiKey'],
      optional: ['project', 'region', 'capabilities'],
      validation: {
        apiKey: /^arc_[A-Za-z0-9_-]{32,}/,
        project: /^[a-z0-9-]{3,50}$/
      }
    }
  },

  hexstrike: {
    name: 'HexStrike',
    description: 'Security testing and reconnaissance tools',
    scopes: {
      'passive': {
        label: 'Passive Scanning',
        description: 'Non-intrusive discovery tools only',
        actions: ['subfinder', 'httpx', 'katana.passive', 'nmap.discovery']
      },
      'active': {
        label: 'Active Scanning',
        description: 'Full reconnaissance suite including port scans',
        actions: ['subfinder', 'httpx', 'katana.*', 'nmap.*', 'gobuster']
      },
      'exploit': {
        label: 'Exploitation',
        description: 'All tools including nuclei vulnerability scanner',
        actions: ['*']
      }
    },
    configSchema: {
      required: ['serverUrl'],
      optional: ['transport', 'toolWhitelist', 'maxConcurrentTools', 'timeoutSec', 'sandbox'],
      validation: {
        serverUrl: /^https?:\/\/.+/,
        transport: /^mcp-(http|websocket)$/
      }
    }
  },

  mcpjungle: {
    name: 'MCPJungle',
    description: 'MCP gateway for agent communication',
    scopes: {
      'discovery': {
        label: 'Discovery Only',
        description: 'List available tools and capabilities',
        actions: ['tools.list', 'tools.describe']
      },
      'execution': {
        label: 'Tool Execution',
        description: 'Execute approved tools from allow list',
        actions: ['tools.list', 'tools.describe', 'tools.call']
      },
      'admin': {
        label: 'Full Gateway',
        description: 'Manage MCP servers and route any requests',
        actions: ['*']
      }
    },
    configSchema: {
      required: ['url'],
      optional: ['token', 'allowedTools', 'hubId'],
      validation: {
        url: /^https?:\/\/.+\/mcp/,
        token: /^bearer_.+/
      }
    }
  },

  toolhive: {
    name: 'ToolHive',
    description: 'Tool registry and secret management',
    scopes: {
      'read-secrets': {
        label: 'Read Secrets',
        description: 'Access stored API keys and credentials',
        actions: ['secrets.get', 'registry.list']
      },
      'write-secrets': {
        label: 'Manage Secrets',
        description: 'Store and update API keys and credentials',
        actions: ['secrets.*', 'registry.list']
      },
      'admin': {
        label: 'Full Registry',
        description: 'Manage tools, secrets, and registry configuration',
        actions: ['*']
      }
    },
    configSchema: {
      required: ['registryUrl'],
      optional: ['vault', 'secrets', 'namespace'],
      validation: {
        registryUrl: /^https:\/\/registry\.toolhive\.(dev|com)/
      }
    }
  }
}

class ConnectionRegistry {
  constructor() {
    this.activeConnections = new Map() // Cache for active connections
    this.artifactPaths = new Map() // Track R2 paths per execution
  }

  // Get typed connection configuration
  async getConnection(userId, type, connectionId = null) {
    let connection
    
    if (connectionId) {
      connection = await prisma.connection.findFirst({
        where: { 
          id: connectionId,
          userId,
          status: 'active'
        }
      })
    } else {
      // Get default connection of this type
      connection = await prisma.connection.findFirst({
        where: { 
          userId,
          type,
          status: 'active'
        },
        orderBy: { lastUsed: 'desc' }
      })
    }

    if (!connection) {
      throw new Error(`No ${type} connection found`)
    }

    // Decrypt configuration
    const config = connectionService.decryptConfig(connection.config)
    
    // Update last used timestamp
    await prisma.connection.update({
      where: { id: connection.id },
      data: { lastUsed: new Date() }
    })

    return {
      id: connection.id,
      name: connection.name,
      type: connection.type,
      scope: connection.scopes?.[0] || 'read-only', // Primary scope
      config,
      capabilities: this.getConnectionCapabilities(type, connection.scopes)
    }
  }

  // Get connection capabilities based on scope
  getConnectionCapabilities(type, scopes) {
    const spec = PROVIDER_SPECS[type]
    if (!spec || !scopes) return []

    const capabilities = []
    for (const scope of scopes) {
      if (spec.scopes[scope]) {
        capabilities.push(...spec.scopes[scope].actions)
      }
    }
    return [...new Set(capabilities)] // Deduplicate
  }

  // Check if connection allows specific action
  canPerformAction(connection, action) {
    const capabilities = connection.capabilities
    return capabilities.includes('*') || capabilities.includes(action)
  }

  // OpenOps Integration
  async runOpenOpsFlow(userId, flowId, params, connectionId, executionId) {
    const conn = await this.getConnection(userId, 'openops', connectionId)
    
    if (!this.canPerformAction(conn, 'workflows.run')) {
      throw new Error('Connection scope does not allow workflow execution')
    }

    const response = await fetch(`${conn.config.apiUrl}/flows/${flowId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${conn.config.apiKey}`,
        'X-User-Agent': 'CrapGPT-Agent'
      },
      body: JSON.stringify({
        ...params,
        metadata: {
          userId,
          executionId,
          connectionId: conn.id
        }
      })
    })

    if (!response.ok) {
      throw new Error(`OpenOps workflow failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Store artifacts to R2
    const artifactPath = r2.buildOrchestrationPath('openops', executionId, 'workflow.json')
    await r2.putJson(artifactPath, {
      flowId,
      params,
      result,
      connection: { id: conn.id, name: conn.name },
      timestamp: new Date().toISOString()
    })

    // Store logs if available
    if (result.logs) {
      const logsPath = r2.buildOrchestrationPath('openops', executionId, 'logs.txt')
      await r2.putObject(logsPath, result.logs, { contentType: 'text/plain' })
    }

    return {
      success: true,
      runId: result.id,
      status: result.status,
      artifacts: [artifactPath],
      provider: 'openops',
      connection: conn.id
    }
  }

  // Arcade Integration
  async runArcadeJob(userId, task, payload, connectionId, executionId) {
    const conn = await this.getConnection(userId, 'arcade', connectionId)
    
    if (!this.canPerformAction(conn, 'jobs.create')) {
      throw new Error('Connection scope does not allow job creation')
    }

    const response = await fetch('https://api.arcade.software/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': conn.config.apiKey,
        'X-Arcade-Project': conn.config.project || 'crapgpt'
      },
      body: JSON.stringify({
        type: task,
        payload,
        metadata: {
          userId,
          executionId,
          connectionId: conn.id,
          source: 'crapgpt-agent'
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Arcade job failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Poll for completion (simplified for now)
    await this.pollArcadeJob(result.id, conn, executionId)
    
    // Store job details to R2
    const jobPath = r2.buildOrchestrationPath('arcade', executionId, 'job.json')
    await r2.putJson(jobPath, {
      task,
      payload,
      result,
      connection: { id: conn.id, name: conn.name },
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      jobId: result.id,
      status: result.status,
      artifacts: [jobPath],
      provider: 'arcade',
      connection: conn.id
    }
  }

  // HexStrike Tool Execution
  async runHexStrikeTool(userId, toolName, args, connectionId, executionId) {
    const conn = await this.getConnection(userId, 'hexstrike', connectionId)
    
    if (!this.canPerformAction(conn, toolName)) {
      throw new Error(`Connection scope does not allow tool: ${toolName}`)
    }

    // Check tool whitelist if configured
    if (conn.config.toolWhitelist && !conn.config.toolWhitelist.includes(toolName)) {
      throw new Error(`Tool ${toolName} not in whitelist`)
    }

    const mcpRequest = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    }

    const response = await fetch(conn.config.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MCP-Version': '2024-11-05'
      },
      body: JSON.stringify(mcpRequest)
    })

    if (!response.ok) {
      throw new Error(`HexStrike tool execution failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Store results to R2
    const toolPath = r2.buildOrchestrationPath('hexstrike', executionId, `${toolName}.json`)
    await r2.putJson(toolPath, {
      tool: toolName,
      args,
      result,
      connection: { id: conn.id, name: conn.name },
      timestamp: new Date().toISOString()
    })

    // Store raw output if available
    if (result.content?.[0]?.text) {
      const outputPath = r2.buildOrchestrationPath('hexstrike', executionId, `${toolName}_output.txt`)
      await r2.putObject(outputPath, result.content[0].text, { contentType: 'text/plain' })
    }

    return {
      success: true,
      tool: toolName,
      content: result.content,
      artifacts: [toolPath],
      provider: 'hexstrike',
      connection: conn.id
    }
  }

  // MCPJungle Gateway
  async callMCPTool(userId, toolName, args, connectionId, executionId) {
    const conn = await this.getConnection(userId, 'mcpjungle', connectionId)
    
    if (!this.canPerformAction(conn, 'tools.call')) {
      throw new Error('Connection scope does not allow tool execution')
    }

    // Check allowed tools if configured
    if (conn.config.allowedTools && !conn.config.allowedTools.includes(toolName)) {
      throw new Error(`Tool ${toolName} not in allowed list`)
    }

    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (conn.config.token) {
      headers['Authorization'] = conn.config.token
    }

    const response = await fetch(`${conn.config.url}/call`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tool: toolName,
        arguments: args,
        metadata: {
          userId,
          executionId,
          connectionId: conn.id
        }
      })
    })

    if (!response.ok) {
      throw new Error(`MCP tool call failed: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Store call transcript to R2
    const callPath = r2.buildOrchestrationPath('mcpjungle', executionId, `${toolName}_call.json`)
    await r2.putJson(callPath, {
      tool: toolName,
      args,
      result,
      connection: { id: conn.id, name: conn.name },
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      tool: toolName,
      result,
      artifacts: [callPath],
      provider: 'mcpjungle',
      connection: conn.id
    }
  }

  // ToolHive Integration
  async getToolHiveSecret(userId, secretName, connectionId) {
    const conn = await this.getConnection(userId, 'toolhive', connectionId)
    
    if (!this.canPerformAction(conn, 'secrets.get')) {
      throw new Error('Connection scope does not allow secret access')
    }

    const response = await fetch(`${conn.config.registryUrl}/secrets/${secretName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${conn.config.vault?.keyring}`,
        'X-Vault-Namespace': conn.config.vault?.namespace || 'default'
      }
    })

    if (!response.ok) {
      throw new Error(`ToolHive secret access failed: ${response.statusText}`)
    }

    const secret = await response.json()
    return secret.value
  }

  async setToolHiveSecret(userId, secretName, secretValue, connectionId) {
    const conn = await this.getConnection(userId, 'toolhive', connectionId)
    
    if (!this.canPerformAction(conn, 'secrets.set')) {
      throw new Error('Connection scope does not allow secret modification')
    }

    const response = await fetch(`${conn.config.registryUrl}/secrets/${secretName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${conn.config.vault?.keyring}`,
        'X-Vault-Namespace': conn.config.vault?.namespace || 'default'
      },
      body: JSON.stringify({ value: secretValue })
    })

    if (!response.ok) {
      throw new Error(`ToolHive secret update failed: ${response.statusText}`)
    }

    return { success: true, secret: secretName }
  }

  // Helper methods
  async pollArcadeJob(jobId, connection, executionId, maxAttempts = 30) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`https://api.arcade.software/jobs/${jobId}`, {
        headers: {
          'Authorization': connection.config.apiKey,
          'X-Arcade-Project': connection.config.project || 'crapgpt'
        }
      })

      if (!response.ok) continue

      const status = await response.json()
      
      if (status.state === 'completed' || status.state === 'failed') {
        // Store final logs
        if (status.logs) {
          const logsPath = r2.buildOrchestrationPath('arcade', executionId, 'logs.txt')
          await r2.putObject(logsPath, status.logs, { contentType: 'text/plain' })
        }
        return status
      }

      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
    }

    throw new Error('Arcade job polling timeout')
  }

  // Get provider specifications for UI
  getProviderSpecs() {
    return PROVIDER_SPECS
  }

  // Validate connection configuration
  validateConnectionConfig(type, config) {
    const spec = PROVIDER_SPECS[type]
    if (!spec) {
      throw new Error(`Unknown provider type: ${type}`)
    }

    const errors = []
    
    // Check required fields
    for (const field of spec.configSchema.required) {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    // Validate field formats
    if (spec.configSchema.validation) {
      for (const [field, pattern] of Object.entries(spec.configSchema.validation)) {
        if (config[field] && !pattern.test(config[field])) {
          errors.push(`Invalid format for field: ${field}`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Generate pre-signed URLs for artifact access
  async generateArtifactUrls(userId, executionId, provider) {
    const basePath = r2.buildOrchestrationPath(provider, executionId)
    
    // List artifacts for this execution
    const artifacts = await r2.listObjects(basePath)
    
    const urls = {}
    for (const artifact of artifacts) {
      const downloadUrl = await r2.generatePresignedUrl(artifact.key, 'GET', 3600) // 1 hour
      urls[artifact.key] = downloadUrl
    }

    return urls
  }
}

// Singleton instance
export const connectionRegistry = new ConnectionRegistry()

export { PROVIDER_SPECS }
export default connectionRegistry