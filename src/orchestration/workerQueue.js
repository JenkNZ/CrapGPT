// CrapGPT Worker Queue System
// Handles heavy/risky operations that must run remotely

import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import { r2 } from '../server/r2.js'

const config = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
  },
  queues: {
    default: 'crapgpt:default',
    heavy: 'crapgpt:heavy',
    risky: 'crapgpt:risky',
    media: 'crapgpt:media',
    security: 'crapgpt:security'
  },
  workers: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 5,
    timeout: parseInt(process.env.WORKER_TIMEOUT) || 300000, // 5 minutes
    maxRetries: parseInt(process.env.WORKER_MAX_RETRIES) || 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
}

class WorkerQueue {
  constructor() {
    this.redis = null
    this.publisher = null
    this.subscriber = null
    this.isConnected = false
    
    this.init()
  }

  async init() {
    try {
      // Create Redis connections
      this.redis = new Redis(config.redis)
      this.publisher = new Redis(config.redis)
      this.subscriber = new Redis(config.redis)
      
      // Set up connection event handlers
      this.redis.on('connect', () => {
        console.log('🔗 Worker Queue Redis connected')
        this.isConnected = true
      })
      
      this.redis.on('error', (error) => {
        console.error('🔥 Worker Queue Redis error:', error)
        this.isConnected = false
      })
      
      // Initialize job processing
      this.startWorkers()
      
    } catch (error) {
      console.error('🔥 Worker Queue initialization failed:', error)
    }
  }

  // Job scheduling based on task characteristics
  determineQueue(taskType, input, options = {}) {
    const analysis = this.analyzeJobCharacteristics(taskType, input, options)
    
    if (analysis.isSecurity) return config.queues.security
    if (analysis.isMedia) return config.queues.media
    if (analysis.isRisky) return config.queues.risky
    if (analysis.isHeavy) return config.queues.heavy
    
    return config.queues.default
  }

  analyzeJobCharacteristics(taskType, input, options) {
    const inputStr = typeof input === 'string' ? input.toLowerCase() : JSON.stringify(input).toLowerCase()
    
    return {
      isSecurity: this.isSecurityJob(taskType, inputStr),
      isMedia: this.isMediaJob(taskType, inputStr),
      isRisky: this.isRiskyJob(taskType, inputStr, options),
      isHeavy: this.isHeavyJob(taskType, inputStr, options)
    }
  }

  isSecurityJob(taskType, input) {
    return [
      'security-scan', 'vulnerability-assessment', 'penetration-test',
      'port-scan', 'network-scan', 'malware-analysis'
    ].includes(taskType) || /\b(scan|hack|exploit|vuln|security|nmap)\b/.test(input)
  }

  isMediaJob(taskType, input) {
    return [
      'image-generation', 'video-generation', 'audio-generation',
      'image-processing', 'video-processing', 'audio-processing'
    ].includes(taskType) || /\b(image|video|audio|media|generate|render)\b/.test(input)
  }

  isRiskyJob(taskType, input, options) {
    const riskyPatterns = [
      /\b(shell|exec|system|subprocess)\b/,
      /\b(download|upload|fetch|curl|wget)\b/,
      /\b(pdf|doc|xls|zip|tar|exe)\b/,
      /<script[^>]*>.*?<\/script>/i,
      /javascript:|data:|vbscript:/i
    ]
    
    return riskyPatterns.some(pattern => pattern.test(input)) || 
           options.untrustedInput || 
           options.allowNetworkAccess ||
           taskType.includes('file-processing')
  }

  isHeavyJob(taskType, input, options) {
    return [
      'llm-inference', 'embedding-generation', 'data-processing',
      'compilation', 'compression', 'machine-learning'
    ].includes(taskType) || 
    options.parallel ||
    options.batch ||
    (input && input.length > 50000) // > 50KB input
  }

