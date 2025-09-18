// Enhanced Researcher Agent
// Demonstrates advanced agent capabilities: delegation, multi-provider routing, and tool usage

import { AgentOrchestrator, TaskContext } from './orchestration.js'
import { ProviderRouter } from './providerRouter.js'
import { ToolExecutor } from './toolExecutor.js'
import { WebSearchTool, DataProcessingTool, ContentGenerationTool } from './tools/demoTools.js'
import { callModel, Provider } from '../providers/unified-index.js'

/**
 * Enhanced Researcher Agent
 * Showcases the full capabilities of the enhanced agent system
 */
export class ResearcherAgent {
  constructor(userId) {
    this.userId = userId
    this.agentName = 'Researcher'
    this.orchestrator = new AgentOrchestrator(userId)
    this.providerRouter = new ProviderRouter()
    this.toolExecutor = new ToolExecutor(userId)
    
    // Register specialized tools
    this.toolExecutor.registerTool(new WebSearchTool())
    this.toolExecutor.registerTool(new DataProcessingTool())
    this.toolExecutor.registerTool(new ContentGenerationTool())
    
    this.capabilities = {
      taskDecomposition: true,
      multiProviderRouting: true,
      toolExecution: true,
      delegation: true,
      structuredMemory: true
    }
  }

  /**
   * Main research workflow - demonstrates all enhanced capabilities
   */
  async conductResearch(question, options = {}) {
    console.log(`🔬 Researcher Agent starting research: "${question}"`)
    
    const startTime = Date.now()
    const context = new TaskContext(this.userId)
    
    try {
      // Phase 1: Task Decomposition
      console.log('📋 Phase 1: Breaking down the research task...')
      const taskBreakdown = await this.decomposeResearchTask(question, options)
      context.set('taskBreakdown', taskBreakdown)
      
      await this.storeStructuredMemory('task_decomposition', {
        originalQuestion: question,
        subtasks: taskBreakdown.subtasks,
        approach: taskBreakdown.approach
      })

      // Phase 2: Information Gathering
      console.log('🔍 Phase 2: Gathering information...')
      const researchData = await this.gatherInformation(taskBreakdown.subtasks, context)
      context.set('researchData', researchData)

      // Phase 3: Analysis and Synthesis
      console.log('🧠 Phase 3: Analyzing and synthesizing findings...')
      const analysis = await this.analyzeFindingsWithDelegation(researchData, question, context)
      context.set('analysis', analysis)

      // Phase 4: Visual Representation
      console.log('🎨 Phase 4: Creating visual representation...')
      const diagram = await this.createResearchDiagram(question, analysis, context)
      context.set('diagram', diagram)

      // Phase 5: Final Synthesis
      console.log('📄 Phase 5: Synthesizing final report...')
      const finalReport = await this.synthesizeFinalReport(question, context)

      const totalTime = Date.now() - startTime
      
      // Store comprehensive research memory
      await this.storeStructuredMemory('completed_research', {
        question,
        process: {
          taskBreakdown: context.get('taskBreakdown'),
          researchData: researchData.length,
          analysisType: analysis.type,
          diagramGenerated: !!diagram.success,
          totalTime
        },
        results: finalReport,
        metadata: {
          providersUsed: this.getUsedProviders(context),
          toolsUsed: this.getUsedTools(context),
          delegationsPerformed: this.getDelegationCount(context)
        }
      })

      console.log(`✅ Research completed in ${totalTime}ms`)
      
      return {
        success: true,
        question,
        report: finalReport,
        metadata: {
          executionTime: totalTime,
          capabilities: this.capabilities,
          workflowSteps: [
            'Task Decomposition',
            'Information Gathering', 
            'Analysis & Synthesis',
            'Visual Representation',
            'Final Report'
          ],
          providersUsed: this.getUsedProviders(context),
          toolsUsed: this.getUsedTools(context)
        }
      }

    } catch (error) {
      console.error('❌ Research failed:', error.message)
      
      await this.storeStructuredMemory('research_error', {
        question,
        error: error.message,
        context: context.toJSON(),
        timestamp: new Date().toISOString()
      })

      return {
        success: false,
        error: error.message,
        partialResults: context.toJSON()
      }
    }
  }

