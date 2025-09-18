import { prisma } from '@wasp-lang/auth/server'
import { HttpError } from '@wasp-lang/core/HttpError'
import { r2 } from './server/r2.js'
import { connectionService } from './server/connectionService.js'
import { connectionSecurityMonitor } from './server/connectionSecurityMonitor.js'
import { connectionRegistry } from './server/connectionRegistry.js'
import orchestrationManager, { 
  hexstrikeAI, 
  executeToolhiveTool, 
  runOpenOpsWorkflow, 
  deployArcadeInfrastructure, 
  delegateViaMCP, 
  callMultiProviderAI 
} from './orchestration/index.js'
import { runAgent as runAgentWithConnections } from './server/runAgent.js'

export const createConversation = async ({ title, userId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  return prisma.conversation.create({
    data: {
      title,
      userId: context.user.id
    }
  })
}

export const sendMessage = async ({ content, conversationId, agentId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Verify user owns the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: context.user.id
      }
    })

    if (!conversation) {
      throw new HttpError(404, 'Conversation not found')
    }

    // Get the agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    })

    if (!agent) {
      throw new HttpError(404, 'Agent not found')
    }

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        content,
        role: 'user',
        conversationId
      }
    })

    // Get conversation history for context
    const previousMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20 // Last 20 messages for context
    })

    // Prepare messages for AI provider
    const messages = [
      {
        role: 'system',
        content: agent.personality
      },
      ...previousMessages.slice(0, -1).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content
      }
    ]

    // Call AI provider
    const response = await providerManager.createChatCompletion(
      agent.provider,
      {
        model: agent.model,
        messages,
        temperature: 0.7,
        maxTokens: 2000
      }
    )

    // Create assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        content: response.content,
        role: 'assistant',
        conversationId
      }
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    return {
      userMessage,
      assistantMessage,
      usage: response.usage
    }

  } catch (error) {
    console.error('Send message error:', error)
    
    // If AI provider fails, still save user message but return error
    throw new HttpError(500, `Failed to get AI response: ${error.message}`)
  }
}

export const createAgent = async ({ 
  name, 
  description, 
  personality, 
  personalityTraits,
  defaultProvider,
  defaultModel,
  memorySettings,
  toolAccess,
  tools 
}, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  return prisma.agent.create({
    data: {
      name,
      description,
      personality,
      personalityTraits: personalityTraits || [],
      defaultProvider: defaultProvider || 'openrouter',
      defaultModel: defaultModel || 'openai/gpt-4o',
      memorySettings: JSON.stringify(memorySettings || { shortTermLimit: 10, longTermLimit: 100, contextWindow: 8000 }),
      toolAccess: JSON.stringify(toolAccess || { webSearch: false, calculator: false, weather: false, imageGeneration: false, codeExecution: false, fileAccess: false }),
      tools: tools || [],
      isActive: true
    }
  })
}

// Helper function to store agent memory
export const storeAgentMemory = async (agentId, userId, input, output, memoryType = 'short_term', importance = 1, context = null) => {
  // Store in database
  const memory = await prisma.agentMemory.create({
    data: {
      agentId,
      userId,
      input,
      output,
      context: context ? JSON.stringify(context) : null,
      memoryType,
      importance
    }
  })

  // Also store in R2 for backup and analytics
  try {
    const memoryPath = r2.buildAgentPath(agentId.toString(), 'memories', `${memory.id}.json`)
    const memoryData = {
      id: memory.id,
      agentId,
      userId,
      input,
      output,
      context: context || null,
      memoryType,
      importance,
      timestamp: memory.createdAt.toISOString()
    }
    
    await r2.putJson(memoryPath, memoryData)
  } catch (r2Error) {
    console.error('Failed to store agent memory in R2:', r2Error)
    // Don't fail if R2 storage fails
  }

  return memory
}

