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

export class UnifiedModelsLabProvider implements IProvider {
  public readonly name = Provider.MODELSLAB
  public readonly config: ProviderConfig

  private readonly baseUrl = 'https://modelslab.com/api/v6'
  private readonly supportedModels = [
    // Text generation models
    'llama-2-7b-chat',
    'llama-2-13b-chat',
    'mistral-7b-instruct',
    'codellama-7b-instruct',
    'vicuna-7b-v1.5',
    'wizardlm-7b',
    // Image generation models
    'midjourney',
    'stable-diffusion-v1-5',
    'stable-diffusion-v2-1',
    'stable-diffusion-xl',
    'dreamshaper-v7',
    'anything-v4',
    'realistic-vision-v3',
    'deliberate-v2',
    'openjourney',
    'analog-diffusion',
    // Video generation models
    'zeroscope-v2-xl',
    'text-to-video-ms-1.7b',
    'animatediff',
    'stable-video-diffusion',
    // Specialized models
    'controlnet-canny',
    'controlnet-depth',
    'controlnet-pose',
    'img2img',
    'inpainting',
    'upscaler'
  ]

  constructor(config: ProviderConfig) {
    this.config = {
      timeout: 90000, // ModelsLab can take longer for complex generations
      maxRetries: 3,
      rateLimitRpm: 20,
      ...config
    }

    if (!config.apiKey) {
      throw new Error('ModelsLab API key is required')
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
        `Model ${request.model} not supported by ModelsLab`,
        this.name,
        400
      )
    }

    const { endpoint, requestBody } = this.buildRequest(request)

    let lastError: Error | null = null
    const maxRetries = this.config.maxRetries || 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Record the request for rate limiting
        rateLimiter.recordRequest(this.name)

