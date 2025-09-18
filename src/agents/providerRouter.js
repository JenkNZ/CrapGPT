// Multi-Provider Routing System
// Dynamically routes requests to different AI providers based on task type and requirements

import { callModel, Provider } from '../providers/unified-index.js'

/**
 * Provider Router - intelligently selects the best provider for each task
 */
export class ProviderRouter {
  constructor() {
    // Define provider capabilities and routing rules
    this.providerCapabilities = {
      [Provider.OPENROUTER]: {
        strengths: ['text', 'conversation', 'analysis', 'code', 'reasoning'],
        outputTypes: ['text', 'json', 'code'],
        costTier: 'medium',
        speed: 'fast',
        reliability: 'high'
      },
      [Provider.FAL]: {
        strengths: ['image_generation', 'image_editing', 'visual', 'creative'],
        outputTypes: ['image', 'video'],
        costTier: 'low',
        speed: 'medium',
        reliability: 'high'
      },
      [Provider.MODELSLAB]: {
        strengths: ['image_generation', 'style_transfer', 'artistic'],
        outputTypes: ['image'],
        costTier: 'low',
        speed: 'slow',
        reliability: 'medium'
      }
    }

    // Task type to provider mapping
    this.taskRouting = {
      'text_generation': [Provider.OPENROUTER],
      'text_analysis': [Provider.OPENROUTER],
      'text_summary': [Provider.OPENROUTER],
      'code_generation': [Provider.OPENROUTER],
      'reasoning': [Provider.OPENROUTER],
      'conversation': [Provider.OPENROUTER],
      'qa': [Provider.OPENROUTER],
      
      'image_generation': [Provider.FAL, Provider.MODELSLAB],
      'image_editing': [Provider.FAL],
      'diagram_creation': [Provider.FAL],
      'visual_creative': [Provider.FAL, Provider.MODELSLAB],
      
      'multimodal': [Provider.OPENROUTER], // Text + image understanding
    }

    // Default fallback order
    this.fallbackOrder = [Provider.OPENROUTER, Provider.FAL, Provider.MODELSLAB]
  }

  /**
   * Route a task to the best provider(s)
   */
  async routeTask(taskType, input, options = {}) {
    const routingPlan = this.createRoutingPlan(taskType, input, options)
    
    try {
      if (routingPlan.providers.length === 1) {
        // Single provider execution
        return await this.executeSingleProvider(routingPlan.providers[0], input, options)
      } else {
        // Multi-provider execution (parallel or sequential)
        return await this.executeMultiProvider(routingPlan, input, options)
      }
    } catch (error) {
      console.error('Provider routing failed:', error)
      
      // Try fallback providers
      return await this.executeWithFallback(taskType, input, options, error)
    }
  }

  /**
   * Create a routing plan based on task type and requirements
   */
  createRoutingPlan(taskType, input, options = {}) {
    let providers = this.taskRouting[taskType] || []
    
    // If no specific routing, use heuristic analysis
    if (providers.length === 0) {
      providers = this.analyzeTaskHeuristics(input, options)
    }

    // Apply constraints and preferences
    providers = this.applyConstraints(providers, options)

    const plan = {
      taskType,
      providers,
      executionMode: this.determineExecutionMode(taskType, providers, options),
      priority: options.priority || 'normal',
      timeout: options.timeout || 30000,
      retries: options.retries || 1
    }

    return plan
  }

  /**
   * Analyze task heuristically when no explicit routing exists
   */
  analyzeTaskHeuristics(input, options) {
    const inputStr = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase()
    
    // Image generation keywords
    const imageKeywords = ['create image', 'generate picture', 'draw', 'illustrate', 'diagram', 'chart', 'visual', 'photo']
    if (imageKeywords.some(keyword => inputStr.includes(keyword))) {
      return [Provider.FAL, Provider.MODELSLAB]
    }

    // Code keywords  
    const codeKeywords = ['code', 'program', 'function', 'class', 'algorithm', 'debug', 'refactor']
    if (codeKeywords.some(keyword => inputStr.includes(keyword))) {
      return [Provider.OPENROUTER]
    }

    // Analysis keywords
    const analysisKeywords = ['analyze', 'explain', 'summarize', 'compare', 'evaluate', 'research']
    if (analysisKeywords.some(keyword => inputStr.includes(keyword))) {
      return [Provider.OPENROUTER]
    }

    // Default to text generation
    return [Provider.OPENROUTER]
  }

  /**
   * Apply user preferences and system constraints
   */
  applyConstraints(providers, options) {
    let filtered = [...providers]

    // Cost constraints
    if (options.maxCost === 'low') {
      filtered = filtered.filter(p => 
        this.providerCapabilities[p]?.costTier === 'low'
      )
    }

    // Speed requirements
    if (options.priority === 'urgent') {
      filtered.sort((a, b) => {
        const speedA = this.providerCapabilities[a]?.speed === 'fast' ? 3 : 
                     this.providerCapabilities[a]?.speed === 'medium' ? 2 : 1
        const speedB = this.providerCapabilities[b]?.speed === 'fast' ? 3 : 
                     this.providerCapabilities[b]?.speed === 'medium' ? 2 : 1
        return speedB - speedA
      })
    }

    // Provider preferences
    if (options.preferredProviders) {
      const preferred = filtered.filter(p => options.preferredProviders.includes(p))
      if (preferred.length > 0) {
        filtered = preferred
      }
    }

    // Avoid specific providers
    if (options.avoidProviders) {
      filtered = filtered.filter(p => !options.avoidProviders.includes(p))
    }

    return filtered.length > 0 ? filtered : [Provider.OPENROUTER]
  }