// Helper function to get recent agent memories
export const getRecentMemories = async (agentId, userId, limit = 10) => {
  return prisma.agentMemory.findMany({
    where: {
      agentId,
      userId,
      memoryType: 'short_term'
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  })
}

// Helper function to clean up old memories based on agent settings
export const cleanupOldMemories = async (agentId, userId, memorySettings) => {
  const settings = typeof memorySettings === 'string' ? JSON.parse(memorySettings) : memorySettings
  
  // Clean up short-term memories beyond the limit
  const shortTermCount = await prisma.agentMemory.count({
    where: {
      agentId,
      userId,
      memoryType: 'short_term'
    }
  })

  if (shortTermCount > settings.shortTermLimit) {
    const memoriesToDelete = await prisma.agentMemory.findMany({
      where: {
        agentId,
        userId,
        memoryType: 'short_term'
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: shortTermCount - settings.shortTermLimit,
      select: { id: true }
    })

    await prisma.agentMemory.deleteMany({
      where: {
        id: {
          in: memoriesToDelete.map(m => m.id)
        }
      }
    })
  }

  // Clean up long-term memories beyond the limit (keep highest importance)
  const longTermCount = await prisma.agentMemory.count({
    where: {
      agentId,
      userId,
      memoryType: 'long_term'
    }
  })

  if (longTermCount > settings.longTermLimit) {
    const memoriesToDelete = await prisma.agentMemory.findMany({
      where: {
        agentId,
        userId,
        memoryType: 'long_term'
      },
      orderBy: [
        { importance: 'asc' },
        { createdAt: 'asc' }
      ],
      take: longTermCount - settings.longTermLimit,
      select: { id: true }
    })

    await prisma.agentMemory.deleteMany({
      where: {
        id: {
          in: memoriesToDelete.map(m => m.id)
        }
      }
    })
  }
}

// Main runAgent function - updated to use connection-aware orchestration
export const runAgent = async ({ agentName, input, userId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const targetUserId = userId || context.user.id

  try {
    // 1. Fetch agent config
    const agent = await prisma.agent.findUnique({
      where: { name: agentName }
    })

    if (!agent || !agent.isActive) {
      throw new HttpError(404, `Agent '${agentName}' not found or inactive`)
    }

    // 2. Check if agent has any connections - use connection-aware orchestration if so
    const agentConnections = await prisma.agentConnection.findMany({
      where: {
        agentId: agent.id,
        connection: {
          userId: targetUserId,
          status: 'active'
        }
      }
    })

    // If agent has connections, use connection-aware orchestration
    if (agentConnections.length > 0) {
      const { connectionAwareOrchestration } = await import('./server/connectionAwareOrchestration.js')
      
      const response = await connectionAwareOrchestration.executeAgentWithConnections(
        agent.id,
        input,
        targetUserId,
        {
          includeMemoryContext: true,
          temperature: 0.7,
          maxTokens: 2000
        }
      )
      
      // Store in traditional memory format for compatibility
      await storeAgentMemory(
        agent.id,
        targetUserId,
        input,
        response.text || JSON.stringify(response),
        'short_term',
        1,
        {
          executionId: response.executionId,
          connectionsUsed: response.connectionsUsed,
          provider: response.metadata?.provider
        }
      )
      
      return {
        agentName: agent.name,
        response: {
          text: response.text,
          images: response.images || [],
          metadata: {
            ...response.metadata,
            executionId: response.executionId,
            connectionsUsed: response.connectionsUsed,
            agentTraits: agent.personalityTraits,
            connectionAware: true
          }
        },
        success: true
      }
    }

    // Fallback to original implementation for agents without connections
    const memorySettings = JSON.parse(agent.memorySettings || '{}')
    const toolAccess = JSON.parse(agent.toolAccess || '{}')

    // Load recent interactions (memories)
    const recentMemories = await getRecentMemories(agent.id, targetUserId, memorySettings.shortTermLimit || 10)
    
    // Build combined prompt with context
    let conversationContext = ''
    if (recentMemories.length > 0) {
      conversationContext = '\n\nRecent conversation history:\n'
      recentMemories.reverse().forEach((memory, index) => {
        conversationContext += `\nUser: ${memory.input}\nAssistant: ${memory.output}`
      })
      conversationContext += '\n\nCurrent interaction:'
    }

    const fullPrompt = agent.personality + conversationContext + `\n\nUser: ${input}\nAssistant:`

    // Call the appropriate provider using legacy approach
    const { callMultiProviderAI } = await import('./orchestration/index.js')
    
    const response = await callMultiProviderAI(
      agent.defaultProvider,
      agent.defaultModel,
      input,
      {
        systemMessage: agent.personality + conversationContext,
        temperature: 0.7,
        maxTokens: Math.min(memorySettings.contextWindow || 8000, 2000)
      }
    )

    // Extract response text
    const responseText = response.text || (response.images && response.images.length > 0 ? `[Generated ${response.images.length} image(s)]` : 'No response generated')

    // 5. Store interaction in memory
    await storeAgentMemory(
      agent.id,
      targetUserId,
      input,
      responseText,
      'short_term',
      1, // Default importance
      {
        provider: response.metadata?.provider,
        model: response.metadata?.model,
        executionTime: response.metadata?.executionTime,
        usage: response.metadata?.usage
      }
    )

    // Clean up old memories
    await cleanupOldMemories(agent.id, targetUserId, memorySettings)

    // 6. Return normalized output
    return {
      agentName: agent.name,
      response: {
        text: response.text,
        images: response.images,
        metadata: {
          ...response.metadata,
          agentTraits: agent.personalityTraits,
          toolsUsed: [], // TODO: Implement tool usage tracking
          memoryContext: recentMemories.length
        }
      },
      success: true
    }

  } catch (error) {
    console.error('RunAgent error:', error)
    
    // Store error in memory for debugging
    if (error.statusCode !== 404) { // Don't store "agent not found" errors
      try {
        const agent = await prisma.agent.findUnique({
          where: { name: agentName }
        })
        
        if (agent) {
          await storeAgentMemory(
            agent.id,
            targetUserId,
            input,
            `[ERROR: ${error.message}]`,
            'short_term',
            0, // Low importance for errors
            { error: error.message, timestamp: new Date().toISOString() }
          )
        }
      } catch (memoryError) {
        console.error('Failed to store error in memory:', memoryError)
      }
    }
    
    throw new HttpError(500, `Failed to run agent: ${error.message}`)
  }
}

// Simple test action for the enhanced agent system
export const testAgentSystem = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    console.log('🚀 Testing Enhanced Agent System...')
    
    // Test basic interaction with Assistant
    const assistantResult = await runAgent({
      agentName: 'Assistant',
      input: 'Hello! Can you briefly explain what you can do?',
      userId: context.user.id
    }, context)

    // Test Creative Writer
    const creativeResult = await runAgent({
      agentName: 'Creative Writer', 
      input: 'Write a very short poem about artificial intelligence.',
      userId: context.user.id
    }, context)

    // Test memory by having a follow-up conversation
    const followUpResult = await runAgent({
      agentName: 'Assistant',
      input: 'What was the topic we just discussed?',
      userId: context.user.id
    }, context)

    return {
      message: 'Agent system test completed successfully!',
      results: {
        assistant: {
          response: assistantResult.response.text,
          provider: assistantResult.response.metadata.provider,
          traits: assistantResult.response.metadata.agentTraits
        },
        creative: {
          response: creativeResult.response.text,
          provider: creativeResult.response.metadata.provider,
          traits: creativeResult.response.metadata.agentTraits
        },
        memory: {
          response: followUpResult.response.text,
          memoryContext: followUpResult.response.metadata.memoryContext
        }
      },
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Agent system test failed:', error)
    throw new HttpError(500, `Test failed: ${error.message}`)
  }
}

// Chat session management
export const createChatSession = async ({ title }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  return prisma.chatSession.create({
    data: {
      title: title || 'New Chat',
      userId: context.user.id
    }
  })
}

// Send chat message and get agent response
export const sendChatMessage = async ({ sessionId, content, agentName }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Verify session ownership
    const session = await prisma.chatSession.findFirst({
      where: {
        id: sessionId,
        userId: context.user.id
      }
    })

    if (!session) {
      throw new HttpError(404, 'Chat session not found')
    }

    // Get the agent
    const agent = await prisma.agent.findUnique({
      where: { name: agentName }
    })

    if (!agent || !agent.isActive) {
      throw new HttpError(404, `Agent '${agentName}' not found or inactive`)
    }

    // Create user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'user',
        content,
        images: [],
        metadata: JSON.stringify({ timestamp: new Date().toISOString() })
      }
    })

    // Create initial agent message (for streaming)
    const agentMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        agentId: agent.id,
        role: 'agent',
        content: '',
        images: [],
        isStreaming: true,
        metadata: JSON.stringify({ 
          provider: agent.defaultProvider,
          model: agent.defaultModel,
          traits: agent.personalityTraits
        })
      }
    })

    // Use the enhanced runAgent function
    const agentResponse = await runAgent({
      agentName,
      input: content,
      userId: context.user.id
    }, context)

    // Update agent message with response
    const updatedAgentMessage = await prisma.chatMessage.update({
      where: { id: agentMessage.id },
      data: {
        content: agentResponse.response.text || '',
        images: agentResponse.response.images || [],
        isStreaming: false,
        metadata: JSON.stringify({
          ...agentResponse.response.metadata,
          timestamp: new Date().toISOString()
        })
      }
    })

    // Store chat session data in R2 for persistence and analysis
    const chatSessionPath = r2.buildUserSessionPath(context.user.id.toString(), sessionId.toString(), 'chat.json')
    const chatData = {
      sessionId,
      userId: context.user.id,
      agentName,
      messages: [
        {
          id: userMessage.id,
          role: 'user',
          content,
          timestamp: userMessage.createdAt.toISOString()
        },
        {
          id: updatedAgentMessage.id,
          role: 'agent',
          content: updatedAgentMessage.content,
          images: updatedAgentMessage.images,
          metadata: agentResponse.response.metadata,
          timestamp: updatedAgentMessage.createdAt.toISOString()
        }
      ],
      updatedAt: new Date().toISOString()
    }

    try {
      await r2.putJson(chatSessionPath, chatData)
      
      // Store any artifacts (images, files) generated by the agent
      if (agentResponse.response.images && agentResponse.response.images.length > 0) {
        for (let i = 0; i < agentResponse.response.images.length; i++) {
          const imageUrl = agentResponse.response.images[i]
          if (imageUrl && imageUrl.startsWith('http')) {
            // Download and store image in R2
            const artifactPath = r2.buildUserSessionPath(
              context.user.id.toString(),
              sessionId.toString(), 
              `artifact_${updatedAgentMessage.id}_${i}.jpg`
            )
            
            try {
              // Fetch image and store in R2
              const response = await fetch(imageUrl)
              if (response.ok) {
                const imageBuffer = await response.arrayBuffer()
                await r2.putObject(artifactPath, imageBuffer, {
                  contentType: 'image/jpeg',
                  metadata: {
                    'original-url': imageUrl,
                    'message-id': updatedAgentMessage.id.toString(),
                    'session-id': sessionId.toString(),
                    'user-id': context.user.id.toString(),
                    'agent-name': agentName
                  }
                })
              }
            } catch (artifactError) {
              console.error('Failed to store artifact in R2:', artifactError)
            }
          }
        }
      }
    } catch (r2Error) {
      console.error('Failed to store chat data in R2:', r2Error)
      // Don't fail the request if R2 storage fails
    }

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { 
        updatedAt: new Date(),
        title: session.title === 'New Chat' ? content.substring(0, 50) + (content.length > 50 ? '...' : '') : session.title
      }
    })

    return {
      userMessage,
      agentMessage: updatedAgentMessage,
      success: true
    }

  } catch (error) {
    console.error('SendChatMessage error:', error)
    throw new HttpError(500, `Failed to send message: ${error.message}`)
  }
}

