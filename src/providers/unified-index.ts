/**
 * Unified Provider System for AI Models
 * 
 * This module provides a unified interface to call models from multiple AI providers:
 * - OpenRouter (text generation with GPT, Claude, Llama, etc.)
 * - FAL (image and video generation with Stable Diffusion, FLUX, etc.)
 * - ModelsLab (text, image, and video with Midjourney, custom models, etc.)
 * 
 * All responses are normalized to the same format:
 * { text?, images?, metadata? }
 */

// Main unified client exports
export { 
  callModel,
  unifiedProviderManager,
  UnifiedProviderManager 
} from './unified-client'

// Individual provider classes
export { UnifiedOpenRouterProvider } from './unified-openrouter'
export { UnifiedFALProvider } from './unified-fal'
export { UnifiedModelsLabProvider } from './unified-modelslab'

// Types and interfaces
export {
  Provider,
  ProviderConfig,
  ModelRequest,
  UnifiedResponse,
  IProvider,
  ProviderError,
  RateLimitError,
  AuthenticationError,
  ModelNotSupportedError,
  RateLimiter
} from './unified-types'

// Rate limiting
export { rateLimiter, SimpleRateLimiter } from './rate-limiter'

// Utility functions
export {
  validateApiKey,
  checkEnvironmentSetup,
  getProviderRecommendations,
  estimateRequestCost,
  formatResponse,
  getModelsByType,
  testProviders
} from './utils'

/**
 * Quick start examples:
 * 
 * // Text generation
 * const response = await callModel(
 *   Provider.OPENROUTER, 
 *   'openai/gpt-4o', 
 *   'Write a short poem about AI',
 *   { temperature: 0.7, maxTokens: 100 }
 * )
 * console.log(response.text)
 * 
 * // Image generation
 * const imageResponse = await callModel(
 *   Provider.FAL,
 *   'stable-diffusion-xl-base-1.0',
 *   'a beautiful sunset over mountains',
 *   { imageSize: '1024x1024', steps: 25 }
 * )
 * console.log(imageResponse.images)
 * 
 * // Video generation
 * const videoResponse = await callModel(
 *   Provider.MODELSLAB,
 *   'stable-video-diffusion',
 *   'a cat playing in a garden',
 *   { videoLength: 5 }
 * )
 * console.log(videoResponse.images) // Video URLs are in images array
 */

// Version info
export const VERSION = '1.0.0'
export const SUPPORTED_PROVIDERS = ['openrouter', 'fal', 'modelslab'] as const