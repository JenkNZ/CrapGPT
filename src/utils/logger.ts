/**
 * Enterprise Logging System for AgentForge
 * Provides structured logging, audit trails, and security monitoring
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export enum LogCategory {
  AUTH = 'auth',
  API = 'api',
  AGENT = 'agent',
  CONNECTION = 'connection',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  AUDIT = 'audit',
  SYSTEM = 'system'
}

export interface LogContext {
  userId?: string;
  agentId?: string;
  connectionId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  traceId?: string;
  spanId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: LogContext;
  metadata?: Record<string, any>;
  error?: Error;
  performance?: {
    duration: number;
    memory: number;
    cpu: number;
  };
  security?: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    threatType?: string;
    mitigated: boolean;
  };
}

class EnterpriseLogger {
  private static instance: EnterpriseLogger;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Flush logs every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000);

    // Flush on process exit
    process.on('exit', () => this.flush());
    process.on('SIGINT', () => this.flush());
    process.on('SIGTERM', () => this.flush());
  }

  public static getInstance(): EnterpriseLogger {
    if (!EnterpriseLogger.instance) {
      EnterpriseLogger.instance = new EnterpriseLogger();
    }
    return EnterpriseLogger.instance;
  }

  /**
   * Log an authentication event
   */
  public auth(message: string, context: LogContext, metadata?: Record<string, any>) {
    this.log({
      level: LogLevel.INFO,
      category: LogCategory.AUTH,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      metadata
    });
  }

  /**
   * Log a security event
   */
  public security(
    message: string, 
    context: LogContext, 
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    threatType?: string,
    mitigated: boolean = false
  ) {
    this.log({
      level: riskLevel === 'critical' || riskLevel === 'high' ? LogLevel.ERROR : LogLevel.WARN,
      category: LogCategory.SECURITY,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      security: {
        riskLevel,
        threatType,
        mitigated
      }
    });
  }

  /**
   * Log an API request
   */
  public api(
    message: string,
    context: LogContext,
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ) {
    this.log({
      level: statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO,
      category: LogCategory.API,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      metadata: {
        method,
        path,
        statusCode
      },
      performance: {
        duration,
        memory: process.memoryUsage().heapUsed,
        cpu: process.cpuUsage().user
      }
    });
  }

  /**
   * Log agent execution
   */
  public agent(
    message: string,
    context: LogContext,
    agentName: string,
    action: string,
    success: boolean,
    duration?: number
  ) {
    this.log({
      level: success ? LogLevel.INFO : LogLevel.ERROR,
      category: LogCategory.AGENT,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      metadata: {
        agentName,
        action,
        success
      },
      performance: duration ? {
        duration,
        memory: process.memoryUsage().heapUsed,
        cpu: process.cpuUsage().user
      } : undefined
    });
  }

  /**
   * Log connection events
   */
  public connection(
    message: string,
    context: LogContext,
    connectionType: string,
    action: 'create' | 'update' | 'delete' | 'test' | 'use',
    success: boolean
  ) {
    this.log({
      level: success ? LogLevel.INFO : LogLevel.ERROR,
      category: LogCategory.CONNECTION,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      metadata: {
        connectionType,
        action,
        success
      }
    });
  }

  /**
   * Log audit events
   */
  public audit(
    message: string,
    context: LogContext,
    action: string,
    resourceType: string,
    resourceId: string,
    changes?: Record<string, any>
  ) {
    this.log({
      level: LogLevel.INFO,
      category: LogCategory.AUDIT,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      metadata: {
        action,
        resourceType,
        resourceId,
        changes: this.sanitizeData(changes)
      }
    });
  }

  /**
   * Log error with stack trace
   */
  public error(message: string, error: Error, context: LogContext = {}) {
    this.log({
      level: LogLevel.ERROR,
      category: LogCategory.SYSTEM,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      error
    });
  }

  /**
   * Log performance metrics
   */
  public performance(
    message: string,
    context: LogContext,
    metrics: {
      duration: number;
      memory: number;
      cpu: number;
    }
  ) {
    this.log({
      level: LogLevel.INFO,
      category: LogCategory.PERFORMANCE,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      performance: metrics
    });
  }

  /**
   * Generic log method
   */
  private log(entry: LogEntry) {
    // Sanitize sensitive data
    entry.context = this.sanitizeData(entry.context);
    entry.metadata = this.sanitizeData(entry.metadata);

    // Add to buffer
    this.logBuffer.push(entry);

    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify(entry, null, 2));
    }

    // Immediate flush for critical security events
    if (entry.security?.riskLevel === 'critical') {
      this.flush();
    }
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = [
      'password', 'secret', 'token', 'key', 'credential', 'auth',
      'api_key', 'access_token', 'refresh_token', 'private_key'
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Flush log buffer to persistent storage
   */
  private flush() {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // In production, this would send to a logging service
    // For now, we'll use structured console output
    if (process.env.NODE_ENV === 'production') {
      logsToFlush.forEach(entry => {
        console.log(JSON.stringify({
          '@timestamp': entry.context.timestamp?.toISOString(),
          level: entry.level,
          category: entry.category,
          message: entry.message,
          ...entry.context,
          metadata: entry.metadata,
          performance: entry.performance,
          security: entry.security,
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack
          } : undefined
        }));
      });
    }
  }
}

// Export singleton instance
export const logger = EnterpriseLogger.getInstance();

/**
 * Middleware helper for request logging
 */
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Add request ID to context
    req.requestId = requestId;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.api(
        `${req.method} ${req.path}`,
        {
          userId: req.user?.id,
          requestId,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        },
        req.method,
        req.path,
        res.statusCode,
        duration
      );
    });

    next();
  };
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}