// Update chat message (for streaming updates)
export const updateChatMessage = async ({ messageId, content, images, isStreaming }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Verify message ownership through session
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId
      },
      include: {
        session: true
      }
    })

    if (!message || message.session.userId !== context.user.id) {
      throw new HttpError(404, 'Message not found or access denied')
    }

    return prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: content || message.content,
        images: images || message.images,
        isStreaming: isStreaming !== undefined ? isStreaming : message.isStreaming
      }
    })

  } catch (error) {
    console.error('UpdateChatMessage error:', error)
    throw new HttpError(500, `Failed to update message: ${error.message}`)
  }
}

// Enhanced Agent System Actions

// Run enhanced agent with full capabilities
export const runEnhancedAgent = async ({ agentName, input, options = {} }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Special handling for Researcher agent
    if (agentName === 'Researcher') {
      const { ResearcherAgent } = await import('./agents/researcherAgent.js')
      const researcher = new ResearcherAgent(context.user.id)
      
      return await researcher.conductResearch(input, options)
    }
    
    // For other agents, use enhanced orchestration system
    const { AgentOrchestrator } = await import('./agents/orchestration.js')
    const { ProviderRouter } = await import('./agents/providerRouter.js')
    const { ToolExecutor } = await import('./agents/toolExecutor.js')
    
    const orchestrator = new AgentOrchestrator(context.user.id)
    const providerRouter = new ProviderRouter()
    const toolExecutor = new ToolExecutor(context.user.id)
    
    // Get agent configuration
    const agent = await prisma.agent.findUnique({
      where: { name: agentName }
    })
    
    if (!agent || !agent.isActive) {
      throw new HttpError(404, `Agent '${agentName}' not found or inactive`)
    }
    
    // Parse agent capabilities
    let capabilities = {}
    try {
      capabilities = JSON.parse(agent.capabilities || '{}')
    } catch (e) {
      console.warn('Failed to parse agent capabilities:', e)
    }
    
    // Determine task routing based on input and agent capabilities
    const taskType = determineTaskType(input, capabilities)
    
    // Route to appropriate provider
    const result = await providerRouter.routeTask(taskType, input, {
      agentId: agent.id,
      model: agent.defaultModel,
      ...options
    })
    
    // Store enhanced memory
    await orchestrator.storeMemory(agent.id, {
      type: 'enhanced_execution',
      input,
      output: result.primary?.result || result.result,
      taskType,
      provider: result.primary?.provider || result.provider
    }, {
      memoryType: 'task',
      importance: 5,
      tags: ['enhanced_agent', taskType, agentName.toLowerCase()]
    })
    
    return {
      success: true,
      agentName,
      result: result.primary?.result || result.result,
      metadata: {
        provider: result.primary?.provider || result.provider,
        taskType,
        executionTime: result.executionTime,
        capabilities: Object.keys(capabilities).filter(cap => capabilities[cap])
      }
    }
    
  } catch (error) {
    console.error('Enhanced agent execution failed:', error)
    throw new HttpError(500, `Enhanced agent execution failed: ${error.message}`)
  }
}

// Delegate task to another agent
export const delegateTask = async ({ delegatingAgent, targetAgent, taskDescription, input, options = {} }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    const { AgentOrchestrator } = await import('./agents/orchestration.js')
    const orchestrator = new AgentOrchestrator(context.user.id)
    
    const delegatingAgentData = await prisma.agent.findUnique({
      where: { name: delegatingAgent }
    })
    
    if (!delegatingAgentData || !delegatingAgentData.canDelegate) {
      throw new HttpError(403, `Agent '${delegatingAgent}' cannot delegate tasks`)
    }
    
    const task = await orchestrator.delegateTask(
      delegatingAgentData.id,
      targetAgent,
      taskDescription,
      input,
      options
    )
    
    return {
      success: true,
      taskId: task.id,
      delegatingAgent,
      targetAgent,
      status: task.status
    }
    
  } catch (error) {
    console.error('Task delegation failed:', error)
    throw new HttpError(500, `Task delegation failed: ${error.message}`)
  }
}

