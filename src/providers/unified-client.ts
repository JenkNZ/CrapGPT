import { 
  Provider, 
  ProviderConfig, 
  ModelRequest, 
  UnifiedResponse,
  IProvider,
  ProviderError,
  AuthenticationError 
} from './unified-types'

import { UnifiedOpenRouterProvider } from './unified-openrouter'
import { UnifiedFALProvider } from './unified-fal'
import { UnifiedModelsLabProvider } from './unified-modelslab'

export class UnifiedProviderManager {
  private providers = new Map<Provider, IProvider>()
  private initialized = false

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    if (this.initialized) return

    // Initialize OpenRouter if API key is available
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const provider = new UnifiedOpenRouterProvider({
          apiKey: process.env.OPENROUTER_API_KEY
        })
        this.providers.set(Provider.OPENROUTER, provider)
      } catch (error) {
        console.warn('Failed to initialize OpenRouter provider:', error.message)
      }
    }

    // Initialize FAL if API key is available
    if (process.env.FAL_API_KEY) {
      try {
        const provider = new UnifiedFALProvider({
          apiKey: process.env.FAL_API_KEY
        })
        this.providers.set(Provider.FAL, provider)
      } catch (error) {
        console.warn('Failed to initialize FAL provider:', error.message)
      }
    }

    // Initialize ModelsLab if API key is available
    if (process.env.MODELSLAB_API_KEY) {
      try {
        const provider = new UnifiedModelsLabProvider({
          apiKey: process.env.MODELSLAB_API_KEY
        })
        this.providers.set(Provider.MODELSLAB, provider)
      } catch (error) {
        console.warn('Failed to initialize ModelsLab provider:', error.message)
      }
    }

    this.initialized = true
  }

  /**
   * Main unified function to call any model from any provider
   */
  async callModel(provider: Provider, model: string, prompt: string, options?: ModelRequest['options']): Promise<UnifiedResponse> {
    const request: ModelRequest = {
      prompt,
      model,
      provider,
      options
    }

    return this.callModelWithRequest(request)
  }

  /**
   * Alternative method that takes a full ModelRequest object
   */
  async callModelWithRequest(request: ModelRequest): Promise<UnifiedResponse> {
    const provider = this.providers.get(request.provider)
    
    if (!provider) {
      throw new ProviderError(
        `Provider ${request.provider} is not initialized. Check your API keys.`,
        request.provider,
        400
      )
    }

    try {
      return await provider.callModel(request)
    } catch (error) {
      // Re-throw with additional context if needed
      if (error instanceof ProviderError) {
        throw error
      }
      
      throw new ProviderError(
        `Unexpected error calling ${request.provider}: ${error.message}`,
        request.provider,
        500,
        error
      )
    }
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): Provider[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Get all models supported by a specific provider
   */
  getSupportedModels(provider: Provider): string[] {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      throw new ProviderError(`Provider ${provider} is not available`, provider, 400)
    }
    return providerInstance.getSupportedModels()
  }

  /**
   * Get all available models across all providers
   */
  getAllSupportedModels(): Record<Provider, string[]> {
    const result: Record<Provider, string[]> = {} as Record<Provider, string[]>
    
    for (const [provider, instance] of this.providers) {
      result[provider] = instance.getSupportedModels()
    }
    
    return result
  }

  /**
   * Check health of a specific provider
   */
  async checkProviderHealth(provider: Provider): Promise<boolean> {
    const providerInstance = this.providers.get(provider)
    if (!providerInstance) {
      return false
    }
    
    try {
      return await providerInstance.isHealthy()
    } catch {
      return false
    }
  }

  /**
   * Check health of all providers
   */
  async checkAllProvidersHealth(): Promise<Record<Provider, boolean>> {
    const results: Record<Provider, boolean> = {} as Record<Provider, boolean>
    
    const healthChecks = Array.from(this.providers.entries()).map(async ([provider, instance]) => {
      try {
        const isHealthy = await instance.isHealthy()
        results[provider] = isHealthy
      } catch {
        results[provider] = false
      }
    })
    
    await Promise.all(healthChecks)
    return results
  }

  /**
   * Add or update a provider with custom configuration
   */
  addProvider(provider: Provider, config: ProviderConfig): void {
    try {
      let instance: IProvider
      
      switch (provider) {
        case Provider.OPENROUTER:
          instance = new UnifiedOpenRouterProvider(config)
          break
        case Provider.FAL:
          instance = new UnifiedFALProvider(config)
          break
        case Provider.MODELSLAB:
          instance = new UnifiedModelsLabProvider(config)
          break
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }
      
      this.providers.set(provider, instance)
    } catch (error) {
      throw new ProviderError(
        `Failed to add provider ${provider}: ${error.message}`,
        provider,
        400,
        error
      )
    }
  }

  /**
   * Remove a provider
   */
  removeProvider(provider: Provider): boolean {
    return this.providers.delete(provider)
  }

  /**
   * Check if a provider is available
   */
  hasProvider(provider: Provider): boolean {
    return this.providers.has(provider)
  }

  /**
   * Get provider configuration info (without sensitive data)
   */
  getProviderInfo(provider: Provider): { available: boolean, models: string[], healthy?: boolean } {
    const instance = this.providers.get(provider)
    
    if (!instance) {
      return { available: false, models: [] }
    }
    
    return {
      available: true,
      models: instance.getSupportedModels()
    }
  }

  /**
   * Validate that a model is supported by a provider
   */
  isModelSupported(provider: Provider, model: string): boolean {
    const instance = this.providers.get(provider)
    if (!instance) return false
    
    return instance.getSupportedModels().includes(model)
  }

  /**
   * Find all providers that support a specific model
   */
  findProvidersForModel(model: string): Provider[] {
    const supportingProviders: Provider[] = []
    
    for (const [provider, instance] of this.providers) {
      if (instance.getSupportedModels().includes(model)) {
        supportingProviders.push(provider)
      }
    }
    
    return supportingProviders
  }
}

// Create and export singleton instance
export const unifiedProviderManager = new UnifiedProviderManager()

/**
 * Main export: Unified function to call any model from any provider
 * 
 * @param provider - The provider to use (openrouter, fal, modelslab)
 * @param model - The model name
 * @param prompt - The input prompt
 * @param options - Optional parameters for the request
 * @returns Promise<UnifiedResponse> with normalized format: { text?, images?, metadata? }
 */
export async function callModel(
  provider: Provider, 
  model: string, 
  prompt: string, 
  options?: ModelRequest['options']
): Promise<UnifiedResponse> {
  return unifiedProviderManager.callModel(provider, model, prompt, options)
}

// Export all types and providers for advanced usage
export * from './unified-types'
export { UnifiedOpenRouterProvider } from './unified-openrouter'
export { UnifiedFALProvider } from './unified-fal'
export { UnifiedModelsLabProvider } from './unified-modelslab'
export { rateLimiter } from './rate-limiter'