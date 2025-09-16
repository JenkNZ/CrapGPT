import axios, { AxiosInstance } from 'axios'
import { 
  ImageProvider, 
  ImageGenerationOptions, 
  ImageGenerationResponse,
  ProviderConfig
} from './types'

export class ModelsLabProvider implements ImageProvider {
  name = 'modelslab'
  config: ProviderConfig
  private client: AxiosInstance

  constructor(config: ProviderConfig) {
    this.config = {
      baseUrl: 'https://modelslab.com/api/v6',
      defaultModel: 'midjourney',
      timeout: 120000, // ModelsLab can take longer for complex images
      ...config
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: this.config.timeout
    })
  }

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResponse> {
    try {
      const model = options.model || this.config.defaultModel || 'midjourney'
      
      // Map common options to ModelsLab API format
      const requestBody: any = {
        key: this.config.apiKey,
        model_id: model,
        prompt: options.prompt,
        width: this.parseDimension(options.size, 'width', 512),
        height: this.parseDimension(options.size, 'height', 512),
        samples: 1,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        seed: Math.floor(Math.random() * 1000000)
      }

      if (options.negativePrompt) {
        requestBody.negative_prompt = options.negativePrompt
      }

      // Choose endpoint based on model type
      let endpoint = '/realtime/text2img'
      
      if (model === 'midjourney') {
        endpoint = '/midjourney/imagine'
        requestBody.init_image = null
        requestBody.mask_image = null
        requestBody.strength = 0.8
      } else if (model.includes('stable-diffusion')) {
        endpoint = '/realtime/text2img'
      }

      const response = await this.client.post(endpoint, requestBody)
      const result = response.data

      // Handle different response formats
      let imageUrl: string
      
      if (result.output && Array.isArray(result.output)) {
        imageUrl = result.output[0]
      } else if (result.proxy_links && Array.isArray(result.proxy_links)) {
        imageUrl = result.proxy_links[0]
      } else if (result.image) {
        imageUrl = result.image
      } else {
        throw new Error('No image URL found in response')
      }

      return {
        id: `modelslab-${Date.now()}`,
        url: imageUrl,
        prompt: options.prompt,
        model: model
      }
    } catch (error: any) {
      console.error('ModelsLab API Error:', error.response?.data || error.message)
      throw new Error(`ModelsLab API Error: ${error.response?.data?.message || error.message}`)
    }
  }

  private parseDimension(size: string | undefined, dimension: 'width' | 'height', defaultValue: number): number {
    if (!size) return defaultValue
    
    // Handle formats like "512x512", "1024x768"
    const parts = size.split('x')
    if (parts.length !== 2) return defaultValue
    
    const width = parseInt(parts[0])
    const height = parseInt(parts[1])
    
    return dimension === 'width' ? (isNaN(width) ? defaultValue : width) 
                                 : (isNaN(height) ? defaultValue : height)
  }

  async getAvailableModels(): Promise<string[]> {
    // ModelsLab supported models
    return [
      'midjourney',
      'stable-diffusion-v1-5',
      'stable-diffusion-2-1',
      'stable-diffusion-xl',
      'dreamshaper',
      'anything-v3',
      'deliberate',
      'analog-diffusion'
    ]
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple API call
      const response = await this.client.post('/realtime/text2img', {
        key: this.config.apiKey,
        model_id: 'stable-diffusion-v1-5',
        prompt: 'test',
        width: 512,
        height: 512,
        samples: 1
      })
      
      // Even if generation fails, if API responds it's healthy
      return response.status === 200 || (response.data && typeof response.data === 'object')
    } catch (error: any) {
      // Check if it's an auth error (API is up) vs connection error
      if (error.response?.status === 401 || error.response?.status === 403) {
        return true // API is up, just auth issue
      }
      console.error('ModelsLab health check failed:', error.message)
      return false
    }
  }
}