// Execute a tool
export const executeTool = async ({ toolName, input, agentContext = {} }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    const { ToolExecutor } = await import('./agents/toolExecutor.js')
    const toolExecutor = new ToolExecutor(context.user.id)
    
    const result = await toolExecutor.executeTool(toolName, input, {
      ...agentContext,
      userId: context.user.id
    })
    
    return {
      success: true,
      toolName,
      result: result.result,
      executionId: result.executionId,
      executionTime: result.executionTime
    }
    
  } catch (error) {
    console.error('Tool execution failed:', error)
    throw new HttpError(500, `Tool execution failed: ${error.message}`)
  }
}

// Complete a task
export const completeTask = async ({ taskId, output, metadata = {} }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
      include: { user: true }
    })
    
    if (!task || task.user.id !== context.user.id) {
      throw new HttpError(404, 'Task not found or access denied')
    }
    
    const updatedTask = await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        output: JSON.stringify(output),
        metadata: JSON.stringify(metadata),
        completedAt: new Date()
      }
    })
    
    // Store task completion data in R2 for audit and analysis
    try {
      const taskCompletionPath = r2.buildAgentPath(task.agentId?.toString() || 'system', 'task-completions', `${taskId}.json`)
      const taskCompletionData = {
        taskId,
        agentId: task.agentId,
        userId: task.user.id,
        status: 'completed',
        input: task.input ? JSON.parse(task.input) : null,
        output,
        metadata,
        startTime: task.createdAt?.toISOString(),
        completedAt: updatedTask.completedAt.toISOString(),
        executionTime: updatedTask.completedAt - task.createdAt
      }
      
      await r2.putJson(taskCompletionPath, taskCompletionData)
    } catch (r2Error) {
      console.error('Failed to store task completion in R2:', r2Error)
      // Don't fail if R2 storage fails
    }
    
    return {
      success: true,
      taskId,
      status: updatedTask.status,
      completedAt: updatedTask.completedAt
    }
    
  } catch (error) {
    console.error('Task completion failed:', error)
    throw new HttpError(500, `Task completion failed: ${error.message}`)
  }
}

// Store structured memory
export const storeStructuredMemory = async ({ agentId, data, options = {} }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    const memory = await prisma.agentMemory.create({
      data: {
        agentId,
        userId: context.user.id,
        input: data.input || data.description || '',
        output: data.output || '',
        structuredData: JSON.stringify(data),
        context: JSON.stringify(options.context || {}),
        memoryType: options.memoryType || 'structured',
        importance: options.importance || 5,
        tags: options.tags || [],
        relatedTaskId: options.taskId || null
      }
    })
    
    // Store structured memory in R2 with enhanced metadata
    try {
      const structuredMemoryPath = r2.buildAgentPath(agentId.toString(), 'structured-memories', `${memory.id}.json`)
      const structuredMemoryData = {
        id: memory.id,
        agentId,
        userId: context.user.id,
        input: data.input || data.description || '',
        output: data.output || '',
        structuredData: data,
        context: options.context || {},
        memoryType: options.memoryType || 'structured',
        importance: options.importance || 5,
        tags: options.tags || [],
        relatedTaskId: options.taskId || null,
        timestamp: memory.createdAt.toISOString()
      }
      
      await r2.putJson(structuredMemoryPath, structuredMemoryData)
    } catch (r2Error) {
      console.error('Failed to store structured memory in R2:', r2Error)
      // Don't fail if R2 storage fails
    }
    
    return {
      success: true,
      memoryId: memory.id,
      type: memory.memoryType,
      importance: memory.importance
    }
    
  } catch (error) {
    console.error('Structured memory storage failed:', error)
    throw new HttpError(500, `Structured memory storage failed: ${error.message}`)
  }
}

// Helper function to determine task type from input
function determineTaskType(input, capabilities) {
  const inputStr = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase()
  
  // Check for image generation keywords
  if (inputStr.includes('image') || inputStr.includes('picture') || inputStr.includes('diagram') || inputStr.includes('visual')) {
    return 'image_generation'
  }
  
  // Check for analysis keywords
  if (inputStr.includes('analyze') || inputStr.includes('research') || inputStr.includes('investigate')) {
    return 'text_analysis'
  }
  
  // Check for code keywords
  if (inputStr.includes('code') || inputStr.includes('function') || inputStr.includes('program')) {
    return 'code_generation'
  }
  
  // Default to text generation
  return 'text_generation'
}

// User profile management
export const updateUserProfile = async ({ name, avatar }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    return prisma.user.update({
      where: {
        id: context.user.id
      },
      data: {
        name: name || context.user.name,
        avatar: avatar || context.user.avatar,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        preferences: true,
        isEmailVerified: true,
        updatedAt: true
      }
    })
  } catch (error) {
    console.error('UpdateUserProfile error:', error)
    throw new HttpError(500, `Failed to update profile: ${error.message}`)
  }
}

export const updateUserPreferences = async ({ preferences }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Validate preferences object
    const validPreferences = {
      defaultAgent: preferences.defaultAgent || 'Assistant',
      defaultProvider: preferences.defaultProvider || 'openrouter',
      theme: preferences.theme || 'light',
      language: preferences.language || 'en',
      ...preferences // Allow additional custom preferences
    }

    return prisma.user.update({
      where: {
        id: context.user.id
      },
      data: {
        preferences: JSON.stringify(validPreferences),
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        preferences: true,
        updatedAt: true
      }
    })
  } catch (error) {
    console.error('UpdateUserPreferences error:', error)
    throw new HttpError(500, `Failed to update preferences: ${error.message}`)
  }
}

// ============================================================================
// MEGA AI ORCHESTRATION ACTIONS - CrapGPT Integration Layer
// ============================================================================