  // Enqueue job for remote processing
  async enqueue(jobType, payload, options = {}) {
    if (!this.isConnected) {
      throw new Error('Worker queue not connected')
    }

    const jobId = uuidv4()
    const queue = this.determineQueue(jobType, payload.input, options)
    
    const job = {
      id: jobId,
      type: jobType,
      payload,
      options,
      metadata: {
        createdAt: new Date().toISOString(),
        queue,
        priority: options.priority || 'normal',
        retries: 0,
        maxRetries: options.maxRetries || config.workers.maxRetries,
        timeout: options.timeout || config.workers.timeout
      },
      status: 'queued'
    }

    // Store job details in Redis
    await this.redis.hset(`job:${jobId}`, {
      data: JSON.stringify(job),
      status: 'queued',
      createdAt: job.metadata.createdAt
    })

    // Store job data in R2 for audit and persistence
    try {
      const jobLogPath = r2.buildWorkerPath(jobType, 'jobs', `${jobId}.json`)
      await r2.putJson(jobLogPath, {
        ...job,
        auditTrail: [
          {
            timestamp: new Date().toISOString(),
            status: 'queued',
            queue,
            priority: options.priority || 'normal'
          }
        ]
      })
    } catch (r2Error) {
      console.error('Failed to store job in R2:', r2Error)
      // Don't fail job creation if R2 storage fails
    }

    // Add to processing queue with priority
    const priority = this.getPriorityScore(options.priority)
    await this.redis.zadd(queue, priority, jobId)

    // Set expiration for job data (24 hours)
    await this.redis.expire(`job:${jobId}`, 86400)

    console.log(`📋 Job ${jobId} enqueued to ${queue}`)
    
    return {
      jobId,
      queue,
      status: 'queued',
      estimatedWaitTime: await this.estimateWaitTime(queue)
    }
  }

  getPriorityScore(priority) {
    const scores = {
      critical: 1,
      high: 10,
      normal: 50,
      low: 100
    }
    return scores[priority] || scores.normal
  }

  async estimateWaitTime(queue) {
    const queueLength = await this.redis.zcard(queue)
    const avgProcessingTime = 30000 // 30 seconds average
    return queueLength * avgProcessingTime
  }

  // Get job status
  async getJobStatus(jobId) {
    const jobData = await this.redis.hget(`job:${jobId}`, 'data')
    if (!jobData) {
      return { status: 'not_found' }
    }

    const job = JSON.parse(jobData)
    const currentStatus = await this.redis.hget(`job:${jobId}`, 'status')
    
    return {
      id: jobId,
      status: currentStatus || job.status,
      type: job.type,
      createdAt: job.metadata.createdAt,
      queue: job.metadata.queue,
      retries: job.metadata.retries
    }
  }

  // Start worker processes for different queues
  startWorkers() {
    Object.values(config.queues).forEach(queueName => {
      this.startQueueWorker(queueName)
    })
  }

  async startQueueWorker(queueName) {
    console.log(`🏗️ Starting worker for queue: ${queueName}`)
    
    // Process jobs continuously
    const processJobs = async () => {
      try {
        while (this.isConnected) {
          const jobId = await this.redis.bzpopmin(queueName, 10) // 10 second timeout
          
          if (jobId && jobId.length >= 2) {
            await this.processJob(jobId[2]) // jobId is in the third element
          }
        }
      } catch (error) {
        console.error(`Worker error for ${queueName}:`, error)
        // Restart worker after delay
        setTimeout(() => processJobs(), 5000)
      }
    }

    // Start multiple concurrent workers per queue
    const workers = Math.min(config.workers.concurrency, 3)
    for (let i = 0; i < workers; i++) {
      processJobs()
    }
  }

  async processJob(jobId) {
    try {
      console.log(`🔄 Processing job ${jobId}`)
      
      // Get job data
      const jobDataStr = await this.redis.hget(`job:${jobId}`, 'data')
      if (!jobDataStr) {
        console.warn(`Job ${jobId} data not found`)
        return
      }

      const job = JSON.parse(jobDataStr)
      
      // Update status to processing
      await this.redis.hset(`job:${jobId}`, 'status', 'processing')
      job.status = 'processing'
      job.metadata.startedAt = new Date().toISOString()

      // Update job log in R2
      await this.updateJobLogInR2(job, 'processing', { startedAt: job.metadata.startedAt })

      // Route to appropriate processor based on job type
      const result = await this.routeJobToProcessor(job)
      
      const completedAt = new Date().toISOString()
      
      // Store result in Redis
      await this.redis.hset(`job:${jobId}`, {
        status: 'completed',
        result: JSON.stringify(result),
        completedAt
      })

      // Store completion data and artifacts in R2
      await this.updateJobLogInR2(job, 'completed', { 
        completedAt,
        result,
        executionTime: new Date(completedAt) - new Date(job.metadata.startedAt)
      })

      // Store any artifacts from the result
      await this.storeJobArtifacts(job, result)

      console.log(`✅ Job ${jobId} completed successfully`)
      
    } catch (error) {
      console.error(`❌ Job ${jobId} failed:`, error)
      
      // Update job log with failure in R2
      const jobDataStr = await this.redis.hget(`job:${jobId}`, 'data')
      if (jobDataStr) {
        const job = JSON.parse(jobDataStr)
        await this.updateJobLogInR2(job, 'failed', { 
          error: error.message,
          failedAt: new Date().toISOString()
        })
      }
      
      await this.handleJobFailure(jobId, error)
    }
  }

  async routeJobToProcessor(job) {
    const { type, payload, options } = job
    
    // Import orchestration manager for remote calls
    const { orchestrationManager } = await import('./index.js')
    
    switch (type) {
      case 'llm-inference':
        return await orchestrationManager.callAI(
          options.provider || 'openrouter',
          options.model || 'gpt-4o-mini',
          payload.input,
          payload.options
        )
        
      case 'image-generation':
        return await orchestrationManager.callAI(
          'fal',
          'flux-dev',
          payload.prompt,
          payload.options
        )
        
      case 'video-generation':
        return await orchestrationManager.callAI(
          'modelslab',
          'ml-video',
          payload.prompt,
          payload.options
        )
        
      case 'security-scan':
        // Route to MCPJungle for isolated execution
        return await orchestrationManager.delegateToAgent(
          'system',
          'security-scanner',
          payload.input,
          { isolated: true, timeout: 60000 }
        )
        
      case 'workflow-execution':
        return await orchestrationManager.runWorkflow(
          payload.workflowId,
          payload.parameters
        )
        
      case 'infrastructure-deployment':
        return await orchestrationManager.deployInfrastructure(
          payload.template,
          payload.config
        )
        
      case 'tool-execution':
        return await orchestrationManager.executeTool(
          payload.toolName,
          payload.parameters
        )
        
      case 'file-processing':
        // Route to secure Arcade job for file processing
        return await this.processFileSecurely(payload)
        
      default:
        throw new Error(`Unknown job type: ${type}`)
    }
  }

  async processFileSecurely(payload) {
    // This would typically create an Arcade job with strict sandboxing
    const { orchestrationManager } = await import('./index.js')
    
    return await orchestrationManager.deployInfrastructure('secure-file-processor', {
      inputFile: payload.fileUrl,
      processingType: payload.processingType,
      outputBucket: payload.outputBucket,
      maxExecutionTime: 300000, // 5 minutes
      securityProfile: 'strict'
    })
  }

