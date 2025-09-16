export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export interface ChatCompletionOptions {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tools?: string[]
}

export interface ChatCompletionResponse {
  id: string
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter'
}

export interface StreamingChatResponse {
  id: string
  delta: string
  finished: boolean
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  defaultModel?: string
  timeout?: number
}

export interface AIProvider {
  name: string
  config: ProviderConfig
  
  // Chat completion methods
  createChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>
  createStreamingChatCompletion(options: ChatCompletionOptions): AsyncGenerator<StreamingChatResponse>
  
  // Model management
  getAvailableModels(): Promise<string[]>
  validateModel(model: string): boolean
  
  // Health check
  healthCheck(): Promise<boolean>
}

export interface ImageGenerationOptions {
  prompt: string
  model?: string
  size?: string
  quality?: string
  style?: string
  negativePrompt?: string
}

export interface ImageGenerationResponse {
  id: string
  url: string
  prompt: string
  model: string
}

export interface ImageProvider {
  name: string
  config: ProviderConfig
  
  generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResponse>
  getAvailableModels(): Promise<string[]>
  healthCheck(): Promise<boolean>
}

export type Provider = AIProvider | ImageProvider

export enum ProviderType {
  CHAT = 'chat',
  IMAGE = 'image',
  BOTH = 'both'
}

export interface ProviderMetadata {
  name: string
  type: ProviderType
  description: string
  supportedModels: string[]
  pricing?: {
    inputTokenPrice: number
    outputTokenPrice: number
    currency: string
  }
}