// Enhanced runAgent with orchestration capabilities
export const runMegaAgent = async ({ agentName, input, orchestrationMode = false }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Fetch agent config
    const agent = await prisma.agent.findUnique({
      where: { name: agentName }
    })

    if (!agent || !agent.isActive) {
      throw new HttpError(404, `Agent '${agentName}' not found or inactive`)
    }

    const memorySettings = JSON.parse(agent.memorySettings || '{}')
    const capabilities = JSON.parse(agent.capabilities || '{}')
    
    // Build context from recent memories
    const recentMemories = await getRecentMemories(agent.id, context.user.id, memorySettings.shortTermLimit || 10)
    let conversationContext = ''
    if (recentMemories.length > 0) {
      conversationContext = '\n\nRecent conversation history:\n'
      recentMemories.reverse().forEach((memory) => {
        conversationContext += `\nUser: ${memory.input}\nAssistant: ${memory.output}`
      })
      conversationContext += '\n\nCurrent interaction:'
    }

    const fullSystemPrompt = agent.personality + conversationContext
    
    let response
    
    // Route to appropriate orchestration system based on agent capabilities
    if (orchestrationMode && capabilities.delegation) {
      // OrchestratorPrime - Use MCPJungle for task delegation
      response = await handleOrchestratorPrime(agent, input, fullSystemPrompt, context)
    } else if (orchestrationMode && capabilities.includes && capabilities.includes('infrastructure-automation')) {
      // CodeCrusher/OpsOverlord - Use OpenOps + Arcade
      response = await handleInfrastructureAgent(agent, input, fullSystemPrompt, context)
    } else if (orchestrationMode && capabilities.includes && capabilities.includes('image-generation')) {
      // MediaMaestro - Use FAL + ModelsLab
      response = await handleMediaAgent(agent, input, fullSystemPrompt, context)
    } else {
      // Standard AI provider call with multi-provider fallback
      response = await callMultiProviderAI(
        agent.defaultProvider,
        agent.defaultModel,
        input,
        {
          systemMessage: fullSystemPrompt,
          temperature: 0.7,
          maxTokens: memorySettings.contextWindow || 2000
        }
      )
    }

    // Store interaction in memory
    await storeAgentMemory(
      agent.id,
      context.user.id,
      input,
      response.text || JSON.stringify(response),
      'short_term',
      1,
      {
        orchestrationMode,
        provider: response.metadata?.provider,
        capabilities: capabilities
      }
    )

    return {
      agentName: agent.name,
      response,
      orchestrationMode,
      success: true,
      metadata: {
        capabilities,
        provider: response.metadata?.provider
      }
    }

  } catch (error) {
    console.error('RunMegaAgent error:', error)
    throw new HttpError(500, `Failed to run mega agent: ${error.message}`)
  }
}

// Remote-first orchestration handlers with proper VPS/worker separation
async function handleOrchestratorPrime(agent, input, systemPrompt, context) {
  // Import worker queue for remote processing
  const { enqueueHeavyTask, orchestrationManager } = await import('./orchestration/index.js')
  
  // Light tasks: routing, session management, quick decisions (run local)
  if (orchestrationManager.shouldRunLocal('routing', input, { realTime: true })) {
    // Only lightweight coordination tasks run locally
    return {
      text: `Task analyzed. Routing to appropriate agent for execution.`,
      metadata: {
        provider: 'local',
        type: 'coordination',
        executionLocation: 'control-plane'
      }
    }
  }
  
  // Heavy tasks: LLM inference, complex reasoning (queue for remote)
  const job = await enqueueHeavyTask('llm-inference', input, {
    provider: 'hexstrike',
    model: 'fast',
    systemMessage: systemPrompt,
    priority: 'high',
    realTime: true
  })
  
  return {
    text: `Complex orchestration task queued for processing. Job ID: ${job.jobId}`,
    jobId: job.jobId,
    metadata: {
      provider: 'hexstrike-remote',
      type: 'llm-inference',
      executionLocation: 'worker',
      estimatedWaitTime: job.estimatedWaitTime
    }
  }
}

async function handleInfrastructureAgent(agent, input, systemPrompt, context) {
  // Import worker queue and orchestration manager
  const { enqueueRiskyTask, orchestrationManager } = await import('./orchestration/index.js')
  
  // Check if this is a risky operation (code execution, system commands)
  const analysis = orchestrationManager.analyzeTask('infrastructure-automation', input, {})
  
  if (analysis.hasRiskySyscalls || analysis.hasUntrustedInput) {
    // All risky operations MUST run in isolated workers via Arcade
    const job = await enqueueRiskyTask('infrastructure-deployment', input, {
      isolated: true,
      sandbox: 'strict',
      template: 'secure-code-executor',
      timeout: 300000, // 5 minutes max
      priority: 'high'
    })
    
    return {
      text: `Infrastructure operation queued for secure execution. Job ID: ${job.jobId}`,
      jobId: job.jobId,
      metadata: {
        provider: 'arcade-isolated',
        type: 'infrastructure-deployment',
        executionLocation: 'secure-worker',
        securityLevel: 'high'
      }
    }
  }
  
  // Light infrastructure queries can use OpenOps workflows
  const { runOpenOpsWorkflow } = await import('./orchestration/index.js')
  
  try {
    const workflow = await runOpenOpsWorkflow('infrastructure-query', {
      query: input,
      systemPrompt,
      maxExecutionTime: 60000 // 1 minute
    })
    
    return {
      text: `Infrastructure query executed via OpenOps`,
      result: workflow.result,
      metadata: {
        provider: 'openops',
        type: 'workflow-execution',
        executionLocation: 'remote-workflow',
        executionId: workflow.executionId
      }
    }
  } catch (error) {
    // Fallback to queued LLM processing (never run locally)
    const job = await enqueueHeavyTask('llm-inference', input, {
      provider: 'openrouter',
      model: 'gpt-4o',
      systemMessage: systemPrompt,
      priority: 'normal'
    })
    
    return {
      text: `Infrastructure task queued for AI processing. Job ID: ${job.jobId}`,
      jobId: job.jobId,
      metadata: {
        provider: 'openrouter-remote',
        type: 'llm-inference',
        executionLocation: 'worker'
      }
    }
  }
}

