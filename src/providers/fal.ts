import axios, { AxiosInstance } from 'axios'
import { 
  ImageProvider, 
  ImageGenerationOptions, 
  ImageGenerationResponse,
  ProviderConfig
} from './types'

export class FALProvider implements ImageProvider {
  name = 'fal'
  config: ProviderConfig
  private client: AxiosInstance

  constructor(config: ProviderConfig) {
    this.config = {
      baseUrl: 'https://fal.run/fal-ai',
      defaultModel: 'stable-diffusion-v1-5',
      timeout: 60000, // Image generation takes longer
      ...config
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Key ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: this.config.timeout
    })
  }

  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResponse> {
    try {
      const model = options.model || this.config.defaultModel || 'stable-diffusion-v1-5'
      
      // Map common options to FAL API format
      const requestBody: any = {
        prompt: options.prompt,
        image_size: options.size || '512x512',
        guidance_scale: 7.5,
        num_inference_steps: 50,
        seed: Math.floor(Math.random() * 1000000)
      }

      if (options.negativePrompt) {
        requestBody.negative_prompt = options.negativePrompt
      }

      // Different endpoints for different models
      let endpoint = '/stable-diffusion-v1-5'
      
      if (model.includes('xl')) {
        endpoint = '/stable-diffusion-xl'
      } else if (model.includes('v2')) {
        endpoint = '/stable-diffusion-v2-1'
      }

      const response = await this.client.post(endpoint, requestBody)
      const result = response.data

      // FAL returns images as base64 or URLs
      const imageUrl = result.images?.[0]?.url || result.image?.url
      
      if (!imageUrl) {
        throw new Error('No image URL returned from FAL API')
      }

      return {
        id: `fal-${Date.now()}`,
        url: imageUrl,
        prompt: options.prompt,
        model: model
      }
    } catch (error: any) {
      console.error('FAL API Error:', error.response?.data || error.message)
      throw new Error(`FAL API Error: ${error.response?.data?.detail || error.message}`)
    }
  }

  async getAvailableModels(): Promise<string[]> {
    // FAL supported models - in production, fetch from their API
    return [
      'stable-diffusion-v1-5',
      'stable-diffusion-v2-1',
      'stable-diffusion-xl',
      'stable-diffusion-xl-turbo',
      'kandinsky-2-2',
      'wuerstchen'
    ]
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - try to get model info
      const response = await this.client.get('/stable-diffusion-v1-5')
      return response.status === 200 || response.status === 400 // 400 might mean missing params but API is up
    } catch (error: any) {
      console.error('FAL health check failed:', error.message)
      return false
    }
  }
}