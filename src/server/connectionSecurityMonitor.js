// Connection Security Monitoring Service
// Monitors connection usage patterns, detects anomalies, and handles security events

import { prisma } from '@wasp-lang/auth/server'
import { r2 } from './r2.js'

class ConnectionSecurityMonitor {
  constructor() {
    this.suspiciousPatterns = new Map()
    this.rateLimits = new Map()
    this.alertThresholds = {
      failedTestsPerHour: 10,
      unusualLocations: true,
      massConnectionCreation: 5, // connections per minute
      suspiciousUsagePatterns: true,
      revokedConnectionUsageAttempts: 3
    }
  }

  // Log security event
  async logSecurityEvent(userId, connectionId, eventType, details = {}) {
    const securityEvent = {
      userId,
      connectionId,
      eventType,
      details,
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(eventType, details),
      ipAddress: details.ipAddress || 'unknown',
      userAgent: details.userAgent || 'unknown'
    }

    try {
      // Store in database for immediate access
      await prisma.connectionSecurityEvent.create({
        data: {
          userId,
          connectionId: connectionId || null,
          eventType,
          severity: securityEvent.severity,
          details: JSON.stringify(details),
          ipAddress: securityEvent.ipAddress,
          userAgent: securityEvent.userAgent
        }
      }).catch(error => {
        // If table doesn't exist yet, continue with R2 storage
        console.warn('ConnectionSecurityEvent table not available:', error.message)
      })

      // Store in R2 for long-term analysis
      const eventPath = r2.buildSecurityPath('connection-events', 
        `${new Date().toISOString().split('T')[0]}`, 
        `${userId}_${connectionId || 'system'}_${Date.now()}.json`)
      
      await r2.putJson(eventPath, securityEvent)

      // Check for immediate security concerns
      await this.analyzeSecurityEvent(securityEvent)

    } catch (error) {
      console.error('Failed to log security event:', error)
    }

    return securityEvent
  }

  // Determine event severity
  determineSeverity(eventType, details) {
    const highSeverityEvents = [
      'unauthorized_access_attempt',
      'credential_theft_detected',
      'mass_connection_creation',
      'revoked_connection_usage',
      'suspicious_location_access'
    ]

    const mediumSeverityEvents = [
      'repeated_failed_tests',
      'unusual_usage_pattern',
      'connection_credential_changed',
      'multiple_agent_links'
    ]

    if (highSeverityEvents.includes(eventType)) return 'high'
    if (mediumSeverityEvents.includes(eventType)) return 'medium'
    return 'low'
  }

  // Analyze security event for immediate threats
  async analyzeSecurityEvent(event) {
    const { userId, eventType, details } = event

    switch (eventType) {
      case 'connection_test_failed':
        await this.handleFailedTests(userId, event)
        break
      
      case 'connection_created':
        await this.handleConnectionCreation(userId, event)
        break
      
      case 'revoked_connection_usage':
        await this.handleRevokedConnectionUsage(userId, event)
        break
      
      case 'unusual_location_access':
        await this.handleUnusualLocation(userId, event)
        break
      
      default:
        // Log for pattern analysis
        break
    }
  }

  // Handle repeated failed connection tests
  async handleFailedTests(userId, event) {
    const key = `failed_tests_${userId}_${event.connectionId}`
    const hour = new Date().getHours()
    const hourKey = `${key}_${hour}`

    if (!this.rateLimits.has(hourKey)) {
      this.rateLimits.set(hourKey, { count: 0, firstFailure: Date.now() })
    }

    const rateLimit = this.rateLimits.get(hourKey)
    rateLimit.count++

    if (rateLimit.count >= this.alertThresholds.failedTestsPerHour) {
      await this.triggerSecurityAlert(userId, 'repeated_failed_tests', {
        connectionId: event.connectionId,
        failureCount: rateLimit.count,
        timeWindow: '1 hour',
        possibleIssue: 'Credential compromise or configuration error'
      })

      // Consider temporarily disabling the connection
      await this.considerConnectionSuspension(event.connectionId, 'repeated_failures')
    }
  }

  // Handle mass connection creation
  async handleConnectionCreation(userId, event) {
    const key = `connections_created_${userId}`
    const minute = Math.floor(Date.now() / 60000)
    const minuteKey = `${key}_${minute}`

    if (!this.rateLimits.has(minuteKey)) {
      this.rateLimits.set(minuteKey, { count: 0 })
    }

    const rateLimit = this.rateLimits.get(minuteKey)
    rateLimit.count++

    if (rateLimit.count >= this.alertThresholds.massConnectionCreation) {
      await this.triggerSecurityAlert(userId, 'mass_connection_creation', {
        connectionCount: rateLimit.count,
        timeWindow: '1 minute',
        possibleIssue: 'Automated attack or compromised account'
      })

      // Consider rate limiting the user
      await this.applyRateLimit(userId, 'connection_creation', 3600000) // 1 hour
    }
  }

