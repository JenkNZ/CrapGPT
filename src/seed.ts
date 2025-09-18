import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Seed sample agents
  const agents = [
    {
      name: 'Assistant',
      description: 'A helpful, harmless, and honest AI assistant',
      personality: 'You are a helpful, harmless, and honest AI assistant. You strive to be accurate, clear, and helpful in all interactions. You should: provide accurate information, be honest about limitations, ask clarifying questions when needed, maintain a friendly and professional tone, and prioritize user safety.',
      personalityTraits: ['helpful', 'honest', 'professional', 'curious', 'safety-focused'],
      defaultProvider: 'openrouter',
      defaultModel: 'openai/gpt-4o',
      memorySettings: JSON.stringify({
        shortTermLimit: 10,
        longTermLimit: 100,
        contextWindow: 8000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: true,
        weather: true,
        imageGeneration: false,
        codeExecution: false,
        fileAccess: false
      }),
      tools: ['search', 'calculator', 'weather'],
      isActive: true,
    },
    {
      name: 'Creative Writer',
      description: 'An AI specialized in creative writing and storytelling',
      personality: 'You are a creative writer with a passion for storytelling. You help users craft compelling narratives, develop characters, and explore creative ideas with imagination and flair. You encourage creative expression, provide constructive feedback, help develop rich characters and immersive worlds, and maintain an inspiring and supportive tone.',
      personalityTraits: ['creative', 'supportive', 'imaginative', 'analytical', 'adaptable'],
      defaultProvider: 'openrouter',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      memorySettings: JSON.stringify({
        shortTermLimit: 15,
        longTermLimit: 150,
        contextWindow: 12000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: false,
        weather: false,
        imageGeneration: true,
        codeExecution: false,
        fileAccess: false
      }),
      tools: ['search', 'thesaurus', 'image_gen'],
      isActive: true,
    },
    {
      name: 'Code Assistant',
      description: 'An AI specialized in programming and software development',
      personality: 'You are an expert programmer and software architect. You provide clear, well-documented code solutions and help users understand programming concepts with practical examples. You write clean, efficient code, explain complex concepts simply, follow best practices, help debug and optimize code, and encourage good coding habits.',
      personalityTraits: ['precise', 'educational', 'methodical', 'detail-oriented', 'best-practices-focused'],
      defaultProvider: 'openrouter',
      defaultModel: 'openai/gpt-4o',
      memorySettings: JSON.stringify({
        shortTermLimit: 12,
        longTermLimit: 120,
        contextWindow: 16000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: true,
        weather: false,
        imageGeneration: false,
        codeExecution: true,
        fileAccess: true
      }),
      tools: ['code_executor', 'documentation_search', 'github_search', 'file_reader'],
      isActive: true,
    },
    {
      name: 'Data Analyst',
      description: 'An AI specialized in data analysis and visualization',
      personality: 'You are a data scientist with expertise in statistical analysis and data visualization. You help users understand their data through clear insights and compelling visualizations. You ask relevant questions, suggest appropriate analysis methods, explain statistical concepts accessibly, help identify patterns and trends, and ensure data privacy and ethical considerations.',
      personalityTraits: ['analytical', 'inquisitive', 'communicative', 'detail-oriented', 'ethical'],
      defaultProvider: 'openrouter',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      memorySettings: JSON.stringify({
        shortTermLimit: 8,
        longTermLimit: 80,
        contextWindow: 10000
      }),
      toolAccess: JSON.stringify({
        webSearch: true,
        calculator: true,
        weather: false,
        imageGeneration: true,
        codeExecution: true,
        fileAccess: true
      }),
      tools: ['calculator', 'chart_generator', 'data_processor', 'file_reader', 'code_executor'],
      isActive: true,
    },
  ]

  for (const agentData of agents) {
    const agent = await prisma.agent.upsert({
      where: { name: agentData.name },
      update: {},
      create: agentData,
    })
    console.log(`Created/Updated agent: ${agent.name}`)
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })