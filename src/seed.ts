import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Seed sample agents
  const agents = [
    {
      name: 'Assistant',
      description: 'A helpful, harmless, and honest AI assistant',
      personality: 'You are a helpful, harmless, and honest AI assistant. You strive to be accurate, clear, and helpful in all interactions.',
      tools: ['search', 'calculator', 'weather'],
      model: 'gpt-4',
      provider: 'openrouter',
      isActive: true,
    },
    {
      name: 'Creative Writer',
      description: 'An AI specialized in creative writing and storytelling',
      personality: 'You are a creative writer with a passion for storytelling. You help users craft compelling narratives, develop characters, and explore creative ideas with imagination and flair.',
      tools: ['search', 'thesaurus'],
      model: 'gpt-4',
      provider: 'openrouter',
      isActive: true,
    },
    {
      name: 'Code Assistant',
      description: 'An AI specialized in programming and software development',
      personality: 'You are an expert programmer and software architect. You provide clear, well-documented code solutions and help users understand programming concepts with practical examples.',
      tools: ['code_executor', 'documentation_search', 'github_search'],
      model: 'gpt-4',
      provider: 'openrouter',
      isActive: true,
    },
    {
      name: 'Data Analyst',
      description: 'An AI specialized in data analysis and visualization',
      personality: 'You are a data scientist with expertise in statistical analysis and data visualization. You help users understand their data through clear insights and compelling visualizations.',
      tools: ['calculator', 'chart_generator', 'data_processor'],
      model: 'gpt-4',
      provider: 'openrouter',
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