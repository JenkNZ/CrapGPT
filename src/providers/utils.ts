import { Provider, ProviderConfig, UnifiedResponse } from './unified-types'
import { unifiedProviderManager } from './unified-client'

/**
 * Validate API key format for different providers
 */
export function validateApiKey(provider: Provider, apiKey: string): { valid: boolean, error?: string } {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: 'API key is required' }
  }

  const trimmedKey = apiKey.trim()

  switch (provider) {
    case Provider.OPENROUTER:
      // OpenRouter keys typically start with 'sk-or-'
      if (trimmedKey.length < 20) {
        return { valid: false, error: 'OpenRouter API key appears to be too short' }
      }
      if (trimmedKey.startsWith('sk-or-')) {
        return { valid: true }
      }
      // Also accept generic OpenAI-format keys
      if (trimmedKey.startsWith('sk-')) {
        return { valid: true }
      }
      return { valid: false, error: 'OpenRouter API key should start with "sk-or-" or "sk-"' }

    case Provider.FAL:
      // FAL keys are typically UUID-like or alphanumeric
      if (trimmedKey.length < 10) {
        return { valid: false, error: 'FAL API key appears to be too short' }
      }
      // FAL keys can be various formats, so we're more lenient
      if (/^[a-zA-Z0-9\-_]+$/.test(trimmedKey)) {
        return { valid: true }
      }
      return { valid: false, error: 'FAL API key contains invalid characters' }

    case Provider.MODELSLAB:
      // ModelsLab keys are typically alphanumeric
      if (trimmedKey.length < 15) {
        return { valid: false, error: 'ModelsLab API key appears to be too short' }
      }
      if (/^[a-zA-Z0-9]+$/.test(trimmedKey)) {
        return { valid: true }
      }
      return { valid: false, error: 'ModelsLab API key should contain only alphanumeric characters' }

    default:
      return { valid: false, error: `Unknown provider: ${provider}` }
  }
}

/**
 * Check if all required environment variables are set
 */
export function checkEnvironmentSetup(): {
  openrouter: boolean
  fal: boolean
  modelslab: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  
  const openrouterAvailable = !!process.env.OPENROUTER_API_KEY
  const falAvailable = !!process.env.FAL_API_KEY
  const modelslabAvailable = !!process.env.MODELSLAB_API_KEY

  if (!openrouterAvailable) {
    warnings.push('OPENROUTER_API_KEY not set - text generation will be unavailable')
  }

  if (!falAvailable) {
    warnings.push('FAL_API_KEY not set - some image/video generation models will be unavailable')
  }

  if (!modelslabAvailable) {
    warnings.push('MODELSLAB_API_KEY not set - additional image/video/text models will be unavailable')
  }

  return {
    openrouter: openrouterAvailable,
    fal: falAvailable,
    modelslab: modelslabAvailable,
    warnings
  }
}

/**
 * Get provider recommendations based on use case
 */
export function getProviderRecommendations(useCase: 'text' | 'image' | 'video' | 'code' | 'chat'): {
  recommended: Provider[]
  models: { provider: Provider, model: string, reason: string }[]
} {
  switch (useCase) {
    case 'text':
    case 'chat':
      return {
        recommended: [Provider.OPENROUTER, Provider.MODELSLAB],
        models: [
          { provider: Provider.OPENROUTER, model: 'openai/gpt-4o', reason: 'Best overall text generation' },
          { provider: Provider.OPENROUTER, model: 'anthropic/claude-3.5-sonnet', reason: 'Excellent reasoning and analysis' },
          { provider: Provider.MODELSLAB, model: 'llama-2-13b-chat', reason: 'Good open-source alternative' }
        ]
      }

    case 'code':
      return {
        recommended: [Provider.OPENROUTER],
        models: [
          { provider: Provider.OPENROUTER, model: 'openai/gpt-4o', reason: 'Excellent code generation and debugging' },
          { provider: Provider.MODELSLAB, model: 'codellama-7b-instruct', reason: 'Specialized code model' }
        ]
      }

    case 'image':
      return {
        recommended: [Provider.FAL, Provider.MODELSLAB],
        models: [
          { provider: Provider.FAL, model: 'flux-pro', reason: 'High-quality, fast generation' },
          { provider: Provider.MODELSLAB, model: 'midjourney', reason: 'Artistic, high-quality images' },
          { provider: Provider.FAL, model: 'stable-diffusion-xl-base-1.0', reason: 'Good balance of quality and speed' }
        ]
      }

    case 'video':
      return {
        recommended: [Provider.FAL, Provider.MODELSLAB],
        models: [
          { provider: Provider.FAL, model: 'luma-dream-machine', reason: 'High-quality video generation' },
          { provider: Provider.FAL, model: 'runway-gen3', reason: 'Professional video generation' },
          { provider: Provider.MODELSLAB, model: 'stable-video-diffusion', reason: 'Good quality, more affordable' }
        ]
      }

    default:
      return {
        recommended: [Provider.OPENROUTER],
        models: [
          { provider: Provider.OPENROUTER, model: 'openai/gpt-4o', reason: 'Versatile general-purpose model' }
        ]
      }
  }
}

/**
 * Estimate cost for a request (rough estimates)
 */