async function handleMediaAgent(agent, input, systemPrompt, context) {
  // All media generation is GPU-intensive - ALWAYS remote
  const { enqueueMediaGeneration } = await import('./orchestration/workerQueue.js')
  
  // Determine media type from input
  const mediaType = determineMediaType(input)
  
  const job = await enqueueMediaGeneration(mediaType, input, {
    provider: mediaType === 'video' ? 'modelslab' : 'fal',
    model: mediaType === 'video' ? 'ml-video' : 'flux-dev',
    quality: 'high',
    priority: 'normal',
    timeout: 180000 // 3 minutes for media generation
  })
  
  return {
    text: `${mediaType} generation queued for processing. Job ID: ${job.jobId}`,
    jobId: job.jobId,
    mediaType,
    metadata: {
      provider: `${mediaType === 'video' ? 'modelslab' : 'fal'}-remote`,
      type: `${mediaType}-generation`,
      executionLocation: 'gpu-worker',
      estimatedWaitTime: job.estimatedWaitTime
    }
  }
}

// Helper function to determine media type
function determineMediaType(input) {
  const inputLower = input.toLowerCase()
  if (/\b(video|movie|animation|clip)\b/.test(inputLower)) return 'video'
  if (/\b(audio|sound|music|voice|speech)\b/.test(inputLower)) return 'audio'
  return 'image' // Default to image
}

// Health check for orchestration system
export const checkOrchestrationHealth = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    const healthStatus = await orchestrationManager.healthCheck()
    return {
      success: true,
      ...healthStatus
    }
  } catch (error) {
    console.error('Health check error:', error)
    throw new HttpError(500, `Health check failed: ${error.message}`)
  }
}

// ============================================================================
// CONNECTION MANAGEMENT SYSTEM
// ============================================================================

// Create a new connection using the Connection Registry
export const createConnection = async ({ type, name, description, config, scopes }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Get provider from registry
    const provider = connectionRegistry.getProvider(type)
    if (!provider) {
      throw new HttpError(400, `Unsupported connection type: ${type}`)
    }

    // Validate connection configuration
    const configValidation = provider.validateConfig(config)
    if (!configValidation.isValid) {
      throw new HttpError(400, `Invalid configuration: ${configValidation.errors.join(', ')}`)
    }

    // Validate scopes
    const requestedScopes = scopes || Object.keys(provider.scopes)
    const scopeValidation = provider.validateScopes(requestedScopes)
    if (!scopeValidation.isValid) {
      throw new HttpError(400, `Invalid scopes: ${scopeValidation.errors.join(', ')}`)
    }

    // Test connection credentials with security monitoring
    const testResult = await provider.testConnection(config, {
      userId: context.user.id,
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers?.['user-agent']
    })
    
    if (!testResult.success) {
      // Log failed test for security monitoring
      await connectionSecurityMonitor.logSecurityEvent(
        context.user.id,
        null,
        'connection_test_failed',
        { type, error: testResult.error, ipAddress: context.request?.ip, userAgent: context.request?.headers?.['user-agent'] }
      )
      throw new HttpError(400, `Connection test failed: ${testResult.error}`)
    }

    // Encrypt sensitive configuration using connection service
    const encryptedConfig = connectionService.encryptConfig(config)

    // Create connection in database
    const connection = await prisma.connection.create({
      data: {
        userId: context.user.id,
        type,
        name,
        description: description || `${provider.metadata.name} connection`,
        config: encryptedConfig,
        scopes: requestedScopes,
        status: 'active',
        isActive: true,
        isDeleted: false,
        metadata: JSON.stringify({
          testResult,
          createdBy: context.user.email,
          userAgent: context.request?.headers?.['user-agent'] || 'unknown',
          providerVersion: provider.version
        })
      }
    })

    // Log connection creation
    await prisma.connectionLog.create({
      data: {
        connectionId: connection.id,
        userId: context.user.id,
        action: 'created',
        context: JSON.stringify({ name, type, scopes: requestedScopes }),
        ipAddress: context.request?.ip,
        userAgent: context.request?.headers?.['user-agent'],
        success: true
      }
    })

    // Store in R2 for audit and security monitoring
    await connectionService.logConnectionActivity(connection.id, 'created', {
      userId: context.user.id,
      type,
      name,
      scopes: requestedScopes,
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers?.['user-agent']
    })
    
    // Log creation event for security monitoring
    await connectionSecurityMonitor.logSecurityEvent(
      context.user.id,
      connection.id,
      'connection_created',
      { type, name, ipAddress: context.request?.ip, userAgent: context.request?.headers?.['user-agent'] }
    )

    // Return sanitized connection (without sensitive config)
    return {
      id: connection.id,
      type: connection.type,
      name: connection.name,
      description: connection.description,
      scopes: connection.scopes,
      status: connection.status,
      isActive: connection.isActive,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      provider: provider.metadata
    }

  } catch (error) {
    console.error('Create connection error:', error)
    
    // Log failed attempt
    try {
      await prisma.connectionLog.create({
        data: {
          connectionId: 'failed',
          userId: context.user.id,
          action: 'create_failed',
          context: JSON.stringify({ name, type, error: error.message }),
          ipAddress: context.request?.ip,
          userAgent: context.request?.headers?.['user-agent'],
          success: false,
          error: error.message
        }
      })
    } catch (logError) {
      console.error('Failed to log connection creation error:', logError)
    }
    
    throw error instanceof HttpError ? error : new HttpError(500, `Failed to create connection: ${error.message}`)
  }
}

// Update an existing connection
export const updateConnection = async ({ connectionId, name, description, config, scopes }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Find existing connection
    const existingConnection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: context.user.id
      }
    })

    if (!existingConnection) {
      throw new HttpError(404, 'Connection not found')
    }

    if (existingConnection.status === 'revoked') {
      throw new HttpError(400, 'Cannot update revoked connection')
    }

    const updateData = {
      updatedAt: new Date()
    }

    // Update name if provided
    if (name !== undefined) {
      updateData.name = name
    }

    // Update description if provided
    if (description !== undefined) {
      updateData.description = description
    }

    // Update config if provided
    if (config) {
      // Validate new configuration
      const configValidation = connectionService.validateConnectionConfig(existingConnection.type, config)
      if (!configValidation.isValid) {
        throw new HttpError(400, `Invalid configuration: ${configValidation.errors.join(', ')}`)
      }

    // Test new credentials with security monitoring
      const testResult = await connectionService.testConnectionCredentials(existingConnection.type, config, context.user.id, connectionId)
      if (!testResult.success) {
        await connectionSecurityMonitor.logSecurityEvent(
          context.user.id,
          connectionId,
          'connection_test_failed',
          { type: existingConnection.type, error: testResult.error, ipAddress: context.request?.ip, userAgent: context.request?.headers?.['user-agent'] }
        )
        throw new HttpError(400, `Connection test failed: ${testResult.error}`)
      }

      // Encrypt new config
      updateData.config = connectionService.encryptConfig(config)
      updateData.metadata = JSON.stringify({
        ...JSON.parse(existingConnection.metadata || '{}'),
        lastTestResult: testResult,
        updatedBy: context.user.email,
        updatedAt: new Date().toISOString()
      })
    }

    // Update scopes if provided
    if (scopes) {
      const scopeValidation = connectionService.validateConnectionScopes(existingConnection.type, scopes)
      if (!scopeValidation.isValid) {
        throw new HttpError(400, `Invalid scopes: ${scopeValidation.invalidScopes.join(', ')}`)
      }
      updateData.scopes = scopes
    }

    // Update connection in database
    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: updateData
    })

    // Log connection update
    await prisma.connectionLog.create({
      data: {
        connectionId,
        userId: context.user.id,
        action: 'updated',
        context: JSON.stringify({ updates: Object.keys(updateData) }),
        ipAddress: context.request?.ip,
        userAgent: context.request?.headers?.['user-agent'],
        success: true
      }
    })

    // Store in R2 for audit
    await connectionService.logConnectionActivity(connectionId, 'updated', {
      userId: context.user.id,
      updates: Object.keys(updateData)
    })

    // Return sanitized connection
    return connectionService.sanitizeConnectionForDisplay(updatedConnection, config)

  } catch (error) {
    console.error('Update connection error:', error)
    throw error instanceof HttpError ? error : new HttpError(500, `Failed to update connection: ${error.message}`)
  }
}

