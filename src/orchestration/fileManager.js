// CrapGPT File Manager with Unified R2 Storage
// Secure file handling using standardized R2 folder structure

import { v4 as uuidv4 } from 'uuid'
import { securityEnforcer } from './securityConfig.js'
import { r2 } from '../server/r2.js'

const config = {
  security: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      '.txt', '.json', '.csv', '.md',
      '.pdf', '.doc', '.docx', 
      '.png', '.jpg', '.jpeg', '.gif', '.webp',
      '.mp3', '.wav', '.mp4', '.mov',
      '.zip', '.tar', '.gz'
    ],
    virusScanning: process.env.VIRUS_SCANNING_ENABLED === 'true',
    contentValidation: true,
    presignedExpiration: 3600, // 1 hour
    downloadExpiration: 86400  // 24 hours
  }
}

class FileManager {
  constructor() {
    this.r2 = r2
    console.log('📁 File Manager initialized with unified R2 service')
  }

  // Generate presigned URL for file upload
  async generateUploadUrl(filename, contentType, options = {}) {
    try {
      // Security validation
      const validation = this.validateUploadRequest(filename, contentType, options)
      if (!validation.allowed) {
        throw new Error(`Upload blocked: ${validation.reason}`)
      }

      const fileId = uuidv4()
      const sanitizedFilename = this.sanitizeFilename(filename)
      const userId = options.userId || 'anonymous'
      
      // Use standardized R2 folder structure
      const key = this.r2.buildUserUploadPath(userId, 'attachments', `${fileId}_${sanitizedFilename}`)
      
      // Generate presigned PUT URL using R2 service
      const presignedUrl = await this.r2.presignPut(key, config.security.presignedExpiration, {
        contentType,
        metadata: {
          'original-name': sanitizedFilename,
          'file-id': fileId,
          'uploaded-by': userId,
          'scan-status': 'pending',
          'upload-timestamp': new Date().toISOString()
        }
      })

      // Log upload request for auditing
      this.auditFileOperation('upload-url-generated', {
        fileId,
        originalName: filename,
        contentType,
        userId,
        key
      })

      return {
        fileId,
        uploadUrl: presignedUrl,
        key,
        expiresIn: config.security.presignedExpiration,
        metadata: {
          originalName: filename,
          contentType,
          userId
        }
      }

    } catch (error) {
      console.error('Generate upload URL error:', error)
      throw error
    }
  }

  // Generate presigned URL for file download
  async generateDownloadUrl(fileId, options = {}) {
    try {
      // Find file by ID
      const fileInfo = await this.getFileInfo(fileId, options)
      if (!fileInfo) {
        throw new Error('File not found')
      }

      // Security validation
      const validation = this.validateDownloadRequest(fileInfo, options)
      if (!validation.allowed) {
        throw new Error(`Download blocked: ${validation.reason}`)
      }

      // Generate presigned GET URL using R2 service
      const downloadUrl = await this.r2.presignGet(fileInfo.key, config.security.downloadExpiration, {
        responseContentDisposition: `attachment; filename="${fileInfo.originalName}"`,
        responseContentType: fileInfo.contentType
      })

      // Log download request for auditing
      this.auditFileOperation('download-url-generated', {
        fileId,
        originalName: fileInfo.originalName,
        userId: options.userId,
        key: fileInfo.key
      })

      return {
        fileId,
        downloadUrl,
        filename: fileInfo.originalName,
        contentType: fileInfo.contentType,
        size: fileInfo.size,
        expiresIn: config.security.downloadExpiration
      }

    } catch (error) {
      console.error('Generate download URL error:', error)
      throw error
    }
  }

