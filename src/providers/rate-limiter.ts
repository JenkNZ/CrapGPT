import { Provider, RateLimiter } from './unified-types'

interface RequestRecord {
  timestamp: number
  count: number
}

export class SimpleRateLimiter implements RateLimiter {
  private requestCounts = new Map<Provider, RequestRecord[]>()
  private limits = new Map<Provider, number>()

  constructor() {
    // Default rate limits (requests per minute)
    this.limits.set(Provider.OPENROUTER, 60) // OpenRouter typical limit
    this.limits.set(Provider.FAL, 30) // FAL conservative limit
    this.limits.set(Provider.MODELSLAB, 20) // ModelsLab conservative limit
  }

  setLimit(provider: Provider, rpm: number): void {
    this.limits.set(provider, rpm)
  }

  async checkLimit(provider: Provider): Promise<boolean> {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const limit = this.limits.get(provider) || 10 // default fallback

    // Get or create request records for this provider
    let records = this.requestCounts.get(provider) || []
    
    // Clean up old records
    records = records.filter(record => record.timestamp > oneMinuteAgo)
    
    // Count total requests in the last minute
    const totalRequests = records.reduce((sum, record) => sum + record.count, 0)
    
    // Update the records
    this.requestCounts.set(provider, records)
    
    return totalRequests < limit
  }

  recordRequest(provider: Provider): void {
    const now = Date.now()
    const records = this.requestCounts.get(provider) || []
    
    // Find or create a record for the current minute
    const currentMinute = Math.floor(now / 60000) * 60000
    const existingRecord = records.find(record => 
      Math.floor(record.timestamp / 60000) * 60000 === currentMinute
    )
    
    if (existingRecord) {
      existingRecord.count++
    } else {
      records.push({ timestamp: now, count: 1 })
    }
    
    this.requestCounts.set(provider, records)
  }

  getRemainingRequests(provider: Provider): number {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const limit = this.limits.get(provider) || 10
    
    const records = this.requestCounts.get(provider) || []
    const recentRecords = records.filter(record => record.timestamp > oneMinuteAgo)
    const totalRequests = recentRecords.reduce((sum, record) => sum + record.count, 0)
    
    return Math.max(0, limit - totalRequests)
  }

  getResetTime(provider: Provider): Date {
    const records = this.requestCounts.get(provider) || []
    if (records.length === 0) {
      return new Date()
    }
    
    const oldestRecord = Math.min(...records.map(r => r.timestamp))
    return new Date(oldestRecord + 60 * 1000) // Add one minute to oldest record
  }
}

// Singleton instance
export const rateLimiter = new SimpleRateLimiter()