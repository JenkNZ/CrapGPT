import axios, { AxiosInstance } from 'axios'
import { 
  AIProvider, 
  ChatCompletionOptions, 
  ChatCompletionResponse, 
  StreamingChatResponse,
  ProviderConfig,
  ChatMessage
} from './types'

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter'
  config: ProviderConfig
  private client: AxiosInstance

  constructor(config: ProviderConfig) {
    this.config = {
      baseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'openai/gpt-4',
      timeout: 30000,
      ...config
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'GPT Clone',
        'Content-Type': 'application/json'
      },
      timeout: this.config.timeout
    })
  }

  async createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || this.config.defaultModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: false
      })

      const completion = response.data

      return {
        id: completion.id,
        content: completion.choices[0]?.message?.content || '',
        model: completion.model,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined,
        finishReason: completion.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length'
      }
    } catch (error: any) {
      console.error('OpenRouter API Error:', error.response?.data || error.message)
      throw new Error(`OpenRouter API Error: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  async* createStreamingChatCompletion(options: ChatCompletionOptions): AsyncGenerator<StreamingChatResponse> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: options.model || this.config.defaultModel,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: true
      }, {
        responseType: 'stream'
      })

      let buffer = ''
      const completionId = `openrouter-${Date.now()}`

      for await (const chunk of response.data) {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            
            if (data === '[DONE]') {
              yield {
                id: completionId,
                delta: '',
                finished: true
              }
              return
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices[0]?.delta?.content || ''
              
              if (delta) {
                yield {
                  id: completionId,
                  delta,
                  finished: false
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue
            }
          }
        }
      }
    } catch (error: any) {
      console.error('OpenRouter Streaming Error:', error.response?.data || error.message)
      throw new Error(`OpenRouter Streaming Error: ${error.message}`)
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models')
      return response.data.data.map((model: any) => model.id)
    } catch (error: any) {
      console.error('Failed to fetch OpenRouter models:', error.message)
      return [
        'openai/gpt-4',
        'openai/gpt-3.5-turbo',
        'anthropic/claude-3-sonnet',
        'anthropic/claude-3-haiku',
        'meta-llama/llama-2-70b-chat',
        'mistralai/mixtral-8x7b-instruct'
      ]
    }
  }

  validateModel(model: string): boolean {
    // Basic validation - in production, check against available models
    return typeof model === 'string' && model.length > 0
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/models')
      return response.status === 200
    } catch (error) {
      console.error('OpenRouter health check failed:', error)
      return false
    }
  }
}