  // Handle usage of revoked connections
  async handleRevokedConnectionUsage(userId, event) {
    const key = `revoked_usage_${userId}`
    
    if (!this.suspiciousPatterns.has(key)) {
      this.suspiciousPatterns.set(key, { attempts: 0, lastAttempt: Date.now() })
    }

    const pattern = this.suspiciousPatterns.get(key)
    pattern.attempts++
    pattern.lastAttempt = Date.now()

    if (pattern.attempts >= this.alertThresholds.revokedConnectionUsageAttempts) {
      await this.triggerSecurityAlert(userId, 'persistent_revoked_usage', {
        attempts: pattern.attempts,
        connectionId: event.connectionId,
        possibleIssue: 'Compromised account or malicious script'
      })
    }
  }

  // Handle unusual location access
  async handleUnusualLocation(userId, event) {
    // Get user's typical access locations
    const recentLogs = await prisma.connectionLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        ipAddress: true
      }
    }).catch(() => [])

    const commonIPs = new Set(recentLogs.map(log => log.ipAddress))
    
    if (!commonIPs.has(event.ipAddress) && commonIPs.size > 0) {
      await this.triggerSecurityAlert(userId, 'unusual_location_access', {
        newIP: event.ipAddress,
        connectionId: event.connectionId,
        possibleIssue: 'Account access from new location'
      })
    }
  }

  // Trigger security alert
  async triggerSecurityAlert(userId, alertType, details) {
    const alert = {
      userId,
      alertType,
      details,
      timestamp: new Date().toISOString(),
      status: 'active',
      severity: this.determineSeverity(alertType, details)
    }

    try {
      // Store alert in database
      await prisma.securityAlert.create({
        data: {
          userId,
          alertType,
          severity: alert.severity,
          details: JSON.stringify(details),
          status: 'active'
        }
      }).catch(() => {
        // If table doesn't exist, continue with R2 storage
        console.warn('SecurityAlert table not available')
      })

      // Store in R2 for analysis
      const alertPath = r2.buildSecurityPath('alerts', 
        new Date().toISOString().split('T')[0], 
        `${userId}_${alertType}_${Date.now()}.json`)
      
      await r2.putJson(alertPath, alert)

      // Send notifications for high severity alerts
      if (alert.severity === 'high') {
        await this.sendSecurityNotification(userId, alert)
      }

    } catch (error) {
      console.error('Failed to trigger security alert:', error)
    }

    return alert
  }

  // Send security notification
  async sendSecurityNotification(userId, alert) {
    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })

    if (!user) return

    const notification = {
      to: user.email,
      subject: `Security Alert: ${alert.alertType}`,
      body: `
        Hello ${user.name || 'User'},
        
        We've detected a security concern with your account:
        
        Alert Type: ${alert.alertType}
        Severity: ${alert.severity}
        Time: ${alert.timestamp}
        
        Details: ${JSON.stringify(alert.details, null, 2)}
        
        If this was not you, please:
        1. Change your password immediately
        2. Review your connections and revoke any suspicious ones
        3. Contact support if you need assistance
        
        Best regards,
        CrapGPT Security Team
      `
    }

    // Store notification for processing (email service integration would go here)
    const notificationPath = r2.buildSecurityPath('notifications', 
      new Date().toISOString().split('T')[0], 
      `${userId}_${Date.now()}.json`)
    
    await r2.putJson(notificationPath, notification)

    console.log(`Security notification queued for ${user.email}: ${alert.alertType}`)
  }

  // Consider suspending a connection
  async considerConnectionSuspension(connectionId, reason) {
    try {
      const connection = await prisma.connection.findUnique({
        where: { id: connectionId }
      })

      if (!connection || connection.status !== 'active') return

      // Update connection status to suspended
      await prisma.connection.update({
        where: { id: connectionId },
        data: {
          status: 'suspended',
          metadata: JSON.stringify({
            ...JSON.parse(connection.metadata || '{}'),
            suspendedAt: new Date().toISOString(),
            suspensionReason: reason,
            autoSuspended: true
          })
        }
      })

      // Log the suspension
      await prisma.connectionLog.create({
        data: {
          connectionId,
          userId: connection.userId,
          action: 'auto_suspended',
          context: JSON.stringify({ reason }),
          success: true
        }
      })

      console.log(`Connection ${connectionId} auto-suspended due to: ${reason}`)

    } catch (error) {
      console.error('Failed to suspend connection:', error)
    }
  }

  // Apply rate limit to user
  async applyRateLimit(userId, action, duration) {
    const rateLimit = {
      userId,
      action,
      expiresAt: new Date(Date.now() + duration),
      createdAt: new Date().toISOString()
    }

    try {
      // Store rate limit
      await prisma.userRateLimit.create({
        data: {
          userId,
          action,
          expiresAt: rateLimit.expiresAt
        }
      }).catch(() => {
        // If table doesn't exist, store in memory temporarily
        const key = `rate_limit_${userId}_${action}`
        this.rateLimits.set(key, rateLimit)
        
        // Clean up after expiration
        setTimeout(() => {
          this.rateLimits.delete(key)
        }, duration)
      })

      console.log(`Rate limit applied to user ${userId} for ${action}: ${duration}ms`)

    } catch (error) {
      console.error('Failed to apply rate limit:', error)
    }
  }

  // Check if user is rate limited
  async isRateLimited(userId, action) {
    try {
      const rateLimit = await prisma.userRateLimit.findFirst({
        where: {
          userId,
          action,
          expiresAt: {
            gt: new Date()
          }
        }
      })

      return !!rateLimit
    } catch (error) {
      // Fallback to in-memory check
      const key = `rate_limit_${userId}_${action}`
      const memoryLimit = this.rateLimits.get(key)
      return memoryLimit && new Date() < memoryLimit.expiresAt
    }
  }

  // Generate security report
  async generateSecurityReport(userId, days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    try {
      const events = await prisma.connectionSecurityEvent.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }).catch(() => [])

      const alerts = await prisma.securityAlert.findMany({
        where: {
          userId,
          createdAt: {
            gte: startDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }).catch(() => [])

      const report = {
        userId,
        period: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days
        },
        summary: {
          totalEvents: events.length,
          totalAlerts: alerts.length,
          highSeverityAlerts: alerts.filter(a => a.severity === 'high').length,
          eventsByType: this.groupBy(events, 'eventType'),
          alertsByType: this.groupBy(alerts, 'alertType')
        },
        events: events.slice(0, 50), // Latest 50 events
        alerts: alerts.slice(0, 20), // Latest 20 alerts
        recommendations: this.generateRecommendations(events, alerts)
      }

      // Store report in R2
      const reportPath = r2.buildSecurityPath('reports', 
        new Date().toISOString().split('T')[0], 
        `${userId}_security_report_${Date.now()}.json`)
      
      await r2.putJson(reportPath, report)

      return report

    } catch (error) {
      console.error('Failed to generate security report:', error)
      return null
    }
  }

  // Generate security recommendations
  generateRecommendations(events, alerts) {
    const recommendations = []

    // Analyze patterns and suggest improvements
    const failedTests = events.filter(e => e.eventType === 'connection_test_failed')
    if (failedTests.length > 5) {
      recommendations.push({
        type: 'credential_health',
        priority: 'medium',
        message: 'Multiple connection test failures detected. Consider reviewing and updating your connection credentials.'
      })
    }

    const highSeverityAlerts = alerts.filter(a => a.severity === 'high')
    if (highSeverityAlerts.length > 0) {
      recommendations.push({
        type: 'immediate_action',
        priority: 'high',
        message: 'High severity security alerts detected. Review your account activity and consider changing passwords.'
      })
    }

    const revokedUsage = events.filter(e => e.eventType === 'revoked_connection_usage')
    if (revokedUsage.length > 0) {
      recommendations.push({
        type: 'cleanup',
        priority: 'medium',
        message: 'Attempts to use revoked connections detected. Clean up any automated scripts or agents using old credentials.'
      })
    }

    return recommendations
  }

  // Utility function to group array by property
  groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property]
      groups[key] = groups[key] || 0
      groups[key]++
      return groups
    }, {})
  }

  // Clean up old data
  async cleanup() {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days

    try {
      // Clean up old events
      await prisma.connectionSecurityEvent.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      }).catch(() => {})

      // Clean up resolved alerts
      await prisma.securityAlert.deleteMany({
        where: {
          status: 'resolved',
          createdAt: {
            lt: cutoffDate
          }
        }
      }).catch(() => {})

      // Clean up expired rate limits
      await prisma.userRateLimit.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      }).catch(() => {})

      console.log('Security monitoring cleanup completed')

    } catch (error) {
      console.error('Failed to cleanup security data:', error)
    }
  }
}

// Create singleton instance
export const connectionSecurityMonitor = new ConnectionSecurityMonitor()

// Set up cleanup interval (daily)
setInterval(() => {
  connectionSecurityMonitor.cleanup()
}, 24 * 60 * 60 * 1000)

export default connectionSecurityMonitor