  /**
   * Determine execution mode (parallel, sequential, single)
   */
  determineExecutionMode(taskType, providers, options) {
    if (providers.length === 1) {
      return 'single'
    }

    // For image generation, try parallel for speed
    if (taskType.includes('image')) {
      return options.executionMode || 'parallel'
    }

    // For text tasks, usually sequential for better results
    return options.executionMode || 'sequential'
  }

  /**
   * Execute task with a single provider
   */
  async executeSingleProvider(provider, input, options) {
    const startTime = Date.now()
    
    try {
      const result = await callModel(
        provider,
        options.model || this.getDefaultModel(provider),
        input,
        {
          ...options,
          timeout: options.timeout || 30000
        }
      )

      return {
        result,
        provider,
        executionTime: Date.now() - startTime,
        success: true
      }
    } catch (error) {
      return {
        result: null,
        provider,
        error: error.message,
        executionTime: Date.now() - startTime,
        success: false
      }
    }
  }

  /**
   * Execute task with multiple providers
   */
  async executeMultiProvider(routingPlan, input, options) {
    const { providers, executionMode } = routingPlan

    if (executionMode === 'parallel') {
      return await this.executeParallel(providers, input, options)
    } else {
      return await this.executeSequential(providers, input, options)
    }
  }

  /**
   * Execute providers in parallel and return the fastest/best result
   */
  async executeParallel(providers, input, options) {
    const startTime = Date.now()
    
    const promises = providers.map(async provider => {
      try {
        const result = await callModel(
          provider,
          options.model || this.getDefaultModel(provider),
          input,
          options
        )
        return {
          result,
          provider,
          success: true,
          responseTime: Date.now() - startTime
        }
      } catch (error) {
        return {
          result: null,
          provider,
          error: error.message,
          success: false,
          responseTime: Date.now() - startTime
        }
      }
    })

    try {
      // Use Promise.allSettled to get all results
      const results = await Promise.allSettled(promises)
      const successful = results
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.value)

      if (successful.length === 0) {
        throw new Error('All providers failed')
      }

      // Return the fastest successful result, or combine results if needed
      const fastest = successful.sort((a, b) => a.responseTime - b.responseTime)[0]
      
      return {
        primary: fastest,
        alternatives: successful.slice(1),
        executionTime: Date.now() - startTime,
        executionMode: 'parallel'
      }
    } catch (error) {
      throw new Error(`Parallel execution failed: ${error.message}`)
    }
  }

  /**
   * Execute providers sequentially (fallback chain)
   */
  async executeSequential(providers, input, options) {
    const results = []
    let lastError = null

    for (const provider of providers) {
      try {
        const result = await this.executeSingleProvider(provider, input, options)
        if (result.success) {
          return {
            ...result,
            executionMode: 'sequential',
            attemptedProviders: results.map(r => r.provider)
          }
        }
        results.push(result)
        lastError = result.error
      } catch (error) {
        results.push({
          provider,
          error: error.message,
          success: false
        })
        lastError = error.message
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError}`)
  }

  /**
   * Execute with fallback providers when main routing fails
   */
  async executeWithFallback(taskType, input, options, originalError) {
    console.warn('Executing fallback routing due to:', originalError.message)
    
    const fallbackProviders = this.fallbackOrder.filter(p => 
      !options.avoidProviders?.includes(p)
    )

    for (const provider of fallbackProviders) {
      try {
        const result = await this.executeSingleProvider(provider, input, {
          ...options,
          timeout: (options.timeout || 30000) / 2 // Faster timeout for fallbacks
        })
        
        if (result.success) {
          return {
            ...result,
            wasFallback: true,
            originalError: originalError.message
          }
        }
      } catch (error) {
        console.warn(`Fallback provider ${provider} failed:`, error.message)
      }
    }

    throw new Error(`All providers including fallbacks failed. Original error: ${originalError.message}`)
  }

  /**
   * Get default model for a provider
   */
  getDefaultModel(provider) {
    const defaults = {
      [Provider.OPENROUTER]: 'openai/gpt-4o',
      [Provider.FAL]: 'fal-ai/flux/schnell',
      [Provider.MODELSLAB]: 'sdxl'
    }
    return defaults[provider] || 'default'
  }

  /**
   * Get routing statistics and performance metrics
   */
  getRoutingStats() {
    // This would typically be backed by a database or cache
    return {
      totalRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      providerUsage: {},
      failureReasons: {}
    }
  }

  /**
   * Create a combined multi-provider result
   */
  async createCombinedResult(taskType, results, options = {}) {
    if (taskType === 'research_with_diagram') {
      // Combine text summary with generated diagram
      const textResult = results.find(r => r.result?.text)
      const imageResult = results.find(r => r.result?.images)

      return {
        text: textResult?.result?.text || '',
        images: imageResult?.result?.images || [],
        metadata: {
          providers: results.map(r => r.provider),
          combinedResult: true
        }
      }
    }

    // Default combination: return the best result with alternatives
    const best = results.find(r => r.success) || results[0]
    return {
      ...best.result,
      alternatives: results.filter(r => r !== best && r.success),
      metadata: {
        providers: results.map(r => r.provider),
        primary: best.provider
      }
    }
  }
}