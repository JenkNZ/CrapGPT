import { OpenRouterProvider } from './openrouter'
import { FALProvider } from './fal'
import { ModelsLabProvider } from './modelslab'
import { 
  AIProvider, 
  ImageProvider, 
  Provider, 
  ProviderConfig,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamingChatResponse,
  ImageGenerationOptions,
  ImageGenerationResponse,
  ProviderType,
  ProviderMetadata
} from './types'

export class ProviderManager {
  private chatProviders = new Map<string, AIProvider>()
  private imageProviders = new Map<string, ImageProvider>()

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Initialize chat providers
    if (process.env.OPENROUTER_API_KEY) {
      const openRouterProvider = new OpenRouterProvider({
        apiKey: process.env.OPENROUTER_API_KEY
      })
      this.chatProviders.set('openrouter', openRouterProvider)
    }

    // Initialize image providers
    if (process.env.FAL_API_KEY) {
      const falProvider = new FALProvider({
        apiKey: process.env.FAL_API_KEY
      })
      this.imageProviders.set('fal', falProvider)
    }

    if (process.env.MODELSLAB_API_KEY) {
      const modelsLabProvider = new ModelsLabProvider({
        apiKey: process.env.MODELSLAB_API_KEY
      })
      this.imageProviders.set('modelslab', modelsLabProvider)
    }
  }

  // Chat completion methods
  async createChatCompletion(
    providerName: string, 
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const provider = this.chatProviders.get(providerName)
    
    if (!provider) {
      throw new Error(`Chat provider '${providerName}' not found or not configured`)
    }

    return provider.createChatCompletion(options)
  }

  async* createStreamingChatCompletion(
    providerName: string,
    options: ChatCompletionOptions
  ): AsyncGenerator<StreamingChatResponse> {
    const provider = this.chatProviders.get(providerName)
    
    if (!provider) {
      throw new Error(`Chat provider '${providerName}' not found or not configured`)
    }

    yield* provider.createStreamingChatCompletion(options)
  }

  // Image generation methods
  async generateImage(
    providerName: string,
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResponse> {
    const provider = this.imageProviders.get(providerName)
    
    if (!provider) {
      throw new Error(`Image provider '${providerName}' not found or not configured`)
    }

    return provider.generateImage(options)
  }

  // Provider management
  getChatProvider(name: string): AIProvider | undefined {
    return this.chatProviders.get(name)
  }

  getImageProvider(name: string): ImageProvider | undefined {
    return this.imageProviders.get(name)
  }

  getAvailableChatProviders(): string[] {
    return Array.from(this.chatProviders.keys())
  }

  getAvailableImageProviders(): string[] {
    return Array.from(this.imageProviders.keys())
  }

  getAllProviders(): { chat: string[], image: string[] } {
    return {
      chat: this.getAvailableChatProviders(),
      image: this.getAvailableImageProviders()
    }
  }

  async getProviderModels(providerName: string): Promise<string[]> {
    const chatProvider = this.chatProviders.get(providerName)
    if (chatProvider) {
      return chatProvider.getAvailableModels()
    }

    const imageProvider = this.imageProviders.get(providerName)
    if (imageProvider) {
      return imageProvider.getAvailableModels()
    }

    throw new Error(`Provider '${providerName}' not found`)
  }

  async healthCheckProvider(providerName: string): Promise<boolean> {
    const chatProvider = this.chatProviders.get(providerName)
    if (chatProvider) {
      return chatProvider.healthCheck()
    }

    const imageProvider = this.imageProviders.get(providerName)
    if (imageProvider) {
      return imageProvider.healthCheck()
    }

    return false
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    // Check chat providers
    for (const [name, provider] of this.chatProviders) {
      try {
        results[name] = await provider.healthCheck()
      } catch (error) {
        results[name] = false
      }
    }

    // Check image providers
    for (const [name, provider] of this.imageProviders) {
      try {
        results[name] = await provider.healthCheck()
      } catch (error) {
        results[name] = false
      }
    }

    return results
  }

  getProviderMetadata(): ProviderMetadata[] {
    return [
      {
        name: 'openrouter',
        type: ProviderType.CHAT,
        description: 'Access to multiple LLM models through OpenRouter API',
        supportedModels: [
          'openai/gpt-4',
          'openai/gpt-3.5-turbo',
          'anthropic/claude-3-sonnet',
          'anthropic/claude-3-haiku',
          'meta-llama/llama-2-70b-chat',
          'mistralai/mixtral-8x7b-instruct'
        ]
      },
      {
        name: 'fal',
        type: ProviderType.IMAGE,
        description: 'High-quality image generation with Stable Diffusion models',
        supportedModels: [
          'stable-diffusion-v1-5',
          'stable-diffusion-v2-1',
          'stable-diffusion-xl',
          'kandinsky-2-2'
        ]
      },
      {
        name: 'modelslab',
        type: ProviderType.IMAGE,
        description: 'Advanced image generation including Midjourney-style models',
        supportedModels: [
          'midjourney',
          'stable-diffusion-v1-5',
          'dreamshaper',
          'anything-v3'
        ]
      }
    ]
  }
}

// Singleton instance
export const providerManager = new ProviderManager()

// Re-export types and classes
export * from './types'
export { OpenRouterProvider } from './openrouter'
export { FALProvider } from './fal'
export { ModelsLabProvider } from './modelslab'