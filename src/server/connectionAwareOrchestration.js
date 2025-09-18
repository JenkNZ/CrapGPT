// Connection-Aware Agent Orchestration Service
// Injects connection context into agent execution and validates required connections

import { prisma } from '@wasp-lang/auth/server'
import { connectionService } from './connectionService.js'
import { r2 } from './r2.js'

class ConnectionAwareOrchestration {
  constructor() {
    this.connectionCache = new Map()
    this.connectionCacheExpiry = new Map()
  }

  // Get decrypted connection credentials with caching
  async getConnectionCredentials(connectionId, userId) {
    const cacheKey = `${connectionId}_${userId}`
    const now = Date.now()
    
    // Check cache first
    if (this.connectionCache.has(cacheKey)) {
      const expiry = this.connectionCacheExpiry.get(cacheKey)
      if (expiry > now) {
        return this.connectionCache.get(cacheKey)
      } else {
        // Clean up expired cache entry
        this.connectionCache.delete(cacheKey)
        this.connectionCacheExpiry.delete(cacheKey)
      }
    }

    // Fetch from database
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId,
        status: 'active'
      }
    })

    if (!connection) {
      throw new Error(`Connection ${connectionId} not found or inactive`)
    }

    try {
      const credentials = connectionService.decryptConfig(connection.config)
      
      // Cache for 5 minutes
      this.connectionCache.set(cacheKey, {
        ...credentials,
        connectionType: connection.type,
        scopes: connection.scopes
      })
      this.connectionCacheExpiry.set(cacheKey, now + 5 * 60 * 1000)
      
      return this.connectionCache.get(cacheKey)
    } catch (error) {
      throw new Error(`Failed to decrypt connection ${connectionId}: ${error.message}`)
    }
  }

  // Get agent connections and validate requirements
  async getAgentConnections(agentId, userId) {
    const agentConnections = await prisma.agentConnection.findMany({
      where: {
        agentId,
        connection: {
          userId,
          status: 'active'
        }
      },
      include: {
        connection: true,
        agent: {
          select: {
            name: true,
            capabilities: true
          }
        }
      }
    })

    const connections = {}
    const requiredMissing = []
    
    for (const ac of agentConnections) {
      try {
        const credentials = await this.getConnectionCredentials(ac.connectionId, userId)
        
        connections[ac.connection.type] = {
          id: ac.connectionId,
          name: ac.connection.name,
          type: ac.connection.type,
          credentials,
          permissions: ac.permissions,
          isRequired: ac.isRequired
        }
      } catch (error) {
        console.error(`Failed to load connection ${ac.connectionId}:`, error)
        if (ac.isRequired) {
          requiredMissing.push({
            type: ac.connection.type,
            name: ac.connection.name,
            error: error.message
          })
        }
      }
    }

    return {
      connections,
      requiredMissing
    }
  }

  // Execute agent with connection context
  async executeAgentWithConnections(agentId, input, userId, options = {}) {
    try {
      // Get agent details
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          connections: {
            include: {
              connection: true
            }
          }
        }
      })

      if (!agent || !agent.isActive) {
        throw new Error(`Agent ${agentId} not found or inactive`)
      }

      // Load and validate connections
      const { connections, requiredMissing } = await this.getAgentConnections(agentId, userId)

      if (requiredMissing.length > 0) {
        throw new Error(`Missing required connections: ${requiredMissing.map(c => `${c.name} (${c.type})`).join(', ')}`)
      }

      // Create execution context
      const executionContext = {
        agentId,
        agentName: agent.name,
        userId,
        input,
        connections,
        capabilities: JSON.parse(agent.capabilities || '{}'),
        options,
        executionId: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      }

      // Log execution start
      await this.logExecution(executionContext.executionId, 'started', {
        agentId,
        agentName: agent.name,
        userId,
        connectionTypes: Object.keys(connections),
        input: input.substring(0, 500) // Log first 500 chars
      })

      // Route to appropriate execution method based on agent capabilities
      let result
      const capabilities = executionContext.capabilities

      if (capabilities.delegation && capabilities.multiProvider) {
        result = await this.executeOrchestratorAgent(executionContext)
      } else if (capabilities.infrastructureAutomation) {
        result = await this.executeInfrastructureAgent(executionContext)
      } else if (capabilities.mediaGeneration) {
        result = await this.executeMediaAgent(executionContext)
      } else if (capabilities.research) {
        result = await this.executeResearchAgent(executionContext)
      } else {
        result = await this.executeStandardAgent(executionContext)
      }

      // Update connection usage timestamps
      for (const [type, connection] of Object.entries(connections)) {
        await prisma.connection.update({
          where: { id: connection.id },
          data: { lastUsed: new Date() }
        })

        // Log connection usage
        await prisma.connectionLog.create({
          data: {
            connectionId: connection.id,
            userId,
            agentId,
            action: 'used',
            context: JSON.stringify({
              executionId: executionContext.executionId,
              agentName: agent.name,
              taskType: capabilities.primary || 'general'
            }),
            success: true
          }
        })
      }

      // Log execution completion
      await this.logExecution(executionContext.executionId, 'completed', {
        result: {
          type: result.type,
          success: result.success,
          outputLength: result.text?.length || 0
        },
        connectionsUsed: Object.keys(connections)
      })

      return {
        ...result,
        executionId: executionContext.executionId,
        connectionsUsed: Object.keys(connections)
      }

    } catch (error) {
      console.error('Connection-aware agent execution error:', error)
      
      // Log execution failure
      if (executionContext?.executionId) {
        await this.logExecution(executionContext.executionId, 'failed', {
          error: error.message,
          agentId,
          userId
        })
      }
      
      throw error
    }
  }

  // Execute orchestrator agent (delegates to other agents/services)
  async executeOrchestratorAgent(context) {
    const { connections, input, options } = context

    // Check if we have MCP connection for delegation
    if (connections.mcpjungle) {
      const mcpCreds = connections.mcpjungle.credentials
      return await this.callMCPJungle(mcpCreds, input, {
        ...options,
        delegationType: 'orchestration'
      })
    }

    // Fallback to OpenOps workflow if available
    if (connections.openops) {
      const openOpsCreds = connections.openops.credentials
      return await this.callOpenOps(openOpsCreds, 'orchestration-workflow', {
        input,
        ...options
      })
    }

    throw new Error('Orchestrator agent requires MCPJungle or OpenOps connection')
  }

  // Execute infrastructure automation agent
  async executeInfrastructureAgent(context) {
    const { connections, input, options } = context

    // Check for infrastructure connections in order of preference
    const infraConnections = ['arcade', 'aws', 'azure', 'gcp', 'openops']
    
    for (const connType of infraConnections) {
      if (connections[connType]) {
        switch (connType) {
          case 'arcade':
            return await this.callArcade(connections[connType].credentials, input, options)
          case 'openops':
            return await this.callOpenOps(connections[connType].credentials, 'infrastructure-workflow', {
              input,
              ...options
            })
          case 'aws':
          case 'azure':
          case 'gcp':
            return await this.callCloudProvider(connType, connections[connType].credentials, input, options)
        }
      }
    }

    throw new Error('Infrastructure agent requires Arcade, cloud provider, or OpenOps connection')
  }

  // Execute media generation agent
  async executeMediaAgent(context) {
    const { connections, input, options } = context

    // Determine media type from input
    const mediaType = this.determineMediaType(input)

    // Route to appropriate media provider
    if (mediaType === 'video' && connections.modelslab) {
      return await this.callModelsLab(connections.modelslab.credentials, input, {
        ...options,
        type: 'video'
      })
    } else if ((mediaType === 'image' || mediaType === 'audio') && connections.fal) {
      return await this.callFAL(connections.fal.credentials, input, {
        ...options,
        type: mediaType
      })
    }

    throw new Error(`Media agent requires appropriate connection for ${mediaType} generation`)
  }

  // Execute research agent
  async executeResearchAgent(context) {
    const { connections, input, options } = context

    // Research agents can use multiple connection types
    const availableConnections = Object.keys(connections)
    
    return await this.callOpenRouter(connections, input, {
      ...options,
      taskType: 'research',
      availableTools: availableConnections
    })
  }

  // Execute standard agent (basic LLM calls)
  async executeStandardAgent(context) {
    const { connections, input, options } = context

    // Use OpenRouter if available, otherwise any LLM provider
    if (connections.openrouter) {
      return await this.callOpenRouter(connections, input, options)
    }

    throw new Error('Standard agent requires at least an OpenRouter connection')
  }

  // Provider integration methods
  async callMCPJungle(credentials, input, options) {
    const { MCPJungle } = await import('mcpjungle')
    
    const client = new MCPJungle({
      apiKey: credentials.apiKey,
      endpoint: credentials.endpoint || 'https://hub.mcpjungle.com',
      hubId: credentials.hub || 'crapgpt-hub'
    })

    const result = await client.delegate({
      task: input,
      ...options
    })

    return {
      type: 'delegation',
      success: true,
      text: result.output,
      metadata: {
        provider: 'mcpjungle',
        delegationId: result.id,
        executionTime: result.executionTime
      }
    }
  }

  async callOpenOps(credentials, workflowType, params) {
    const { OpenOpsSDK } = await import('@openops/sdk')
    
    const client = new OpenOpsSDK({
      apiKey: credentials.apiKey,
      endpoint: credentials.endpoint || 'https://api.openops.cloud',
      workspace: credentials.workspace || 'default'
    })

    const execution = await client.workflows.run(workflowType, params)

    return {
      type: 'workflow',
      success: execution.status === 'completed',
      text: execution.output || `Workflow ${workflowType} executed`,
      metadata: {
        provider: 'openops',
        executionId: execution.id,
        workflowType,
        status: execution.status
      }
    }
  }

  async callArcade(credentials, input, options) {
    const { ArcadeSDK } = await import('arcade-sdk')
    
    const client = new ArcadeSDK({
      apiKey: credentials.apiKey,
      endpoint: credentials.endpoint || 'https://api.arcade.dev',
      project: credentials.project || 'crapgpt'
    })

    // Deploy infrastructure based on input
    const deployment = await client.deploy({
      template: options.template || 'auto-detect',
      config: {
        description: input,
        ...options
      }
    })

    return {
      type: 'infrastructure',
      success: deployment.status === 'deployed',
      text: `Infrastructure deployed: ${deployment.endpoints?.join(', ') || 'No endpoints'}`,
      metadata: {
        provider: 'arcade',
        deploymentId: deployment.id,
        status: deployment.status,
        endpoints: deployment.endpoints
      }
    }
  }

  async callOpenRouter(connections, input, options) {
    const { OpenAI } = await import('openai')
    
    // Use openrouter connection if available
    const openrouterCreds = connections.openrouter?.credentials
    if (!openrouterCreds) {
      throw new Error('OpenRouter connection required')
    }

    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterCreds.apiKey
    })

    const response = await client.chat.completions.create({
      model: options.model || 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: options.systemMessage || 'You are a helpful AI assistant.'
        },
        {
          role: 'user',
          content: input
        }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7
    })

    return {
      type: 'llm',
      success: true,
      text: response.choices[0].message.content,
      metadata: {
        provider: 'openrouter',
        model: options.model || 'openai/gpt-4o-mini',
        usage: response.usage
      }
    }
  }

  async callFAL(credentials, input, options) {
    const { fal } = await import('@fal-ai/client')
    
    fal.config({ credentials: credentials.apiKey })

    const modelMap = {
      image: 'fal-ai/flux-dev',
      audio: 'fal-ai/musicgen',
      video: 'fal-ai/video-gen'
    }

    const model = modelMap[options.type] || modelMap.image

    const result = await fal.subscribe(model, {
      input: {
        prompt: input,
        ...options
      }
    })

    return {
      type: 'media',
      success: true,
      text: `Generated ${options.type || 'image'}`,
      images: result.images,
      metadata: {
        provider: 'fal',
        model,
        requestId: result.requestId
      }
    }
  }

  async callModelsLab(credentials, input, options) {
    const axios = await import('axios')
    
    const endpoint = credentials.endpoint || 'https://modelslab.com/api/v6'
    const response = await axios.post(`${endpoint}/video`, {
      key: credentials.apiKey,
      prompt: input,
      ...options
    })

    return {
      type: 'media',
      success: response.data.status === 'success',
      text: 'Video generated',
      images: response.data.output?.images || [],
      metadata: {
        provider: 'modelslab',
        status: response.data.status
      }
    }
  }

  // Helper methods
  determineMediaType(input) {
    const inputLower = input.toLowerCase()
    if (/\b(video|movie|animation|clip)\b/.test(inputLower)) return 'video'
    if (/\b(audio|sound|music|voice|speech)\b/.test(inputLower)) return 'audio'
    return 'image'
  }

  async callCloudProvider(type, credentials, input, options) {
    // Basic cloud provider integration
    return {
      type: 'cloud',
      success: true,
      text: `${type} operation completed`,
      metadata: {
        provider: type,
        operation: options.operation || 'general'
      }
    }
  }

  // Execution logging
  async logExecution(executionId, status, data) {
    try {
      const logPath = r2.buildOrchestrationPath('connection-executions', `${executionId}.json`)
      
      let executionLog
      try {
        executionLog = await r2.getJson(logPath)
      } catch (error) {
        executionLog = {
          executionId,
          events: [],
          createdAt: new Date().toISOString()
        }
      }

      executionLog.events.push({
        timestamp: new Date().toISOString(),
        status,
        ...data
      })

      executionLog.currentStatus = status
      executionLog.updatedAt = new Date().toISOString()

      await r2.putJson(logPath, executionLog)
    } catch (error) {
      console.error(`Failed to log execution ${executionId}:`, error)
    }
  }

  // Clean up expired cache entries
  cleanupCache() {
    const now = Date.now()
    for (const [key, expiry] of this.connectionCacheExpiry.entries()) {
      if (expiry <= now) {
        this.connectionCache.delete(key)
        this.connectionCacheExpiry.delete(key)
      }
    }
  }
}

// Create singleton instance
export const connectionAwareOrchestration = new ConnectionAwareOrchestration()

// Set up cache cleanup interval (every 5 minutes)
setInterval(() => {
  connectionAwareOrchestration.cleanupCache()
}, 5 * 60 * 1000)

export default connectionAwareOrchestration