        const response = await fetch(`${this.baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: this.config.apiKey,
            ...requestBody
          }),
          signal: AbortSignal.timeout(this.config.timeout || 90000)
        })

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new AuthenticationError(this.name)
          }
          if (response.status === 429) {
            const retryAfter = response.headers.get('retry-after')
            throw new RateLimitError(this.name, retryAfter ? parseInt(retryAfter) : undefined)
          }

          const errorData = await response.json().catch(() => ({}))
          throw new ProviderError(
            errorData.message || errorData.error || `HTTP ${response.status}`,
            this.name,
            response.status,
            errorData
          )
        }

        const data = await response.json()
        
        // Handle async operations (ModelsLab often returns a task ID first)
        if (data.status === 'processing' && data.id) {
          const finalResult = await this.pollForResult(data.id, startTime)
          return this.parseResponse(finalResult, request, Date.now() - startTime)
        }

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

  private buildRequest(request: ModelRequest): { endpoint: string, requestBody: any } {
    const modelType = this.getModelType(request.model)
    
    switch (modelType) {
      case 'text':
        return this.buildTextRequest(request)
      case 'image':
        return this.buildImageRequest(request)
      case 'video':
        return this.buildVideoRequest(request)
      default:
        throw new ProviderError(`Unsupported model type for ${request.model}`, this.name, 400)
    }
  }

  private buildTextRequest(request: ModelRequest): { endpoint: string, requestBody: any } {
    return {
      endpoint: 'text_completion',
      requestBody: {
        model_id: request.model,
        prompt: request.prompt,
        max_tokens: request.options?.maxTokens || 1000,
        temperature: request.options?.temperature || 0.7,
        top_p: 0.9,
        repetition_penalty: 1.1,
        system_prompt: request.options?.systemMessage || ''
      }
    }
  }

  private buildImageRequest(request: ModelRequest): { endpoint: string, requestBody: any } {
    const imageSize = request.options?.imageSize || '512x512'
    const [width, height] = imageSize.split('x').map(Number)

    const baseBody = {
      model_id: request.model,
      prompt: request.prompt,
      negative_prompt: request.options?.negativePrompt || '',
      width: width || 512,
      height: height || 512,
      samples: 1,
      num_inference_steps: request.options?.steps || 20,
      guidance_scale: request.options?.guidanceScale || 7.5,
      seed: request.options?.seed,
      scheduler: 'UniPCMultistepScheduler',
      use_karras_sigmas: 'yes',
      algorithm_type: 'dpm-solver++',
      safety_checker: 'no',
      enhance_prompt: 'yes'
    }

    // Choose endpoint based on model
    let endpoint = 'text2img'
    if (request.model === 'midjourney') {
      endpoint = 'midjourney'
    } else if (request.model.includes('controlnet')) {
      endpoint = 'controlnet'
    } else if (request.model === 'img2img') {
      endpoint = 'img2img'
    } else if (request.model === 'inpainting') {
      endpoint = 'inpainting'
    } else if (request.model === 'upscaler') {
      endpoint = 'super_resolution'
    }

    return { endpoint, requestBody: baseBody }
  }

  private buildVideoRequest(request: ModelRequest): { endpoint: string, requestBody: any } {
    return {
      endpoint: 'text2video',
      requestBody: {
        model_id: request.model,
        prompt: request.prompt,
        negative_prompt: request.options?.negativePrompt || '',
        height: 576,
        width: 1024,
        num_frames: Math.min(request.options?.videoLength || 16, 24),
        num_inference_steps: request.options?.steps || 25,
        guidance_scale: request.options?.guidanceScale || 7.5,
        seed: request.options?.seed,
        fps: 8
      }
    }
  }

  private async pollForResult(taskId: string, startTime: number): Promise<any> {
    const maxPollTime = this.config.timeout || 90000
    const pollInterval = 3000 // 3 seconds

    while (Date.now() - startTime < maxPollTime) {
      try {
        const response = await fetch(`${this.baseUrl}/fetch/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: this.config.apiKey
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.status === 'success') {
            return data
          } else if (data.status === 'error') {
            throw new ProviderError(data.message || 'Generation failed', this.name, 500)
          }
          // Still processing, continue polling
        }
      } catch (error) {
        // Continue polling on fetch errors
        console.warn('Polling error:', error)
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new ProviderError('Request timeout while waiting for result', this.name, 408)
  }

  private parseResponse(data: any, request: ModelRequest, executionTime: number): UnifiedResponse {
    let text: string | undefined
    let images: string[] = []

    // Handle different response formats
    if (data.status === 'success') {
      if (data.output) {
        if (Array.isArray(data.output)) {
          images = data.output.filter((url: any) => typeof url === 'string')
        } else if (typeof data.output === 'string') {
          if (data.output.startsWith('http')) {
            images = [data.output]
          } else {
            text = data.output
          }
        }
      }
      
      if (data.generated_text) {
        text = data.generated_text
      }
    }

    // Handle text completion responses
    if (data.choices && Array.isArray(data.choices)) {
      text = data.choices[0]?.text || data.choices[0]?.message?.content
    }

    // Handle direct text responses
    if (!text && !images.length && typeof data === 'string') {
      text = data
    }

    return {
      text,
      images: images.length > 0 ? images : undefined,
      metadata: {
        model: request.model,
        provider: this.name,
        executionTime,
        requestId: data.id || data.task_id,
        seed: data.seed,
        steps: data.num_inference_steps,
        guidance_scale: data.guidance_scale,
        status: data.status,
        originalResponse: data
      }
    }
  }

  private getModelType(model: string): 'text' | 'image' | 'video' {
    const textModels = [
      'llama-2-7b-chat',
      'llama-2-13b-chat',
      'mistral-7b-instruct',
      'codellama-7b-instruct',
      'vicuna-7b-v1.5',
      'wizardlm-7b'
    ]

    const videoModels = [
      'zeroscope-v2-xl',
      'text-to-video-ms-1.7b',
      'animatediff',
      'stable-video-diffusion'
    ]

    if (textModels.includes(model)) {
      return 'text'
    }
    if (videoModels.includes(model)) {
      return 'video'
    }
    return 'image' // Default to image for remaining models
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/text2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: this.config.apiKey,
          model_id: 'stable-diffusion-v1-5',
          prompt: 'test',
          samples: 1,
          num_inference_steps: 1,
          width: 512,
          height: 512
        }),
        signal: AbortSignal.timeout(5000)
      })
      return response.status !== 0 // Network connectivity check
    } catch {
      return false
    }
  }

  getSupportedModels(): string[] {
    return [...this.supportedModels]
  }
}