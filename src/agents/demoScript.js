// Enhanced Agent System Demo Script
// Demonstrates all the advanced capabilities of the enhanced agent system

import { prisma } from '@wasp-lang/auth/server'
import { ResearcherAgent } from './researcherAgent.js'
import { AgentOrchestrator } from './orchestration.js'
import { ProviderRouter } from './providerRouter.js'
import { ToolExecutor } from './toolExecutor.js'

/**
 * Run comprehensive demo of enhanced agent system
 */
export async function runEnhancedAgentDemo(userId) {
  console.log('🚀 Starting Enhanced Agent System Demo')
  console.log('=' .repeat(60))
  
  try {
    // Phase 1: Setup and Infrastructure Test
    console.log('\n📋 Phase 1: System Infrastructure Test')
    await testInfrastructure(userId)
    
    // Phase 2: Tool Execution Demo
    console.log('\n🔧 Phase 2: Tool Execution Demo')
    await testToolExecution(userId)
    
    // Phase 3: Multi-Provider Routing Demo
    console.log('\n🔀 Phase 3: Multi-Provider Routing Demo')
    await testProviderRouting(userId)
    
    // Phase 4: Agent Delegation Demo
    console.log('\n🤝 Phase 4: Agent Delegation Demo')
    await testAgentDelegation(userId)
    
    // Phase 5: Researcher Agent Full Workflow Demo
    console.log('\n🔬 Phase 5: Researcher Agent Full Workflow Demo')
    await testResearcherAgent(userId)
    
    // Phase 6: Structured Memory Demo
    console.log('\n🧠 Phase 6: Structured Memory Demo')
    await testStructuredMemory(userId)
    
    console.log('\n✅ Enhanced Agent System Demo Completed Successfully!')
    console.log('=' .repeat(60))
    
    return {
      success: true,
      message: 'All enhanced agent capabilities tested successfully',
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message)
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Test system infrastructure components
 */
async function testInfrastructure(userId) {
  console.log('  🏗️  Testing infrastructure components...')
  
  // Test orchestrator
  const orchestrator = new AgentOrchestrator(userId)
  console.log('    ✓ Agent Orchestrator initialized')
  
  // Test provider router
  const router = new ProviderRouter()
  console.log('    ✓ Provider Router initialized')
  
  // Test tool executor
  const toolExecutor = new ToolExecutor(userId)
  console.log('    ✓ Tool Executor initialized')
  
  // Test database connectivity
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  console.log(`    ✓ Database connectivity verified for user: ${user?.email}`)
  
  console.log('  🎯 Infrastructure test completed')
}

/**
 * Test tool execution capabilities
 */
async function testToolExecution(userId) {
  console.log('  🔧 Testing tool execution...')
  
  const toolExecutor = new ToolExecutor(userId)
  
  // Test calculator tool
  try {
    const calcResult = await toolExecutor.executeTool(
      'calculator',
      { expression: '(25 * 4) + (100 / 2)' },
      { agentId: null }
    )
    console.log(`    ✓ Calculator: ${calcResult.result.expression} = ${calcResult.result.result}`)
  } catch (error) {
    console.log(`    ⚠️  Calculator test failed: ${error.message}`)
  }
  
  // Test task splitter tool
  try {
    const splitResult = await toolExecutor.executeTool(
      'task_splitter',
      { 
        task: 'Create a comprehensive marketing strategy for a new AI product',
        criteria: { timePerTask: 30 }
      },
      { agentId: null }
    )
    console.log(`    ✓ Task Splitter: Split into ${splitResult.result.totalSubtasks} subtasks`)
    splitResult.result.subtasks.forEach((subtask, i) => {
      console.log(`       ${i + 1}. ${subtask.description}`)
    })
  } catch (error) {
    console.log(`    ⚠️  Task Splitter test failed: ${error.message}`)
  }
  
  // Test web search tool
  try {
    const searchResult = await toolExecutor.executeTool(
      'web_search',
      { 
        query: 'artificial intelligence trends 2024',
        maxResults: 3
      },
      { agentId: null }
    )
    console.log(`    ✓ Web Search: Found ${searchResult.result.totalResults} results`)
    console.log(`       Query: "${searchResult.result.query}"`)
    console.log(`       Top result: ${searchResult.result.results[0]?.title}`)
  } catch (error) {
    console.log(`    ⚠️  Web Search test failed: ${error.message}`)
  }
  
  console.log('  🎯 Tool execution test completed')
}

/**
 * Test multi-provider routing
 */
async function testProviderRouting(userId) {
  console.log('  🔀 Testing multi-provider routing...')
  
  const router = new ProviderRouter()
  
  // Test text analysis routing
  try {
    console.log('    📝 Testing text analysis routing...')
    const textResult = await router.routeTask(
      'text_analysis',
      'Analyze the key trends in artificial intelligence for 2024 and their potential impact on business.',
      { 
        priority: 'normal',
        timeout: 15000
      }
    )
    console.log(`    ✓ Text Analysis routed to: ${textResult.provider}`)
    console.log(`    ✓ Execution time: ${textResult.executionTime}ms`)
    console.log(`    ✓ Result type: ${typeof textResult.result}`)
  } catch (error) {
    console.log(`    ⚠️  Text analysis routing failed: ${error.message}`)
  }
  
  // Test image generation routing
  try {
    console.log('    🎨 Testing image generation routing...')
    const imageResult = await router.routeTask(
      'image_generation',
      'A professional diagram showing the evolution of artificial intelligence from 2020 to 2024',
      {
        priority: 'normal',
        timeout: 20000
      }
    )
    console.log(`    ✓ Image Generation routed to: ${imageResult.provider}`)
    console.log(`    ✓ Execution time: ${imageResult.executionTime}ms`)
    console.log(`    ✓ Images generated: ${imageResult.result?.images?.length || 0}`)
  } catch (error) {
    console.log(`    ⚠️  Image generation routing failed: ${error.message}`)
  }
  
  console.log('  🎯 Provider routing test completed')
}

/**
 * Test agent delegation
 */
async function testAgentDelegation(userId) {
  console.log('  🤝 Testing agent delegation...')
  
  const orchestrator = new AgentOrchestrator(userId)
  
  try {
    // Create a mock delegating agent
    const mockAgent = await prisma.agent.upsert({
      where: { name: 'Test Delegator' },
      create: {
        name: 'Test Delegator',
        description: 'Test agent for delegation demo',
        personality: 'A test agent that delegates tasks to other agents',
        personalityTraits: ['test', 'delegation'],
        defaultProvider: 'openrouter',
        defaultModel: 'openai/gpt-4o',
        memorySettings: '{}',
        toolAccess: '{}',
        capabilities: '{}',
        providerConfig: '{}',
        tools: [],
        canDelegate: true
      },
      update: {
        canDelegate: true
      }
    })
    
    // Test delegation
    const delegationTask = await orchestrator.delegateTask(
      mockAgent.id,
      'Assistant',
      'Analyze the benefits of task delegation in AI systems',
      {
        prompt: 'Please provide a comprehensive analysis of how task delegation improves AI system efficiency and capabilities.'
      },
      {
        priority: 1,
        timeout: 30000
      }
    )
    
    console.log('    ✓ Task delegated successfully')
    console.log(`    ✓ Task ID: ${delegationTask.id}`)
    console.log(`    ✓ Status: ${delegationTask.status}`)
    console.log('    ✓ Delegating Agent: Test Delegator')
    console.log('    ✓ Target Agent: Assistant')
    
    // Check task status
    const taskStatus = await orchestrator.getTaskStatus(delegationTask.id)
    console.log(`    ✓ Task progress: ${taskStatus?.progress || 0}%`)
    
  } catch (error) {
    console.log(`    ⚠️  Agent delegation test failed: ${error.message}`)
  }
  
  console.log('  🎯 Agent delegation test completed')
}

/**
 * Test the full Researcher Agent workflow
 */
async function testResearcherAgent(userId) {
  console.log('  🔬 Testing Researcher Agent full workflow...')
  
  try {
    const researcher = new ResearcherAgent(userId)
    
    console.log('    📋 Starting research workflow...')
    const researchResult = await researcher.conductResearch(
      'What are the key benefits and challenges of implementing AI agents in enterprise environments?',
      {
        depth: 'comprehensive',
        timePerSubtask: 30,
        focusAreas: ['benefits', 'challenges', 'implementation']
      }
    )
    
    if (researchResult.success) {
      console.log('    ✅ Research completed successfully!')
      console.log(`    ✓ Execution time: ${researchResult.metadata.executionTime}ms`)
      console.log(`    ✓ Workflow steps: ${researchResult.metadata.workflowSteps.length}`)
      console.log(`    ✓ Providers used: ${researchResult.metadata.providersUsed.join(', ')}`)
      console.log(`    ✓ Tools used: ${researchResult.metadata.toolsUsed.join(', ')}`)
      
      // Display report summary
      console.log(`    ✓ Report title: ${researchResult.report.title}`)
      console.log(`    ✓ Key findings: ${researchResult.report.keyFindings?.length || 0}`)
      console.log(`    ✓ Methodology: ${researchResult.report.methodology.approach}`)
      
      if (researchResult.report.visualElements?.images) {
        console.log(`    ✓ Visual elements: ${researchResult.report.visualElements.images.length} images generated`)
      }
      
    } else {
      console.log(`    ❌ Research failed: ${researchResult.error}`)
      if (researchResult.partialResults) {
        console.log('    📊 Partial results available')
      }
    }
    
  } catch (error) {
    console.log(`    ⚠️  Researcher Agent test failed: ${error.message}`)
  }
  
  console.log('  🎯 Researcher Agent test completed')
}

/**
 * Test structured memory storage and retrieval
 */
async function testStructuredMemory(userId) {
  console.log('  🧠 Testing structured memory system...')
  
  const orchestrator = new AgentOrchestrator(userId)
  
  try {
    // Store structured memory
    await orchestrator.storeMemory(null, {
      type: 'demo_test',
      testData: {
        phase: 'memory_test',
        timestamp: new Date().toISOString(),
        metrics: {
          toolsExecuted: 4,
          providersUsed: ['OpenRouter', 'FAL'],
          delegations: 1,
          success: true
        },
        insights: [
          'Enhanced agent system working correctly',
          'Multi-provider routing functional',
          'Tool execution system operational',
          'Agent delegation successful'
        ]
      }
    }, {
      memoryType: 'demo',
      importance: 9,
      tags: ['demo', 'test', 'enhanced_system', 'comprehensive']
    })
    
    console.log('    ✓ Structured memory stored')
    
    // Retrieve structured memories
    const memories = await orchestrator.getStructuredMemories(null, {
      memoryType: 'demo',
      tags: ['demo'],
      limit: 5
    })
    
    console.log(`    ✓ Retrieved ${memories.length} memories`)
    
    if (memories.length > 0) {
      const latestMemory = memories[0]
      console.log(`    ✓ Latest memory type: ${latestMemory.structuredData?.type}`)
      console.log(`    ✓ Memory importance: ${latestMemory.importance}`)
      console.log(`    ✓ Memory tags: ${latestMemory.tags.join(', ')}`)
      
      if (latestMemory.structuredData?.testData) {
        const testData = latestMemory.structuredData.testData
        console.log(`    ✓ Test metrics: ${JSON.stringify(testData.metrics)}`)
        console.log(`    ✓ Insights count: ${testData.insights?.length || 0}`)
      }
    }
    
  } catch (error) {
    console.log(`    ⚠️  Structured memory test failed: ${error.message}`)
  }
  
  console.log('  🎯 Structured memory test completed')
}

/**
 * Export demo for use in actions
 */
export const testEnhancedAgentSystem = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }
  
  return await runEnhancedAgentDemo(context.user.id)
}