export function estimateRequestCost(provider: Provider, model: string, inputLength: number): {
  estimated: boolean
  cost: number
  currency: string
  notes: string
} {
  // These are rough estimates - actual pricing varies
  const baseCosts = {
    [Provider.OPENROUTER]: {
      'openai/gpt-4o': { input: 0.00001, output: 0.00003 }, // per token
      'openai/gpt-3.5-turbo': { input: 0.000001, output: 0.000002 },
      'anthropic/claude-3.5-sonnet': { input: 0.000003, output: 0.000015 }
    },
    [Provider.FAL]: {
      'flux-pro': { base: 0.05 }, // per image
      'stable-diffusion-xl-base-1.0': { base: 0.02 },
      'luma-dream-machine': { base: 0.50 } // per video
    },
    [Provider.MODELSLAB]: {
      'midjourney': { base: 0.03 }, // per image
      'stable-diffusion-v1-5': { base: 0.01 },
      'llama-2-7b-chat': { input: 0.0000005, output: 0.0000005 }
    }
  }

  const providerCosts = baseCosts[provider]
  const modelCost = providerCosts?.[model]

  if (!modelCost) {
    return {
      estimated: false,
      cost: 0,
      currency: 'USD',
      notes: 'Cost data not available for this model'
    }
  }

  let estimatedCost = 0
  let notes = ''

  if ('input' in modelCost) {
    // Text model - estimate based on tokens
    const estimatedTokens = Math.ceil(inputLength / 4) // rough token estimate
    estimatedCost = (estimatedTokens * modelCost.input) + (estimatedTokens * 0.5 * modelCost.output)
    notes = `Estimated based on ~${estimatedTokens} input tokens`
  } else {
    // Fixed cost model (image/video)
    estimatedCost = modelCost.base
    notes = 'Fixed cost per generation'
  }

  return {
    estimated: true,
    cost: estimatedCost,
    currency: 'USD',
    notes: `${notes}. Actual costs may vary.`
  }
}

/**
 * Format a UnifiedResponse for debugging or logging
 */
export function formatResponse(response: UnifiedResponse): string {
  const parts: string[] = []

  if (response.text) {
    parts.push(`Text: "${response.text.substring(0, 100)}${response.text.length > 100 ? '...' : ''}"`)
  }

  if (response.images && response.images.length > 0) {
    parts.push(`Images: ${response.images.length} generated`)
    response.images.forEach((url, idx) => {
      parts.push(`  [${idx}]: ${url}`)
    })
  }

  if (response.metadata) {
    parts.push(`Provider: ${response.metadata.provider}`)
    parts.push(`Model: ${response.metadata.model}`)
    if (response.metadata.executionTime) {
      parts.push(`Execution: ${response.metadata.executionTime}ms`)
    }
    if (response.metadata.usage) {
      const usage = response.metadata.usage
      parts.push(`Tokens: ${usage.inputTokens || 0}→${usage.outputTokens || 0} (${usage.totalTokens || 0} total)`)
    }
  }

  return parts.join('\n')
}

/**
 * Get available models filtered by type
 */
export function getModelsByType(type: 'text' | 'image' | 'video'): { provider: Provider, models: string[] }[] {
  const allModels = unifiedProviderManager.getAllSupportedModels()
  const results: { provider: Provider, models: string[] }[] = []

  for (const [provider, models] of Object.entries(allModels)) {
    const filteredModels = models.filter(model => {
      switch (type) {
        case 'text':
          return isTextModel(model)
        case 'image':
          return isImageModel(model)
        case 'video':
          return isVideoModel(model)
        default:
          return false
      }
    })

    if (filteredModels.length > 0) {
      results.push({
        provider: provider as Provider,
        models: filteredModels
      })
    }
  }

  return results
}

function isTextModel(model: string): boolean {
  const textModels = [
    'gpt', 'claude', 'llama', 'mistral', 'gemini', 'wizardlm', 'vicuna', 'codellama'
  ]
  return textModels.some(keyword => model.toLowerCase().includes(keyword))
}

function isImageModel(model: string): boolean {
  const imageKeywords = [
    'stable-diffusion', 'midjourney', 'flux', 'dreamshaper', 'anything',
    'realistic-vision', 'deliberate', 'openjourney', 'analog-diffusion',
    'kandinsky', 'controlnet', 'img2img', 'inpainting', 'upscaler'
  ]
  return imageKeywords.some(keyword => model.toLowerCase().includes(keyword))
}

function isVideoModel(model: string): boolean {
  const videoKeywords = [
    'video', 'luma-dream-machine', 'kling', 'runway', 'zeroscope', 'animatediff'
  ]
  return videoKeywords.some(keyword => model.toLowerCase().includes(keyword))
}

/**
 * Simple function to test if providers are working
 */
export async function testProviders(): Promise<Record<Provider, { success: boolean, error?: string, response?: any }>> {
  const results: Record<Provider, { success: boolean, error?: string, response?: any }> = {} as any

  const availableProviders = unifiedProviderManager.getAvailableProviders()

  for (const provider of availableProviders) {
    try {
      let model: string
      let prompt: string
      
      // Choose appropriate test model and prompt
      switch (provider) {
        case Provider.OPENROUTER:
          model = 'openai/gpt-3.5-turbo'
          prompt = 'Hello, respond with just "OK"'
          break
        case Provider.FAL:
          model = 'stable-diffusion-v1-5'
          prompt = 'a simple red circle'
          break
        case Provider.MODELSLAB:
          model = 'stable-diffusion-v1-5'
          prompt = 'a simple blue square'
          break
        default:
          continue
      }

      const response = await unifiedProviderManager.callModel(provider, model, prompt, {
        maxTokens: 10, // Keep it minimal
        temperature: 0,
        steps: 5, // For image models
      })

      results[provider] = { success: true, response }
    } catch (error) {
      results[provider] = { success: false, error: error.message }
    }
  }

  return results
}