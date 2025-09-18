// Demo Tools for Enhanced Agent System
// Includes web search simulation, data processing, and other utility tools

import { BaseTool } from '../toolExecutor.js'

/**
 * Web Search Tool (simulated for demo)
 */
export class WebSearchTool extends BaseTool {
  constructor() {
    super('web_search', '1.0.0')
    this.permissions = ['web_access']
    this.timeout = 15000
  }

  getDescription() {
    return 'Search the web for information using search engines'
  }

  getInputSchema() {
    return {
      query: { type: 'string', required: true, description: 'Search query' },
      maxResults: { type: 'number', default: 5, description: 'Maximum results to return' },
      language: { type: 'string', default: 'en', description: 'Search language' }
    }
  }

  validateInput(input) {
    return typeof input.query === 'string' && input.query.length > 0
  }

  async execute(input, context) {
    const { query, maxResults = 5, language = 'en' } = input

    // Simulate web search results (in production, integrate with real search API)
    const simulatedResults = [
      {
        title: `${query} - Overview and Key Information`,
        url: `https://example.com/search/${encodeURIComponent(query)}/overview`,
        snippet: `Comprehensive information about ${query}, including key facts, recent developments, and expert analysis. This source provides detailed insights and current data.`,
        datePublished: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: `${query} - Latest News and Updates`,
        url: `https://news.example.com/${encodeURIComponent(query)}`,
        snippet: `Recent news and updates related to ${query}. Stay informed with the latest developments, trends, and analysis from trusted sources.`,
        datePublished: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: `${query} - Research and Data`,
        url: `https://research.example.com/data/${encodeURIComponent(query)}`,
        snippet: `Research data, statistics, and analytical insights about ${query}. Access peer-reviewed information and data-driven analysis.`,
        datePublished: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: `Understanding ${query} - Expert Guide`,
        url: `https://guide.example.com/${encodeURIComponent(query)}`,
        snippet: `Expert guide and comprehensive explanation of ${query}. Learn from industry professionals and get detailed explanations.`,
        datePublished: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        title: `${query} - Community Discussion and Insights`,
        url: `https://forum.example.com/discussion/${encodeURIComponent(query)}`,
        snippet: `Community discussions, insights, and experiences related to ${query}. Join the conversation and learn from others.`,
        datePublished: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    return {
      query,
      results: simulatedResults.slice(0, maxResults),
      totalResults: simulatedResults.length,
      searchTime: Math.random() * 0.5 + 0.2,
      language,
      metadata: {
        searchEngine: 'demo-search',
        timestamp: new Date().toISOString(),
        cached: false
      }
    }
  }
}

/**
 * Data Processing Tool
 */
export class DataProcessingTool extends BaseTool {
  constructor() {
    super('data_processing', '1.0.0')
    this.permissions = []
    this.timeout = 20000
  }

  getDescription() {
    return 'Process and analyze structured data, perform calculations, and generate insights'
  }

  getInputSchema() {
    return {
      operation: { type: 'string', required: true, description: 'Operation to perform' },
      data: { type: 'object', required: true, description: 'Input data to process' },
      options: { type: 'object', description: 'Processing options' }
    }
  }

  validateInput(input) {
    return typeof input.operation === 'string' && input.data !== undefined
  }

  async execute(input, context) {
    const { operation, data, options = {} } = input

    switch (operation.toLowerCase()) {
      case 'summarize':
        return this.summarizeData(data, options)
      
      case 'analyze_trends':
        return this.analyzeTrends(data, options)
      
      case 'extract_insights':
        return this.extractInsights(data, options)
      
      case 'calculate_statistics':
        return this.calculateStatistics(data, options)
      
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }

  summarizeData(data, options) {
    if (Array.isArray(data)) {
      return {
        summary: {
          totalItems: data.length,
          dataTypes: [...new Set(data.map(item => typeof item))],
          sampleData: data.slice(0, Math.min(3, data.length)),
          structure: this.analyzeStructure(data)
        },
        operation: 'summarize',
        timestamp: new Date().toISOString()
      }
    } else if (typeof data === 'object') {
      return {
        summary: {
          keys: Object.keys(data),
          totalProperties: Object.keys(data).length,
          dataTypes: Object.entries(data).reduce((acc, [key, value]) => {
            acc[key] = typeof value
            return acc
          }, {}),
          nestedObjects: Object.values(data).filter(v => typeof v === 'object' && v !== null).length
        },
        operation: 'summarize',
        timestamp: new Date().toISOString()
      }
    } else {
      return {
        summary: {
          type: typeof data,
          value: data,
          length: data.toString().length
        },
        operation: 'summarize',
        timestamp: new Date().toISOString()
      }
    }
  }

  analyzeTrends(data, options) {
    if (!Array.isArray(data)) {
      throw new Error('Trend analysis requires array data')
    }

    const numericData = data.filter(item => typeof item === 'number')
    if (numericData.length < 2) {
      throw new Error('Need at least 2 numeric values for trend analysis')
    }

    const trend = this.calculateTrend(numericData)
    
    return {
      trends: {
        direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        slope: trend,
        confidence: Math.min(numericData.length / 10, 1), // Simple confidence based on data points
        dataPoints: numericData.length,
        range: {
          min: Math.min(...numericData),
          max: Math.max(...numericData)
        }
      },
      operation: 'analyze_trends',
      timestamp: new Date().toISOString()
    }
  }

  calculateTrend(data) {
    const n = data.length
    const x = Array.from({length: n}, (_, i) => i)
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = data.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  }

  extractInsights(data, options) {
    const insights = []

    if (Array.isArray(data)) {
      const numericData = data.filter(item => typeof item === 'number')
      const stringData = data.filter(item => typeof item === 'string')
      
      if (numericData.length > 0) {
        const avg = numericData.reduce((a, b) => a + b, 0) / numericData.length
        const sorted = [...numericData].sort((a, b) => a - b)
        const median = sorted.length % 2 === 0 
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]

        insights.push({
          type: 'statistical',
          finding: `Average value is ${avg.toFixed(2)}, median is ${median}`,
          confidence: 'high',
          data: { average: avg, median, count: numericData.length }
        })
      }

      if (stringData.length > 0) {
        const commonWords = this.findCommonWords(stringData)
        insights.push({
          type: 'textual',
          finding: `Most common terms: ${commonWords.slice(0, 3).map(w => w.word).join(', ')}`,
          confidence: 'medium',
          data: { commonWords, totalStrings: stringData.length }
        })
      }
    }

    if (insights.length === 0) {
      insights.push({
        type: 'general',
        finding: 'Data structure identified but no specific patterns detected',
        confidence: 'low',
        data: { dataType: typeof data }
      })
    }

    return {
      insights,
      operation: 'extract_insights',
      timestamp: new Date().toISOString()
    }
  }

  calculateStatistics(data, options) {
    if (!Array.isArray(data)) {
      throw new Error('Statistics calculation requires array data')
    }

    const numericData = data.filter(item => typeof item === 'number')
    if (numericData.length === 0) {
      throw new Error('No numeric data found for statistical analysis')
    }

    const sorted = [...numericData].sort((a, b) => a - b)
    const sum = numericData.reduce((a, b) => a + b, 0)
    const mean = sum / numericData.length
    const variance = numericData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericData.length
    const stdDev = Math.sqrt(variance)

    return {
      statistics: {
        count: numericData.length,
        sum,
        mean,
        median: sorted.length % 2 === 0 
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)],
        min: Math.min(...numericData),
        max: Math.max(...numericData),
        range: Math.max(...numericData) - Math.min(...numericData),
        variance,
        standardDeviation: stdDev,
        quartiles: {
          q1: sorted[Math.floor(sorted.length * 0.25)],
          q3: sorted[Math.floor(sorted.length * 0.75)]
        }
      },
      operation: 'calculate_statistics',
      timestamp: new Date().toISOString()
    }
  }

