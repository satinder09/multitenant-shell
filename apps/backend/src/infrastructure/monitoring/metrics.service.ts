import { Injectable, Logger } from '@nestjs/common';
import { Performance } from 'perf_hooks';

export interface MetricEvent {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface DatabaseMetrics {
  query_count: number;
  avg_query_time: number;
  slow_queries: number;
  active_connections: number;
  error_rate: number;
}

export interface ApplicationMetrics {
  request_count: number;
  avg_response_time: number;
  error_count: number;
  active_sessions: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: Map<string, MetricEvent[]> = new Map();
  private counters: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();

  // Counter methods
  incrementCounter(name: string, value = 1, tags?: Record<string, string>) {
    const key = this.buildKey(name, tags);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    
    this.recordMetric({
      name,
      value: current + value,
      unit: 'count',
      timestamp: new Date(),
      tags,
    });
  }

  // Timer methods
  startTimer(name: string): string {
    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, performance.now());
    return timerId;
  }

  endTimer(timerId: string, tags?: Record<string, string>): number {
    const startTime = this.timers.get(timerId);
    if (!startTime) {
      this.logger.warn(`Timer ${timerId} not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(timerId);

    const name = timerId.split('_')[0];
    this.recordMetric({
      name: `${name}_duration`,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags,
    });

    return duration;
  }

  // Gauge methods
  recordGauge(name: string, value: number, unit = 'count', tags?: Record<string, string>) {
    this.recordMetric({
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
    });
  }

  // Histogram methods
  recordHistogram(name: string, value: number, unit = 'ms', tags?: Record<string, string>) {
    this.recordMetric({
      name: `${name}_histogram`,
      value,
      unit,
      timestamp: new Date(),
      tags,
    });
  }

  // Database metrics
  recordDatabaseQuery(query: string, duration: number, success = true) {
    this.incrementCounter('database_queries_total', 1, {
      success: success.toString(),
    });

    this.recordHistogram('database_query_duration', duration, 'ms');

    if (duration > 1000) { // Slow query threshold
      this.incrementCounter('database_slow_queries_total', 1);
      this.logger.warn(`Slow query detected: ${duration}ms - ${query.substring(0, 100)}...`);
    }

    if (!success) {
      this.incrementCounter('database_errors_total', 1);
    }
  }

  // HTTP metrics
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number) {
    this.incrementCounter('http_requests_total', 1, {
      method,
      path,
      status_code: statusCode.toString(),
    });

    this.recordHistogram('http_request_duration', duration, 'ms', {
      method,
      path,
    });

    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', 1, {
        status_code: statusCode.toString(),
      });
    }
  }

  // Authentication metrics
  recordAuthEvent(event: 'login' | 'logout' | 'failed_login', tenantId?: string) {
    this.incrementCounter(`auth_${event}_total`, 1, {
      tenant_id: tenantId || 'platform',
    });
  }

  // Tenant metrics
  recordTenantOperation(operation: string, tenantId: string, success = true) {
    this.incrementCounter('tenant_operations_total', 1, {
      operation,
      tenant_id: tenantId,
      success: success.toString(),
    });
  }

  // Get metrics summary
  getMetricsSummary(): Record<string, any> {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentMetrics = new Map();
    
    for (const [key, events] of this.metrics.entries()) {
      const recentEvents = events.filter(event => 
        event.timestamp.getTime() > oneHourAgo
      );
      
      if (recentEvents.length > 0) {
        recentMetrics.set(key, {
          count: recentEvents.length,
          avg_value: recentEvents.reduce((sum, e) => sum + e.value, 0) / recentEvents.length,
          last_value: recentEvents[recentEvents.length - 1].value,
          last_timestamp: recentEvents[recentEvents.length - 1].timestamp,
        });
      }
    }

    return {
      counters: Object.fromEntries(this.counters),
      recent_metrics: Object.fromEntries(recentMetrics),
      active_timers: this.timers.size,
      timestamp: new Date().toISOString(),
    };
  }

  // Export metrics in Prometheus format
  exportPrometheusMetrics(): string {
    let output = '';

    // Export counters
    for (const [key, value] of this.counters.entries()) {
      const [name, tagsStr] = this.parseKey(key);
      output += `# TYPE ${name} counter\n`;
      output += `${name}${tagsStr} ${value}\n`;
    }

    // Export recent metric values
    for (const [key, events] of this.metrics.entries()) {
      if (events.length > 0) {
        const latest = events[events.length - 1];
        const [name, tagsStr] = this.parseKey(key);
        
        if (latest.unit === 'ms') {
          output += `# TYPE ${name} histogram\n`;
        } else {
          output += `# TYPE ${name} gauge\n`;
        }
        
        output += `${name}${tagsStr} ${latest.value}\n`;
      }
    }

    return output;
  }

  // Public method for recording metrics
  public recordMetric(metric: MetricEvent) {
    const key = this.buildKey(metric.name, metric.tags);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const events = this.metrics.get(key)!;
    events.push(metric);
    
    // Keep only last 1000 events per metric
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
  }

  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}{${tagString}}`;
  }

  private parseKey(key: string): [string, string] {
    const braceIndex = key.indexOf('{');
    if (braceIndex === -1) {
      return [key, ''];
    }
    
    const name = key.substring(0, braceIndex);
    const tags = key.substring(braceIndex);
    return [name, tags];
  }

  // Security metrics methods
  recordSecurityEvent(eventType: string, eventData: any = {}): void {
    this.incrementCounter('security_events_total', 1, {
      event_type: eventType,
    });

    // Log security event for monitoring
    this.logger.warn(`Security event: ${eventType}`, eventData);
  }

  recordSecurityMetrics(metrics: any): void {
    // Record security-related metrics
    this.recordMetric({
      name: 'security_metrics',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      tags: {
        ip: metrics.ip || 'unknown',
        method: metrics.method || 'unknown',
      },
    });
  }

  recordBusinessMetric(domain: string, action: string, data: any = {}): void {
    this.incrementCounter('business_events_total', 1, {
      domain,
      action,
    });

    this.logger.log(`Business metric: ${domain}.${action}`, data);
  }
} 