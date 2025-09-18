// CrapGPT Security Configuration
// Implements strict separation between VPS control plane and worker execution

export const securityConfig = {
  // VPS Control Plane - What runs locally on the web server
  controlPlane: {
    allowedOperations: [
      'authentication',
      'session-management', 
      'routing',
      'rate-limiting',
      'json-validation',
      'markdown-conversion',
      'presigned-url-generation',
      'webhook-receivers',
      'database-queries',
      'api-responses'
    ],
    
    restrictions: {
      maxMemoryUsage: '256MB',
      maxCPUUsage: '50%',
      maxExecutionTime: 5000, // 5 seconds
      maxInputSize: 10 * 1024, // 10KB
      allowedNetworkAccess: [
        'database',
        'redis',
        'auth-providers',
        'orchestration-apis'
      ],
      blockedPatterns: [
        /\b(exec|eval|system|shell|subprocess)\b/i,
        /\b(rm|del|format|sudo|admin)\b/i,
        /<script[^>]*>/i,
        /javascript:|data:|vbscript:/i,
        /\$\([^)]+\)/,  // Shell substitution
        /[;&|`]/        // Shell operators
      ]
    }
  },

  // Worker Execution - What runs in isolated environments
  workers: {
    security: {
      sandbox: 'strict',
      isolation: 'container',
      networkPolicy: 'restricted',
      fileSystemAccess: 'read-only',
      capabilities: 'minimal'
    },
    
    profiles: {
      // Low-risk workers for LLM inference
      standard: {
        memory: '2GB',
        cpu: '1 core',
        timeout: '300s',
        networkAccess: ['api-endpoints'],
        volumes: [],
        seccomp: 'default',
        apparmor: 'confined'
      },
      
      // High-security workers for risky operations
      isolated: {
        memory: '1GB', 
        cpu: '0.5 core',
        timeout: '120s',
        networkAccess: [],
        volumes: ['tmp:rw'],
        seccomp: 'strict',
        apparmor: 'enforce',
        readOnlyRootFilesystem: true,
        nonRootUser: true,
        capabilities: []
      },
      
      // GPU workers for media generation
      gpu: {
        memory: '8GB',
        cpu: '2 cores', 
        gpu: '1 unit',
        timeout: '600s',
        networkAccess: ['model-apis'],
        volumes: ['models:ro', 'output:rw'],
        seccomp: 'default',
        apparmor: 'confined'
      }
    }
  },

  // File handling security
  fileHandling: {
    // All file uploads/downloads use presigned URLs
    presignedUrls: {
      maxFileSize: '100MB',
      allowedTypes: ['.txt', '.json', '.csv', '.pdf', '.png', '.jpg'],
      expiration: 3600, // 1 hour
      bucketPolicy: 'private'
    },
    
    // File processing happens in secure workers
    processing: {
      virusScan: true,
      contentTypeValidation: true,
      sizeValidation: true,
      nameValidation: true,
      quarantinePolicy: 'isolate'
    }
  },

  // Network security policies
  networkSecurity: {
    controlPlane: {
      inbound: {
        allowedPorts: [3001], // Only API port
        rateLimiting: {
          requests: 1000,
          window: '15m',
          blockDuration: '1h'
        },
        cors: {
          origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
          credentials: true
        }
      },
      outbound: {
        allowedDestinations: [
          'database',
          'redis', 
          'auth-providers',
          'orchestration-apis'
        ],
        blockedDestinations: [
          'internal-networks',
          'localhost-except-services',
          'cloud-metadata-endpoints'
        ]
      }
    },
    
    workers: {
      inbound: {
        allowedPorts: [], // No inbound access
        isolation: 'complete'
      },
      outbound: {
        whitelist: 'strict',
        allowedByProfile: {
          standard: ['openrouter.ai', 'fal.run'],
          isolated: [],
          gpu: ['huggingface.co', 'modelslab.com']
        }
      }
    }
  },

  // Secrets and credential management
  secretsManagement: {
    controlPlane: {
      // Only secrets needed for control plane operations
      allowedSecrets: [
        'DATABASE_URL',
        'JWT_SECRET', 
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GITHUB_CLIENT_ID',
        'GITHUB_CLIENT_SECRET',
        'REDIS_URL'
      ]
    },
    
    workers: {
      // Workers get scoped secrets via secure injection
      injection: 'runtime',
      scope: 'minimal',
      rotation: 'automatic',
      audit: 'enabled'
    }
  }
}

// Security enforcement functions
export class SecurityEnforcer {
  constructor() {
    this.config = securityConfig
  }

  // Check if operation is allowed on control plane
  isControlPlaneOperation(operation, input, options = {}) {
    // Check if operation is in allowed list
    if (!this.config.controlPlane.allowedOperations.includes(operation)) {
      return {
        allowed: false,
        reason: 'Operation not permitted on control plane'
      }
    }

    // Check input size
    const inputSize = typeof input === 'string' ? input.length : JSON.stringify(input).length
    if (inputSize > this.config.controlPlane.restrictions.maxInputSize) {
      return {
        allowed: false,
        reason: 'Input size exceeds control plane limits'
      }
    }

    // Check for blocked patterns
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input)
    for (const pattern of this.config.controlPlane.restrictions.blockedPatterns) {
      if (pattern.test(inputStr)) {
        return {
          allowed: false,
          reason: `Input contains blocked pattern: ${pattern}`,
          pattern: pattern.toString()
        }
      }
    }

    // Check execution time estimate
    if (options.estimatedTime && options.estimatedTime > this.config.controlPlane.restrictions.maxExecutionTime) {
      return {
        allowed: false,
        reason: 'Estimated execution time exceeds control plane limits'
      }
    }

    return { allowed: true }
  }

  // Get appropriate worker profile for operation
  getWorkerProfile(operation, input, options = {}) {
    // Security-sensitive operations get isolated profile
    if (this.isSecuritySensitive(operation, input)) {
      return 'isolated'
    }

    // GPU operations get GPU profile
    if (this.requiresGPU(operation, input)) {
      return 'gpu'
    }

    // Default to standard profile
    return 'standard'
  }

  isSecuritySensitive(operation, input) {
    const sensitiveOperations = [
      'security-scan',
      'file-processing',
      'code-execution',
      'shell-execution',
      'network-scan'
    ]

    const sensitivePatterns = [
      /\b(exec|system|shell|subprocess)\b/i,
      /\b(scan|port|nmap|curl|wget)\b/i,
      /\b(pdf|doc|xls|zip|exe)\b/i,
      /<script[^>]*>/i
    ]

    if (sensitiveOperations.includes(operation)) {
      return true
    }

    const inputStr = typeof input === 'string' ? input : JSON.stringify(input)
    return sensitivePatterns.some(pattern => pattern.test(inputStr))
  }

  requiresGPU(operation, input) {
    const gpuOperations = [
      'image-generation',
      'video-generation', 
      'audio-generation',
      'llm-inference-large',
      'embedding-generation'
    ]

    const gpuPatterns = [
      /\b(generate|render|model|inference)\b/i,
      /\b(image|video|audio|llm|embedding)\b/i
    ]

    if (gpuOperations.includes(operation)) {
      return true
    }

    const inputStr = typeof input === 'string' ? input : JSON.stringify(input)
    return gpuPatterns.some(pattern => pattern.test(inputStr))
  }

  // Generate secure container configuration
  generateContainerConfig(profile, operation) {
    const baseConfig = this.config.workers.profiles[profile]
    
    return {
      image: this.getSecureImage(operation),
      resources: {
        memory: baseConfig.memory,
        cpu: baseConfig.cpu,
        gpu: baseConfig.gpu
      },
      security: {
        readOnlyRootFilesystem: baseConfig.readOnlyRootFilesystem || false,
        runAsNonRoot: baseConfig.nonRootUser || false,
        capabilities: baseConfig.capabilities || [],
        seccomp: baseConfig.seccomp,
        apparmor: baseConfig.apparmor
      },
      networking: {
        mode: profile === 'isolated' ? 'none' : 'restricted',
        allowedDestinations: baseConfig.networkAccess || []
      },
      volumes: baseConfig.volumes || [],
      environment: this.getSecureEnvironment(operation),
      timeout: this.parseTimeout(baseConfig.timeout)
    }
  }

  getSecureImage(operation) {
    const imageMap = {
      'llm-inference': 'crapgpt/llm-worker:latest',
      'image-generation': 'crapgpt/gpu-worker:latest',
      'security-scan': 'crapgpt/security-worker:latest',
      'file-processing': 'crapgpt/file-worker:latest',
      'code-execution': 'crapgpt/code-worker:latest',
      default: 'crapgpt/standard-worker:latest'
    }

    return imageMap[operation] || imageMap.default
  }

  getSecureEnvironment(operation) {
    // Only provide necessary environment variables
    const baseEnv = {
      NODE_ENV: 'production',
      LOG_LEVEL: 'error', // Minimal logging in workers
      OPERATION_TYPE: operation
    }

    // Add operation-specific env vars securely
    switch (operation) {
      case 'llm-inference':
        return {
          ...baseEnv,
          PROVIDER_ENDPOINT: process.env.OPENROUTER_ENDPOINT
          // API keys injected at runtime via secrets management
        }
      
      case 'image-generation':
        return {
          ...baseEnv,
          FAL_ENDPOINT: process.env.FAL_ENDPOINT
        }
      
      default:
        return baseEnv
    }
  }

  parseTimeout(timeout) {
    if (typeof timeout === 'number') return timeout
    
    const match = timeout.match(/^(\d+)([sm])$/)
    if (!match) return 300000 // Default 5 minutes
    
    const value = parseInt(match[1])
    const unit = match[2]
    
    return unit === 's' ? value * 1000 : value * 60000
  }

  // Audit and monitoring
  auditSecurityEvent(event, details) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity: this.getSeverity(event),
      source: 'security-enforcer'
    }

    // Log security events
    console.log('🔒 Security Event:', JSON.stringify(auditLog))
    
    // In production, send to security monitoring system
    if (process.env.NODE_ENV === 'production') {
      this.sendToSecurityMonitoring(auditLog)
    }
  }

  getSeverity(event) {
    const severityMap = {
      'blocked-operation': 'medium',
      'suspicious-input': 'medium', 
      'policy-violation': 'high',
      'container-escape-attempt': 'critical',
      'unauthorized-access': 'high'
    }

    return severityMap[event] || 'low'
  }

  async sendToSecurityMonitoring(auditLog) {
    // Implementation would send to your security monitoring system
    // e.g., Datadog, Splunk, ELK stack, etc.
  }
}

// Export singleton instance
export const securityEnforcer = new SecurityEnforcer()

// Convenience functions
export const enforceControlPlaneSecurity = (operation, input, options) =>
  securityEnforcer.isControlPlaneOperation(operation, input, options)

export const getSecureWorkerProfile = (operation, input, options) =>
  securityEnforcer.getWorkerProfile(operation, input, options)

export const generateSecureContainer = (profile, operation) =>
  securityEnforcer.generateContainerConfig(profile, operation)

export const auditSecurity = (event, details) =>
  securityEnforcer.auditSecurityEvent(event, details)

export default securityEnforcer