import { prisma } from '@wasp-lang/auth/server'

export const getConversations = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  return prisma.conversation.findMany({
    where: {
      userId: context.user.id
    },
    orderBy: {
      updatedAt: 'desc'
    },
    include: {
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })
}

export const getMessages = async ({ conversationId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

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

  return prisma.message.findMany({
    where: {
      conversationId: conversationId
    },
    orderBy: {
      createdAt: 'asc'
    }
  })
}

export const getAgents = async (args, context) => {
  return prisma.agent.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  })
}