  analyzeStructure(data) {
    if (data.length === 0) return 'empty'
    
    const firstItem = data[0]
    const isHomogeneous = data.every(item => typeof item === typeof firstItem)
    
    return {
      homogeneous: isHomogeneous,
      primaryType: typeof firstItem,
      hasObjects: data.some(item => typeof item === 'object' && item !== null),
      hasArrays: data.some(item => Array.isArray(item)),
      complexity: isHomogeneous ? 'simple' : 'mixed'
    }
  }

  findCommonWords(strings) {
    const wordCounts = {}
    
    strings.forEach(str => {
      const words = str.toLowerCase().match(/\b\w+\b/g) || []
      words.forEach(word => {
        if (word.length > 2) { // Skip short words
          wordCounts[word] = (wordCounts[word] || 0) + 1
        }
      })
    })

    return Object.entries(wordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }
}

/**
 * Content Generation Tool
 */
export class ContentGenerationTool extends BaseTool {
  constructor() {
    super('content_generation', '1.0.0')
    this.permissions = []
    this.timeout = 25000
  }

  getDescription() {
    return 'Generate various types of content including text, structured data, and templates'
  }

  getInputSchema() {
    return {
      type: { type: 'string', required: true, description: 'Type of content to generate' },
      specifications: { type: 'object', required: true, description: 'Content specifications' },
      style: { type: 'string', description: 'Content style or tone' }
    }
  }

  validateInput(input) {
    return typeof input.type === 'string' && input.specifications !== undefined
  }

