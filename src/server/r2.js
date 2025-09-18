// CrapGPT Unified R2 Storage Service
// Single artifact store for all components: Wasp, OpenOps, ToolHive, Arcade, HexStrike, MCPJungle

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

// R2 Configuration
const config = {
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  },
  forcePathStyle: true // Required for R2
}

const bucket = process.env.R2_BUCKET || 'crapgpt'

// Initialize S3 client for R2
const s3 = new S3Client(config)

// Standard folder layout for CrapGPT R2 bucket
export const R2_PATHS = {
  // User-specific data
  users: (userId) => `users/${userId}`,
  userSessions: (userId, sessionId) => `users/${userId}/sessions/${sessionId}`,
  userMessages: (userId, sessionId, messageId) => `users/${userId}/sessions/${sessionId}/messages/${messageId}.json`,
  userAttachments: (userId, sessionId, fileId) => `users/${userId}/sessions/${sessionId}/attachments/${fileId}`,
  userImages: (userId, sessionId, imageId) => `users/${userId}/sessions/${sessionId}/images/${imageId}.png`,
  userAudio: (userId, sessionId, audioId) => `users/${userId}/sessions/${sessionId}/audio/${audioId}.wav`,
  userMemory: (userId, embeddingId) => `users/${userId}/memory/longterm/${embeddingId}.json`,
  
  // Agent execution data
  agentRuns: (runId) => `agents/runs/${runId}`,
  agentStdout: (runId) => `agents/runs/${runId}/stdout.txt`,
  agentArtifacts: (runId, filename) => `agents/runs/${runId}/artifacts/${filename}`,
  
  // OpenOps workflow data
  openopsRuns: (runId) => `openops/runs/${runId}`,
  openopsLogs: (runId) => `openops/runs/${runId}/logs.json`,
  openopsArtifacts: (runId, filename) => `openops/artifacts/${runId}/${filename}`,
  
  // MCP tool execution data
  mcpCalls: (callId) => `mcp/calls/${callId}.json`,
  mcpTranscripts: (callId) => `mcp/transcripts/${callId}.txt`,
  
  // File uploads
  uploads: (date, uuid) => `uploads/${date}/${uuid}`,
  
  // ToolHive artifacts
  toolhive: (toolName, runId) => `toolhive/${toolName}/${runId}`,
  toolhiveResults: (toolName, runId) => `toolhive/${toolName}/${runId}/results.json`,
  
  // Arcade job artifacts
  arcade: (jobId) => `arcade/jobs/${jobId}`,
  arcadeArtifacts: (jobId, filename) => `arcade/jobs/${jobId}/artifacts/${filename}`,
  
  // HexStrike security scan results
  hexstrike: (scanId) => `hexstrike/scans/${scanId}`,
  hexstrikeResults: (scanId) => `hexstrike/scans/${scanId}/results.json`
}

class R2Storage {
  constructor() {
    this.client = s3
    this.bucket = bucket
  }

  // Core JSON storage function
  async putJson(key, data, metadata = {}) {
    try {
      const body = Buffer.from(JSON.stringify(data, null, 2))
      
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
        Metadata: {
          'stored-at': new Date().toISOString(),
          'content-type': 'application/json',
          ...metadata
        }
      }))
      
      const r2Uri = `r2://${this.bucket}/${key}`
      console.log(`📦 Stored to R2: ${r2Uri}`)
      
      return r2Uri
    } catch (error) {
      console.error('R2 putJson error:', error)
      throw new Error(`Failed to store JSON to R2: ${error.message}`)
    }
  }

  // Core binary/text storage function  
  async putObject(key, data, contentType = 'application/octet-stream', metadata = {}) {
    try {
      const body = typeof data === 'string' ? Buffer.from(data) : data
      
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: {
          'stored-at': new Date().toISOString(),
          'content-type': contentType,
          ...metadata
        }
      }))
      
      const r2Uri = `r2://${this.bucket}/${key}`
      console.log(`📦 Stored to R2: ${r2Uri}`)
      
      return r2Uri
    } catch (error) {
      console.error('R2 putObject error:', error)
      throw new Error(`Failed to store object to R2: ${error.message}`)
    }
  }

  // Get object from R2
  async getObject(key) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
      
      const response = await this.client.send(command)
      return response
    } catch (error) {
      console.error('R2 getObject error:', error)
      throw new Error(`Failed to get object from R2: ${error.message}`)
    }
  }

  // Get JSON object from R2
  async getJson(key) {
    try {
      const response = await this.getObject(key)
      const bodyString = await response.Body.transformToString()
      return JSON.parse(bodyString)
    } catch (error) {
      console.error('R2 getJson error:', error)
      throw new Error(`Failed to get JSON from R2: ${error.message}`)
    }
  }

  // Generate presigned PUT URL
  async presignPut(key, contentType = 'application/octet-stream', expiresIn = 600, metadata = {}) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        Metadata: metadata
      })
      
      const signedUrl = await getSignedUrl(this.client, command, { expiresIn })
      console.log(`🔗 Generated presigned PUT URL for: ${key}`)
      
      return signedUrl
    } catch (error) {
      console.error('R2 presignPut error:', error)
      throw new Error(`Failed to generate presigned PUT URL: ${error.message}`)
    }
  }

  // Generate presigned GET URL
  async presignGet(key, expiresIn = 600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
      
      const signedUrl = await getSignedUrl(this.client, command, { expiresIn })
      console.log(`🔗 Generated presigned GET URL for: ${key}`)
      
      return signedUrl
    } catch (error) {
      console.error('R2 presignGet error:', error)
      throw new Error(`Failed to generate presigned GET URL: ${error.message}`)
    }
  }

  // List objects with prefix
  async listObjects(prefix, maxKeys = 1000) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      })
      
      const response = await this.client.send(command)
      return response.Contents || []
    } catch (error) {
      console.error('R2 listObjects error:', error)
      throw new Error(`Failed to list objects from R2: ${error.message}`)
    }
  }

  // Delete object
  async deleteObject(key) {
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      }))
      
      console.log(`🗑️ Deleted from R2: ${key}`)
    } catch (error) {
      console.error('R2 deleteObject error:', error)
      throw new Error(`Failed to delete object from R2: ${error.message}`)
    }
  }

  // Helper: Generate unique file ID with date prefix
  generateFileId() {
    const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const uuid = uuidv4()
    return { date, uuid, fileId: `${date}/${uuid}` }
  }

  // Validate key path for security
  validateKey(key, userId = null) {
    // Prevent directory traversal
    if (key.includes('..') || key.includes('//')) {
      throw new Error('Invalid key: contains directory traversal')
    }

    // If userId provided, ensure user can only access their own data
    if (userId && key.startsWith('users/')) {
      if (!key.startsWith(`users/${userId}/`)) {
        throw new Error('Access denied: cannot access other users data')
      }
    }

    return true
  }
}

