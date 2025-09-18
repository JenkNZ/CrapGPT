import type { PrismaClient } from '@prisma/client'

export const seedDevData = async (prisma: PrismaClient) => {
  console.log('Seeding development data...')
  
  // Create default agent
  const defaultAgent = await prisma.agent.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Default Assistant',
      description: 'A helpful AI assistant',
      model: 'gpt-4',
      provider: 'openai',
      systemPrompt: 'You are a helpful AI assistant.',
      isActive: true
    }
  })
  
  console.log('✅ Created default agent:', defaultAgent.name)
}

export const seedAgents = async (prisma: PrismaClient) => {
  console.log('🌱 Seeding CrapGPT agents...')

  // Define agents with their capabilities
  const agentsToSeed = [
    {
      name: 'Research Assistant',
      description: 'Specialized in research, data gathering, and analysis',
      personality: 'Thorough, analytical, and detail-oriented researcher',
      personalityTraits: ['analytical', 'thorough', 'methodical', 'curious'],
      defaultProvider: 'openrouter',
      defaultModel: 'openai/gpt-4o',
      memorySettings: JSON.stringify({
        maxShortTerm: 50,
        maxLongTerm: 200,
        retentionDays: 30
      }),
      toolAccess: JSON.stringify({
        allowedTools: ['web_search', 'data_analysis', 'file_reader'],
        restrictedTools: ['file_writer', 'shell_exec']
      }),
      tools: ['web_search', 'data_analysis', 'file_reader', 'summarizer'],
      capabilities: JSON.stringify({
        canDelegate: false,
        multiProvider: true,
        maxConcurrentTasks: 3
      }),
      providerConfig: JSON.stringify({
        primary: 'openrouter',
        fallback: ['anthropic', 'openai'],
        routingRules: {
          'research': 'openrouter',
          'analysis': 'anthropic'
        }
      })
    },
    {
      name: 'Code Assistant',
      description: 'Expert in software development, debugging, and code review',
      personality: 'Precise, logical, and solution-oriented developer',
      personalityTraits: ['logical', 'precise', 'innovative', 'systematic'],
      defaultProvider: 'openrouter',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      memorySettings: JSON.stringify({
        maxShortTerm: 40,
        maxLongTerm: 150,
        retentionDays: 60
      }),
      toolAccess: JSON.stringify({
        allowedTools: ['code_executor', 'file_reader', 'file_writer', 'git_ops'],
        restrictedTools: ['shell_exec']
      }),
      tools: ['code_executor', 'file_reader', 'file_writer', 'git_ops', 'linter'],
      capabilities: JSON.stringify({
        canDelegate: false,
        multiProvider: true,
        maxConcurrentTasks: 2
      }),
      providerConfig: JSON.stringify({
        primary: 'anthropic',
        fallback: ['openrouter'],
        routingRules: {
          'code_generation': 'anthropic',
          'code_review': 'openrouter'
        }
      })
    },
    {
      name: 'Creative Writer',
      description: 'Specializes in creative content, storytelling, and copywriting',
      personality: 'Imaginative, expressive, and emotionally intelligent',
      personalityTraits: ['creative', 'empathetic', 'expressive', 'intuitive'],
      defaultProvider: 'openrouter',
      defaultModel: 'openai/gpt-4o',
      memorySettings: JSON.stringify({
        maxShortTerm: 30,
        maxLongTerm: 100,
        retentionDays: 45
      }),
      toolAccess: JSON.stringify({
        allowedTools: ['text_generator', 'image_generator', 'file_writer'],
        restrictedTools: ['shell_exec', 'data_analysis']
      }),
      tools: ['text_generator', 'image_generator', 'file_writer', 'style_analyzer'],
      capabilities: JSON.stringify({
        canDelegate: false,
        multiProvider: true,
        maxConcurrentTasks: 3
      }),
      providerConfig: JSON.stringify({
        primary: 'openai',
        fallback: ['anthropic', 'openrouter'],
        routingRules: {
          'creative_writing': 'openai',
          'technical_writing': 'anthropic'
        }
      })
    },
    {
      name: 'Task Coordinator',
      description: 'Master delegator that manages complex multi-agent workflows',
      personality: 'Organized, strategic, and leadership-focused',
      personalityTraits: ['organized', 'strategic', 'decisive', 'collaborative'],
      defaultProvider: 'anthropic',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      memorySettings: JSON.stringify({
        maxShortTerm: 100,
        maxLongTerm: 500,
        retentionDays: 90
      }),
      toolAccess: JSON.stringify({
        allowedTools: ['task_manager', 'agent_delegator', 'workflow_builder'],
        restrictedTools: []
      }),
      tools: ['task_manager', 'agent_delegator', 'workflow_builder', 'progress_tracker'],
      capabilities: JSON.stringify({
        canDelegate: true,
        multiProvider: true,
        maxConcurrentTasks: 10
      }),
      providerConfig: JSON.stringify({
        primary: 'anthropic',
        fallback: ['openrouter'],
        routingRules: {
          'delegation': 'anthropic',
          'coordination': 'anthropic'
        }
      }),
      delegationRules: JSON.stringify({
        maxDelegations: 5,
        allowedAgents: ['Research Assistant', 'Code Assistant', 'Creative Writer'],
        delegationStrategy: 'capability_match',
        escalationRules: {
          'timeout': 'escalate_to_user',
          'failure': 'retry_with_different_agent'
        }
      }),
      canDelegate: true
    }
  ]

  const createdAgents = []

  for (const agentData of agentsToSeed) {
    try {
      // Check if agent already exists
      const existingAgent = await prisma.agent.findUnique({
        where: { name: agentData.name }
      })

      if (existingAgent) {
        console.log(`⚠️  Agent "${agentData.name}" already exists, skipping...`)
        createdAgents.push(existingAgent)
        continue
      }

      const agent = await prisma.agent.create({
        data: agentData
      })

      console.log(`✅ Created agent: ${agent.name} (ID: ${agent.id})`)
      createdAgents.push(agent)

    } catch (error) {
      console.error(`❌ Failed to create agent "${agentData.name}":`, error.message)
    }
  }

  console.log(`\n🎉 Seeded ${createdAgents.length} agents successfully!`)
  
  // Create some sample agent memories for demonstration
  if (createdAgents.length > 0) {
    console.log('🧠 Creating sample agent memories...')
    
    // Find a test user (create if doesn't exist)
    let testUser = await prisma.user.findFirst({
      where: { email: 'test@crapgpt.dev' }
    })

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@crapgpt.dev',
          username: 'testuser',
          name: 'Test User'
        }
      })
      console.log('👤 Created test user')
    }

    // Create sample memories for each agent
    for (const agent of createdAgents.slice(0, 2)) { // Just first 2 agents to avoid clutter
      try {
        await prisma.agentMemory.create({
          data: {
            agentId: agent.id,
            userId: testUser.id,
            input: `Hello ${agent.name}! This is a test interaction.`,
            output: `Hello! I'm ${agent.name}. ${agent.description}. How can I help you today?`,
            context: JSON.stringify({
              sessionId: 'seed-session-1',
              timestamp: new Date().toISOString(),
              userAgent: 'CrapGPT-Seeder'
            }),
            memoryType: 'short_term',
            importance: 1,
            tags: ['greeting', 'test', 'seed_data']
          }
        })
        console.log(`💭 Created sample memory for ${agent.name}`)
      } catch (error) {
        console.error(`Failed to create memory for ${agent.name}:`, error.message)
      }
    }
  }

  return createdAgents
}