  // Get file information and metadata
  async getFileInfo(fileId, options = {}) {
    try {
      const userId = options.userId || 'anonymous'
      
      // Search for file in different locations using R2 standardized paths
      const searchPaths = [
        // User uploads
        this.r2.buildUserUploadPath(userId, 'attachments', ''),
        this.r2.buildUserUploadPath(userId, 'images', ''),
        this.r2.buildUserUploadPath(userId, 'audio', ''),
        // Agent artifacts  
        this.r2.buildAgentPath('', 'artifacts', ''),
        // Processed files (legacy)
        'processed/',
        // Uploads (legacy)
        'uploads/'
      ]

      let fileKey = null
      let metadata = null

      // Search across all possible locations
      for (const searchPath of searchPaths) {
        try {
          // List objects that contain the file ID
          const objects = await this.r2.listObjects(searchPath)
          
          // Find file that contains the fileId in its key
          const matchingFile = objects.find(obj => 
            obj.Key.includes(fileId) || obj.Key.includes(`${fileId}_`)
          )
          
          if (matchingFile) {
            fileKey = matchingFile.Key
            
            // Get detailed metadata
            const objectInfo = await this.r2.getObject(fileKey)
            metadata = objectInfo.Metadata
            
            break
          }
        } catch (err) {
          // Continue searching in other paths
          continue
        }
      }

      if (!fileKey || !metadata) {
        return null
      }

      return {
        fileId,
        key: fileKey,
        originalName: metadata['original-name'] || metadata['x-amz-meta-original-name'] || 'unknown',
        contentType: metadata['content-type'] || 'application/octet-stream',
        size: metadata['content-length'] || 0,
        lastModified: metadata['last-modified'] || new Date(),
        scanStatus: metadata['scan-status'] || metadata['x-amz-meta-scan-status'] || 'unknown',
        uploadedBy: metadata['uploaded-by'] || metadata['x-amz-meta-uploaded-by'] || 'unknown'
      }

    } catch (error) {
      console.error('Get file info error:', error)
      return null
    }
  }

  // Process uploaded file (security scanning, validation)
  async processUploadedFile(fileId, options = {}) {
    try {
      const fileInfo = await this.getFileInfo(fileId, options)
      if (!fileInfo) {
        throw new Error('File not found for processing')
      }

      console.log(`🔍 Processing file ${fileId}: ${fileInfo.originalName}`)

      // Step 1: Content validation
      const contentValidation = await this.validateFileContent(fileInfo)
      if (!contentValidation.valid) {
        await this.quarantineFile(fileInfo, `Content validation failed: ${contentValidation.reason}`)
        throw new Error(`File quarantined: ${contentValidation.reason}`)
      }

      // Step 2: Virus scanning (if enabled)
      if (config.security.virusScanning) {
        const virusScanResult = await this.scanForViruses(fileInfo)
        if (!virusScanResult.clean) {
          await this.quarantineFile(fileInfo, `Virus detected: ${virusScanResult.threat}`)
          throw new Error(`File quarantined: virus detected`)
        }
      }

      // Step 3: Update metadata to mark as processed
      const processedMetadata = {
        'scan-status': 'clean',
        'processed-at': new Date().toISOString(),
        'original-name': fileInfo.originalName,
        'uploaded-by': fileInfo.uploadedBy
      }

      // Store processing status as JSON metadata
      const processingInfoPath = `${fileInfo.key}.processing.json`
      await this.r2.putJson(processingInfoPath, {
        fileId,
        status: 'processed',
        scanResult: 'clean',
        processedAt: new Date().toISOString(),
        originalKey: fileInfo.key
      })

      // Log successful processing
      this.auditFileOperation('file-processed', {
        fileId,
        originalName: fileInfo.originalName,
        key: fileInfo.key,
        scanResult: 'clean'
      })

      return {
        fileId,
        status: 'processed',
        key: fileInfo.key,
        scanResult: 'clean'
      }

    } catch (error) {
      console.error('Process uploaded file error:', error)
      
      // Log processing failure
      this.auditFileOperation('file-processing-failed', {
        fileId,
        error: error.message
      })
      
      throw error
    }
  }

