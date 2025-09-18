// Tool Execution Framework
// Provides a secure and extensible framework for agents to execute various tools

import { prisma } from '@wasp-lang/auth/server'

/**
 * Base Tool Class - all tools extend this
 */
export class BaseTool {
  constructor(name, version = '1.0.0') {
    this.name = name
    this.version = version
    this.permissions = []
    this.timeout = 30000 // 30 seconds default
  }

  // Override in subclasses
  async execute(input, context) {
    throw new Error('Tool execute method must be implemented')
  }

  // Validate input parameters
  validateInput(input) {
    return true // Override in subclasses
  }

  // Get tool metadata
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      permissions: this.permissions,
      timeout: this.timeout,
      description: this.getDescription(),
      inputSchema: this.getInputSchema(),
      outputSchema: this.getOutputSchema()
    }
  }

  // Override in subclasses
  getDescription() {
    return 'No description provided'
  }

  getInputSchema() {
    return {}
  }

  getOutputSchema() {
    return {}
  }
}

/**
 * Tool Executor - manages tool execution with security and monitoring
 */
export class ToolExecutor {
  constructor(userId) {
    this.userId = userId
    this.tools = new Map()
    this.executionHistory = []
    this.registerDefaultTools()
  }

  /**
   * Register a tool for execution
   */
  registerTool(tool) {
    if (!(tool instanceof BaseTool)) {
      throw new Error('Tool must extend BaseTool class')
    }
    
    this.tools.set(tool.name, tool)
    console.log(`Registered tool: ${tool.name} v${tool.version}`)
  }

  /**
   * Execute a tool with security checks and monitoring
   */
  async executeTool(toolName, input, context = {}) {
    const startTime = Date.now()
    let execution = null

    try {
      // Get the tool
      const tool = this.tools.get(toolName)
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found`)
      }

      // Create execution record
      execution = await this.createExecutionRecord(toolName, tool.version, input, context)

      // Validate permissions
      await this.checkPermissions(tool, context)

      // Validate input
      if (!tool.validateInput(input)) {
        throw new Error('Invalid input parameters')
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(tool, input, context)

      // Update execution record
      const executionTime = Date.now() - startTime
      await this.updateExecutionRecord(execution.id, 'completed', result, executionTime)

      this.executionHistory.push({
        toolName,
        success: true,
        executionTime,
        timestamp: new Date()
      })

      return {
        success: true,
        result,
        executionId: execution.id,
        executionTime,
        tool: tool.getMetadata()
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      
      if (execution) {
        await this.updateExecutionRecord(execution.id, 'failed', null, executionTime, error.message)
      }

      this.executionHistory.push({
        toolName,
        success: false,
        error: error.message,
        executionTime,
        timestamp: new Date()
      })

      throw error
    }
  }

  /**
   * Execute tool with timeout protection
   */
  async executeWithTimeout(tool, input, context) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${tool.timeout}ms`))
      }, tool.timeout)

      tool.execute(input, context)
        .then(result => {
          clearTimeout(timeoutId)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  /**
   * Check if agent has permission to use tool
   */
  async checkPermissions(tool, context) {
    if (!context.agentId) {
      return true // Skip permission check if no agent context
    }

    const agent = await prisma.agent.findUnique({
      where: { id: context.agentId }
    })

    if (!agent) {
      throw new Error('Agent not found')
    }

    // Parse tool access configuration
    let toolAccess = {}
    try {
      toolAccess = JSON.parse(agent.toolAccess || '{}')
    } catch (e) {
      console.warn('Failed to parse agent toolAccess:', e)
    }

    // Check if tool is allowed
    if (toolAccess[tool.name] === false) {
      throw new Error(`Agent does not have permission to use tool '${tool.name}'`)
    }

    // Check specific permissions
    for (const permission of tool.permissions) {
      if (toolAccess[permission] === false) {
        throw new Error(`Agent does not have permission: ${permission}`)
      }
    }

    return true
  }

  /**
   * Create execution record in database
   */
  async createExecutionRecord(toolName, toolVersion, input, context) {
    return await prisma.toolExecution.create({
      data: {
        toolName,
        toolVersion,
        input: JSON.stringify(input),
        status: 'running',
        userId: this.userId,
        agentId: context.agentId || null,
        taskId: context.taskId || null,
        metadata: JSON.stringify({
          startTime: Date.now(),
          context: context
        })
      }
    })
  }

  /**
   * Update execution record with results
   */
  async updateExecutionRecord(executionId, status, output, executionTime, error = null) {
    const data = {
      status,
      executionTime,
      updatedAt: new Date()
    }

    if (output !== null) {
      data.output = JSON.stringify(output)
    }

    if (error) {
      data.error = error
    }

    return await prisma.toolExecution.update({
      where: { id: executionId },
      data
    })
  }

  /**
   * Get available tools for an agent
   */
  async getAvailableTools(agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    })

    if (!agent) {
      return []
    }

    let toolAccess = {}
    try {
      toolAccess = JSON.parse(agent.toolAccess || '{}')
    } catch (e) {
      console.warn('Failed to parse agent toolAccess:', e)
    }

    const availableTools = []
    for (const [toolName, tool] of this.tools) {
      // Skip if explicitly disabled
      if (toolAccess[toolName] === false) {
        continue
      }

      // Check if all required permissions are granted
      const hasAllPermissions = tool.permissions.every(permission => 
        toolAccess[permission] !== false
      )

      if (hasAllPermissions) {
        availableTools.push({
          ...tool.getMetadata(),
          enabled: true
        })
      }
    }

    return availableTools
  }

  /**
   * Get tool execution history
   */
  async getExecutionHistory(filters = {}) {
    const where = {
      userId: this.userId
    }

    if (filters.agentId) {
      where.agentId = filters.agentId
    }

    if (filters.toolName) {
      where.toolName = filters.toolName
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.dateFrom) {
      where.createdAt = {
        gte: filters.dateFrom
      }
    }

    return await prisma.toolExecution.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: filters.limit || 100,
      include: {
        agent: {
          select: {
            name: true
          }
        }
      }
    })
  }

  /**
   * Register default tools
   */
  registerDefaultTools() {
    // Tools will be registered here
    this.registerTool(new WebSearchTool())
    this.registerTool(new FileOperationsTool())
    this.registerTool(new CalculatorTool())
    this.registerTool(new WeatherTool())
    this.registerTool(new TaskSplitterTool())
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(timeRange = '24h') {
    const cutoff = new Date(Date.now() - this.parseTimeRange(timeRange))
    const recentExecutions = this.executionHistory.filter(ex => ex.timestamp >= cutoff)

    const stats = {
      total: recentExecutions.length,
      successful: recentExecutions.filter(ex => ex.success).length,
      failed: recentExecutions.filter(ex => !ex.success).length,
      averageTime: 0,
      toolUsage: {}
    }

    if (recentExecutions.length > 0) {
      stats.averageTime = recentExecutions.reduce((sum, ex) => sum + ex.executionTime, 0) / recentExecutions.length
    }

    // Count tool usage
    recentExecutions.forEach(ex => {
      stats.toolUsage[ex.toolName] = (stats.toolUsage[ex.toolName] || 0) + 1
    })

    return stats
  }

  parseTimeRange(range) {
    const units = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    }

    const match = range.match(/^(\\d+)([hdw])$/)
    if (!match) return 24 * 60 * 60 * 1000 // Default 24h

    const [, amount, unit] = match
    return parseInt(amount) * units[unit]
  }
}

