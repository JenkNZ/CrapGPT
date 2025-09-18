// Database seeds for CrapGPT
// Seeds default agents for the system

export const seedAgents = async (prisma) => {
  console.log('🌱 Seeding default agents...')

  const agents = [
    {
      name: 'Assistant',
      description: 'General-purpose AI assistant for everyday tasks and questions.',
      personality: 'You are a helpful and knowledgeable assistant. Provide accurate, concise, and helpful responses to user queries. Be friendly but professional.',
      personalityTraits: ['helpful', 'knowledgeable', 'concise', 'professional'],
      defaultProvider: 'openrouter',
      defaultModel: 'openai/gpt-4o-mini',
      memorySettings: JSON.stringify({
        shortTermLimit: 10,
        longTermLimit: 100,
        contextWindow: 8000
      }),
      toolAccess: JSON.stringify({
        webSearch: false,
        calculator: true,
        weather: false,
        imageGeneration: false,
        codeExecution: false,
        fileAccess: false
      }),
      capabilities: JSON.stringify({
        text_generation: true,
        general_knowledge: true,
        reasoning: true
      }),
      isActive: true,
      canDelegate: false
    },
    {
      name: 'Creative Writer',
      description: 'Specialized AI for creative writing, storytelling, and content creation.',
      personality: 'You are a creative writing assistant. Help users with storytelling, poetry, creative content, and imaginative writing. Be inspiring and creative while maintaining quality.',
      personalityTraits: ['creative', 'imaginative', 'expressive', 'inspiring'],
      defaultProvider: 'openrouter',
      defaultModel: 'anthropic/claude-3-sonnet',
      memorySettings: JSON.stringify({
        shortTermLimit: 15,
        longTermLimit: 150,
        contextWindow: 16000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: false,
        weather: false,
        imageGeneration: true,
        codeExecution: false,
        fileAccess: false
      }),
      capabilities: JSON.stringify({
        text_generation: true,
        creative_writing: true,
        storytelling: true,
        poetry: true,
        content_creation: true
      }),
      isActive: true,
      canDelegate: false
    },
    {
      name: 'Code Expert',
      description: 'Programming and development specialist for coding tasks and technical questions.',
      personality: 'You are an expert programmer and software architect. Help with coding, debugging, code review, and software architecture. Be precise, explain your reasoning, and provide working code examples.',
      personalityTraits: ['technical', 'analytical', 'detail-oriented', 'systematic'],
      defaultProvider: 'openrouter',
      defaultModel: 'deepseek/deepseek-coder',
      memorySettings: JSON.stringify({
        shortTermLimit: 20,
        longTermLimit: 200,
        contextWindow: 32000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: true,
        weather: false,
        imageGeneration: false,
        codeExecution: true,
        fileAccess: true
      }),
      capabilities: JSON.stringify({
        code_generation: true,
        debugging: true,
        code_review: true,
        architecture_design: true,
        technical_documentation: true
      }),
      isActive: true,
      canDelegate: false
    },
    {
      name: 'Researcher',
      description: 'Research and analysis specialist for information gathering and fact-checking.',
      personality: 'You are a thorough research assistant. Help with information gathering, analysis, fact-checking, and research synthesis. Be objective, cite sources, and provide comprehensive insights.',
      personalityTraits: ['analytical', 'thorough', 'objective', 'methodical'],
      defaultProvider: 'openrouter',
      defaultModel: 'perplexity/llama-3.1-sonar-large-128k-online',
      memorySettings: JSON.stringify({
        shortTermLimit: 25,
        longTermLimit: 250,
        contextWindow: 64000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: true,
        weather: true,
        imageGeneration: false,
        codeExecution: false,
        fileAccess: true
      }),
      capabilities: JSON.stringify({
        research: true,
        analysis: true,
        fact_checking: true,
        data_synthesis: true,
        information_gathering: true
      }),
      isActive: true,
      canDelegate: false
    },
    {
      name: 'OrchestratorPrime',
      description: 'Master coordinator for task delegation and complex workflow orchestration.',
      personality: 'You are the master coordinator and task orchestrator. Analyze complex requests, break them into subtasks, and delegate to appropriate agents. Be strategic, efficient, and ensure quality coordination.',
      personalityTraits: ['leadership', 'strategic', 'efficient', 'coordinating'],
      defaultProvider: 'openrouter',
      defaultModel: 'openai/gpt-4o',
      memorySettings: JSON.stringify({
        shortTermLimit: 30,
        longTermLimit: 300,
        contextWindow: 128000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: true,
        weather: true,
        imageGeneration: true,
        codeExecution: true,
        fileAccess: true
      }),
      capabilities: JSON.stringify({
        delegation: true,
        orchestration: true,
        task_planning: true,
        workflow_management: true,
        multi_agent_coordination: true
      }),
      isActive: true,
      canDelegate: true
    },
    {
      name: 'MediaMaestro',
      description: 'Creative media specialist for image and video generation.',
      personality: 'You are a creative media specialist focused on visual content creation. Help users generate images, design concepts, and visual media. Be artistic, understand composition, and create stunning visuals.',
      personalityTraits: ['creative', 'visual', 'artistic', 'aesthetic'],
      defaultProvider: 'fal',
      defaultModel: 'flux-dev',
      memorySettings: JSON.stringify({
        shortTermLimit: 15,
        longTermLimit: 150,
        contextWindow: 16000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: false,
        weather: false,
        imageGeneration: true,
        codeExecution: false,
        fileAccess: true
      }),
      capabilities: JSON.stringify({
        image_generation: true,
        media_generation: true,
        visual_design: true,
        creative_direction: true
      }),
      isActive: true,
      canDelegate: false
    },
    {
      name: 'CodeCrusher',
      description: 'DevOps and infrastructure specialist for deployment and system automation.',
      personality: 'You are a DevOps and infrastructure expert. Handle deployments, system automation, infrastructure setup, and operations. Be reliable, security-conscious, and systematic in your approach.',
      personalityTraits: ['technical', 'systematic', 'reliable', 'security-focused'],
      defaultProvider: 'openrouter',
      defaultModel: 'openai/gpt-4o',
      memorySettings: JSON.stringify({
        shortTermLimit: 20,
        longTermLimit: 200,
        contextWindow: 32000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: true,
        weather: false,
        imageGeneration: false,
        codeExecution: true,
        fileAccess: true
      }),
      capabilities: JSON.stringify({
        infrastructure_automation: true,
        deployment: true,
        system_administration: true,
        devops: true,
        security_configuration: true
      }),
      isActive: true,
      canDelegate: false
    },
    {
      name: 'HexStrike AI',
      description: 'Cybersecurity expert for penetration testing and security analysis.',
      personality: 'You are a cybersecurity expert specializing in ethical hacking and security analysis. Help with security assessments, vulnerability analysis, and penetration testing. Always emphasize ethical use and responsible disclosure.',
      personalityTraits: ['security-focused', 'analytical', 'thorough', 'ethical'],
      defaultProvider: 'openrouter',
      defaultModel: 'openai/gpt-4o',
      memorySettings: JSON.stringify({
        shortTermLimit: 25,
        longTermLimit: 250,
        contextWindow: 32000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: true,
        weather: false,
        imageGeneration: false,
        codeExecution: true,
        fileAccess: true
      }),
      capabilities: JSON.stringify({
        security_analysis: true,
        penetration_testing: true,
        vulnerability_assessment: true,
        threat_analysis: true,
        security_auditing: true
      }),
      isActive: true,
      canDelegate: false
    }
  ]

  for (const agentData of agents) {
    try {
      // Check if agent already exists
      const existing = await prisma.agent.findUnique({
        where: { name: agentData.name }
      })

      if (existing) {
        console.log(`  📝 Agent '${agentData.name}' already exists, updating...`)
        await prisma.agent.update({
          where: { name: agentData.name },
          data: {
            description: agentData.description,
            personality: agentData.personality,
            personalityTraits: agentData.personalityTraits,
            defaultProvider: agentData.defaultProvider,
            defaultModel: agentData.defaultModel,
            memorySettings: agentData.memorySettings,
            toolAccess: agentData.toolAccess,
            capabilities: agentData.capabilities,
            isActive: agentData.isActive,
            canDelegate: agentData.canDelegate
          }
        })
      } else {
        console.log(`  ➕ Creating agent '${agentData.name}'...`)
        await prisma.agent.create({
          data: agentData
        })
      }
    } catch (error) {
      console.error(`  ❌ Failed to seed agent '${agentData.name}':`, error.message)
    }
  }

  console.log('✅ Agent seeding completed!')
}