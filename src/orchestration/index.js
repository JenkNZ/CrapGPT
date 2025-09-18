// CrapGPT Mega AI Orchestration Integration Layer
// Integrates Hexstrike-AI, Toolhive, OpenOps, Arcade, MCPJungle

// Framework imports
import HexstrikeAI from 'hexstrike-ai'
import { ToolhiveCore, ToolRegistry } from '@toolhive/core'
import { OpenOpsSDK } from '@openops/sdk'
import { ArcadeSDK } from 'arcade-sdk'
import { MCPJungle, MCPHub } from 'mcpjungle'
import { OpenAI } from 'openai'
import { fal } from '@fal-ai/client'
import axios from 'axios'
import { r2 } from '../server/r2.js'

// Environment configuration
const config = {
  hexstrike: {
    apiKey: process.env.HEXSTRIKE_API_KEY,
    endpoint: process.env.HEXSTRIKE_ENDPOINT || 'http://localhost:8080',
    models: {
      fast: 'hexstrike-fast',
      balanced: 'hexstrike-balanced', 
      quality: 'hexstrike-quality'
    }
  },
  toolhive: {
    apiKey: process.env.TOOLHIVE_API_KEY,
    endpoint: process.env.TOOLHIVE_ENDPOINT || 'https://api.toolhive.com',
    registry: process.env.TOOLHIVE_REGISTRY || 'default'
  },
  openops: {
    apiKey: process.env.OPENOPS_API_KEY,
    endpoint: process.env.OPENOPS_ENDPOINT || 'https://api.openops.cloud',
    workspace: process.env.OPENOPS_WORKSPACE || 'default'
  },
  arcade: {
    apiKey: process.env.ARCADE_API_KEY,
    endpoint: process.env.ARCADE_ENDPOINT || 'https://api.arcade.dev',
    project: process.env.ARCADE_PROJECT || 'crapgpt'
  },
  mcpjungle: {
    apiKey: process.env.MCPJUNGLE_API_KEY,
    endpoint: process.env.MCPJUNGLE_ENDPOINT || 'https://hub.mcpjungle.com',
    hub: process.env.MCPJUNGLE_HUB || 'crapgpt-hub'
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    endpoint: 'https://openrouter.ai/api/v1'
  },
  fal: {
    apiKey: process.env.FAL_API_KEY
  },
  modelslab: {
    apiKey: process.env.MODELSLAB_API_KEY,
    endpoint: 'https://modelslab.com/api/v6'
  }
}

// Initialize framework clients
class OrchestrationManager {
  constructor() {
    this.hexstrike = null
    this.toolhive = null
    this.openops = null
    this.arcade = null
    this.mcpHub = null
    this.openrouter = null
    this.fal = null
    this.modelslab = null
    
    this.init()
  }

  async init() {
    try {
      // Initialize Hexstrike-AI for low-latency inference
      if (config.hexstrike.apiKey) {
        this.hexstrike = new HexstrikeAI({
          apiKey: config.hexstrike.apiKey,
          endpoint: config.hexstrike.endpoint
        })
      }

      // Initialize Toolhive for tool orchestration
      if (config.toolhive.apiKey) {
        this.toolhive = new ToolhiveCore({
          apiKey: config.toolhive.apiKey,
          endpoint: config.toolhive.endpoint
        })
        await this.registerCrapGPTTools()
      }

      // Initialize OpenOps for workflow automation
      if (config.openops.apiKey) {
        this.openops = new OpenOpsSDK({
          apiKey: config.openops.apiKey,
          endpoint: config.openops.endpoint,
          workspace: config.openops.workspace
        })
      }

      // Initialize Arcade for infrastructure orchestration
      if (config.arcade.apiKey) {
        this.arcade = new ArcadeSDK({
          apiKey: config.arcade.apiKey,
          endpoint: config.arcade.endpoint,
          project: config.arcade.project
        })
      }

      // Initialize MCPJungle for agent communication
      if (config.mcpjungle.apiKey) {
        this.mcpHub = new MCPJungle({
          apiKey: config.mcpjungle.apiKey,
          endpoint: config.mcpjungle.endpoint,
          hubId: config.mcpjungle.hub
        })
        await this.setupAgentCommunication()
      }

      // Initialize traditional providers
      if (config.openrouter.apiKey) {
        this.openrouter = new OpenAI({
          baseURL: config.openrouter.endpoint,
          apiKey: config.openrouter.apiKey
        })
      }

      if (config.fal.apiKey) {
        fal.config({
          credentials: config.fal.apiKey
        })
        this.fal = fal
      }

      console.log('🚀 CrapGPT Orchestration Manager initialized successfully')
    } catch (error) {
      console.error('🔥 Orchestration Manager initialization failed:', error)
    }
  }

