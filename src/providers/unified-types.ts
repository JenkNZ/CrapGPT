// Unified response format for all providers
export interface UnifiedResponse {
  text?: string
  images?: string[]
  metadata?: {
    model?: string
    provider?: string
    usage?: {
      inputTokens?: number
      outputTokens?: number
      totalTokens?: number
    }
    executionTime?: number
    requestId?: string
    [key: string]: any
  }
}

// Provider configuration
export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  maxRetries?: number
  rateLimitRpm?: number // requests per minute
}

// Supported providers
export enum Provider {
  OPENROUTER = 'openrouter',
  FAL = 'fal',
  MODELSLAB = 'modelslab'
}

// Request options
export interface ModelRequest {
  prompt: string
  model: string
  provider: Provider
  options?: {
    temperature?: number
    maxTokens?: number
    systemMessage?: string
    imageSize?: string
    videoLength?: number
    quality?: string
    style?: string
    negativePrompt?: string
    seed?: number
    steps?: number
    guidanceScale?: number
    [key: string]: any
  }
}

// Error types
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: Provider,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: Provider, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 429)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
  public retryAfter?: number
}

export class AuthenticationError extends ProviderError {
  constructor(provider: Provider) {
    super(`Authentication failed for ${provider}`, provider, 401)
    this.name = 'AuthenticationError'
  }
}

export class ModelNotSupportedError extends ProviderError {
  constructor(provider: Provider, model: string) {
    super(`Model ${model} not supported by ${provider}`, provider, 400)
    this.name = 'ModelNotSupportedError'
  }
}

// Rate limiter interface
export interface RateLimiter {
  checkLimit(provider: Provider): Promise<boolean>
  recordRequest(provider: Provider): void
}

// Provider interface
export interface IProvider {
  name: Provider
  config: ProviderConfig
  callModel(request: ModelRequest): Promise<UnifiedResponse>
  isHealthy(): Promise<boolean>
  getSupportedModels(): string[]
}