  async execute(input, context) {
    const { type, specifications, style = 'professional' } = input

    switch (type.toLowerCase()) {
      case 'summary':
        return this.generateSummary(specifications, style)
      
      case 'report':
        return this.generateReport(specifications, style)
      
      case 'structured_data':
        return this.generateStructuredData(specifications, style)
      
      case 'outline':
        return this.generateOutline(specifications, style)
      
      default:
        throw new Error(`Unknown content type: ${type}`)
    }
  }

  generateSummary(specs, style) {
    const { topic, keyPoints = [], length = 'medium' } = specs
    
    const lengthMap = {
      'short': 2,
      'medium': 4,
      'long': 6
    }
    
    const sentences = lengthMap[length] || 4
    
    return {
      content: {
        title: `Summary: ${topic}`,
        text: `This is a ${style} summary about ${topic}. ${keyPoints.length > 0 ? 
          'Key points include: ' + keyPoints.slice(0, 3).join(', ') + '.' : ''} 
          This summary provides essential information and insights in a concise format. 
          ${sentences > 3 ? 'Additional context and background information helps provide a complete understanding of the topic. ' : ''}
          ${sentences > 5 ? 'Further analysis and implications are considered for comprehensive coverage.' : ''}`.trim(),
        keyPoints,
        wordCount: Math.floor(sentences * 25),
        style
      },
      metadata: {
        generationType: 'summary',
        timestamp: new Date().toISOString(),
        specifications: specs
      }
    }
  }

  generateReport(specs, style) {
    const { title, sections = [], data = {} } = specs
    
    const reportSections = sections.map(section => ({
      title: section,
      content: `This section covers ${section.toLowerCase()}. The analysis shows relevant findings and insights. 
        ${Object.keys(data).length > 0 ? 'Supporting data indicates key trends and patterns.' : ''} 
        Detailed examination reveals important considerations and implications.`
    }))

    if (reportSections.length === 0) {
      reportSections.push(
        { title: 'Overview', content: `Comprehensive overview of ${title}. This report examines key aspects and provides detailed analysis.` },
        { title: 'Analysis', content: 'Detailed analysis of available information, trends, and patterns.' },
        { title: 'Conclusions', content: 'Summary of findings and recommendations based on the analysis.' }
      )
    }

    return {
      content: {
        title: title || 'Generated Report',
        sections: reportSections,
        executiveSummary: `Executive summary of ${title}. This report provides comprehensive analysis and key insights.`,
        totalSections: reportSections.length,
        estimatedReadTime: Math.ceil(reportSections.length * 2.5) + ' minutes'
      },
      metadata: {
        generationType: 'report',
        timestamp: new Date().toISOString(),
        style,
        specifications: specs
      }
    }
  }

  generateStructuredData(specs, style) {
    const { format, fields = [], sampleSize = 3 } = specs
    
    const sampleData = []
    
    for (let i = 0; i < sampleSize; i++) {
      const dataPoint = {}
      fields.forEach(field => {
        switch (field.type || 'string') {
          case 'number':
            dataPoint[field.name] = Math.floor(Math.random() * 1000) + 1
            break
          case 'boolean':
            dataPoint[field.name] = Math.random() > 0.5
            break
          case 'date':
            dataPoint[field.name] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
            break
          default:
            dataPoint[field.name] = `Sample ${field.name} ${i + 1}`
        }
      })
      sampleData.push(dataPoint)
    }

    return {
      content: {
        format: format || 'json',
        schema: fields,
        sampleData,
        totalFields: fields.length,
        dataTypes: fields.map(f => f.type || 'string')
      },
      metadata: {
        generationType: 'structured_data',
        timestamp: new Date().toISOString(),
        specifications: specs
      }
    }
  }

  generateOutline(specs, style) {
    const { topic, depth = 2, sections = 5 } = specs
    
    const outline = []
    
    for (let i = 1; i <= sections; i++) {
      const mainSection = {
        level: 1,
        title: `${i}. Main Section ${i} - ${topic}`,
        subsections: []
      }
      
      if (depth > 1) {
        const subsectionCount = Math.floor(Math.random() * 3) + 2 // 2-4 subsections
        for (let j = 1; j <= subsectionCount; j++) {
          mainSection.subsections.push({
            level: 2,
            title: `${i}.${j} Subsection ${j}`,
            description: `Detailed coverage of specific aspect ${j}`
          })
        }
      }
      
      outline.push(mainSection)
    }

    return {
      content: {
        topic,
        outline,
        totalSections: sections,
        maxDepth: depth,
        estimatedLength: `${sections * 500} words`
      },
      metadata: {
        generationType: 'outline',
        timestamp: new Date().toISOString(),
        style,
        specifications: specs
      }
    }
  }
}