  /**
   * Phase 1: Decompose the research task using tool execution
   */
  async decomposeResearchTask(question, options) {
    try {
      const taskSplitterResult = await this.toolExecutor.executeTool(
        'task_splitter',
        {
          task: `Research and analyze: ${question}`,
          criteria: {
            depth: options.depth || 'comprehensive',
            timePerTask: options.timePerSubtask || 45,
            focusAreas: options.focusAreas || []
          }
        },
        { agentId: null } // No specific agent context for orchestrator
      )

      const subtasks = taskSplitterResult.result.subtasks.map(subtask => ({
        ...subtask,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        provider: this.determineSubtaskProvider(subtask.type)
      }))

      return {
        originalQuestion: question,
        approach: 'multi_phase_research',
        subtasks,
        estimatedTime: taskSplitterResult.result.estimatedTime,
        metadata: taskSplitterResult.result.metadata
      }
    } catch (error) {
      console.warn('Task splitter failed, using fallback decomposition')
      
      return {
        originalQuestion: question,
        approach: 'fallback_research',
        subtasks: [
          {
            id: 'research_1',
            type: 'research',
            description: `Research background information about: ${question}`,
            priority: 1,
            provider: 'openrouter',
            status: 'pending'
          },
          {
            id: 'analysis_1', 
            type: 'analysis',
            description: 'Analyze and synthesize findings',
            priority: 2,
            provider: 'openrouter',
            status: 'pending'
          },
          {
            id: 'visual_1',
            type: 'presentation',
            description: 'Create visual representation',
            priority: 3,
            provider: 'fal',
            status: 'pending'
          }
        ],
        estimatedTime: 120
      }
    }
  }

  /**
   * Phase 2: Gather information using web search and provider routing
   */
  async gatherInformation(subtasks, context) {
    const researchResults = []

    for (const subtask of subtasks) {
      if (subtask.type === 'research') {
        try {
          console.log(`  📚 Researching: ${subtask.description}`)
          
          // Use web search tool
          const searchResult = await this.toolExecutor.executeTool(
            'web_search',
            {
              query: this.extractSearchQuery(subtask.description),
              maxResults: 3,
              language: 'en'
            }
          )

          // Route to appropriate provider for analysis
          const analysisResult = await this.providerRouter.routeTask(
            'text_analysis',
            `Analyze these search results and extract key information about: ${subtask.description}

Search Results:
${searchResult.result.results.map(r => 
  `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.url}`
).join('\n\n')}

Please provide a comprehensive analysis focusing on the key facts, insights, and relevant details.`,
            {
              priority: 'normal',
              expectedOutputType: 'text'
            }
          )

          researchResults.push({
            subtask: subtask.id,
            type: 'research',
            searchResults: searchResult.result.results,
            analysis: analysisResult.primary?.result || analysisResult.result,
            provider: analysisResult.primary?.provider || analysisResult.provider,
            success: true
          })

          subtask.status = 'completed'
          
        } catch (error) {
          console.warn(`Research subtask failed: ${error.message}`)
          researchResults.push({
            subtask: subtask.id,
            type: 'research',
            error: error.message,
            success: false
          })
          subtask.status = 'failed'
        }
      }
    }

