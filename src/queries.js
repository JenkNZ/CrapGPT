import { prisma } from '@wasp-lang/auth/server'
import { HttpError } from '@wasp-lang/core/HttpError'
import { connectionService } from './server/connectionService.js'
import { connectionRegistry } from './server/connectionRegistry.js'

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

export const getAgentByName = async ({ name }, context) => {
  return prisma.agent.findUnique({
    where: {
      name: name
    }
  })
}

export const getAgentMemories = async ({ agentId, userId, memoryType, limit }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const whereClause = {
    agentId: agentId,
    userId: userId || context.user.id
  }

  if (memoryType) {
    whereClause.memoryType = memoryType
  }

  return prisma.agentMemory.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc'
    },
    take: limit || 10
  })
}

export const getChatSessions = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  return prisma.chatSession.findMany({
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

export const getChatMessages = async ({ sessionId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  // Verify user owns the chat session
  const session = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      userId: context.user.id
    }
  })

  if (!session) {
    throw new HttpError(404, 'Chat session not found')
  }

  return prisma.chatMessage.findMany({
    where: {
      sessionId: sessionId
    },
    orderBy: {
      createdAt: 'asc'
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          personalityTraits: true
        }
      }
    }
  })
}

export const getUserProfile = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  return prisma.user.findUnique({
    where: {
      id: context.user.id
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      preferences: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true
    }
  })
}

// Enhanced Agent System Queries

// Get agent tasks for a user
export const getAgentTasks = async ({ agentId, status, limit = 50 }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const where = {
    userId: context.user.id
  }

  if (agentId) {
    where.OR = [
      { delegatingAgentId: agentId },
      { executingAgentId: agentId }
    ]
  }

  if (status) {
    where.status = status
  }

  return prisma.agentTask.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    include: {
      delegatingAgent: {
        select: {
          name: true,
          description: true
        }
      },
      executingAgent: {
        select: {
          name: true,
          description: true
        }
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          status: true
        }
      },
      toolExecutions: {
        select: {
          id: true,
          toolName: true,
          status: true
        }
      }
    }
  })
}

// Get tool executions for a user
export const getToolExecutions = async ({ agentId, toolName, status, limit = 100 }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const where = {
    userId: context.user.id
  }

  if (agentId) {
    where.agentId = agentId
  }

  if (toolName) {
    where.toolName = toolName
  }

  if (status) {
    where.status = status
  }

  return prisma.toolExecution.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    include: {
      agent: {
        select: {
          name: true
        }
      },
      task: {
        select: {
          id: true,
          title: true
        }
      }
    }
  })
}

// Get structured memories
export const getStructuredMemories = async ({ agentId, memoryType, tags, limit = 50 }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const where = {
    userId: context.user.id,
    structuredData: {
      not: null
    }
  }

  if (agentId) {
    where.agentId = agentId
  }

  if (memoryType) {
    where.memoryType = memoryType
  }

  if (tags && tags.length > 0) {
    where.tags = {
      hasSome: tags
    }
  }

  const memories = await prisma.agentMemory.findMany({
    where,
    orderBy: [
      { importance: 'desc' },
      { createdAt: 'desc' }
    ],
    take: limit,
    include: {
      agent: {
        select: {
          name: true
        }
      }
    }
  })

  // Parse structured data
  return memories.map(memory => ({
    ...memory,
    structuredData: memory.structuredData ? JSON.parse(memory.structuredData) : null,
    context: memory.context ? JSON.parse(memory.context) : null
  }))
}

