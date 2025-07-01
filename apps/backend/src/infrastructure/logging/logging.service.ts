import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  service: string;
  message: string;
  metadata?: any;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
}

export interface LoggingConfig {
  level: string;
  format: 'json' | 'text';
  outputs: ('console' | 'file' | 'database' | 'external')[];
  retention: {
    files: number;
    days: number;
  };
  externalService?: {
    type: 'elasticsearch' | 'loki' | 'datadog';
    endpoint: string;
    apiKey?: string;
  };
}

@Injectable()
export class LoggingService {
  private readonly logger = new Logger(LoggingService.name);
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    this.config = {
      level: this.configService.get('LOG_LEVEL', 'info'),
      format: this.configService.get('LOG_FORMAT', 'json') as 'json' | 'text',
      outputs: (this.configService.get('LOG_OUTPUTS', 'console,file')).split(','),
      retention: {
        files: parseInt(this.configService.get('LOG_RETENTION_FILES', '10')),
        days: parseInt(this.configService.get('LOG_RETENTION_DAYS', '30'))
      },
      externalService: this.getExternalServiceConfig()
    };

    this.initializeLogging();
    this.setupPeriodicFlush();
  }

  private getExternalServiceConfig() {
    const type = this.configService.get('LOG_EXTERNAL_SERVICE');
    if (!type) return undefined;

    return {
      type,
      endpoint: this.configService.get('LOG_EXTERNAL_ENDPOINT'),
      apiKey: this.configService.get('LOG_EXTERNAL_API_KEY')
    };
  }

  private initializeLogging() {
    this.logger.log('🔍 Initializing centralized logging system...');
    
    // Ensure log directory exists
    if (this.config.outputs.includes('file')) {
      this.ensureLogDirectory();
    }

    // Setup external service connection
    if (this.config.externalService) {
      this.testExternalServiceConnection();
    }

    this.logger.log(`✅ Logging initialized: ${this.config.outputs.join(', ')}`);
  }

  private ensureLogDirectory() {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private setupPeriodicFlush() {
    // Flush logs every 5 seconds or when buffer reaches 100 entries
    this.flushInterval = setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flushLogs();
      }
    }, 5000);
  }

  /**
   * Log an entry with structured data
   */
  async log(entry: Partial<LogEntry>) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: entry.level || 'info',
      service: entry.service || 'multitenant-shell',
      message: entry.message || '',
      metadata: entry.metadata,
      requestId: entry.requestId,
      userId: entry.userId,
      tenantId: entry.tenantId,
      ip: entry.ip,
      userAgent: entry.userAgent,
      duration: entry.duration,
      statusCode: entry.statusCode
    };

    // Add to buffer for batch processing
    this.logBuffer.push(logEntry);

    // Immediate flush for error and warning levels
    if (logEntry.level === 'error' || logEntry.level === 'warn') {
      await this.flushLogs();
    }

    // Flush if buffer is full
    if (this.logBuffer.length >= 100) {
      await this.flushLogs();
    }
  }

  /**
   * Log API request/response
   */
  async logApiRequest(requestData: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    requestId: string;
    userId?: string;
    tenantId?: string;
    ip: string;
    userAgent: string;
    requestBody?: any;
    responseSize?: number;
  }) {
    await this.log({
      level: requestData.statusCode >= 400 ? 'error' : 'info',
      service: 'api',
      message: `${requestData.method} ${requestData.url}`,
      metadata: {
        method: requestData.method,
        url: requestData.url,
        requestBody: this.sanitizeRequestBody(requestData.requestBody),
        responseSize: requestData.responseSize
      },
      requestId: requestData.requestId,
      userId: requestData.userId,
      tenantId: requestData.tenantId,
      ip: requestData.ip,
      userAgent: requestData.userAgent,
      duration: requestData.duration,
      statusCode: requestData.statusCode
    });
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(eventData: {
    event: 'login' | 'logout' | 'failed_login' | 'token_refresh' | 'password_change';
    userId?: string;
    email?: string;
    tenantId?: string;
    ip: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    requestId?: string;
  }) {
    await this.log({
      level: eventData.success ? 'info' : 'warn',
      service: 'auth',
      message: `Authentication event: ${eventData.event}`,
      metadata: {
        event: eventData.event,
        email: eventData.email,
        success: eventData.success,
        reason: eventData.reason
      },
      requestId: eventData.requestId,
      userId: eventData.userId,
      tenantId: eventData.tenantId,
      ip: eventData.ip,
      userAgent: eventData.userAgent
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventData: {
    event: 'suspicious_activity' | 'rate_limit_exceeded' | 'csrf_violation' | 'unauthorized_access';
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    tenantId?: string;
    ip: string;
    userAgent: string;
    details: any;
    requestId?: string;
  }) {
    await this.log({
      level: eventData.severity === 'critical' ? 'error' : 'warn',
      service: 'security',
      message: `Security event: ${eventData.event}`,
      metadata: {
        event: eventData.event,
        severity: eventData.severity,
        details: eventData.details
      },
      requestId: eventData.requestId,
      userId: eventData.userId,
      tenantId: eventData.tenantId,
      ip: eventData.ip,
      userAgent: eventData.userAgent
    });
  }

  /**
   * Log business events
   */
  async logBusinessEvent(eventData: {
    event: string;
    category: 'tenant' | 'user' | 'rbac' | 'data' | 'system';
    userId?: string;
    tenantId?: string;
    entityId?: string;
    changes?: any;
    requestId?: string;
  }) {
    await this.log({
      level: 'info',
      service: 'business',
      message: `Business event: ${eventData.event}`,
      metadata: {
        event: eventData.event,
        category: eventData.category,
        entityId: eventData.entityId,
        changes: eventData.changes
      },
      requestId: eventData.requestId,
      userId: eventData.userId,
      tenantId: eventData.tenantId
    });
  }

  /**
   * Log performance metrics
   */
  async logPerformanceMetric(metricData: {
    metric: string;
    value: number;
    unit: string;
    service: string;
    tags?: Record<string, string>;
    requestId?: string;
  }) {
    await this.log({
      level: 'info',
      service: 'performance',
      message: `Performance metric: ${metricData.metric}`,
      metadata: {
        metric: metricData.metric,
        value: metricData.value,
        unit: metricData.unit,
        tags: metricData.tags
      },
      requestId: metricData.requestId
    });
  }

  /**
   * Log error with stack trace
   */
  async logError(error: Error, context: {
    service?: string;
    userId?: string;
    tenantId?: string;
    requestId?: string;
    additionalInfo?: any;
  }) {
    await this.log({
      level: 'error',
      service: context.service || 'unknown',
      message: error.message,
      metadata: {
        errorName: error.name,
        stack: error.stack,
        additionalInfo: context.additionalInfo
      },
      requestId: context.requestId,
      userId: context.userId,
      tenantId: context.tenantId
    });
  }

  private async flushLogs() {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Output to console
      if (this.config.outputs.includes('console')) {
        this.outputToConsole(logsToFlush);
      }

      // Output to file
      if (this.config.outputs.includes('file')) {
        await this.outputToFile(logsToFlush);
      }

      // Output to external service
      if (this.config.outputs.includes('external') && this.config.externalService) {
        await this.outputToExternalService(logsToFlush);
      }

    } catch (error) {
      this.logger.error('Failed to flush logs:', error);
      // Put logs back in buffer to retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  private outputToConsole(logs: LogEntry[]) {
    logs.forEach(log => {
      const formatted = this.config.format === 'json' 
        ? JSON.stringify(log)
        : this.formatTextLog(log);
      
      console.log(formatted);
    });
  }

  private async outputToFile(logs: LogEntry[]) {
    const logDir = path.join(process.cwd(), 'logs');
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `app-${date}.log`);

    const logLines = logs.map(log => 
      this.config.format === 'json' 
        ? JSON.stringify(log)
        : this.formatTextLog(log)
    ).join('\n') + '\n';

    try {
      await fs.promises.appendFile(logFile, logLines);
    } catch (error) {
      this.logger.error('Failed to write to log file:', error);
    }
  }

  private async outputToExternalService(logs: LogEntry[]) {
    if (!this.config.externalService) return;

    try {
      switch (this.config.externalService.type) {
        case 'loki':
          await this.sendToLoki(logs);
          break;
        case 'elasticsearch':
          await this.sendToElasticsearch(logs);
          break;
        case 'datadog':
          await this.sendToDatadog(logs);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to send logs to external service:', error);
    }
  }

  private async sendToLoki(logs: LogEntry[]) {
    if (!this.config.externalService?.endpoint) {
      throw new Error('Loki endpoint not configured');
    }

    const streams = logs.map(log => ({
      stream: {
        service: log.service,
        level: log.level,
        tenant: log.tenantId || 'unknown'
      },
      values: [[
        (new Date(log.timestamp).getTime() * 1000000).toString(),
        JSON.stringify(log)
      ]]
    }));

    const payload = { streams };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.externalService.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.externalService.apiKey}`;
    }

    const response = await fetch(`${this.config.externalService.endpoint}/loki/api/v1/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Loki push failed: ${response.statusText}`);
    }
  }

  private async sendToElasticsearch(logs: LogEntry[]) {
    if (!this.config.externalService?.endpoint) {
      throw new Error('Elasticsearch endpoint not configured');
    }

    const bulkBody = logs.flatMap(log => [
      { index: { _index: `multitenant-logs-${new Date().toISOString().split('T')[0]}` } },
      log
    ]);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.externalService.apiKey) {
      headers['Authorization'] = `ApiKey ${this.config.externalService.apiKey}`;
    }

    const response = await fetch(`${this.config.externalService.endpoint}/_bulk`, {
      method: 'POST',
      headers,
      body: bulkBody.map(item => JSON.stringify(item)).join('\n') + '\n'
    });

    if (!response.ok) {
      throw new Error(`Elasticsearch bulk failed: ${response.statusText}`);
    }
  }

  private async sendToDatadog(logs: LogEntry[]) {
    if (!this.config.externalService?.endpoint || !this.config.externalService?.apiKey) {
      throw new Error('Datadog endpoint and API key must be configured');
    }

    const payload = logs.map(log => ({
      timestamp: new Date(log.timestamp).getTime(),
      level: log.level,
      message: log.message,
      service: log.service,
      tags: {
        tenant: log.tenantId,
        user: log.userId,
        request: log.requestId
      },
      attributes: log.metadata
    }));

    const response = await fetch(`${this.config.externalService.endpoint}/v1/input/${this.config.externalService.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': this.config.externalService.apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Datadog logs failed: ${response.statusText}`);
    }
  }

  private formatTextLog(log: LogEntry): string {
    const timestamp = log.timestamp;
    const level = log.level.toUpperCase().padEnd(5);
    const service = log.service.padEnd(10);
    const message = log.message;
    
    let formatted = `[${timestamp}] ${level} [${service}] ${message}`;
    
    if (log.requestId) {
      formatted += ` [req:${log.requestId}]`;
    }
    
    if (log.userId) {
      formatted += ` [user:${log.userId}]`;
    }
    
    if (log.tenantId) {
      formatted += ` [tenant:${log.tenantId}]`;
    }
    
    if (log.duration) {
      formatted += ` [${log.duration}ms]`;
    }
    
    return formatted;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return undefined;

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const result: Record<string, any> = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };

    return sanitizeObject(sanitized);
  }

  private async testExternalServiceConnection() {
    try {
      if (!this.config.externalService?.type) {
        return;
      }

      this.logger.log(`Testing connection to ${this.config.externalService.type}...`);
      
      // Test connection with a ping log
      await this.log({
        level: 'info',
        service: 'logging',
        message: 'Logging service connection test'
      });
      
      this.logger.log(`✅ External logging service connected: ${this.config.externalService.type}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`⚠️ External logging service connection failed: ${errorMessage}`);
    }
  }

  /**
   * Get recent logs for debugging
   */
  async getRecentLogs(filters: {
    service?: string;
    level?: string;
    userId?: string;
    tenantId?: string;
    since?: Date;
    limit?: number;
  } = {}): Promise<LogEntry[]> {
    // This would typically query the log storage
    // For now, return from current buffer
    let logs = [...this.logBuffer];

    if (filters.service) {
      logs = logs.filter(log => log.service === filters.service);
    }

    if (filters.level) {
      logs = logs.filter(log => log.level === filters.level);
    }

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }

    if (filters.tenantId) {
      logs = logs.filter(log => log.tenantId === filters.tenantId);
    }

    if (filters.since) {
      logs = logs.filter(log => new Date(log.timestamp) >= filters.since!);
    }

    return logs.slice(0, filters.limit || 100);
  }

  async onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Final flush
    await this.flushLogs();
  }
} 