# Unified AI Provider System

This directory contains a unified API client system for multiple AI providers, normalizing responses into a consistent format.

## Overview

The unified provider system supports:
- **OpenRouter**: Text generation with GPT-4, Claude, Llama, and more
- **FAL**: Image and video generation with Stable Diffusion, FLUX, etc.
- **ModelsLab**: Text, image, and video generation including Midjourney-style models

All responses are normalized to the same shape:
```typescript
{
  text?: string,
  images?: string[],
  metadata?: {
    model: string,
    provider: string,
    usage?: { inputTokens, outputTokens, totalTokens },
    executionTime: number,
    requestId?: string
  }
}
```

## Quick Start

### Basic Usage

```typescript
import { callModel, Provider } from '@src/providers/unified-index'

// Text generation
const textResponse = await callModel(
  Provider.OPENROUTER,
  'openai/gpt-4o',
  'Explain quantum computing in simple terms',
  { temperature: 0.7, maxTokens: 500 }
)
console.log(textResponse.text)

// Image generation  
const imageResponse = await callModel(
  Provider.FAL,
  'stable-diffusion-xl-base-1.0',
  'a majestic dragon flying over a medieval castle',
  { imageSize: '1024x1024', steps: 25 }
)
console.log(imageResponse.images) // Array of image URLs

// Video generation
const videoResponse = await callModel(
  Provider.MODELSLAB,
  'stable-video-diffusion',
  'waves crashing on a beach at sunset',
  { videoLength: 5, steps: 25 }
)
console.log(videoResponse.images) // Video URLs
```

### Environment Setup

Add API keys to your `.env` file:

```env
OPENROUTER_API_KEY=sk-or-your-openrouter-key
FAL_API_KEY=your-fal-api-key
MODELSLAB_API_KEY=your-modelslab-key
```

## File Structure

```
providers/
├── unified-index.ts       # Main exports and documentation
├── unified-client.ts      # Provider manager and main callModel function
├── unified-types.ts       # TypeScript interfaces and types
├── unified-openrouter.ts  # OpenRouter implementation
├── unified-fal.ts         # FAL implementation  
├── unified-modelslab.ts   # ModelsLab implementation
├── rate-limiter.ts        # Rate limiting implementation
├── utils.ts               # Helper functions and utilities
└── README.md             # This file
```

## Supported Models

### OpenRouter (Text Generation)
- `openai/gpt-4o` - Latest GPT-4 model
- `openai/gpt-4o-mini` - Faster, cheaper GPT-4
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet
- `meta-llama/llama-3.1-405b-instruct` - Llama 3.1 405B
- `google/gemini-pro-1.5` - Google Gemini Pro
- And many more...

### FAL (Image/Video Generation)
- `flux-pro` - High-quality image generation
- `stable-diffusion-xl-base-1.0` - SDXL base model
- `luma-dream-machine` - Video generation
- `runway-gen3` - Professional video generation
- `kandinsky-v2-2` - Alternative art styles

### ModelsLab (Multi-modal)
- `midjourney` - Midjourney-style image generation
- `stable-diffusion-v1-5` - Classic Stable Diffusion
- `llama-2-13b-chat` - Text generation
- `zeroscope-v2-xl` - Video generation
- `controlnet-*` - Various ControlNet models

## Advanced Usage

### Provider Manager

```typescript
import { unifiedProviderManager, Provider } from '@src/providers/unified-index'

// Check available providers
const providers = unifiedProviderManager.getAvailableProviders()
console.log('Available providers:', providers)

// Get models for a specific provider
const openrouterModels = unifiedProviderManager.getSupportedModels(Provider.OPENROUTER)
console.log('OpenRouter models:', openrouterModels)

// Health check
const health = await unifiedProviderManager.checkAllProvidersHealth()
console.log('Provider health:', health)
```

### Error Handling

```typescript
import { 
  callModel, 
  Provider, 
  ProviderError, 
  RateLimitError, 
  AuthenticationError 
} from '@src/providers/unified-index'

try {
  const response = await callModel(Provider.OPENROUTER, 'openai/gpt-4o', 'Hello')
  console.log(response.text)
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key')
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded, retry after:', error.retryAfter)
  } else if (error instanceof ProviderError) {
    console.error('Provider error:', error.message, 'Status:', error.statusCode)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

### Custom Options

```typescript
// Text generation with custom options
const textResponse = await callModel(
  Provider.OPENROUTER,
  'openai/gpt-4o',
  'Write a story',
  {
    temperature: 0.9,     // More creative
    maxTokens: 1000,      // Longer response
    systemMessage: 'You are a creative storyteller'
  }
)

// Image generation with custom options  
const imageResponse = await callModel(
  Provider.FAL,
  'stable-diffusion-xl-base-1.0',
  'a cyberpunk city',
  {
    imageSize: '1024x1024',
    negativePrompt: 'blurry, low quality',
    steps: 30,
    guidanceScale: 7.5,
    seed: 12345
  }
)

// Video generation with custom options
const videoResponse = await callModel(
  Provider.MODELSLAB,
  'stable-video-diffusion', 
  'ocean waves',
  {
    videoLength: 10,      // 10 seconds
    steps: 25,
    guidanceScale: 8.0
  }
)
```

## Rate Limiting

The system includes built-in rate limiting:

```typescript
import { rateLimiter, Provider } from '@src/providers/unified-index'

// Check if you can make a request
const canMakeRequest = await rateLimiter.checkLimit(Provider.OPENROUTER)
if (canMakeRequest) {
  // Make your request
  const response = await callModel(Provider.OPENROUTER, 'openai/gpt-4o', 'Hello')
}

// Check remaining requests
const remaining = rateLimiter.getRemainingRequests(Provider.OPENROUTER)
console.log(`${remaining} requests remaining`)
```

## Utility Functions

```typescript
import { 
  validateApiKey,
  checkEnvironmentSetup,
  getProviderRecommendations,
  estimateRequestCost,
  formatResponse,
  testProviders 
} from '@src/providers/unified-index'

// Validate API keys
const validation = validateApiKey(Provider.OPENROUTER, 'sk-or-...')
console.log('API key valid:', validation.valid)

// Check environment setup
const envCheck = checkEnvironmentSetup()
console.log('Environment warnings:', envCheck.warnings)

// Get recommendations for use case
const recs = getProviderRecommendations('image')
console.log('Recommended image providers:', recs.recommended)

// Estimate costs
const cost = estimateRequestCost(Provider.OPENROUTER, 'openai/gpt-4o', 100)
console.log(`Estimated cost: $${cost.cost} ${cost.currency}`)

// Test all providers
const testResults = await testProviders()
console.log('Provider test results:', testResults)
```

## Error Types

- `ProviderError` - General provider errors
- `AuthenticationError` - Invalid API keys  
- `RateLimitError` - Rate limit exceeded
- `ModelNotSupportedError` - Unsupported model

## Best Practices

1. **Always handle errors** - Network requests can fail
2. **Use rate limiting** - Respect provider limits
3. **Set reasonable timeouts** - Especially for image/video generation
4. **Monitor costs** - Use cost estimation utilities
5. **Test API keys** - Use validation functions before deployment
6. **Cache responses** - When possible, to reduce API calls

## Contributing

When adding new providers:

1. Implement the `IProvider` interface
2. Add to the `UnifiedProviderManager` 
3. Update supported models list
4. Add error handling and rate limiting
5. Include comprehensive tests
6. Update documentation

## License

This provider system is part of the GPT Clone project and follows the same MIT license.