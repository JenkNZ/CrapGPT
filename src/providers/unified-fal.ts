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

export class UnifiedFALProvider implements IProvider {
  public readonly name = Provider.FAL
  public readonly config: ProviderConfig

  private readonly baseUrl = 'https://fal.run/fal-ai'
  private readonly supportedModels = [
    // Image generation models
    'stable-diffusion-v1-5',
    'stable-diffusion-v2-1',
    'stable-diffusion-xl-base-1.0',
    'flux/dev',
    'flux/schnell',
    'flux-pro',
    'aura-flow',
    'kandinsky-v2-2',
    'dreamshaper-v7',
    'anything-v4',
    // Video generation models
    'luma-dream-machine',
    'kling-video',
    'runway-gen3',
    'stable-video-diffusion',
    'zeroscope-v2-xl',
    // 3D models
    'triplane-gaussian-splatting',
    'instant-mesh'
  ]

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 60000, // FAL can take longer for image/video generation
      maxRetries: 3,
      rateLimitRpm: 30,
      ...config
    }

    if (!config.apiKey) {
      throw new Error('FAL API key is required')
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
        `Model ${request.model} not supported by FAL`,
        this.name,
        400
      )
    }

    // Build request body based on model type
    const requestBody = this.buildRequestBody(request)
    const endpoint = this.getModelEndpoint(request.model)

    let lastError: Error | null = null
    const maxRetries = this.config.maxRetries || 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Record the request for rate limiting
        rateLimiter.recordRequest(this.name)

        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.config.timeout || 60000)
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
            errorData.detail || errorData.error || `HTTP ${response.status}`,
            this.name,
            response.status,
            errorData
          )
        }

        const data = await response.json()
        const executionTime = Date.now() - startTime

        return this.parseResponse(data, request, executionTime)

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

  private buildRequestBody(request: ModelRequest): any {
    const baseParams = {
      prompt: request.prompt,
      seed: request.options?.seed,
      num_inference_steps: request.options?.steps || 20,
      guidance_scale: request.options?.guidanceScale || 7.5,
    }

    // Add negative prompt if provided
    if (request.options?.negativePrompt) {
      baseParams.negative_prompt = request.options.negativePrompt
    }

    // Model-specific parameters
    if (this.isVideoModel(request.model)) {
      return {
        ...baseParams,
        duration: request.options?.videoLength || 5, // seconds
        fps: 24,
        aspect_ratio: '16:9'
      }
    }

    // Image models
    const imageSize = request.options?.imageSize || '1024x1024'
    const [width, height] = imageSize.split('x').map(Number)
    
    return {
      ...baseParams,
      image_size: imageSize,
      width: width || 1024,
      height: height || 1024,
      num_images: 1
    }
  }

  private getModelEndpoint(model: string): string {
    // Map model names to FAL endpoints
    const endpointMap: Record<string, string> = {
      'stable-diffusion-v1-5': 'stable-diffusion-v1-5',
      'stable-diffusion-v2-1': 'stable-diffusion-v2-1',
      'stable-diffusion-xl-base-1.0': 'stable-diffusion-xl',
      'flux/dev': 'flux/dev',
      'flux/schnell': 'flux/schnell',
      'flux-pro': 'flux-pro',
      'aura-flow': 'aura-flow',
      'kandinsky-v2-2': 'kandinsky-v2/text2img',
      'dreamshaper-v7': 'dreamshaper-v7',
      'anything-v4': 'anything-v4',
      'luma-dream-machine': 'luma-dream-machine',
      'kling-video': 'kling-video/v1/standard/text-to-video',
      'runway-gen3': 'runway-gen3/turbo/text-to-video',
      'stable-video-diffusion': 'stable-video-diffusion',
      'zeroscope-v2-xl': 'zeroscope-v2-xl',
      'triplane-gaussian-splatting': 'triplane-gaussian-splatting',
      'instant-mesh': 'instant-mesh'
    }

    return endpointMap[model] || model
  }

  private parseResponse(data: any, request: ModelRequest, executionTime: number): UnifiedResponse {
    let images: string[] = []
    let text: string | undefined

    // Handle different response formats
    if (data.images && Array.isArray(data.images)) {
      images = data.images.map((img: any) => img.url || img)
    } else if (data.image) {
      images = [data.image.url || data.image]
    } else if (data.video) {
      images = [data.video.url || data.video]
    } else if (data.url) {
      images = [data.url]
    }

    // Some models might return text descriptions
    if (data.description || data.caption) {
      text = data.description || data.caption
    }

    return {
      text,
      images: images.length > 0 ? images : undefined,
      metadata: {
        model: request.model,
        provider: this.name,
        executionTime,
        requestId: data.request_id || data.id,
        seed: data.seed,
        steps: data.num_inference_steps,
        guidance_scale: data.guidance_scale,
        originalResponse: data
      }
    }
  }

  private isVideoModel(model: string): boolean {
    const videoModels = [
      'luma-dream-machine',
      'kling-video',
      'runway-gen3',
      'stable-video-diffusion',
      'zeroscope-v2-xl'
    ]
    return videoModels.includes(model)
  }

  async isHealthy(): Promise<boolean> {
    try {
      // FAL doesn't have a dedicated health endpoint, so we'll do a simple request
      const response = await fetch(`${this.baseUrl}/stable-diffusion-v1-5`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'test',
          num_inference_steps: 1,
          width: 512,
          height: 512
        }),
        signal: AbortSignal.timeout(5000)
      })
      // We expect this to either work or return a proper error (not a connection error)
      return response.status !== 0
    } catch (error) {
      // Network errors indicate unhealthy
      return false
    }
  }

  getSupportedModels(): string[] {
    return [...this.supportedModels]
  }
}