// Create singleton instance
const r2Storage = new R2Storage()

// High-level helper functions for different use cases

// Chat message storage
export async function storeMessage(userId, sessionId, messageId, messageData) {
  const key = R2_PATHS.userMessages(userId, sessionId, messageId)
  return await r2Storage.putJson(key, messageData, {
    'user-id': userId,
    'session-id': sessionId,
    'message-id': messageId
  })
}

// Agent run artifact storage
export async function storeAgentArtifact(runId, filename, data, contentType) {
  const key = R2_PATHS.agentArtifacts(runId, filename)
  return await r2Storage.putObject(key, data, contentType, {
    'run-id': runId,
    'artifact-type': 'agent-output'
  })
}

// OpenOps logs storage
export async function storeOpenOpsLogs(runId, logs) {
  const key = R2_PATHS.openopsLogs(runId)
  return await r2Storage.putJson(key, logs, {
    'run-id': runId,
    'service': 'openops'
  })
}

// MCP call storage
export async function storeMcpCall(callId, callData) {
  const key = R2_PATHS.mcpCalls(callId)
  return await r2Storage.putJson(key, callData, {
    'call-id': callId,
    'service': 'mcpjungle'
  })
}

// ToolHive results storage
export async function storeToolhiveResults(toolName, runId, results) {
  const key = R2_PATHS.toolhiveResults(toolName, runId)
  return await r2Storage.putJson(key, results, {
    'tool-name': toolName,
    'run-id': runId,
    'service': 'toolhive'
  })
}

// Arcade job artifacts storage
export async function storeArcadeArtifact(jobId, filename, data, contentType) {
  const key = R2_PATHS.arcadeArtifacts(jobId, filename)
  return await r2Storage.putObject(key, data, contentType, {
    'job-id': jobId,
    'service': 'arcade'
  })
}

// HexStrike scan results storage
export async function storeHexstrikeResults(scanId, results) {
  const key = R2_PATHS.hexstrikeResults(scanId)
  return await r2Storage.putJson(key, results, {
    'scan-id': scanId,
    'service': 'hexstrike'
  })
}

// Image storage with metadata
export async function storeUserImage(userId, sessionId, imageId, imageData, metadata = {}) {
  const key = R2_PATHS.userImages(userId, sessionId, imageId)
  return await r2Storage.putObject(key, imageData, 'image/png', {
    'user-id': userId,
    'session-id': sessionId,
    'image-id': imageId,
    ...metadata
  })
}

// Generic file upload storage
export async function storeUpload(data, contentType, metadata = {}) {
  const { date, uuid } = r2Storage.generateFileId()
  const key = R2_PATHS.uploads(date, uuid)
  
  const r2Uri = await r2Storage.putObject(key, data, contentType, metadata)
  
  return {
    fileId: uuid,
    key,
    r2Uri,
    date
  }
}

// Export core functions
export const putJson = (key, data, metadata) => r2Storage.putJson(key, data, metadata)
export const putObject = (key, data, contentType, metadata) => r2Storage.putObject(key, data, contentType, metadata)
export const getObject = (key) => r2Storage.getObject(key)
export const getJson = (key) => r2Storage.getJson(key)
export const presignPut = (key, contentType, expiresIn, metadata) => r2Storage.presignPut(key, contentType, expiresIn, metadata)
export const presignGet = (key, expiresIn) => r2Storage.presignGet(key, expiresIn)
export const listObjects = (prefix, maxKeys) => r2Storage.listObjects(prefix, maxKeys)
export const deleteObject = (key) => r2Storage.deleteObject(key)
export const validateKey = (key, userId) => r2Storage.validateKey(key, userId)

// Export storage instance and paths
export { r2Storage, R2_PATHS }
export default r2Storage