    return researchResults
  }

  /**
   * Phase 3: Analyze findings with delegation to other agents
   */
  async analyzeFindingsWithDelegation(researchData, originalQuestion, context) {
    const analysisInput = {
      question: originalQuestion,
      findings: researchData
        .filter(r => r.success)
        .map(r => ({
          source: r.searchResults?.map(s => s.title).join(', ') || 'Internal analysis',
          analysis: r.analysis?.text || r.analysis || 'No analysis available'
        }))
    }

    try {
      // Delegate analysis to OpenRouter (text analysis specialist)
      const analysisResult = await this.providerRouter.routeTask(
        'text_analysis',
        `As an expert analyst, please analyze the following research findings and provide comprehensive insights about: "${originalQuestion}"

Research Findings:
${analysisInput.findings.map((f, i) => 
  `Finding ${i + 1} (Source: ${f.source}):\n${f.analysis}`
).join('\n\n')}

Please provide:
1. Key themes and patterns
2. Important insights and discoveries
3. Potential implications
4. Areas that need further investigation
5. Conclusion based on the evidence

Format your response as a structured analysis with clear sections.`,
        {
          model: 'openai/gpt-4o',
          priority: 'normal',
          timeout: 45000
        }
      )

      return {
        type: 'comprehensive_analysis',
        content: analysisResult.primary?.result?.text || analysisResult.result?.text || 'Analysis completed',
        provider: analysisResult.primary?.provider || analysisResult.provider,
        rawFindings: analysisInput.findings,
        success: true
      }

    } catch (error) {
      console.warn(`Analysis delegation failed: ${error.message}`)
      
      // Fallback to local analysis
      return {
        type: 'fallback_analysis',
        content: `Based on the research findings for "${originalQuestion}", several key themes emerge: 
        ${analysisInput.findings.map(f => f.analysis).join(' ')}
        
        This analysis suggests important implications and areas for further investigation.`,
        provider: 'fallback',
        rawFindings: analysisInput.findings,
        success: true
      }
    }
  }

  /**
   * Phase 4: Create research diagram using FAL provider
   */
  async createResearchDiagram(question, analysis, context) {
    try {
      console.log('  🎨 Generating research diagram...')
      
      // Create diagram prompt based on analysis
      const diagramPrompt = this.createDiagramPrompt(question, analysis)
      
      // Route to image generation provider (FAL)
      const diagramResult = await this.providerRouter.routeTask(
        'diagram_creation',
        diagramPrompt,
        {
          priority: 'normal',
          model: 'fal-ai/flux/schnell',
          timeout: 30000,
          preferredProviders: [Provider.FAL]
        }
      )

      return {
        success: true,
        images: diagramResult.primary?.result?.images || diagramResult.result?.images || [],
        provider: diagramResult.primary?.provider || diagramResult.provider,
        prompt: diagramPrompt,
        metadata: diagramResult.primary?.result?.metadata || diagramResult.result?.metadata
      }

    } catch (error) {
      console.warn(`Diagram creation failed: ${error.message}`)
      
      return {
        success: false,
        error: error.message,
        fallbackDescription: `A visual diagram would illustrate the key concepts from the research on "${question}". 
        This would include the main themes, relationships between concepts, and supporting evidence found in the analysis.`
      }
    }
  }

  /**
   * Phase 5: Synthesize final report combining all results
   */
  async synthesizeFinalReport(question, context) {
    const taskBreakdown = context.get('taskBreakdown')
    const researchData = context.get('researchData') 
    const analysis = context.get('analysis')
    const diagram = context.get('diagram')

    // Generate comprehensive report using content generation tool
    const reportResult = await this.toolExecutor.executeTool(
      'content_generation',
      {
        type: 'report',
        specifications: {
          title: `Research Report: ${question}`,
          sections: [
            'Executive Summary',
            'Research Methodology', 
            'Key Findings',
            'Analysis and Insights',
            'Visual Representation',
            'Conclusions and Recommendations'
          ],
          data: {
            question,
            findingsCount: researchData?.filter(r => r.success).length || 0,
            analysisType: analysis?.type || 'basic',
            diagramGenerated: diagram?.success || false
          }
        },
        style: 'professional'
      }
    )

    // Enhance the generated report with actual research content
    return {
      title: `Comprehensive Research Report: ${question}`,
      executiveSummary: `This report presents comprehensive research findings on "${question}". 
        The investigation utilized ${researchData?.length || 0} research sources, 
        advanced analysis techniques, and ${diagram?.success ? 'includes visual representations' : 'provides detailed textual analysis'}.`,
      
      methodology: {
        approach: taskBreakdown?.approach || 'systematic research',
        phases: [
          'Task decomposition and planning',
          'Multi-source information gathering',
          'Expert analysis and synthesis', 
          'Visual representation creation',
          'Comprehensive report generation'
        ],
        providersUsed: this.getUsedProviders(context),
        toolsUsed: this.getUsedTools(context)
      },
      
      keyFindings: researchData?.filter(r => r.success).map(r => ({
        source: r.searchResults?.map(s => s.title).join(', ') || 'Research analysis',
        insight: this.extractKeyInsight(r.analysis),
        confidence: 'high'
      })) || [],
      
      analysis: {
        summary: analysis?.content || 'Comprehensive analysis completed',
        provider: analysis?.provider || 'integrated',
        type: analysis?.type || 'multi-source'
      },
      
      visualElements: diagram?.success ? {
        images: diagram.images,
        description: 'Research findings visualized in diagram format',
        generatedBy: diagram.provider
      } : {
        description: diagram?.fallbackDescription || 'Visual representation not available'
      },
      
      conclusions: this.generateConclusions(question, analysis, researchData),
      
      metadata: {
        generatedBy: 'Researcher Agent',
        timestamp: new Date().toISOString(),
        reportStructure: reportResult.result?.content || { sections: [] },
        capabilities: Object.keys(this.capabilities).filter(cap => this.capabilities[cap])
      }
    }
  }

  /**
   * Helper methods
   */
  
  determineSubtaskProvider(subtaskType) {
    const providerMapping = {
      'research': 'openrouter',
      'analysis': 'openrouter', 
      'presentation': 'fal',
      'visual': 'fal',
      'planning': 'openrouter',
      'execution': 'openrouter'
    }
    return providerMapping[subtaskType] || 'openrouter'
  }

  extractSearchQuery(description) {
    // Simple extraction - in production, use NLP
    const stopWords = ['research', 'analyze', 'about', 'information', 'find', 'search']
    const words = description.toLowerCase().split(' ')
    const meaningfulWords = words.filter(word => 
      !stopWords.includes(word) && word.length > 2
    )
    return meaningfulWords.slice(0, 5).join(' ')
  }

  createDiagramPrompt(question, analysis) {
    return `Create a professional research diagram or infographic that visually represents the key concepts and findings from research on "${question}". 

    The diagram should include:
    - Main topic at the center
    - Key findings and insights as connected elements
    - Visual hierarchy showing relationships
    - Clean, professional design suitable for a research report
    
    Style: Clean, modern, informative diagram with clear labels and logical flow. Use a professional color scheme.`
  }

  extractKeyInsight(analysis) {
    if (typeof analysis === 'string') {
      // Extract first meaningful sentence
      const sentences = analysis.split('.').filter(s => s.trim().length > 20)
      return sentences[0]?.trim() + '.' || 'Key insights identified'
    }
    return analysis?.text?.substring(0, 100) + '...' || 'Analysis completed'
  }

  generateConclusions(question, analysis, researchData) {
    const successfulResearch = researchData?.filter(r => r.success).length || 0
    
    return [
      `Based on comprehensive research of ${successfulResearch} sources, significant insights about "${question}" have been identified.`,
      analysis?.content ? 
        `The analysis reveals ${this.extractKeyInsight(analysis.content)}` :
        'The research provides valuable perspectives on the topic.',
      'These findings contribute to a deeper understanding of the subject matter.',
      'Further investigation in specific areas could yield additional insights.'
    ]
  }

  async storeStructuredMemory(type, data) {
    await this.orchestrator.storeMemory(null, data, {
      memoryType: 'task',
      importance: 7,
      tags: ['research', type, 'enhanced_agent']
    })
  }

  getUsedProviders(context) {
    // In production, track this more systematically
    return ['OpenRouter', 'FAL AI']
  }

  getUsedTools(context) {
    return ['task_splitter', 'web_search', 'content_generation', 'data_processing']
  }

  getDelegationCount(context) {
    return 2 // Analysis delegation + diagram generation
  }
}