// Default tool implementations will be added in separate files
// Here are the class stubs for now:

class WebSearchTool extends BaseTool {
  constructor() {
    super('web_search', '1.0.0')
    this.permissions = ['web_access']
  }

  getDescription() {
    return 'Search the web for information using search engines'
  }

  async execute(input, context) {
    // Implementation would go here
    throw new Error('WebSearchTool not implemented yet')
  }
}

class FileOperationsTool extends BaseTool {
  constructor() {
    super('file_operations', '1.0.0')
    this.permissions = ['file_access']
  }

  getDescription() {
    return 'Read, write, and manipulate files (within allowed directories)'
  }

  async execute(input, context) {
    // Implementation would go here
    throw new Error('FileOperationsTool not implemented yet')
  }
}

class CalculatorTool extends BaseTool {
  constructor() {
    super('calculator', '1.0.0')
    this.permissions = []
  }

  getDescription() {
    return 'Perform mathematical calculations'
  }

  validateInput(input) {
    return typeof input.expression === 'string'
  }

  async execute(input, context) {
    try {
      // Simple calculator using eval (in production, use a math parser)
      const result = eval(input.expression.replace(/[^0-9+\\-*/.() ]/g, ''))
      return {
        expression: input.expression,
        result: result,
        type: 'number'
      }
    } catch (error) {
      throw new Error(`Calculator error: ${error.message}`)
    }
  }
}

class WeatherTool extends BaseTool {
  constructor() {
    super('weather', '1.0.0')
    this.permissions = ['api_access']
  }

  getDescription() {
    return 'Get current weather information for a location'
  }

  async execute(input, context) {
    // Implementation would go here - integrate with weather API
    throw new Error('WeatherTool not implemented yet')
  }
}

class TaskSplitterTool extends BaseTool {
  constructor() {
    super('task_splitter', '1.0.0')
    this.permissions = []
  }

  getDescription() {
    return 'Split complex tasks into smaller subtasks'
  }

  async execute(input, context) {
    const { task, criteria = {} } = input
    
    // Simple rule-based task splitting
    const subtasks = []
    
    if (task.toLowerCase().includes('research')) {
      subtasks.push({
        type: 'research',
        description: `Research background information about: ${task}`,
        priority: 1
      })
      subtasks.push({
        type: 'analysis',
        description: `Analyze and summarize findings from research`,
        priority: 2
      })
      subtasks.push({
        type: 'presentation',
        description: `Create visual representation or summary`,
        priority: 3
      })
    } else if (task.toLowerCase().includes('create') || task.toLowerCase().includes('generate')) {
      subtasks.push({
        type: 'planning',
        description: `Plan the creation of: ${task}`,
        priority: 1
      })
      subtasks.push({
        type: 'execution',
        description: `Execute the creation task`,
        priority: 2
      })
      subtasks.push({
        type: 'review',
        description: `Review and refine the created content`,
        priority: 3
      })
    } else {
      // Generic splitting
      subtasks.push({
        type: 'analysis',
        description: `Analyze requirements for: ${task}`,
        priority: 1
      })
      subtasks.push({
        type: 'execution',
        description: `Execute main task: ${task}`,
        priority: 2
      })
    }

    return {
      originalTask: task,
      subtasks,
      totalSubtasks: subtasks.length,
      estimatedTime: subtasks.length * (criteria.timePerTask || 30), // seconds
      metadata: {
        splittingMethod: 'rule_based',
        criteria
      }
    }
  }
}