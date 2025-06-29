import { Controller, Get, Query, Logger } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { DatabasePerformanceService } from '../performance/database.config';

interface MetricsSummary {
  timestamp: string;
  uptime: number;
  performance: {
    api: {
      total_requests: number;
      avg_response_time: number;
      error_rate: number;
      slow_requests: number;
    };
    database: {
      total_queries: number;
      avg_query_time: number;
      slow_queries: number;
      error_rate: number;
    };
  };
  business: {
    active_users: number;
    active_tenants: number;
    auth_success_rate: number;
    rbac_operations: number;
  };
  system: {
    memory_usage_mb: number;
    cpu_usage_percent: number;
    active_connections: number;
  };
  alerts: AlertInfo[];
}

interface AlertInfo {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'error' | 'security' | 'business';
  message: string;
  timestamp: string;
  resolved: boolean;
}

@Controller('metrics')
export class MetricsDashboardController {
  private readonly logger = new Logger(MetricsDashboardController.name);
  private alertHistory: AlertInfo[] = [];

  constructor(
    private readonly metricsService: MetricsService,
    private readonly dbPerformanceService: DatabasePerformanceService,
  ) {
    // Start alert monitoring
    this.startAlertMonitoring();
  }

  @Get('dashboard')
  async getDashboard(@Query('timeRange') timeRange: string = '1h'): Promise<MetricsSummary> {
    const rawMetrics = this.metricsService.getMetricsSummary();
    const dbHealth = await this.dbPerformanceService.performHealthCheck();
    const memoryUsage = process.memoryUsage();
    
    // Calculate performance metrics
    const apiMetrics = this.calculateApiMetrics(rawMetrics);
    const dbMetrics = this.calculateDatabaseMetrics(rawMetrics);
    const businessMetrics = this.calculateBusinessMetrics(rawMetrics);
    const systemMetrics = this.calculateSystemMetrics(memoryUsage);
    
    // Check for active alerts
    const activeAlerts = this.getActiveAlerts();

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      performance: {
        api: apiMetrics,
        database: dbMetrics,
      },
      business: businessMetrics,
      system: systemMetrics,
      alerts: activeAlerts,
    };
  }

  @Get('performance')
  async getPerformanceMetrics() {
    const rawMetrics = this.metricsService.getMetricsSummary();
    
    return {
      api_response_times: this.getMetricsByPattern(rawMetrics, 'api_response_time'),
      database_query_times: this.getMetricsByPattern(rawMetrics, 'database_query_duration'),
      slow_operations: this.getSlowOperations(rawMetrics),
      error_rates: this.getErrorRates(rawMetrics),
      throughput: this.getThroughputMetrics(rawMetrics),
    };
  }

  @Get('business')
  async getBusinessMetrics() {
    const rawMetrics = this.metricsService.getMetricsSummary();
    
    return {
      user_activity: this.getUserActivityMetrics(rawMetrics),
      tenant_operations: this.getTenantMetrics(rawMetrics),
      auth_metrics: this.getAuthMetrics(rawMetrics),
      rbac_usage: this.getRbacMetrics(rawMetrics),
      feature_usage: this.getFeatureUsageMetrics(rawMetrics),
    };
  }

  @Get('alerts')
  async getAlerts(@Query('severity') severity?: string, @Query('resolved') resolved?: string) {
    let alerts = this.alertHistory;
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    if (resolved !== undefined) {
      const isResolved = resolved.toLowerCase() === 'true';
      alerts = alerts.filter(alert => alert.resolved === isResolved);
    }
    
    return {
      alerts: alerts.slice(0, 100), // Limit to latest 100 alerts
      summary: {
        total: alerts.length,
        active: alerts.filter(a => !a.resolved).length,
        by_severity: this.groupAlertsBySeverity(alerts),
      },
    };
  }

  @Get('health-score')
  async getHealthScore() {
    const rawMetrics = this.metricsService.getMetricsSummary();
    const dbHealth = await this.dbPerformanceService.performHealthCheck();
    
    // Calculate health score (0-100)
    const scores = {
      performance: this.calculatePerformanceScore(rawMetrics),
      reliability: this.calculateReliabilityScore(rawMetrics),
      security: this.calculateSecurityScore(rawMetrics),
      business: this.calculateBusinessScore(rawMetrics),
    };
    
    const overallScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;
    
    return {
      overall_score: Math.round(overallScore),
      category_scores: scores,
      recommendations: this.generateRecommendations(scores, rawMetrics),
      timestamp: new Date().toISOString(),
    };
  }

  // Private helper methods
  private calculateApiMetrics(rawMetrics: any) {
    const totalRequests = rawMetrics.counters['api_requests_total'] || 0;
    const totalErrors = rawMetrics.counters['api_errors_total'] || 0;
    const slowRequests = rawMetrics.counters['api_slow_requests_total'] || 0;
    
    const responseTimeMetrics = rawMetrics.recent_metrics['api_response_time'] || {};
    const avgResponseTime = responseTimeMetrics.avg_value || 0;
    
    return {
      total_requests: totalRequests,
      avg_response_time: Math.round(avgResponseTime),
      error_rate: totalRequests > 0 ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0,
      slow_requests: slowRequests,
    };
  }

  private calculateDatabaseMetrics(rawMetrics: any) {
    const totalQueries = rawMetrics.counters['database_queries_total'] || 0;
    const totalErrors = rawMetrics.counters['database_errors_total'] || 0;
    const slowQueries = rawMetrics.counters['database_slow_queries_total'] || 0;
    
    const queryTimeMetrics = rawMetrics.recent_metrics['database_query_duration'] || {};
    const avgQueryTime = queryTimeMetrics.avg_value || 0;
    
    return {
      total_queries: totalQueries,
      avg_query_time: Math.round(avgQueryTime),
      slow_queries: slowQueries,
      error_rate: totalQueries > 0 ? Number(((totalErrors / totalQueries) * 100).toFixed(2)) : 0,
    };
  }

  private calculateBusinessMetrics(rawMetrics: any) {
    const authLogins = rawMetrics.counters['auth_login_attempts'] || 0;
    const authSuccess = rawMetrics.counters['auth_login_success'] || 0;
    const userRequests = rawMetrics.counters['user_api_requests'] || 0;
    const tenantRequests = rawMetrics.counters['tenant_api_requests'] || 0;
    const rbacOps = rawMetrics.counters['rbac_operations'] || 0;
    
    // Estimate active users/tenants from recent activity
    const activeUsers = Object.keys(rawMetrics.recent_metrics)
      .filter(key => key.startsWith('user_api_requests'))
      .length;
    
    const activeTenants = Object.keys(rawMetrics.recent_metrics)
      .filter(key => key.startsWith('tenant_api_requests'))
      .length;
    
    return {
      active_users: activeUsers,
      active_tenants: activeTenants,
      auth_success_rate: authLogins > 0 ? Number(((authSuccess / authLogins) * 100).toFixed(2)) : 100,
      rbac_operations: rbacOps,
    };
  }

  private calculateSystemMetrics(memoryUsage: NodeJS.MemoryUsage) {
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    return {
      memory_usage_mb: memoryUsageMB,
      cpu_usage_percent: 0, // Would need additional monitoring for CPU
      active_connections: 0, // Would need connection pool monitoring
    };
  }

  private getMetricsByPattern(rawMetrics: any, pattern: string) {
    const matchingMetrics = Object.entries(rawMetrics.recent_metrics)
      .filter(([key]) => key.includes(pattern))
      .map(([key, value]: [string, any]) => ({
        metric: key,
        count: value.count,
        avg_value: Number(value.avg_value?.toFixed(2)) || 0,
        last_value: value.last_value,
        last_timestamp: value.last_timestamp,
      }));
    
    return matchingMetrics;
  }

  private getSlowOperations(rawMetrics: any) {
    return {
      slow_api_requests: rawMetrics.counters['api_slow_requests_total'] || 0,
      slow_database_queries: rawMetrics.counters['database_slow_queries_total'] || 0,
    };
  }

  private getErrorRates(rawMetrics: any) {
    const apiTotal = rawMetrics.counters['api_requests_total'] || 0;
    const apiErrors = rawMetrics.counters['api_errors_total'] || 0;
    const dbTotal = rawMetrics.counters['database_queries_total'] || 0;
    const dbErrors = rawMetrics.counters['database_errors_total'] || 0;
    
    return {
      api_error_rate: apiTotal > 0 ? Number(((apiErrors / apiTotal) * 100).toFixed(2)) : 0,
      database_error_rate: dbTotal > 0 ? Number(((dbErrors / dbTotal) * 100).toFixed(2)) : 0,
    };
  }

  private getThroughputMetrics(rawMetrics: any) {
    return {
      requests_per_minute: Math.round((rawMetrics.counters['api_requests_total'] || 0) / (process.uptime() / 60)),
      queries_per_minute: Math.round((rawMetrics.counters['database_queries_total'] || 0) / (process.uptime() / 60)),
    };
  }

  private getUserActivityMetrics(rawMetrics: any) {
    return {
      total_user_requests: rawMetrics.counters['user_api_requests'] || 0,
      unique_active_users: Object.keys(rawMetrics.recent_metrics)
        .filter(key => key.startsWith('user_api_requests'))
        .length,
    };
  }

  private getTenantMetrics(rawMetrics: any) {
    return {
      total_tenant_requests: rawMetrics.counters['tenant_api_requests'] || 0,
      active_tenants: Object.keys(rawMetrics.recent_metrics)
        .filter(key => key.startsWith('tenant_api_requests'))
        .length,
    };
  }

  private getAuthMetrics(rawMetrics: any) {
    return {
      login_attempts: rawMetrics.counters['auth_login_attempts'] || 0,
      registrations: rawMetrics.counters['auth_registrations'] || 0,
    };
  }

  private getRbacMetrics(rawMetrics: any) {
    return {
      total_rbac_operations: rawMetrics.counters['rbac_operations'] || 0,
    };
  }

  private getFeatureUsageMetrics(rawMetrics: any) {
    // Extract feature usage from API endpoint patterns
    const featureUsage: Record<string, number> = {};
    
    Object.entries(rawMetrics.counters)
      .filter(([key]) => key.startsWith('api_requests_total'))
      .forEach(([key, value]) => {
        // Parse endpoint from key to determine feature usage
        // This would need more sophisticated parsing based on your routing
        featureUsage['api_usage'] = (featureUsage['api_usage'] || 0) + (value as number);
      });
    
    return featureUsage;
  }

  private startAlertMonitoring() {
    // Check for alerts every 30 seconds
    setInterval(() => {
      this.checkAndGenerateAlerts();
    }, 30000);
  }

  private checkAndGenerateAlerts() {
    const rawMetrics = this.metricsService.getMetricsSummary();
    const alerts: AlertInfo[] = [];
    
    // Performance alerts
    const avgResponseTime = rawMetrics.recent_metrics['api_response_time']?.avg_value || 0;
    if (avgResponseTime > 2000) {
      alerts.push(this.createAlert('critical', 'performance', 
        `High API response time: ${avgResponseTime.toFixed(0)}ms`));
    } else if (avgResponseTime > 1000) {
      alerts.push(this.createAlert('high', 'performance', 
        `Elevated API response time: ${avgResponseTime.toFixed(0)}ms`));
    }
    
    // Error rate alerts
    const totalRequests = rawMetrics.counters['api_requests_total'] || 0;
    const totalErrors = rawMetrics.counters['api_errors_total'] || 0;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    if (errorRate > 10) {
      alerts.push(this.createAlert('critical', 'error', 
        `High error rate: ${errorRate.toFixed(1)}%`));
    } else if (errorRate > 5) {
      alerts.push(this.createAlert('high', 'error', 
        `Elevated error rate: ${errorRate.toFixed(1)}%`));
    }
    
    // Memory alerts
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 200) {
      alerts.push(this.createAlert('high', 'performance', 
        `High memory usage: ${heapUsedMB.toFixed(0)}MB`));
    }
    
    // Add new alerts to history
    alerts.forEach(alert => {
      const existingAlert = this.alertHistory.find(a => 
        a.type === alert.type && 
        a.message === alert.message && 
        !a.resolved
      );
      
      if (!existingAlert) {
        this.alertHistory.push(alert);
        this.logger.warn(`Alert generated: ${alert.severity} - ${alert.message}`);
      }
    });
    
    // Auto-resolve alerts that no longer apply
    this.autoResolveAlerts(rawMetrics);
    
    // Keep only last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }
  }

  private createAlert(severity: AlertInfo['severity'], type: AlertInfo['type'], message: string): AlertInfo {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      type,
      message,
      timestamp: new Date().toISOString(),
      resolved: false,
    };
  }

  private autoResolveAlerts(rawMetrics: any) {
    const now = new Date();
    
    this.alertHistory.forEach(alert => {
      if (alert.resolved) return;
      
      // Auto-resolve performance alerts if metrics are now normal
      if (alert.type === 'performance' && alert.message.includes('response time')) {
        const avgResponseTime = rawMetrics.recent_metrics['api_response_time']?.avg_value || 0;
        if (avgResponseTime < 1000) {
          alert.resolved = true;
          this.logger.log(`Alert auto-resolved: ${alert.message}`);
        }
      }
      
      // Auto-resolve error rate alerts
      if (alert.type === 'error' && alert.message.includes('error rate')) {
        const totalRequests = rawMetrics.counters['api_requests_total'] || 0;
        const totalErrors = rawMetrics.counters['api_errors_total'] || 0;
        const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
        
        if (errorRate < 2) {
          alert.resolved = true;
          this.logger.log(`Alert auto-resolved: ${alert.message}`);
        }
      }
    });
  }

  private getActiveAlerts(): AlertInfo[] {
    return this.alertHistory
      .filter(alert => !alert.resolved)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Latest 20 active alerts
  }

  private groupAlertsBySeverity(alerts: AlertInfo[]) {
    return alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculatePerformanceScore(rawMetrics: any): number {
    const avgResponseTime = rawMetrics.recent_metrics['api_response_time']?.avg_value || 0;
    const slowRequests = rawMetrics.counters['api_slow_requests_total'] || 0;
    const totalRequests = rawMetrics.counters['api_requests_total'] || 1;
    
    // Performance score based on response time and slow request ratio
    let score = 100;
    
    if (avgResponseTime > 2000) score -= 40;
    else if (avgResponseTime > 1000) score -= 20;
    else if (avgResponseTime > 500) score -= 10;
    
    const slowRequestRatio = (slowRequests / totalRequests) * 100;
    if (slowRequestRatio > 10) score -= 30;
    else if (slowRequestRatio > 5) score -= 15;
    
    return Math.max(0, score);
  }

  private calculateReliabilityScore(rawMetrics: any): number {
    const totalRequests = rawMetrics.counters['api_requests_total'] || 1;
    const totalErrors = rawMetrics.counters['api_errors_total'] || 0;
    const errorRate = (totalErrors / totalRequests) * 100;
    
    let score = 100;
    
    if (errorRate > 10) score -= 50;
    else if (errorRate > 5) score -= 30;
    else if (errorRate > 2) score -= 15;
    else if (errorRate > 1) score -= 5;
    
    return Math.max(0, score);
  }

  private calculateSecurityScore(rawMetrics: any): number {
    // Basic security scoring - would expand with more security metrics
    const authAttempts = rawMetrics.counters['auth_login_attempts'] || 0;
    const authSuccess = rawMetrics.counters['auth_login_success'] || 0;
    
    let score = 100;
    
    if (authAttempts > 0) {
      const failureRate = ((authAttempts - authSuccess) / authAttempts) * 100;
      if (failureRate > 50) score -= 20; // High failure rate might indicate attacks
    }
    
    return Math.max(0, score);
  }

  private calculateBusinessScore(rawMetrics: any): number {
    const userRequests = rawMetrics.counters['user_api_requests'] || 0;
    const tenantRequests = rawMetrics.counters['tenant_api_requests'] || 0;
    
    // Business score based on user activity and system utilization
    let score = 50; // Base score
    
    if (userRequests > 100) score += 25;
    else if (userRequests > 50) score += 15;
    else if (userRequests > 10) score += 10;
    
    if (tenantRequests > 50) score += 25;
    else if (tenantRequests > 10) score += 15;
    
    return Math.min(100, score);
  }

  private generateRecommendations(scores: any, rawMetrics: any): string[] {
    const recommendations: string[] = [];
    
    if (scores.performance < 70) {
      recommendations.push('Consider optimizing API response times and database queries');
    }
    
    if (scores.reliability < 80) {
      recommendations.push('Investigate and reduce error rates across the application');
    }
    
    if (scores.security < 90) {
      recommendations.push('Review authentication patterns and security measures');
    }
    
    if (scores.business < 60) {
      recommendations.push('Increase system utilization and user engagement');
    }
    
    // Memory usage recommendation
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 150) {
      recommendations.push('Monitor memory usage and consider optimization');
    }
    
    return recommendations;
  }
} 