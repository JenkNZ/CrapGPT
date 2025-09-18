/**
 * Performance Monitoring and Optimization Utilities for AgentForge
 * Enterprise-grade performance monitoring and optimization
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializeObservers() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: 'navigation',
            value: entry.duration,
            unit: 'ms',
            timestamp: new Date(),
            metadata: {
              type: entry.entryType,
              name: entry.name
            }
          });
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: 'resource_load',
            value: entry.duration,
            unit: 'ms',
            timestamp: new Date(),
            metadata: {
              name: entry.name,
              size: (entry as any).transferSize || 0,
              type: (entry as any).initiatorType
            }
          });
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // Monitor largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: 'largest_contentful_paint',
            value: entry.startTime,
            unit: 'ms',
            timestamp: new Date()
          });
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    }
  }

  public recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Send critical performance issues to monitoring service
    if (this.isCriticalMetric(metric)) {
      this.reportCriticalMetric(metric);
    }
  }

  private isCriticalMetric(metric: PerformanceMetric): boolean {
    const thresholds = {
      navigation: 5000, // 5 seconds
      resource_load: 2000, // 2 seconds
      largest_contentful_paint: 4000, // 4 seconds
      api_call: 10000, // 10 seconds
      database_query: 1000 // 1 second
    };

    return metric.value > (thresholds[metric.name as keyof typeof thresholds] || Infinity);
  }

  private reportCriticalMetric(metric: PerformanceMetric) {
    // In production, this would send to a monitoring service like DataDog, New Relic, etc.
    console.warn('Critical performance metric detected:', metric);
    
    if (typeof window !== 'undefined' && 'navigator' in window && 'sendBeacon' in navigator) {
      navigator.sendBeacon('/api/performance/critical', JSON.stringify(metric));
    }
  }

  public getMetrics(name?: string): PerformanceMetric[] {
    return name ? this.metrics.filter(m => m.name === name) : this.metrics;
  }

  public getAverageMetric(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;
    
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  public startTimer(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      this.recordMetric({
        name,
        value: endTime - startTime,
        unit: 'ms',
        timestamp: new Date()
      });
    };
  }

  public cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

export class MemoryCache<T> {
  private cache = new Map<string, { data: T; expiry: number; hits: number }>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };

    this.startCleanupTimer();
  }

  public set(key: string, data: T): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + this.config.ttl,
      hits: 0
    });
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public getStats() {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      totalHits: entries.reduce((sum, entry) => sum + entry.hits, 0),
      averageHits: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + entry.hits, 0) / entries.length 
        : 0
    };
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

export class QueryOptimizer {
  private static queryCache = new MemoryCache<any>({
    ttl: 2 * 60 * 1000, // 2 minutes for query results
    maxSize: 500
  });

  public static async executeWithCache<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: { ttl?: number } = {}
  ): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    const timer = monitor.startTimer(`query_${key}`);

    // Check cache first
    const cached = this.queryCache.get(key);
    if (cached) {
      timer();
      monitor.recordMetric({
        name: 'query_cache_hit',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        metadata: { key }
      });
      return cached;
    }

    // Execute query
    try {
      const result = await queryFn();
      
      // Cache the result
      if (options.ttl) {
        const customCache = new MemoryCache<T>({ ttl: options.ttl });
        customCache.set(key, result);
      } else {
        this.queryCache.set(key, result);
      }

      timer();
      monitor.recordMetric({
        name: 'query_cache_miss',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        metadata: { key }
      });

      return result;
    } catch (error) {
      timer();
      monitor.recordMetric({
        name: 'query_error',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        metadata: { key, error: (error as Error).message }
      });
      throw error;
    }
  }

  public static invalidateCache(pattern: string): void {
    // This would implement cache invalidation based on patterns
    // For now, we'll clear the entire cache
    this.queryCache.clear();
  }
}

export class DatabaseOptimizer {
  private static connectionPool: Map<string, any> = new Map();
  private static queryStats = new Map<string, { count: number; totalTime: number; lastRun: Date }>();

  public static async executeQuery<T>(
    query: string,
    params: any[] = [],
    options: { timeout?: number } = {}
  ): Promise<T> {
    const monitor = PerformanceMonitor.getInstance();
    const timer = monitor.startTimer('database_query');
    const queryHash = this.hashQuery(query);

    try {
      // Update query statistics
      const stats = this.queryStats.get(queryHash) || { count: 0, totalTime: 0, lastRun: new Date() };
      
      const startTime = performance.now();
      
      // Execute query with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), options.timeout || 30000);
      });

      // Simulate database query execution
      const queryPromise = new Promise<T>((resolve) => {
        // In real implementation, this would execute against the database
        setTimeout(() => resolve({} as T), 10);
      });

      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      const endTime = performance.now();
      const queryTime = endTime - startTime;

      // Update statistics
      stats.count++;
      stats.totalTime += queryTime;
      stats.lastRun = new Date();
      this.queryStats.set(queryHash, stats);

      timer();

      // Log slow queries
      if (queryTime > 1000) {
        console.warn(`Slow query detected (${queryTime.toFixed(2)}ms):`, query);
      }

      monitor.recordMetric({
        name: 'database_query_time',
        value: queryTime,
        unit: 'ms',
        timestamp: new Date(),
        metadata: {
          queryHash,
          paramCount: params.length
        }
      });

      return result;
    } catch (error) {
      timer();
      monitor.recordMetric({
        name: 'database_query_error',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        metadata: {
          queryHash,
          error: (error as Error).message
        }
      });
      throw error;
    }
  }

  private static hashQuery(query: string): string {
    // Simple hash function for query identification
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  public static getQueryStats(): Array<{ query: string; stats: any }> {
    return Array.from(this.queryStats.entries()).map(([queryHash, stats]) => ({
      query: queryHash,
      stats: {
        ...stats,
        averageTime: stats.totalTime / stats.count
      }
    }));
  }
}

// React hooks for performance monitoring
export function usePerformanceMonitoring(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  
  React.useEffect(() => {
    const timer = monitor.startTimer(`component_render_${componentName}`);
    
    return () => {
      timer();
    };
  });

  const trackUserAction = (actionName: string, metadata?: Record<string, any>) => {
    monitor.recordMetric({
      name: `user_action_${actionName}`,
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      metadata
    });
  };

  return { trackUserAction };
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const queryOptimizer = QueryOptimizer;
export const databaseOptimizer = DatabaseOptimizer;