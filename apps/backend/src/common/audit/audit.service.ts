// Comprehensive audit logging service
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AuditEvent {
  id?: string;
  timestamp: Date;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: {
    type: string;
    id?: string;
    name?: string;
  };
  actor: {
    type: 'user' | 'system' | 'api';
    id: string;
    name?: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  context: {
    operation: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'access';
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'authentication' | 'authorization' | 'data' | 'system' | 'security';
    outcome: 'success' | 'failure' | 'error';
  };
  details: {
    description: string;
    changes?: {
      before?: any;
      after?: any;
      fields?: string[];
    };
    metadata?: Record<string, any>;
    errorMessage?: string;
    duration?: number;
  };
  tags?: string[];
}

export interface AuditQuery {
  tenantId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  category?: string;
  severity?: string;
  outcome?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'action';
  sortOrder?: 'asc' | 'desc';
  tags?: string[];
}

export interface AuditStats {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  topResources: Array<{ resourceType: string; count: number }>;
  recentActivity: AuditEvent[];
  securityAlerts: AuditEvent[];
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private auditBuffer: AuditEvent[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {
    this.bufferSize = this.configService.get('AUDIT_BUFFER_SIZE', 100);
    this.flushInterval = this.configService.get('AUDIT_FLUSH_INTERVAL', 5000);
    this.startBufferFlush();
  }

  // Log audit event
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    // Add to buffer
    this.auditBuffer.push(auditEvent);

    // Log to console for development
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.log(`Audit: ${auditEvent.action} on ${auditEvent.resource.type} by ${auditEvent.actor.id}`);
    }

    // Flush buffer if it's full
    if (this.auditBuffer.length >= this.bufferSize) {
      await this.flushBuffer();
    }

    // Handle critical events immediately
    if (auditEvent.context.severity === 'critical') {
      await this.handleCriticalEvent(auditEvent);
    }
  }

  // Convenience methods for common audit events
  async logAuthentication(
    userId: string,
    action: 'login' | 'logout' | 'failed_login' | 'password_change',
    details: { ipAddress?: string; userAgent?: string; reason?: string },
    outcome: 'success' | 'failure' = 'success'
  ): Promise<void> {
    await this.log({
      action,
      resource: { type: 'authentication', id: userId },
      actor: {
        type: 'user',
        id: userId,
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
      },
      context: {
        operation: 'access',
        severity: action === 'failed_login' ? 'medium' : 'low',
        category: 'authentication',
        outcome,
      },
      details: {
        description: `User ${action.replace('_', ' ')}`,
        errorMessage: outcome === 'failure' ? details.reason : undefined,
      },
      tags: ['auth'],
    });
  }

  async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    operation: 'create' | 'read' | 'update' | 'delete',
    details: { changes?: any; metadata?: any; tenantId?: string } = {}
  ): Promise<void> {
    await this.log({
      tenantId: details.tenantId,
      action: `${operation}_${resourceType}`,
      resource: { type: resourceType, id: resourceId },
      actor: { type: 'user', id: userId },
      context: {
        operation,
        severity: operation === 'delete' ? 'medium' : 'low',
        category: 'data',
        outcome: 'success',
      },
      details: {
        description: `${operation.charAt(0).toUpperCase() + operation.slice(1)} ${resourceType}`,
        changes: details.changes,
        metadata: details.metadata,
      },
      tags: ['data', resourceType],
    });
  }

  async logSecurityEvent(
    event: {
      action: string;
      userId?: string;
      details: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      metadata?: any;
      tenantId?: string;
    }
  ): Promise<void> {
    await this.log({
      tenantId: event.tenantId,
      action: event.action,
      resource: { type: 'security' },
      actor: {
        type: event.userId ? 'user' : 'system',
        id: event.userId || 'system',
      },
      context: {
        operation: 'execute',
        severity: event.severity,
        category: 'security',
        outcome: 'success',
      },
      details: {
        description: event.details,
        metadata: event.metadata,
      },
      tags: ['security'],
    });
  }

  async logSystemEvent(
    action: string,
    details: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      action,
      resource: { type: 'system' },
      actor: { type: 'system', id: 'system' },
      context: {
        operation: 'execute',
        severity: 'low',
        category: 'system',
        outcome: 'success',
      },
      details: {
        description: details,
        metadata,
      },
      tags: ['system'],
    });
  }

  // Query audit events
  async query(query: AuditQuery): Promise<{ events: AuditEvent[]; total: number }> {
    // This would be implemented with actual database queries
    // For now, return empty results
    return { events: [], total: 0 };
  }

  // Get audit statistics
  async getStats(tenantId?: string, timeRange?: { start: Date; end: Date }): Promise<AuditStats> {
    // This would be implemented with actual database aggregations
    return {
      totalEvents: 0,
      eventsByCategory: {},
      eventsBySeverity: {},
      eventsByOutcome: {},
      topUsers: [],
      topResources: [],
      recentActivity: [],
      securityAlerts: [],
    };
  }

  // Export audit logs
  async exportLogs(query: AuditQuery, format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    const { events } = await this.query(query);
    
    switch (format) {
      case 'csv':
        return this.formatAsCSV(events);
      case 'xml':
        return this.formatAsXML(events);
      default:
        return JSON.stringify(events, null, 2);
    }
  }

  // Archive old logs
  async archiveLogs(olderThan: Date): Promise<number> {
    // This would move old logs to archive storage
    // Return number of archived events
    return 0;
  }

  // Delete old logs
  async deleteLogs(olderThan: Date): Promise<number> {
    // This would permanently delete old logs
    // Return number of deleted events
    return 0;
  }

  // Private methods
  private startBufferFlush(): void {
    this.flushTimer = setInterval(async () => {
      if (this.auditBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, this.flushInterval);
  }

  private async flushBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) return;

    const events = [...this.auditBuffer];
    this.auditBuffer = [];

    try {
      // This would batch insert to database
      await this.persistEvents(events);
      this.logger.debug(`Flushed ${events.length} audit events`);
    } catch (error) {
      this.logger.error('Failed to flush audit buffer:', error);
      // Re-add events to buffer for retry
      this.auditBuffer.unshift(...events);
    }
  }

  private async persistEvents(events: AuditEvent[]): Promise<void> {
    // This would be implemented with actual database operations
    // For now, just log the events
    if (this.configService.get('AUDIT_LOG_TO_FILE', 'false') === 'true') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        events: events.length,
        data: events,
      };
      console.log('AUDIT_LOG:', JSON.stringify(logEntry));
    }
  }

  private async handleCriticalEvent(event: AuditEvent): Promise<void> {
    // Handle critical security events
    this.logger.error(`CRITICAL AUDIT EVENT: ${event.action}`, {
      event: event.id,
      actor: event.actor.id,
      resource: event.resource.type,
      details: event.details.description,
    });

    // This could trigger alerts, notifications, etc.
    // For now, just ensure immediate persistence
    await this.persistEvents([event]);
  }

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatAsCSV(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = [
      'id', 'timestamp', 'tenantId', 'userId', 'action', 'resourceType', 
      'resourceId', 'actorType', 'actorId', 'operation', 'severity', 
      'category', 'outcome', 'description'
    ];

    const rows = events.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.tenantId || '',
      event.userId || '',
      event.action,
      event.resource.type,
      event.resource.id || '',
      event.actor.type,
      event.actor.id,
      event.context.operation,
      event.context.severity,
      event.context.category,
      event.context.outcome,
      event.details.description,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private formatAsXML(events: AuditEvent[]): string {
    const xmlEvents = events.map(event => `
      <event id="${event.id}">
        <timestamp>${event.timestamp.toISOString()}</timestamp>
        <tenantId>${event.tenantId || ''}</tenantId>
        <userId>${event.userId || ''}</userId>
        <action>${event.action}</action>
        <resource type="${event.resource.type}" id="${event.resource.id || ''}" />
        <actor type="${event.actor.type}" id="${event.actor.id}" />
        <context operation="${event.context.operation}" severity="${event.context.severity}" 
                 category="${event.context.category}" outcome="${event.context.outcome}" />
        <details>${event.details.description}</details>
      </event>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?><auditLog>${xmlEvents}</auditLog>`;
  }

  // Cleanup on module destroy
  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining events
    if (this.auditBuffer.length > 0) {
      await this.flushBuffer();
    }
  }
} 