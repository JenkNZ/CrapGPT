// Agent Orchestration System
// Handles agent delegation, task routing, and complex workflows

import { prisma } from '@wasp-lang/auth/server'
import { connectionAwareOrchestration } from '../server/connectionAwareOrchestration.js'

/**
 * Agent Orchestrator - manages delegation and task execution
 */
export class AgentOrchestrator {
  constructor(userId) {
    this.userId = userId
  }

  /**
   * Delegate a task to another agent
   */
  async delegateTask(delegatingAgentId, targetAgentName, taskDescription, input, options = {}) {
    try {
      // Get the target agent
      const targetAgent = await prisma.agent.findUnique({
        where: { name: targetAgentName }
      })

      if (!targetAgent || !targetAgent.isActive) {
        throw new Error(`Target agent '${targetAgentName}' not found or inactive`)
      }

      // Create the task record
      const task = await prisma.agentTask.create({
        data: {
          delegatingAgentId,
          executingAgentId: targetAgent.id,
          userId: this.userId,
          taskType: 'delegation',
          title: options.title || `Delegated task: ${taskDescription}`,
          description: taskDescription,
          input: JSON.stringify(input),
          status: 'pending',
          priority: options.priority || 1,
          metadata: JSON.stringify({
            delegationType: options.delegationType || 'full',
            contextPassthrough: options.contextPassthrough || {},
            expectedOutputType: options.expectedOutputType || 'text',
            timeout: options.timeout || 300000 // 5 minutes default
          }),
          parentTaskId: options.parentTaskId || null
        }
      })

      // Store delegation memory
      await this.storeMemory(delegatingAgentId, {
        type: 'delegation_initiated',
        taskId: task.id,
        targetAgent: targetAgentName,
        description: taskDescription,
        input
      })

      return task
    } catch (error) {
      console.error('Task delegation failed:', error)
      throw error
    }
  }

  /**
   * Execute a delegated task
   */
  async executeTask(taskId, agentRunner) {
    try {
      // Get task details
      const task = await prisma.agentTask.findUnique({
        where: { id: taskId },
        include: {
          delegatingAgent: true,
          executingAgent: true,
          parentTask: true
        }
      })

      if (!task) {
        throw new Error(`Task ${taskId} not found`)
      }

      // Update task status
      await prisma.agentTask.update({
        where: { id: taskId },
        data: { status: 'running' }
      })

      // Parse input and metadata
      const input = JSON.parse(task.input)
      const metadata = JSON.parse(task.metadata || '{}')

      // Execute the task using connection-aware orchestration
      const result = await connectionAwareOrchestration.executeAgentWithConnections(
        task.executingAgentId,
        input.prompt || input.question || input.text || input,
        this.userId,
        {
          context: metadata.contextPassthrough,
          expectedOutputType: metadata.expectedOutputType,
          parentTaskId: taskId
        }
      )

      // Update task with results
      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          output: JSON.stringify(result),
          completedAt: new Date()
        }
      })

      // Store completion memory
      await this.storeMemory(task.executingAgentId, {
        type: 'task_completed',
        taskId: task.id,
        delegatingAgent: task.delegatingAgent.name,
        input: input,
        output: result
      })

      return result
    } catch (error) {
      // Update task status to failed
      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          output: JSON.stringify({ error: error.message })
        }
      })

      console.error(`Task ${taskId} execution failed:`, error)
      throw error
    }
  }

  /**
   * Break down a complex task into subtasks
   */
  async createTaskHierarchy(parentTaskId, subtasks) {
    const createdSubtasks = []

    for (const subtask of subtasks) {
      const task = await prisma.agentTask.create({
        data: {
          delegatingAgentId: subtask.delegatingAgentId,
          executingAgentId: subtask.executingAgentId,
          userId: this.userId,
          taskType: subtask.taskType || 'delegation',
          title: subtask.title,
          description: subtask.description,
          input: JSON.stringify(subtask.input),
          status: 'pending',
          priority: subtask.priority || 1,
          metadata: JSON.stringify(subtask.metadata || {}),
          parentTaskId: parentTaskId
        }
      })
      createdSubtasks.push(task)
    }

    return createdSubtasks
  }

  /**
   * Get task execution status
   */
  async getTaskStatus(taskId) {
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId },
      include: {
        subtasks: true,
        toolExecutions: true
      }
    })

    if (!task) {
      return null
    }

    // Calculate overall progress for hierarchical tasks
    let progress = 0
    if (task.subtasks.length > 0) {
      const completed = task.subtasks.filter(st => st.status === 'completed').length
      progress = (completed / task.subtasks.length) * 100
    } else {
      progress = task.status === 'completed' ? 100 : 
                 task.status === 'running' ? 50 : 0
    }

    return {
      ...task,
      progress,
      isHierarchical: task.subtasks.length > 0
    }
  }

  /**
   * Store structured memory for agents
   */
  async storeMemory(agentId, data, options = {}) {
    return await prisma.agentMemory.create({
      data: {
        agentId,
        userId: this.userId,
        input: data.input || data.description || '',
        output: data.output || '',
        structuredData: JSON.stringify(data),
        context: JSON.stringify(options.context || {}),
        memoryType: options.memoryType || 'task',
        importance: options.importance || 5,
        tags: options.tags || [],
        relatedTaskId: options.taskId || data.taskId || null
      }
    })
  }

  /**
   * Retrieve structured memories by type and tags
   */
  async getStructuredMemories(agentId, filters = {}) {
    const where = {
      agentId,
      userId: this.userId
    }

    if (filters.memoryType) {
      where.memoryType = filters.memoryType
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags
      }
    }

    if (filters.taskId) {
      where.relatedTaskId = filters.taskId
    }

    const memories = await prisma.agentMemory.findMany({
      where,
      orderBy: {
        importance: 'desc'
      },
      take: filters.limit || 50
    })

    return memories.map(memory => ({
      ...memory,
      structuredData: memory.structuredData ? JSON.parse(memory.structuredData) : null,
      context: memory.context ? JSON.parse(memory.context) : null
    }))
  }

  /**
   * Clean up completed tasks and old memories
   */
  async cleanup(options = {}) {
    const cutoffDate = new Date(Date.now() - (options.daysOld || 7) * 24 * 60 * 60 * 1000)

    // Clean up old completed tasks
    await prisma.agentTask.deleteMany({
      where: {
        userId: this.userId,
        status: 'completed',
        completedAt: {
          lt: cutoffDate
        }
      }
    })

    // Clean up old short-term memories
    await prisma.agentMemory.deleteMany({
      where: {
        userId: this.userId,
        memoryType: 'short_term',
        importance: {
          lt: 3
        },
        createdAt: {
          lt: cutoffDate
        }
      }
    })

    console.log(`Cleaned up tasks and memories older than ${options.daysOld || 7} days`)
  }
}

