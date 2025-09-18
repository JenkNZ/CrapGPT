/**
 * Test Examples for Enhanced Agent System
 * 
 * This file demonstrates how to use the new runAgent function with
 * memory management, personality traits, and provider configurations.
 */

import { runAgent } from './actions.js'
import { getAgentByName, getAgentMemories } from './queries.js'

// Example 1: Basic agent interaction
export const testBasicInteraction = async (context) => {
  try {
    const result = await runAgent({
      agentName: 'Assistant',
      input: 'Hello! Can you help me understand quantum computing?',
      userId: context.user.id
    }, context)

    console.log('Agent Response:', result.response.text)
    console.log('Memory Context:', result.response.metadata.memoryContext)
    return result
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

// Example 2: Creative agent with image generation capability
export const testCreativeAgent = async (context) => {
  try {
    const result = await runAgent({
      agentName: 'Creative Writer',
      input: 'Write a short story about a robot who discovers emotions. Also, can you create an image of the main character?',
      userId: context.user.id
    }, context)

    console.log('Story:', result.response.text)
    if (result.response.images) {
      console.log('Generated Images:', result.response.images)
    }
    console.log('Agent Traits:', result.response.metadata.agentTraits)
    return result
  } catch (error) {
    console.error('Creative test failed:', error.message)
  }
}

// Example 3: Code assistant with memory context
export const testCodeAssistantWithMemory = async (context) => {
  try {
    // First interaction - ask about a programming concept
    const result1 = await runAgent({
      agentName: 'Code Assistant',
      input: 'Can you explain React hooks to me?',
      userId: context.user.id
    }, context)

    console.log('First Response:', result1.response.text)

    // Second interaction - follow-up question (should remember context)
    const result2 = await runAgent({
      agentName: 'Code Assistant',
      input: 'Can you show me a practical example using the concept you just explained?',
      userId: context.user.id
    }, context)

    console.log('Second Response (with memory context):', result2.response.text)
    console.log('Memory Context Length:', result2.response.metadata.memoryContext)
    
    return { result1, result2 }
  } catch (error) {
    console.error('Code assistant test failed:', error.message)
  }
}

// Example 4: Data analyst with different provider
export const testDataAnalyst = async (context) => {
  try {
    const result = await runAgent({
      agentName: 'Data Analyst',
      input: 'I have sales data showing declining trends. What analysis methods should I use to understand the root causes?',
      userId: context.user.id
    }, context)

    console.log('Analysis Suggestion:', result.response.text)
    console.log('Provider Used:', result.response.metadata.provider)
    console.log('Model Used:', result.response.metadata.model)
    return result
  } catch (error) {
    console.error('Data analyst test failed:', error.message)
  }
}

// Example 5: Memory retrieval and analysis
export const testMemoryRetrieval = async (context) => {
  try {
    // Get the agent first
    const agent = await getAgentByName({ name: 'Assistant' }, context)
    
    // Retrieve recent memories
    const memories = await getAgentMemories({
      agentId: agent.id,
      userId: context.user.id,
      memoryType: 'short_term',
      limit: 5
    }, context)

    console.log('Recent Agent Memories:')
    memories.forEach((memory, index) => {
      console.log(`${index + 1}. Input: "${memory.input}"`)
      console.log(`   Output: "${memory.output}"`)
      console.log(`   Time: ${memory.createdAt}`)
      console.log(`   Importance: ${memory.importance}`)
      
      if (memory.context) {
        const ctx = JSON.parse(memory.context)
        console.log(`   Provider: ${ctx.provider}, Execution Time: ${ctx.executionTime}ms`)
      }
      console.log('---')
    })

    return memories
  } catch (error) {
    console.error('Memory retrieval test failed:', error.message)
  }
}

// Example 6: Testing tool access permissions
export const testToolAccess = async (context) => {
  try {
    // Test an agent with image generation enabled (Creative Writer)
    const creativeResult = await runAgent({
      agentName: 'Creative Writer',
      input: 'Generate an image of a sunset over a mountain range',
      userId: context.user.id
    }, context)

    console.log('Creative Writer (with image access):', creativeResult.response)

    // Test an agent without image generation (Assistant)
    const assistantResult = await runAgent({
      agentName: 'Assistant',
      input: 'Can you generate an image for me?',
      userId: context.user.id
    }, context)

    console.log('Assistant (no image access):', assistantResult.response.text)

    return { creativeResult, assistantResult }
  } catch (error) {
    console.error('Tool access test failed:', error.message)
  }
}

// Example 7: Error handling and recovery
export const testErrorHandling = async (context) => {
  try {
    // Try to call a non-existent agent
    const result = await runAgent({
      agentName: 'NonExistentAgent',
      input: 'Hello',
      userId: context.user.id
    }, context)
  } catch (error) {
    console.log('Expected error caught:', error.message)
    
    // Now try with valid agent
    const validResult = await runAgent({
      agentName: 'Assistant',
      input: 'This should work fine',
      userId: context.user.id
    }, context)

    console.log('Recovery successful:', validResult.response.text)
    return validResult
  }
}

// Example 8: Batch testing all agents
export const testAllAgents = async (context) => {
  const agents = ['Assistant', 'Creative Writer', 'Code Assistant', 'Data Analyst']
  const results = {}

  for (const agentName of agents) {
    try {
      const result = await runAgent({
        agentName: agentName,
        input: `Hello! I'm testing the ${agentName} agent. Can you tell me about your capabilities?`,
        userId: context.user.id
      }, context)

      results[agentName] = {
        success: true,
        response: result.response.text,
        traits: result.response.metadata.agentTraits,
        provider: result.response.metadata.provider,
        model: result.response.metadata.model
      }

      console.log(`✅ ${agentName}: ${result.response.text.substring(0, 100)}...`)
    } catch (error) {
      results[agentName] = {
        success: false,
        error: error.message
      }
      console.log(`❌ ${agentName}: ${error.message}`)
    }
  }

  return results
}

// Usage example:
/*
// In a Wasp action or API endpoint:
export const testAgentSystem = async (args, context) => {
  console.log('🚀 Testing Enhanced Agent System...')
  
  // Test basic interaction
  await testBasicInteraction(context)
  
  // Test creative agent
  await testCreativeAgent(context)
  
  // Test memory functionality
  await testCodeAssistantWithMemory(context)
  
  // Test memory retrieval
  await testMemoryRetrieval(context)
  
  // Test all agents
  const results = await testAllAgents(context)
  
  return { message: 'Agent system tests completed', results }
}
*/

export default {
  testBasicInteraction,
  testCreativeAgent,
  testCodeAssistantWithMemory,
  testDataAnalyst,
  testMemoryRetrieval,
  testToolAccess,
  testErrorHandling,
  testAllAgents
}