  // Security validation functions
  validateUploadRequest(filename, contentType, options) {
    // Check file extension
    const ext = this.getFileExtension(filename).toLowerCase()
    if (!config.security.allowedTypes.includes(ext)) {
      return {
        allowed: false,
        reason: `File type ${ext} not allowed`
      }
    }

    // Check filename for suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid filename characters
      /\.(exe|bat|cmd|scr|vbs|js)$/i,  // Executable extensions (if not in allowedTypes)
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Windows reserved names
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(filename)) {
        return {
          allowed: false,
          reason: 'Suspicious filename pattern detected'
        }
      }
    }

    // Use security enforcer for additional validation
    const securityCheck = securityEnforcer.isControlPlaneOperation('file-upload', filename, options)
    if (!securityCheck.allowed) {
      return securityCheck
    }

    return { allowed: true }
  }

  validateDownloadRequest(fileInfo, options) {
    // Check file scan status
    if (fileInfo.scanStatus !== 'clean' && fileInfo.scanStatus !== 'unknown') {
      return {
        allowed: false,
        reason: 'File has not passed security scanning'
      }
    }

    // Check if file is quarantined (new standardized path)
    if (fileInfo.key.includes('security/quarantine/') || fileInfo.key.includes('quarantine/')) {
      return {
        allowed: false,
        reason: 'File is quarantined'
      }
    }

    return { allowed: true }
  }

  async validateFileContent(fileInfo) {
    try {
      // Get file to validate content type (R2 doesn't support range requests in same way)
      const fileObject = await this.r2.getObject(fileInfo.key)
      const header = Buffer.from(fileObject.Body.slice(0, 512)) // First 512 bytes

      // Validate content type matches file signature
      const actualType = this.detectContentType(header, fileInfo.originalName)
      
      if (actualType !== fileInfo.contentType) {
        return {
          valid: false,
          reason: `Content type mismatch: expected ${fileInfo.contentType}, detected ${actualType}`
        }
      }

      // Check for embedded scripts or malicious content
      const headerStr = header.toString('utf8', 0, Math.min(512, header.length))
      const maliciousPatterns = [
        /<script[^>]*>/i,
        /javascript:/i,
        /vbscript:/i,
        /data:text\/html/i
      ]

      for (const pattern of maliciousPatterns) {
        if (pattern.test(headerStr)) {
          return {
            valid: false,
            reason: 'Malicious content detected in file'
          }
        }
      }

      return { valid: true }

    } catch (error) {
      console.error('Content validation error:', error)
      return {
        valid: false,
        reason: 'Content validation failed'
      }
    }
  }

  async scanForViruses(fileInfo) {
    // This would integrate with a virus scanning service
    // For now, return clean result
    
    // Example integrations:
    // - ClamAV
    // - VirusTotal API
    // - AWS GuardDuty Malware Protection
    // - Third-party scanning services
    
    console.log(`🔍 Virus scanning ${fileInfo.originalName} (simulated)`)
    
    return {
      clean: true,
      threat: null,
      scanEngine: 'simulated'
    }
  }

  async quarantineFile(fileInfo, reason) {
    try {
      // Create quarantine path using standardized structure
      const quarantineKey = this.r2.buildSecurityPath('quarantine', `${fileInfo.fileId}_${fileInfo.originalName}`)

      // Get original file
      const fileData = await this.r2.getObject(fileInfo.key)
      
      // Store in quarantine with metadata about the reason
      await this.r2.putObject(quarantineKey, fileData.Body, {
        contentType: fileInfo.contentType,
        metadata: {
          'original-name': fileInfo.originalName,
          'original-key': fileInfo.key,
          'quarantine-reason': reason,
          'quarantined-at': new Date().toISOString(),
          'uploaded-by': fileInfo.uploadedBy
        }
      })

      // Delete original
      await this.r2.deleteObject(fileInfo.key)

      this.auditFileOperation('file-quarantined', {
        fileId: fileInfo.fileId,
        originalName: fileInfo.originalName,
        reason,
        quarantineKey
      })

    } catch (error) {
      console.error('Quarantine file error:', error)
      throw error
    }
  }

  // Helper functions
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')  // Replace special chars with underscore
      .replace(/_{2,}/g, '_')           // Replace multiple underscores with single
      .substring(0, 255)               // Limit length
  }

  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.')
    return lastDot === -1 ? '' : filename.substring(lastDot)
  }

  detectContentType(header, filename) {
    // Simple content type detection based on file signatures
    const signatures = {
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
      'application/zip': [0x50, 0x4B, 0x03, 0x04],
      'text/plain': null // Default for text files
    }

    for (const [contentType, signature] of Object.entries(signatures)) {
      if (signature === null) continue // Skip text/plain

      if (this.matchesSignature(header, signature)) {
        return contentType
      }
    }

    // Fallback to extension-based detection
    const ext = this.getFileExtension(filename).toLowerCase()
    const extensionMap = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    }

    return extensionMap[ext] || 'application/octet-stream'
  }

  matchesSignature(header, signature) {
    if (header.length < signature.length) return false
    
    for (let i = 0; i < signature.length; i++) {
      if (header[i] !== signature[i]) return false
    }
    
    return true
  }

  // List user files with presigned download URLs
  async listUserFiles(userId, type = 'attachments') {
    try {
      const userPath = this.r2.buildUserUploadPath(userId, type, '')
      const objects = await this.r2.listObjects(userPath)
      
      const files = []
      for (const obj of objects) {
        try {
          // Extract file ID from key
          const keyParts = obj.Key.split('/')
          const filename = keyParts[keyParts.length - 1]
          const fileIdMatch = filename.match(/^([a-f0-9\-]{36})_/)
          const fileId = fileIdMatch ? fileIdMatch[1] : null
          
          if (fileId) {
            // Get detailed file info
            const fileInfo = await this.getFileInfo(fileId, { userId })
            if (fileInfo) {
              // Generate download URL
              const downloadUrl = await this.generateDownloadUrl(fileId, { userId })
              
              files.push({
                fileId,
                originalName: fileInfo.originalName,
                contentType: fileInfo.contentType,
                size: fileInfo.size,
                lastModified: fileInfo.lastModified,
                downloadUrl: downloadUrl.downloadUrl,
                key: fileInfo.key
              })
            }
          }
        } catch (err) {
          console.error(`Error processing file ${obj.Key}:`, err)
          continue
        }
      }
      
      return files
    } catch (error) {
      console.error('List user files error:', error)
      return []
    }
  }

  // Auditing and logging
  auditFileOperation(operation, details) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      operation,
      details,
      source: 'file-manager'
    }

    console.log('📁 File Operation:', JSON.stringify(auditLog))

    // In production, send to audit logging system
    if (process.env.NODE_ENV === 'production') {
      this.sendToAuditLog(auditLog)
    }
  }

  async sendToAuditLog(auditLog) {
    // Implementation would send to your audit logging system
  }

  // Cleanup functions
  async cleanupExpiredFiles() {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    // Clean up temp files across all users
    await this.cleanupFolder('users/', cutoffDate, 'temp/')
    
    // Clean up old quarantine files  
    await this.cleanupFolder('security/quarantine/', cutoffDate)
    
    // Clean up old processing metadata
    await this.cleanupFolder('', cutoffDate, '.processing.json')
  }

  async cleanupFolder(prefix, cutoffDate, suffix = '') {
    try {
      const objects = await this.r2.listObjects(prefix)

      const toDelete = objects.filter(obj => {
        const matchesSuffix = suffix ? obj.Key.endsWith(suffix) : true
        const isOld = new Date(obj.LastModified) < cutoffDate
        return matchesSuffix && isOld
      })

      if (toDelete.length > 0) {
        // Delete files in batches
        for (const obj of toDelete) {
          try {
            await this.r2.deleteObject(obj.Key)
          } catch (err) {
            console.error(`Failed to delete ${obj.Key}:`, err)
          }
        }

        console.log(`🧹 Cleaned up ${toDelete.length} expired files from ${prefix}`)
      }

    } catch (error) {
      console.error(`Cleanup error for ${prefix}:`, error)
    }
  }
}

// Create global file manager instance
export const fileManager = new FileManager()

// Convenience functions
export const generateFileUploadUrl = (filename, contentType, options) =>
  fileManager.generateUploadUrl(filename, contentType, options)

export const generateFileDownloadUrl = (fileId, options) =>
  fileManager.generateDownloadUrl(fileId, options)

export const processFile = (fileId, options) =>
  fileManager.processUploadedFile(fileId, options)

export const getFileInfo = (fileId, options) =>
  fileManager.getFileInfo(fileId, options)

export const listUserFiles = (userId, type) =>
  fileManager.listUserFiles(userId, type)

export const cleanupExpiredFiles = () =>
  fileManager.cleanupExpiredFiles()

export default fileManager