/**
 * Task execution context for complex workflows
 */
export class TaskContext {
  constructor(userId, parentTaskId = null) {
    this.userId = userId
    this.parentTaskId = parentTaskId
    this.data = new Map()
    this.orchestrator = new AgentOrchestrator(userId)
    this.connectionContext = null
  }
  
  /**
   * Initialize connection context for this task
   */
  async initializeConnectionContext(agentId) {
    try {
      const { connections, requiredMissing } = await connectionAwareOrchestration.getAgentConnections(agentId, this.userId)
      this.connectionContext = { connections, requiredMissing }
      return this.connectionContext
    } catch (error) {
      console.error('Failed to initialize connection context:', error)
      throw error
    }
  }

  set(key, value) {
    this.data.set(key, value)
  }

  get(key) {
    return this.data.get(key)
  }

  async delegateSubtask(agentName, description, input, options = {}) {
    // Get agent ID from name
    const agent = await prisma.agent.findUnique({
      where: { name: agentName }
    })
    
    if (!agent) {
      throw new Error(`Agent ${agentName} not found`)
    }
    
    // Check if we should use connection-aware execution
    if (options.useConnections !== false) {
      try {
        // Initialize connection context if not already done
        if (!this.connectionContext) {
          await this.initializeConnectionContext(agent.id)
        }
        
        // Execute directly with connection context
        const result = await connectionAwareOrchestration.executeAgentWithConnections(
          agent.id,
          input,
          this.userId,
          {
            ...options,
            taskDescription: description,
            parentTaskId: this.parentTaskId
          }
        )
        
        // Store the execution as a task for consistency
        const task = await prisma.agentTask.create({
          data: {
            executingAgentId: agent.id,
            userId: this.userId,
            taskType: 'connection_aware_execution',
            title: description,
            description,
            input: JSON.stringify(input),
            status: 'completed',
            output: JSON.stringify(result),
            metadata: JSON.stringify({
              executionId: result.executionId,
              connectionsUsed: result.connectionsUsed || []
            }),
            parentTaskId: this.parentTaskId,
            completedAt: new Date()
          }
        })
        
        return { task, result }
      } catch (error) {
        console.error('Connection-aware execution failed, falling back to standard delegation:', error)
      }
    }
    
    // Fall back to standard delegation
    return await this.orchestrator.delegateTask(
      null, // Will be set by the calling agent
      agentName,
      description,
      input,
      {
        ...options,
        parentTaskId: this.parentTaskId
      }
    )
  }

  async storeResult(key, result, metadata = {}) {
    this.set(key, result)
    
    // Store in structured memory for future reference
    await this.orchestrator.storeMemory(null, {
      type: 'context_result',
      key,
      result,
      metadata
    }, {
      memoryType: 'task',
      taskId: this.parentTaskId
    })
  }

  toJSON() {
    const jsonData = Object.fromEntries(this.data)
    if (this.connectionContext) {
      jsonData.connectionContext = {
        availableConnections: Object.keys(this.connectionContext.connections),
        requiredMissing: this.connectionContext.requiredMissing
      }
    }
    return jsonData
  }
  
  /**
   * Get available connection credentials by type
   */
  getConnectionByType(type) {
    if (!this.connectionContext || !this.connectionContext.connections[type]) {
      return null
    }
    return this.connectionContext.connections[type]
  }
}