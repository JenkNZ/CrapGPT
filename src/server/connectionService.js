// CrapGPT Connection Management Service
// Secure credential storage and management for provider integrations

import crypto from 'crypto'
import { r2 } from './r2.js'
import { connectionSecurityMonitor } from './connectionSecurityMonitor.js'

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY = process.env.CONNECTION_ENCRYPTION_KEY || crypto.randomBytes(32)
const IV_LENGTH = 16
const SALT_LENGTH = 32
const TAG_LENGTH = 16

// Connection type definitions with validation schemas
const CONNECTION_TYPES = {
  aws: {
    name: 'Amazon Web Services',
    description: 'AWS cloud services integration',
    requiredFields: ['accessKeyId', 'secretAccessKey'],
    optionalFields: ['region', 'sessionToken'],
    defaultScopes: ['read'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      accessKeyId: /^AKIA[0-9A-Z]{16}$/,
      secretAccessKey: /^[A-Za-z0-9/+=]{40}$/
    }
  },
  
  azure: {
    name: 'Microsoft Azure',
    description: 'Azure cloud services integration',
    requiredFields: ['clientId', 'clientSecret', 'tenantId'],
    optionalFields: ['subscriptionId'],
    defaultScopes: ['read'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      clientId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      tenantId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    }
  },
  
  gcp: {
    name: 'Google Cloud Platform',
    description: 'Google Cloud services integration',
    requiredFields: ['projectId', 'keyFile'],
    optionalFields: ['region'],
    defaultScopes: ['read'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      projectId: /^[a-z]([a-z0-9-]{4,28}[a-z0-9])$/
    }
  },
  
  github: {
    name: 'GitHub',
    description: 'GitHub repositories and actions',
    requiredFields: ['token'],
    optionalFields: ['username'],
    defaultScopes: ['read'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      token: /^gh[po]_[A-Za-z0-9_]{36,255}$/
    }
  },
  
  openops: {
    name: 'OpenOps',
    description: 'OpenOps workflow automation',
    requiredFields: ['apiKey'],
    optionalFields: ['endpoint', 'workspace'],
    defaultScopes: ['read', 'write'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      apiKey: /^[A-Za-z0-9_-]{32,}$/
    }
  },
  
  toolhive: {
    name: 'Toolhive',
    description: 'Toolhive tool registry and execution',
    requiredFields: ['apiKey'],
    optionalFields: ['endpoint', 'registry'],
    defaultScopes: ['read', 'write'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      apiKey: /^[A-Za-z0-9_-]{32,}$/
    }
  },
  
  arcade: {
    name: 'Arcade',
    description: 'Arcade infrastructure orchestration',
    requiredFields: ['apiKey'],
    optionalFields: ['endpoint', 'project'],
    defaultScopes: ['read', 'write'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      apiKey: /^[A-Za-z0-9_-]{32,}$/
    }
  },
  
  mcpjungle: {
    name: 'MCPJungle',
    description: 'MCP agent communication hub',
    requiredFields: ['apiKey'],
    optionalFields: ['endpoint', 'hub'],
    defaultScopes: ['read', 'write'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      apiKey: /^[A-Za-z0-9_-]{32,}$/
    }
  },
  
  supabase: {
    name: 'Supabase',
    description: 'Supabase backend services',
    requiredFields: ['url', 'anonKey'],
    optionalFields: ['serviceKey'],
    defaultScopes: ['read'],
    supportedScopes: ['read', 'write', 'admin'],
    validationRules: {
      url: /^https:\/\/[a-z0-9-]+\.supabase\.co$/,
      anonKey: /^eyJ[A-Za-z0-9_-]+$/
    }
  }
}

class ConnectionService {
  constructor() {
    if (!process.env.CONNECTION_ENCRYPTION_KEY) {
      console.warn('⚠️  CONNECTION_ENCRYPTION_KEY not set. Using random key - connections will not persist across restarts!')
    }
  }

