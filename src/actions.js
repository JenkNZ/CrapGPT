import { prisma } from '@wasp-lang/auth/server'
import { providerManager } from './providers/index.js'

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
  tools, 
  model, 
  provider 
}, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  return prisma.agent.create({
    data: {
      name,
      description,
      personality,
      tools,
      model,
      provider,
      isActive: true
    }
  })
}