  // Hexstrike-AI Integration
  async callHexstrike(model, prompt, options = {}) {
    if (!this.hexstrike) {
      throw new Error('Hexstrike-AI not initialized')
    }

    const executionId = `hexstrike_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    try {
      // Log execution start in R2
      await this.logOrchestrationExecution(executionId, {
        provider: 'hexstrike',
        model,
        prompt: prompt.substring(0, 500), // Log first 500 chars for debugging
        status: 'started',
        startTime: new Date().toISOString()
      })

      const response = await this.hexstrike.complete({
        model: config.hexstrike.models[model] || model,
        prompt,
        maxTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        stream: options.stream || false
      })

      const endTime = Date.now()
      const result = {
        text: response.completion,
        metadata: {
          provider: 'hexstrike',
          model,
          latency: response.latency,
          tokens: response.usage,
          executionId
        }
      }

      // Log successful completion in R2
      await this.logOrchestrationExecution(executionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
        executionTime: endTime - startTime,
        result: {
          textLength: response.completion?.length || 0,
          usage: response.usage
        }
      })

      return result
    } catch (error) {
      console.error('Hexstrike AI error:', error)
      
      // Log error in R2
      await this.logOrchestrationExecution(executionId, {
        status: 'failed',
        endTime: new Date().toISOString(),
        error: error.message,
        executionTime: Date.now() - startTime
      })
      
      throw error
    }
  }

  // Toolhive Integration
  async registerCrapGPTTools() {
    const crapGPTTools = [
      {
        name: 'webSearch',
        description: 'Search the web for information',
        parameters: {
          query: { type: 'string', required: true },
          maxResults: { type: 'number', default: 10 }
        }
      },
      {
        name: 'generateImage',
        description: 'Generate images using AI models',
        parameters: {
          prompt: { type: 'string', required: true },
          model: { type: 'string', default: 'fal-image' },
          size: { type: 'string', default: '1024x1024' }
        }
      },
      {
        name: 'executeCode',
        description: 'Execute code snippets safely',
        parameters: {
          code: { type: 'string', required: true },
          language: { type: 'string', required: true }
        }
      },
      {
        name: 'deployInfrastructure',
        description: 'Deploy infrastructure using Arcade',
        parameters: {
          template: { type: 'string', required: true },
          config: { type: 'object', required: true }
        }
      }
    ]

    for (const tool of crapGPTTools) {
      await this.toolhive.registry.register(tool)
    }
  }

  async executeTool(toolName, parameters) {
    if (!this.toolhive) {
      throw new Error('Toolhive not initialized')
    }

    try {
      const result = await this.toolhive.execute(toolName, parameters)
      return {
        success: true,
        result: result.output,
        metadata: {
          tool: toolName,
          executionTime: result.executionTime,
          provider: 'toolhive'
        }
      }
    } catch (error) {
      console.error('Tool execution error:', error)
      throw error
    }
  }

  // OpenOps Integration
  async runWorkflow(workflowId, parameters = {}) {
    if (!this.openops) {
      throw new Error('OpenOps not initialized')
    }

    try {
      const execution = await this.openops.workflows.run(workflowId, parameters)
      return {
        executionId: execution.id,
        status: execution.status,
        result: execution.result,
        metadata: {
          provider: 'openops',
          workflow: workflowId,
          startTime: execution.startTime
        }
      }
    } catch (error) {
      console.error('OpenOps workflow error:', error)
      throw error
    }
  }

  async getWorkflowStatus(executionId) {
    if (!this.openops) {
      throw new Error('OpenOps not initialized')
    }

    return await this.openops.workflows.getStatus(executionId)
  }

  // Arcade Integration
  async deployInfrastructure(template, config = {}) {
    if (!this.arcade) {
      throw new Error('Arcade not initialized')
    }

    try {
      const deployment = await this.arcade.deploy({
        template,
        config: {
          ...config,
          project: config.arcade.project
        }
      })

      return {
        deploymentId: deployment.id,
        status: deployment.status,
        endpoints: deployment.endpoints,
        resources: deployment.resources,
        metadata: {
          provider: 'arcade',
          template,
          deployTime: deployment.createdAt
        }
      }
    } catch (error) {
      console.error('Arcade deployment error:', error)
      throw error
    }
  }

  async scaleResources(deploymentId, scalingConfig) {
    if (!this.arcade) {
      throw new Error('Arcade not initialized')
    }

    return await this.arcade.scale(deploymentId, scalingConfig)
  }

  // MCPJungle Integration
  async setupAgentCommunication() {
    if (!this.mcpHub) return

    const agents = [
      'OrchestratorPrime',
      'CodeCrusher', 
      'MediaMaestro',
      'DataDestroyer',
      'OpsOverlord'
    ]

    for (const agentName of agents) {
      await this.mcpHub.registerAgent({
        name: agentName,
        capabilities: await this.getAgentCapabilities(agentName),
        endpoints: {
          delegate: `/api/agents/${agentName}/delegate`,
          status: `/api/agents/${agentName}/status`
        }
      })
    }
  }

  async delegateToAgent(sourceAgent, targetAgent, task, context = {}) {
    if (!this.mcpHub) {
      throw new Error('MCPJungle not initialized')
    }

    try {
      const delegation = await this.mcpHub.delegate({
        from: sourceAgent,
        to: targetAgent,
        task,
        context,
        priority: context.priority || 'normal'
      })

      return {
        delegationId: delegation.id,
        status: 'pending',
        task,
        metadata: {
          provider: 'mcpjungle',
          sourceAgent,
          targetAgent,
          timestamp: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Agent delegation error:', error)
      throw error
    }
  }

// Smart local/remote execution decision logic
  shouldRunLocal(taskType, input, options = {}) {
    const taskAnalysis = this.analyzeTask(taskType, input, options)
    
    // Always run remote if any of these conditions are true
    const forceRemote = [
      taskAnalysis.requiresGPU,
      taskAnalysis.isHeavyCPU,
      taskAnalysis.isBursty,
      taskAnalysis.hasUntrustedInput,
      taskAnalysis.hasRiskySyscalls,
      taskAnalysis.hasReliableAPI
    ].some(condition => condition)
    
    if (forceRemote) return false
    
    // Run local only if ALL conditions are met
    const allowLocal = [
      taskAnalysis.isLight,
      taskAnalysis.isDeterministic,
      taskAnalysis.isLowMemory,
      taskAnalysis.needsFirstPartySecrets,
      taskAnalysis.isLatencyCritical,
      taskAnalysis.isSafeToExecute
    ].every(condition => condition)
    
    return allowLocal
  }
  
  analyzeTask(taskType, input, options = {}) {
    const inputStr = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase()
    
    return {
      // Force remote conditions
      requiresGPU: this.requiresGPU(taskType, inputStr),
      isHeavyCPU: this.isHeavyCPU(taskType, inputStr),
      isBursty: options.parallel || options.batch,
      hasUntrustedInput: this.hasUntrustedInput(inputStr, options),
      hasRiskySyscalls: this.hasRiskySyscalls(taskType, inputStr),
      hasReliableAPI: this.hasReliableAPI(taskType),
      
      // Allow local conditions
      isLight: this.isLightTask(taskType, inputStr),
      isDeterministic: this.isDeterministic(taskType),
      isLowMemory: this.isLowMemory(taskType, inputStr),
      needsFirstPartySecrets: this.needsFirstPartySecrets(taskType, options),
      isLatencyCritical: this.isLatencyCritical(taskType, options),
      isSafeToExecute: this.isSafeToExecute(taskType, inputStr)
    }
  }
  
  // Task analysis helpers
  requiresGPU(taskType, input) {
    return [
      'image-generation', 'video-generation', 'audio-generation',
      'llm-inference', 'embedding-generation', 'asr', 'tts'
    ].includes(taskType) || /\b(image|video|audio|llm|embedding|speech)\b/.test(input)
  }
  
  isHeavyCPU(taskType, input) {
    return [
      'data-processing', 'video-processing', 'large-file-processing',
      'machine-learning', 'compilation', 'compression'
    ].includes(taskType) || /\b(process|compile|compress|convert|analyze)\b/.test(input)
  }
  
  hasUntrustedInput(input, options) {
    const riskyPatterns = [
      /\b(pdf|doc|xls|zip|tar|exe)\b/,
      /https?:\/\/[^\s]+/,
      /\b(scan|port|nmap|curl|wget)\b/,
      /<[^>]+>/, // HTML tags
      /\$\([^)]+\)/, // Shell substitution
    ]
    return riskyPatterns.some(pattern => pattern.test(input)) || options.untrustedSource
  }
  
  hasRiskySyscalls(taskType, input) {
    return [
      'security-scan', 'network-scan', 'file-processing',
      'shell-execution', 'system-interaction'
    ].includes(taskType) || /\b(shell|exec|system|network|scan|hack)\b/.test(input)
  }
  
  hasReliableAPI(taskType) {
    const apiAvailable = {
      'llm-inference': true,
      'image-generation': true,
      'video-generation': true,
      'audio-generation': true,
      'workflow-automation': true,
      'infrastructure-deployment': true,
      'security-scan': true
    }
    return apiAvailable[taskType] || false
  }
  
  isLightTask(taskType, input) {
    return [
      'text-processing', 'json-validation', 'markdown-conversion',
      'routing', 'authentication', 'session-management'
    ].includes(taskType) && input.length < 10000 // < 10KB input
  }
  
  isDeterministic(taskType) {
    return [
      'text-processing', 'json-validation', 'markdown-conversion',
      'routing', 'authentication', 'file-upload'
    ].includes(taskType)
  }
  
  isLowMemory(taskType, input) {
    const memoryEstimate = this.estimateMemoryUsage(taskType, input)
    return memoryEstimate < 100 * 1024 * 1024 // < 100MB
  }
  
  needsFirstPartySecrets(taskType, options) {
    return [
      'authentication', 'session-management', 'database-access',
      'internal-routing'
    ].includes(taskType) || options.requiresSecrets
  }
  
  isLatencyCritical(taskType, options) {
    return [
      'authentication', 'routing', 'session-management',
      'real-time-chat', 'api-response'
    ].includes(taskType) || options.realTime
  }
  
  isSafeToExecute(taskType, input) {
    const unsafePatterns = [
      /\b(rm|del|format|sudo|admin)\b/,
      /[;&|`$(){}]/,
      /\\|\//,
      /\b(exec|eval|system)\b/
    ]
    return !unsafePatterns.some(pattern => pattern.test(input)) && 
           !['security-scan', 'shell-execution', 'system-interaction'].includes(taskType)
  }
  
  estimateMemoryUsage(taskType, input) {
    const baseSizes = {
      'text-processing': input.length * 2,
      'json-validation': input.length * 3,
      'markdown-conversion': input.length * 4,
      'image-processing': 50 * 1024 * 1024, // 50MB
      'video-processing': 200 * 1024 * 1024, // 200MB
      'llm-inference': 100 * 1024 * 1024 // 100MB
    }
    return baseSizes[taskType] || input.length * 5
  }

  // Multi-provider AI calling with smart routing
  async callAI(provider, model, prompt, options = {}) {
    const taskType = options.taskType || 'llm-inference'
    
    // Force all AI calls to be remote (they require GPU/heavy CPU)
    if (this.shouldRunLocal(taskType, prompt, options)) {
      console.warn('AI inference requested for local execution - forcing remote for safety')
    }
    
    switch (provider) {
      case 'hexstrike':
        return await this.callHexstrike(model, prompt, options)
      
      case 'openrouter':
        return await this.callOpenRouter(model, prompt, options)
      
      case 'fal':
        return await this.callFAL(model, prompt, options)
      
      case 'modelslab':
        return await this.callModelsLab(model, prompt, options)
      
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  async callOpenRouter(model, prompt, options = {}) {
    if (!this.openrouter) {
      throw new Error('OpenRouter not initialized')
    }

    try {
      const response = await this.openrouter.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: options.systemMessage || '' },
          { role: 'user', content: prompt }
        ],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7
      })

      return {
        text: response.choices[0].message.content,
        metadata: {
          provider: 'openrouter',
          model,
          usage: response.usage
        }
      }
    } catch (error) {
      console.error('OpenRouter error:', error)
      throw error
    }
  }

  async callFAL(model, prompt, options = {}) {
    if (!this.fal) {
      throw new Error('FAL not initialized')
    }

    try {
      const response = await this.fal.subscribe(model, {
        input: {
          prompt,
          ...options
        }
      })

      return {
        text: response.output?.text,
        images: response.output?.images,
        metadata: {
          provider: 'fal',
          model,
          requestId: response.requestId
        }
      }
    } catch (error) {
      console.error('FAL error:', error)
      throw error
    }
  }

  async callModelsLab(model, prompt, options = {}) {
    try {
      const response = await axios.post(`${config.modelslab.endpoint}/${model}`, {
        key: config.modelslab.apiKey,
        prompt,
        ...options
      })

      return {
        text: response.data.output?.text,
        images: response.data.output?.images,
        metadata: {
          provider: 'modelslab',
          model,
          status: response.data.status
        }
      }
    } catch (error) {
      console.error('ModelsLab error:', error)
      throw error
    }
  }

  // Agent capability mapping
  async getAgentCapabilities(agentName) {
    const capabilityMap = {
      'OrchestratorPrime': ['delegation', 'workflow-orchestration', 'resource-management'],
      'CodeCrusher': ['code-generation', 'infrastructure-automation', 'tool-orchestration'],
      'MediaMaestro': ['image-generation', 'video-generation', 'audio-generation'],
      'DataDestroyer': ['data-analysis', 'resource-scaling', 'visualization'],
      'OpsOverlord': ['infrastructure-management', 'deployment-automation', 'monitoring']
    }

    return capabilityMap[agentName] || []
  }

  // R2 logging for orchestration executions
  async logOrchestrationExecution(executionId, data) {
    try {
      const logPath = r2.buildOrchestrationPath('executions', `${executionId}.json`)
      
      // Get existing log or create new one
      let executionLog
      try {
        executionLog = await r2.getJson(logPath)
      } catch (error) {
        // Create new log if it doesn't exist
        executionLog = {
          executionId,
          provider: data.provider,
          createdAt: new Date().toISOString(),
          events: []
        }
      }
      
      // Add new event to log
      executionLog.events.push({
        timestamp: new Date().toISOString(),
        ...data
      })
      
      executionLog.updatedAt = new Date().toISOString()
      if (data.status) {
        executionLog.status = data.status
      }
      
      await r2.putJson(logPath, executionLog)
    } catch (error) {
      console.error(`Failed to log orchestration execution ${executionId}:`, error)
      // Don't throw - logging failures shouldn't break orchestration
    }
  }

  // Store orchestration artifacts in R2
  async storeOrchestrationArtifacts(executionId, artifacts) {
    try {
      if (!artifacts || typeof artifacts !== 'object') return
      
      // Store artifacts by type
      for (const [artifactType, artifactData] of Object.entries(artifacts)) {
        const artifactPath = r2.buildOrchestrationPath('artifacts', `${executionId}_${artifactType}.json`)
        await r2.putJson(artifactPath, {
          executionId,
          type: artifactType,
          data: artifactData,
          createdAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error(`Failed to store orchestration artifacts for ${executionId}:`, error)
      // Don't throw - artifact storage failures shouldn't break orchestration
    }
  }

  // Health check for all services
  async healthCheck() {
    const status = {
      timestamp: new Date().toISOString(),
      services: {}
    }

    // Check each service
    const services = ['hexstrike', 'toolhive', 'openops', 'arcade', 'mcpHub', 'openrouter', 'fal']
    
    for (const service of services) {
      try {
        if (this[service]) {
          status.services[service] = 'healthy'
        } else {
          status.services[service] = 'not_initialized'
        }
      } catch (error) {
        status.services[service] = `error: ${error.message}`
      }
    }

    return status
  }
}

// Create global orchestration manager instance
export const orchestrationManager = new OrchestrationManager()

// Export individual service functions
export const hexstrikeAI = (model, prompt, options) => 
  orchestrationManager.callHexstrike(model, prompt, options)

export const executeToolhiveTool = (toolName, parameters) => 
  orchestrationManager.executeTool(toolName, parameters)

export const runOpenOpsWorkflow = (workflowId, parameters) => 
  orchestrationManager.runWorkflow(workflowId, parameters)

export const deployArcadeInfrastructure = (template, config) => 
  orchestrationManager.deployInfrastructure(template, config)

export const delegateViaMCP = (sourceAgent, targetAgent, task, context) => 
  orchestrationManager.delegateToAgent(sourceAgent, targetAgent, task, context)

export const callMultiProviderAI = (provider, model, prompt, options) => 
  orchestrationManager.callAI(provider, model, prompt, options)

export default orchestrationManager