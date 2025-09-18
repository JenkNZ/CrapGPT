import { 
  IProvider, 
  Provider, 
  ProviderConfig, 
  ModelRequest, 
  UnifiedResponse,
  ProviderError,
  AuthenticationError,
  RateLimitError 
} from './unified-types'
import { rateLimiter } from './rate-limiter'

export class UnifiedOpenRouterProvider implements IProvider {
  public readonly name = Provider.OPENROUTER
  public readonly config: ProviderConfig

  private readonly baseUrl = 'https://openrouter.ai/api/v1'
  private readonly supportedModels = [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'meta-llama/llama-3.1-405b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'google/gemini-pro-1.5',
    'mistralai/mixtral-8x7b-instruct',
    'perplexity/llama-3.1-sonar-large-128k-online'
  ]

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      rateLimitRpm: 60,
      ...config
    }

    if (!config.apiKey) {
      throw new Error('OpenRouter API key is required')
    }
  }

  async callModel(request: ModelRequest): Promise<UnifiedResponse> {
    const startTime = Date.now()

    // Check rate limit
    if (!(await rateLimiter.checkLimit(this.name))) {
      throw new RateLimitError(this.name)
    }

    // Validate model
    if (!this.supportedModels.includes(request.model)) {
      throw new ProviderError(
        `Model ${request.model} not supported by OpenRouter`,
        this.name,
        400
      )
    }

    const messages = []
    
    // Add system message if provided
    if (request.options?.systemMessage) {
      messages.push({
        role: 'system',
        content: request.options.systemMessage
      })
    }

    // Add user prompt
    messages.push({
      role: 'user',
      content: request.prompt
    })

    const requestBody = {
      model: request.model,
      messages,
      temperature: request.options?.temperature || 0.7,
      max_tokens: request.options?.maxTokens || 2000,
      stream: false
    }

    let lastError: Error | null = null
    const maxRetries = this.config.maxRetries || 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Record the request for rate limiting
        rateLimiter.recordRequest(this.name)

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000',
            'X-Title': 'GPT Clone'
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.config.timeout || 30000)
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new AuthenticationError(this.name)
          }
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after')
            throw new RateLimitError(this.name, retryAfter ? parseInt(retryAfter) : undefined)
          }

          const errorData = await response.json().catch(() => ({}))
          throw new ProviderError(
            errorData.error?.message || `HTTP ${response.status}`,
            this.name,
            response.status,
            errorData
          )
        }

        const data = await response.json()
        const executionTime = Date.now() - startTime

        if (!data.choices || !data.choices[0]) {
          throw new ProviderError('Invalid response format', this.name, 500, data)
        }

        return {
          text: data.choices[0].message.content,
          metadata: {
            model: request.model,
            provider: this.name,
            usage: data.usage ? {
              inputTokens: data.usage.prompt_tokens,
              outputTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens
            } : undefined,
            executionTime,
            requestId: data.id
          }
        }

      } catch (error) {
        lastError = error as Error
        
        // Don't retry on auth errors or rate limits
        if (error instanceof AuthenticationError || error instanceof RateLimitError) {
          throw error
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries - 1) {
          break
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new ProviderError(
      `Failed after ${maxRetries} attempts: ${lastError?.message}`,
      this.name,
      500,
      lastError
    )
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  getSupportedModels(): string[] {
    return [...this.supportedModels]
  }
}