// Delete a connection
export const deleteConnection = async ({ connectionId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Find existing connection
    const existingConnection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: context.user.id
      },
      include: {
        agentConnections: true
      }
    })

    if (!existingConnection) {
      throw new HttpError(404, 'Connection not found')
    }

    // Check if connection is used by any agents
    if (existingConnection.agentConnections.length > 0) {
      const requiredConnections = existingConnection.agentConnections.filter(ac => ac.isRequired)
      if (requiredConnections.length > 0) {
        throw new HttpError(400, 'Cannot delete connection that is required by active agents. Please unlink from agents first.')
      }
    }

    // Delete all agent connections first
    await prisma.agentConnection.deleteMany({
      where: { connectionId }
    })

    // Delete the connection
    await prisma.connection.delete({
      where: { id: connectionId }
    })

    // Log connection deletion
    await prisma.connectionLog.create({
      data: {
        connectionId,
        userId: context.user.id,
        action: 'deleted',
        context: JSON.stringify({ name: existingConnection.name, type: existingConnection.type }),
        ipAddress: context.request?.ip,
        userAgent: context.request?.headers?.['user-agent'],
        success: true
      }
    })

    // Store in R2 for audit
    await connectionService.logConnectionActivity(connectionId, 'deleted', {
      userId: context.user.id,
      name: existingConnection.name,
      type: existingConnection.type
    })

    return {
      success: true,
      message: `Connection '${existingConnection.name}' deleted successfully`
    }

  } catch (error) {
    console.error('Delete connection error:', error)
    throw error instanceof HttpError ? error : new HttpError(500, `Failed to delete connection: ${error.message}`)
  }
}

// Test connection credentials (overloaded for both existing connections and new configs)
export const testConnection = async ({ connectionId, type, config }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    let connectionType, connectionConfig, existingConnection

    if (connectionId) {
      // Testing existing connection
      existingConnection = await prisma.connection.findFirst({
        where: {
          id: connectionId,
          userId: context.user.id
        }
      })

      if (!existingConnection) {
        throw new HttpError(404, 'Connection not found')
      }

      if (existingConnection.status === 'revoked') {
        throw new HttpError(400, 'Cannot test revoked connection')
      }

      connectionType = existingConnection.type
      connectionConfig = connectionService.decryptConfig(existingConnection.config)
    } else if (type && config) {
      // Testing new connection configuration
      connectionType = type
      connectionConfig = config
    } else {
      throw new HttpError(400, 'Must provide either connectionId or type+config')
    }

    // Get provider from registry
    const provider = connectionRegistry.getProvider(connectionType)
    if (!provider) {
      throw new HttpError(400, `Unsupported connection type: ${connectionType}`)
    }

    // Test connection using provider
    const testResult = await provider.testConnection(connectionConfig, {
      userId: context.user.id,
      ipAddress: context.request?.ip,
      userAgent: context.request?.headers?.['user-agent'],
      connectionId: connectionId || 'test'
    })

    // Update last used timestamp for existing connections
    if (existingConnection) {
      await prisma.connection.update({
        where: { id: connectionId },
        data: { 
          lastUsed: new Date(),
          status: testResult.success ? 'active' : 'failed'
        }
      })
    }
    
    // Log test result for security monitoring
    if (!testResult.success) {
      await connectionSecurityMonitor.logSecurityEvent(
        context.user.id,
        connectionId || null,
        'connection_test_failed',
        { type: connectionType, error: testResult.error, ipAddress: context.request?.ip, userAgent: context.request?.headers?.['user-agent'] }
      )
    }

    // Log connection test for existing connections
    if (connectionId) {
      await prisma.connectionLog.create({
        data: {
          connectionId,
          userId: context.user.id,
          action: 'tested',
          context: JSON.stringify({ result: testResult }),
          ipAddress: context.request?.ip,
          userAgent: context.request?.headers?.['user-agent'],
          success: testResult.success
        }
      })
    }

    return testResult

  } catch (error) {
    console.error('Test connection error:', error)
    throw error instanceof HttpError ? error : new HttpError(500, `Failed to test connection: ${error.message}`)
  }
}

// Revoke a connection
export const revokeConnection = async ({ connectionId, reason }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Find connection
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: context.user.id
      }
    })

    if (!connection) {
      throw new HttpError(404, 'Connection not found')
    }

    if (connection.status === 'revoked') {
      throw new HttpError(400, 'Connection is already revoked')
    }

    // Update connection status
    const updatedConnection = await prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: 'revoked',
        metadata: JSON.stringify({
          ...JSON.parse(connection.metadata || '{}'),
          revokedAt: new Date().toISOString(),
          revokedBy: context.user.email,
          revokedReason: reason || 'Manual revocation'
        })
      }
    })

    // Log connection revocation
    await prisma.connectionLog.create({
      data: {
        connectionId,
        userId: context.user.id,
        action: 'revoked',
        context: JSON.stringify({ reason: reason || 'Manual revocation' }),
        ipAddress: context.request?.ip,
        userAgent: context.request?.headers?.['user-agent'],
        success: true
      }
    })

    // Store in R2 for audit
    await connectionService.logConnectionActivity(connectionId, 'revoked', {
      userId: context.user.id,
      reason: reason || 'Manual revocation'
    })

    return connectionService.sanitizeConnectionForDisplay(updatedConnection)

  } catch (error) {
    console.error('Revoke connection error:', error)
    throw error instanceof HttpError ? error : new HttpError(500, `Failed to revoke connection: ${error.message}`)
  }
}