  async handleJobFailure(jobId, error) {
    const jobDataStr = await this.redis.hget(`job:${jobId}`, 'data')
    if (!jobDataStr) return

    const job = JSON.parse(jobDataStr)
    job.metadata.retries = (job.metadata.retries || 0) + 1

    if (job.metadata.retries < job.metadata.maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, job.metadata.retries) * config.workers.backoff.delay
      
      setTimeout(async () => {
        const queue = job.metadata.queue
        const priority = this.getPriorityScore(job.metadata.priority)
        
        // Re-queue the job
        await this.redis.zadd(queue, priority, jobId)
        await this.redis.hset(`job:${jobId}`, {
          data: JSON.stringify(job),
          status: 'queued'
        })
        
        console.log(`🔄 Retrying job ${jobId} (attempt ${job.metadata.retries})`)
      }, delay)
      
    } else {
      // Mark as failed
      await this.redis.hset(`job:${jobId}`, {
        status: 'failed',
        error: error.message,
        failedAt: new Date().toISOString()
      })
      
      console.error(`💀 Job ${jobId} failed permanently after ${job.metadata.retries} retries`)
    }
  }

  // Update job log in R2 with status changes
  async updateJobLogInR2(job, status, additionalData = {}) {
    try {
      const jobLogPath = r2.buildWorkerPath(job.type, 'jobs', `${job.id}.json`)
      
      // Get existing job log or create new one
      let jobLog
      try {
        jobLog = await r2.getJson(jobLogPath)
      } catch (error) {
        // Create new log if it doesn't exist
        jobLog = {
          ...job,
          auditTrail: []
        }
      }
      
      // Add new audit entry
      jobLog.auditTrail.push({
        timestamp: new Date().toISOString(),
        status,
        ...additionalData
      })
      
      jobLog.currentStatus = status
      jobLog.updatedAt = new Date().toISOString()
      
      await r2.putJson(jobLogPath, jobLog)
    } catch (error) {
      console.error(`Failed to update job ${job.id} log in R2:`, error)
      // Don't throw - logging failures shouldn't break job processing
    }
  }

  // Store job artifacts (images, files, etc.) in R2
  async storeJobArtifacts(job, result) {
    try {
      if (!result || typeof result !== 'object') return
      
      // Store images
      if (result.images && Array.isArray(result.images)) {
        for (let i = 0; i < result.images.length; i++) {
          const imageUrl = result.images[i]
          if (imageUrl && imageUrl.startsWith('http')) {
            try {
              // Download and store image
              const response = await fetch(imageUrl)
              if (response.ok) {
                const imageBuffer = await response.arrayBuffer()
                const artifactPath = r2.buildWorkerPath(job.type, 'artifacts', `${job.id}_image_${i}.jpg`)
                
                await r2.putObject(artifactPath, imageBuffer, {
                  contentType: 'image/jpeg',
                  metadata: {
                    'job-id': job.id,
                    'job-type': job.type,
                    'artifact-type': 'image',
                    'original-url': imageUrl,
                    'created-at': new Date().toISOString()
                  }
                })
                
                // Update result to point to R2 URL instead of external URL
                result.images[i] = await r2.presignGet(artifactPath, 86400) // 24 hour access
              }
            } catch (imageError) {
              console.error(`Failed to store image artifact for job ${job.id}:`, imageError)
            }
          }
        }
      }
      
      // Store files
      if (result.files && Array.isArray(result.files)) {
        for (let i = 0; i < result.files.length; i++) {
          const fileData = result.files[i]
          if (fileData && (fileData.url || fileData.content)) {
            try {
              const artifactPath = r2.buildWorkerPath(job.type, 'artifacts', `${job.id}_file_${i}.dat`)
              
              if (fileData.url && fileData.url.startsWith('http')) {
                // Download file from URL
                const response = await fetch(fileData.url)
                if (response.ok) {
                  const fileBuffer = await response.arrayBuffer()
                  await r2.putObject(artifactPath, fileBuffer, {
                    contentType: fileData.contentType || 'application/octet-stream',
                    metadata: {
                      'job-id': job.id,
                      'job-type': job.type,
                      'artifact-type': 'file',
                      'original-name': fileData.name || `file_${i}`,
                      'original-url': fileData.url,
                      'created-at': new Date().toISOString()
                    }
                  })
                  
                  result.files[i].url = await r2.presignGet(artifactPath, 86400)
                }
              } else if (fileData.content) {
                // Store content directly
                await r2.putObject(artifactPath, Buffer.from(fileData.content), {
                  contentType: fileData.contentType || 'text/plain',
                  metadata: {
                    'job-id': job.id,
                    'job-type': job.type,
                    'artifact-type': 'file',
                    'original-name': fileData.name || `file_${i}`,
                    'created-at': new Date().toISOString()
                  }
                })
                
                result.files[i].url = await r2.presignGet(artifactPath, 86400)
                delete result.files[i].content // Remove content after storing
              }
            } catch (fileError) {
              console.error(`Failed to store file artifact for job ${job.id}:`, fileError)
            }
          }
        }
      }
      
      // Store any other data as JSON
      if (result.data && typeof result.data === 'object') {
        try {
          const dataPath = r2.buildWorkerPath(job.type, 'artifacts', `${job.id}_data.json`)
          await r2.putJson(dataPath, result.data)
          result.dataUrl = await r2.presignGet(dataPath, 86400)
        } catch (dataError) {
          console.error(`Failed to store data artifact for job ${job.id}:`, dataError)
        }
      }
      
    } catch (error) {
      console.error(`Failed to store artifacts for job ${job.id}:`, error)
      // Don't throw - artifact storage failures shouldn't break job processing
    }
  }

  // Clean up old jobs
  async cleanup() {
    const cutoff = new Date(Date.now() - 86400000).toISOString() // 24 hours ago
    
    // Find old completed/failed jobs
    const pattern = 'job:*'
    const keys = await this.redis.keys(pattern)
    
    for (const key of keys) {
      const createdAt = await this.redis.hget(key, 'createdAt')
      const status = await this.redis.hget(key, 'status')
      
      if (createdAt && createdAt < cutoff && ['completed', 'failed'].includes(status)) {
        await this.redis.del(key)
      }
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down worker queue...')
    this.isConnected = false
    
    if (this.redis) await this.redis.disconnect()
    if (this.publisher) await this.publisher.disconnect()
    if (this.subscriber) await this.subscriber.disconnect()
    
    console.log('✅ Worker queue shutdown complete')
  }
}

// Create global worker queue instance
export const workerQueue = new WorkerQueue()

// Convenience functions
export const enqueueJob = (jobType, payload, options) => 
  workerQueue.enqueue(jobType, payload, options)

export const getJobStatus = (jobId) => 
  workerQueue.getJobStatus(jobId)

export const enqueueHeavyTask = (taskType, input, options = {}) =>
  enqueueJob(taskType, { input, options }, { priority: 'normal', ...options })

export const enqueueRiskyTask = (taskType, input, options = {}) =>
  enqueueJob(taskType, { input, options }, { priority: 'high', isolated: true, ...options })

export const enqueueMediaGeneration = (type, prompt, options = {}) =>
  enqueueJob(`${type}-generation`, { prompt, options }, { priority: 'normal', ...options })

export const enqueueSecurityScan = (target, scanType, options = {}) =>
  enqueueJob('security-scan', { input: target, scanType, options }, { 
    priority: 'high', 
    isolated: true, 
    timeout: 300000,
    ...options 
  })

export default workerQueue