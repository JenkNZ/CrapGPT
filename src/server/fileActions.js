// CrapGPT R2 File Actions
// Wasp actions for generating presigned URLs with proper authentication

import { HttpError } from '@wasp-lang/core/HttpError'
import { presignPut, presignGet, validateKey, listObjects, R2_PATHS } from './r2.js'

// Generate presigned PUT URL for file uploads
export const presignUpload = async ({ key, contentType = 'application/octet-stream', expiresIn = 600 }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required')
  }

  try {
    // Validate the key for security
    validateKey(key, context.user.id)
    
    // Generate presigned PUT URL
    const uploadUrl = await presignPut(key, contentType, expiresIn, {
      'uploaded-by': context.user.id.toString(),
      'upload-timestamp': new Date().toISOString()
    })
    
    return {
      uploadUrl,
      key,
      contentType,
      expiresIn,
      bucket: process.env.R2_BUCKET
    }
  } catch (error) {
    console.error('Presign upload error:', error)
    throw new HttpError(400, error.message)
  }
}

// Generate presigned GET URL for file downloads
export const presignDownload = async ({ key, expiresIn = 600 }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required')
  }

  try {
    // Validate the key for security
    validateKey(key, context.user.id)
    
    // Generate presigned GET URL
    const downloadUrl = await presignGet(key, expiresIn)
    
    return {
      downloadUrl,
      key,
      expiresIn
    }
  } catch (error) {
    console.error('Presign download error:', error)
    throw new HttpError(400, error.message)
  }
}

// Generate presigned URL for user-specific paths
export const presignUserUpload = async ({ 
  sessionId, 
  fileType, 
  filename, 
  contentType = 'application/octet-stream', 
  expiresIn = 600 
}, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required')
  }

  try {
    let key
    const userId = context.user.id
    
    // Generate appropriate key based on file type
    switch (fileType) {
      case 'attachment':
        const fileId = crypto.randomUUID()
        key = R2_PATHS.userAttachments(userId, sessionId, fileId)
        break
      case 'image':
        const imageId = crypto.randomUUID()
        key = R2_PATHS.userImages(userId, sessionId, imageId)
        break
      case 'audio':
        const audioId = crypto.randomUUID()
        key = R2_PATHS.userAudio(userId, sessionId, audioId)
        break
      default:
        throw new Error('Invalid file type. Must be: attachment, image, or audio')
    }
    
    // Generate presigned PUT URL
    const uploadUrl = await presignPut(key, contentType, expiresIn, {
      'uploaded-by': userId.toString(),
      'session-id': sessionId,
      'file-type': fileType,
      'original-filename': filename,
      'upload-timestamp': new Date().toISOString()
    })
    
    return {
      uploadUrl,
      key,
      fileType,
      contentType,
      expiresIn,
      metadata: {
        userId,
        sessionId,
        filename
      }
    }
  } catch (error) {
    console.error('Presign user upload error:', error)
    throw new HttpError(400, error.message)
  }
}

// Generate presigned URL for agent artifacts
export const presignAgentArtifact = async ({ 
  runId, 
  filename, 
  contentType = 'application/octet-stream', 
  expiresIn = 600 
}, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required')
  }

  try {
    const key = R2_PATHS.agentArtifacts(runId, filename)
    
    // Generate presigned PUT URL
    const uploadUrl = await presignPut(key, contentType, expiresIn, {
      'uploaded-by': context.user.id.toString(),
      'run-id': runId,
      'artifact-type': 'agent-output',
      'filename': filename,
      'upload-timestamp': new Date().toISOString()
    })
    
    return {
      uploadUrl,
      key,
      runId,
      filename,
      contentType,
      expiresIn
    }
  } catch (error) {
    console.error('Presign agent artifact error:', error)
    throw new HttpError(400, error.message)
  }
}

// List user files with presigned download URLs
export const listUserFiles = async ({ sessionId, fileType, limit = 50 }, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required')
  }

  try {
    const userId = context.user.id
    let prefix

    // Generate appropriate prefix based on file type
    switch (fileType) {
      case 'attachments':
        prefix = `users/${userId}/sessions/${sessionId}/attachments/`
        break
      case 'images':
        prefix = `users/${userId}/sessions/${sessionId}/images/`
        break
      case 'audio':
        prefix = `users/${userId}/sessions/${sessionId}/audio/`
        break
      case 'all':
        prefix = `users/${userId}/sessions/${sessionId}/`
        break
      default:
        throw new Error('Invalid file type. Must be: attachments, images, audio, or all')
    }

    // List objects from R2
    const objects = await listObjects(prefix, limit)
    
    // Generate presigned download URLs for each file
    const filesWithUrls = await Promise.all(
      objects.map(async (obj) => {
        try {
          const downloadUrl = await presignGet(obj.Key, 3600) // 1 hour expiry
          
          return {
            key: obj.Key,
            filename: obj.Key.split('/').pop(),
            size: obj.Size,
            lastModified: obj.LastModified,
            downloadUrl,
            contentType: obj.ContentType || 'application/octet-stream'
          }
        } catch (error) {
          console.error(`Error generating download URL for ${obj.Key}:`, error)
          return null
        }
      })
    )
    
    // Filter out any failed URL generations
    const validFiles = filesWithUrls.filter(file => file !== null)
    
    return {
      files: validFiles,
      sessionId,
      fileType,
      totalFiles: validFiles.length
    }
  } catch (error) {
    console.error('List user files error:', error)
    throw new HttpError(400, error.message)
  }
}

// Generate multiple presigned URLs for batch operations
export const presignBatchUpload = async ({ 
  files, // Array of { key, contentType } objects
  expiresIn = 600 
}, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required')
  }

  if (!Array.isArray(files) || files.length === 0) {
    throw new HttpError(400, 'Files array is required and cannot be empty')
  }

  if (files.length > 20) {
    throw new HttpError(400, 'Maximum 20 files per batch')
  }

  try {
    const results = await Promise.all(
      files.map(async ({ key, contentType = 'application/octet-stream' }) => {
        try {
          // Validate each key
          validateKey(key, context.user.id)
          
          // Generate presigned PUT URL
          const uploadUrl = await presignPut(key, contentType, expiresIn, {
            'uploaded-by': context.user.id.toString(),
            'batch-upload': 'true',
            'upload-timestamp': new Date().toISOString()
          })
          
          return {
            key,
            uploadUrl,
            contentType,
            success: true
          }
        } catch (error) {
          return {
            key,
            error: error.message,
            success: false
          }
        }
      })
    )
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    return {
      results,
      summary: {
        total: files.length,
        successful: successful.length,
        failed: failed.length
      },
      expiresIn
    }
  } catch (error) {
    console.error('Batch presign upload error:', error)
    throw new HttpError(400, error.message)
  }
}

// Get R2 bucket info and configuration
export const getR2Info = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Authentication required')
  }

  return {
    bucket: process.env.R2_BUCKET,
    endpoint: process.env.R2_ENDPOINT,
    region: 'auto',
    maxFileSize: '100MB',
    supportedFileTypes: [
      'image/*',
      'audio/*',
      'video/*',
      'text/*',
      'application/pdf',
      'application/json',
      'application/zip',
      'application/octet-stream'
    ],
    folderStructure: {
      userFiles: `users/{userId}/sessions/{sessionId}/`,
      agentArtifacts: `agents/runs/{runId}/artifacts/`,
      openopsLogs: `openops/runs/{runId}/`,
      mcpCalls: `mcp/calls/`,
      uploads: `uploads/{date}/`
    }
  }
}