  // Encrypt sensitive configuration data
  encryptConfig(config) {
    try {
      const salt = crypto.randomBytes(SALT_LENGTH)
      const iv = crypto.randomBytes(IV_LENGTH)
      
      // Derive key from base key and salt
      const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 10000, 32, 'sha512')
      
      const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key)
      cipher.setAAD(salt)
      
      let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      // Combine salt, iv, tag, and encrypted data
      return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64')
    } catch (error) {
      throw new Error(`Failed to encrypt config: ${error.message}`)
    }
  }

  // Decrypt sensitive configuration data
  decryptConfig(encryptedConfig) {
    try {
      const data = Buffer.from(encryptedConfig, 'base64')
      
      const salt = data.subarray(0, SALT_LENGTH)
      const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
      const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
      const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
      
      // Derive key from base key and salt
      const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 10000, 32, 'sha512')
      
      const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key)
      decipher.setAAD(salt)
      decipher.setAuthTag(tag)
      
      let decrypted = decipher.update(encrypted, null, 'utf8')
      decrypted += decipher.final('utf8')
      
      return JSON.parse(decrypted)
    } catch (error) {
      throw new Error(`Failed to decrypt config: ${error.message}`)
    }
  }

  // Validate connection configuration based on type
  validateConnectionConfig(type, config) {
    const connectionType = CONNECTION_TYPES[type]
    if (!connectionType) {
      throw new Error(`Unsupported connection type: ${type}`)
    }

    const errors = []

    // Check required fields
    for (const field of connectionType.requiredFields) {
      if (!config[field]) {
        errors.push(`Missing required field: ${field}`)
      } else if (connectionType.validationRules[field]) {
        const pattern = connectionType.validationRules[field]
        if (!pattern.test(config[field])) {
          errors.push(`Invalid format for field: ${field}`)
        }
      }
    }

    // Validate optional fields if present
    for (const field of connectionType.optionalFields) {
      if (config[field] && connectionType.validationRules[field]) {
        const pattern = connectionType.validationRules[field]
        if (!pattern.test(config[field])) {
          errors.push(`Invalid format for field: ${field}`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Validate connection scopes
  validateConnectionScopes(type, scopes) {
    const connectionType = CONNECTION_TYPES[type]
    if (!connectionType) {
      throw new Error(`Unsupported connection type: ${type}`)
    }

    const invalidScopes = scopes.filter(scope => !connectionType.supportedScopes.includes(scope))
    
    return {
      isValid: invalidScopes.length === 0,
      invalidScopes,
      supportedScopes: connectionType.supportedScopes
    }
  }

  // Test connection by making a simple API call
  async testConnectionCredentials(type, config) {
    try {
      switch (type) {
        case 'aws':
          return await this.testAWSConnection(config)
        case 'azure':
          return await this.testAzureConnection(config)
        case 'gcp':
          return await this.testGCPConnection(config)
        case 'github':
          return await this.testGitHubConnection(config)
        case 'openops':
          return await this.testOpenOpsConnection(config)
        case 'toolhive':
          return await this.testToolhiveConnection(config)
        case 'arcade':
          return await this.testArcadeConnection(config)
        case 'mcpjungle':
          return await this.testMCPJungleConnection(config)
        case 'supabase':
          return await this.testSupabaseConnection(config)
        default:
          throw new Error(`Connection testing not implemented for type: ${type}`)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  // AWS connection test
  async testAWSConnection(config) {
    const AWS = await import('aws-sdk')
    const sts = new AWS.default.STS({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region || 'us-east-1'
    })

    const result = await sts.getCallerIdentity().promise()
    return {
      success: true,
      accountId: result.Account,
      arn: result.Arn,
      timestamp: new Date().toISOString()
    }
  }

  // GitHub connection test
  async testGitHubConnection(config) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${config.token}`,
        'User-Agent': 'CrapGPT-Connection-Test'
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const user = await response.json()
    return {
      success: true,
      username: user.login,
      userId: user.id,
      timestamp: new Date().toISOString()
    }
  }

  // OpenOps connection test
  async testOpenOpsConnection(config) {
    const endpoint = config.endpoint || 'https://api.openops.cloud'
    const response = await fetch(`${endpoint}/api/v1/health`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`OpenOps API error: ${response.statusText}`)
    }

    const health = await response.json()
    return {
      success: true,
      workspace: config.workspace,
      status: health.status,
      timestamp: new Date().toISOString()
    }
  }

  // Toolhive connection test
  async testToolhiveConnection(config) {
    const endpoint = config.endpoint || 'https://api.toolhive.com'
    const response = await fetch(`${endpoint}/api/v1/registry`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Toolhive API error: ${response.statusText}`)
    }

    return {
      success: true,
      registry: config.registry,
      timestamp: new Date().toISOString()
    }
  }

  // Arcade connection test
  async testArcadeConnection(config) {
    const endpoint = config.endpoint || 'https://api.arcade.dev'
    const response = await fetch(`${endpoint}/api/v1/projects`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Arcade API error: ${response.statusText}`)
    }

    return {
      success: true,
      project: config.project,
      timestamp: new Date().toISOString()
    }
  }

  // MCPJungle connection test
  async testMCPJungleConnection(config) {
    const endpoint = config.endpoint || 'https://hub.mcpjungle.com'
    const response = await fetch(`${endpoint}/api/v1/status`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`MCPJungle API error: ${response.statusText}`)
    }

    return {
      success: true,
      hub: config.hub,
      timestamp: new Date().toISOString()
    }
  }

  // Supabase connection test
  async testSupabaseConnection(config) {
    const response = await fetch(`${config.url}/rest/v1/`, {
      headers: {
        'apikey': config.anonKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.statusText}`)
    }

    return {
      success: true,
      url: config.url,
      timestamp: new Date().toISOString()
    }
  }

  // Placeholder for other connection tests
  async testAzureConnection(config) {
    // TODO: Implement Azure AD authentication test
    throw new Error('Azure connection testing not yet implemented')
  }

  async testGCPConnection(config) {
    // TODO: Implement GCP service account test
    throw new Error('GCP connection testing not yet implemented')
  }

  // Get all available connection types
  getAvailableConnectionTypes() {
    return Object.entries(CONNECTION_TYPES).map(([type, info]) => ({
      type,
      ...info
    }))
  }

  // Get connection type definition
  getConnectionType(type) {
    return CONNECTION_TYPES[type] || null
  }

  // Store connection audit log in R2
  async logConnectionActivity(connectionId, action, context = {}) {
    try {
      const logPath = r2.buildSecurityPath('connection-logs', `${connectionId}_${Date.now()}.json`)
      const logData = {
        connectionId,
        action,
        context,
        timestamp: new Date().toISOString(),
        source: 'connection-service'
      }
      
      await r2.putJson(logPath, logData)
    } catch (error) {
      console.error('Failed to store connection log in R2:', error)
      // Don't throw - logging failures shouldn't break connection operations
    }
  }

  // Sanitize connection for safe display (remove sensitive data)
  sanitizeConnectionForDisplay(connection, config = null) {
    const sanitized = {
      id: connection.id,
      type: connection.type,
      name: connection.name,
      description: connection.description,
      scopes: connection.scopes,
      status: connection.status,
      lastUsed: connection.lastUsed,
      expiresAt: connection.expiresAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    }

    // Add non-sensitive config fields for display
    if (config) {
      const connectionType = this.getConnectionType(connection.type)
      if (connectionType) {
        const safeFields = ['region', 'endpoint', 'workspace', 'registry', 'project', 'hub', 'url', 'username']
        
        for (const field of safeFields) {
          if (config[field]) {
            sanitized[field] = config[field]
          }
        }
      }
    }

    return sanitized
  }
}

// Create singleton instance
export const connectionService = new ConnectionService()

// Export connection type definitions for use in UI
export const CONNECTION_TYPES_PUBLIC = Object.entries(CONNECTION_TYPES).reduce((acc, [type, info]) => {
  acc[type] = {
    name: info.name,
    description: info.description,
    requiredFields: info.requiredFields,
    optionalFields: info.optionalFields,
    defaultScopes: info.defaultScopes,
    supportedScopes: info.supportedScopes
  }
  return acc
}, {})

export default connectionService