// Link agent to connection
export const linkAgentConnection = async ({ agentId, connectionId, permissions, isRequired }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Verify agent exists and belongs to user or is public
    const agent = await prisma.agent.findFirst({
      where: { id: agentId }
    })

    if (!agent) {
      throw new HttpError(404, 'Agent not found')
    }

    // Verify connection exists and belongs to user
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: context.user.id
      }
    })

    if (!connection) {
      throw new HttpError(404, 'Connection not found')
    }

    if (connection.status !== 'active') {
      throw new HttpError(400, 'Cannot link to inactive connection')
    }

    // Validate permissions
    if (permissions) {
      const scopeValidation = connectionService.validateConnectionScopes(connection.type, permissions)
      if (!scopeValidation.isValid) {
        throw new HttpError(400, `Invalid permissions: ${scopeValidation.invalidScopes.join(', ')}`)
      }

      // Check if requested permissions are available in connection scopes
      const unavailablePermissions = permissions.filter(p => !connection.scopes.includes(p))
      if (unavailablePermissions.length > 0) {
        throw new HttpError(400, `Permissions not available in connection: ${unavailablePermissions.join(', ')}`)
      }
    }

    // Create or update agent connection
    const agentConnection = await prisma.agentConnection.upsert({
      where: {
        agentId_connectionId: {
          agentId,
          connectionId
        }
      },
      update: {
        permissions: permissions || connection.scopes,
        isRequired: isRequired !== undefined ? isRequired : false,
        updatedAt: new Date()
      },
      create: {
        agentId,
        connectionId,
        permissions: permissions || connection.scopes,
        isRequired: isRequired !== undefined ? isRequired : false
      }
    })

    return {
      success: true,
      agentConnection,
      message: `Agent '${agent.name}' linked to connection '${connection.name}'`
    }

  } catch (error) {
    console.error('Link agent connection error:', error)
    throw error instanceof HttpError ? error : new HttpError(500, `Failed to link agent connection: ${error.message}`)
  }
}

// Unlink agent from connection
export const unlinkAgentConnection = async ({ agentId, connectionId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Find the agent connection
    const agentConnection = await prisma.agentConnection.findFirst({
      where: {
        agentId,
        connectionId
      },
      include: {
        agent: true,
        connection: true
      }
    })

    if (!agentConnection) {
      throw new HttpError(404, 'Agent connection not found')
    }

    // Verify user owns the connection
    if (agentConnection.connection.userId !== context.user.id) {
      throw new HttpError(403, 'Access denied')
    }

    // Delete the agent connection
    await prisma.agentConnection.delete({
      where: {
        agentId_connectionId: {
          agentId,
          connectionId
        }
      }
    })

    return {
      success: true,
      message: `Agent '${agentConnection.agent.name}' unlinked from connection '${agentConnection.connection.name}'`
    }

  } catch (error) {
    console.error('Unlink agent connection error:', error)
    throw error instanceof HttpError ? error : new HttpError(500, `Failed to unlink agent connection: ${error.message}`)
  }
}

// ============================================================================
// NEW CONNECTION-AWARE AGENT SYSTEM (SUPABASE)
// ============================================================================

// Run agent with new connection system - for smoke testing
export const runAgentWithConnection = async ({ agentName, input, connectionId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  try {
    // Use the new connection-aware agent runner
    const result = await runAgentWithConnections({
      userId: context.user.id.toString(),
      agent: agentName.toLowerCase(),
      input,
      connectionId
    })

    // Store result in R2 for audit
    try {
      const executionPath = r2.buildUserPath(context.user.id.toString(), 'agent-executions', `${Date.now()}.json`)
      await r2.putJson(executionPath, {
        agentName,
        input,
        connectionId,
        result,
        timestamp: new Date().toISOString(),
        userId: context.user.id
      })
    } catch (r2Error) {
      console.error('Failed to store execution in R2:', r2Error)
      // Don't fail the request if R2 storage fails
    }

    return {
      success: true,
      agentName,
      result: result.data,
      connectionUsed: result.connectionUsed,
      source: result.source,
      metadata: {
        executionTime: result.executionTime || 'unknown',
        connectionAware: true,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('Connection-aware agent error:', error)
    throw new HttpError(500, `Failed to run connection-aware agent: ${error.message}`)
  }
}

// OpenOps agent action for smoke testing connection system
export async function runOpenOpsAgent(args, context) {
  if (!context.user) throw new HttpError(401, 'Not signed in')

  const { flowId, params, connectionId } = args

  // Import Supabase client
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  try {
    // fetch connection for this user
    const { data: conn, error } = await sb
      .from('crapgpt_connections')
      .select('id, config, type, active')
      .eq('id', connectionId)
      .eq('user_id', context.user.id)
      .single()

    if (error || !conn) throw new HttpError(404, 'Connection not found')
    if (conn.type !== 'openops') throw new HttpError(400, 'Connection must be type openops')
    if (!conn.active) throw new HttpError(400, 'Connection is inactive')

    const { apiUrl, apiKey } = conn.config

    const res = await fetch(`${apiUrl}/flows/${flowId}/run`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(params || {})
    })

    if (!res.ok) throw new HttpError(500, `OpenOps run failed: ${res.status}`)

    const json = await res.json()
    
    // Store execution result in R2 for audit
    try {
      const executionPath = r2.buildUserPath(
        context.user.id.toString(), 
        'openops-executions', 
        `${json.id || Date.now()}.json`
      )
      await r2.putJson(executionPath, {
        flowId,
        params,
        connectionId,
        result: json,
        timestamp: new Date().toISOString(),
        userId: context.user.id
      })
    } catch (r2Error) {
      console.error('Failed to store OpenOps execution in R2:', r2Error)
      // Don't fail the request if R2 storage fails
    }
    
    return { 
      ok: true, 
      runId: json.id, 
      data: json,
      connectionUsed: connectionId,
      executedAt: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('OpenOps agent error:', error)
    throw error instanceof HttpError ? error : new HttpError(500, `OpenOps execution failed: ${error.message}`)
  }
}