// Get task hierarchy (parent and child tasks)
export const getTaskHierarchy = async ({ taskId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const task = await prisma.agentTask.findUnique({
    where: {
      id: taskId
    },
    include: {
      user: true,
      delegatingAgent: {
        select: {
          name: true,
          description: true
        }
      },
      executingAgent: {
        select: {
          name: true,
          description: true
        }
      },
      parentTask: {
        include: {
          delegatingAgent: {
            select: {
              name: true
            }
          }
        }
      },
      subtasks: {
        include: {
          executingAgent: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          priority: 'asc'
        }
      },
      toolExecutions: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  if (!task || task.user.id !== context.user.id) {
    throw new HttpError(404, 'Task not found or access denied')
  }

  return task
}

// ============================================================================
// CONNECTION MANAGEMENT QUERIES
// ============================================================================

// Get user connections
export const getUserConnections = async ({ type, status }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const where = {
    userId: context.user.id
  }

  if (type) {
    where.type = type
  }

  if (status) {
    where.status = status
  }

  const connections = await prisma.connection.findMany({
    where,
    orderBy: [
      { status: 'asc' }, // Active connections first
      { lastUsed: 'desc' },
      { createdAt: 'desc' }
    ],
    include: {
      agentConnections: {
        include: {
          agent: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  // Sanitize connections for display (remove sensitive config)
  return connections.map(connection => {
    let config = null
    try {
      // Only decrypt config for display purposes if needed
      config = connectionService.decryptConfig(connection.config)
    } catch (error) {
      // If decryption fails, continue without config
      console.warn(`Failed to decrypt config for connection ${connection.id}`)
    }
    
    return {
      ...connectionService.sanitizeConnectionForDisplay(connection, config),
      agentConnections: connection.agentConnections
    }
  })
}

// Get connection by ID
export const getConnectionById = async ({ connectionId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const connection = await prisma.connection.findFirst({
    where: {
      id: connectionId,
      userId: context.user.id
    },
    include: {
      agentConnections: {
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      },
      connectionLogs: {
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }
    }
  })

  if (!connection) {
    throw new HttpError(404, 'Connection not found')
  }

  // Decrypt config for editing purposes
  let config = null
  try {
    config = connectionService.decryptConfig(connection.config)
  } catch (error) {
    console.warn(`Failed to decrypt config for connection ${connection.id}`)
  }

  return {
    ...connectionService.sanitizeConnectionForDisplay(connection, config),
    agentConnections: connection.agentConnections,
    recentLogs: connection.connectionLogs,
    // For editing - include non-sensitive config fields
    editableConfig: config ? connectionService.sanitizeConnectionForDisplay(connection, config) : null
  }
}

// Get agent connections
export const getAgentConnections = async ({ agentId }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId }
  })

  if (!agent) {
    throw new HttpError(404, 'Agent not found')
  }

  const agentConnections = await prisma.agentConnection.findMany({
    where: {
      agentId,
      connection: {
        userId: context.user.id,
        status: 'active'
      }
    },
    include: {
      connection: true,
      agent: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    },
    orderBy: {
      isRequired: 'desc' // Required connections first
    }
  })

  // Sanitize connections for display
  return agentConnections.map(ac => ({
    ...ac,
    connection: connectionService.sanitizeConnectionForDisplay(ac.connection)
  }))
}

// Get connection logs
export const getConnectionLogs = async ({ connectionId, action, limit = 50 }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }

  // Verify user owns the connection
  const connection = await prisma.connection.findFirst({
    where: {
      id: connectionId,
      userId: context.user.id
    }
  })

  if (!connection) {
    throw new HttpError(404, 'Connection not found')
  }

  const where = {
    connectionId
  }

  if (action) {
    where.action = action
  }

  return prisma.connectionLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  })
}

// Get available connection types
export const getAvailableConnectionTypes = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'User must be logged in')
  }
  
  // Return provider specifications from the registry
  const providers = connectionRegistry.getAllProviders()
  
  return providers.map(provider => ({
    type: provider.type,
    name: provider.metadata.name,
    description: provider.metadata.description,
    category: provider.metadata.category,
    scopes: provider.scopes,
    configSchema: {
      required: provider.requiredConfig || [],
      optional: provider.optionalConfig || []
    },
    features: provider.features || [],
    limitations: provider.limitations || []
  }))
}
