/**
 * 🔌 GENERIC WEBSOCKET SERVICE
 * 
 * Simple, scalable WebSocket service for enterprise SaaS applications
 * Supports platform/tenant isolation and any real-time operation
 */

import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

// Generic event structure for ANY operation
export interface WebSocketEvent {
  type: string;                    // 'operation:progress', 'chat:message', 'data:updated', etc.
  targetUser?: string;             // Send to specific user
  targetRoom?: string;             // Send to room (multiple users)
  data?: any;                      // Event-specific data
  timestamp?: number;
  metadata?: Record<string, any>;  // Additional context
}

// User connection context
export interface ConnectionContext {
  userId: string;
  tenantId?: string;
  scope: 'platform' | 'tenant';   // Platform vs tenant isolation
  roles: string[];
  socketId: string;
  connectedAt: Date;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://lvh.me:3000', 'https://your-production-domain.com'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class WebSocketService implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketService.name);
  
  // Connection management
  private connections = new Map<string, ConnectionContext>();
  private userConnections = new Map<string, Set<string>>();
  private roomConnections = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      const user = await this.validateToken(token);
      
      if (!user) {
        this.logger.warn(`WebSocket connection rejected: Invalid token`);
        client.disconnect();
        return;
      }

      const userId = user.sub || user.id; // JWT uses 'sub' field for user ID

      // Determine context (platform or tenant)
      const context: ConnectionContext = {
        userId: userId,
        tenantId: user.tenantId,
        scope: user.tenantId ? 'tenant' : 'platform',
        roles: user.roles || [],
        socketId: client.id,
        connectedAt: new Date(),
      };

      // Store connection
      this.connections.set(client.id, context);
      
      // Track user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(client.id);

      // Auto-join appropriate rooms
      await this.autoJoinRooms(client, context);

      // Confirm connection
      client.emit('connected', {
        userId: userId,
        scope: context.scope,
        timestamp: Date.now(),
      });

      this.logger.log(`WebSocket connected: ${userId} (${context.scope})`);

    } catch (error) {
      this.logger.error('❌ Connection error:', error);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: Socket) {
    const context = this.connections.get(client.id);
    if (context) {
      // Remove from user connections
      this.userConnections.get(context.userId)?.delete(client.id);
      if (this.userConnections.get(context.userId)?.size === 0) {
        this.userConnections.delete(context.userId);
      }

      // Remove from rooms
      this.roomConnections.forEach((sockets, room) => {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.roomConnections.delete(room);
        }
      });

      // Remove connection
      this.connections.delete(client.id);

      this.logger.log(`WebSocket disconnected: ${context.userId}`);
    }
  }

  /**
   * Send event to specific user
   */
  async sendToUser(userId: string, event: WebSocketEvent) {
    const userSockets = this.userConnections.get(userId);
    
    if (userSockets) {
      const eventData = {
        ...event,
        timestamp: event.timestamp || Date.now(),
      };

      userSockets.forEach(socketId => {
        this.server.to(socketId).emit('event', eventData);
      });

      this.logger.debug(`Event sent to user ${userId}: ${event.type}`);
    } else {
      this.logger.warn(`No sockets found for user ${userId}`);
    }
  }

  /**
   * Send event to room (multiple users)
   */
  async sendToRoom(roomName: string, event: WebSocketEvent) {
    const eventData = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    this.server.to(roomName).emit('event', eventData);
    this.logger.debug(`Event sent to room ${roomName}: ${event.type}`);
  }

  /**
   * Send event to all platform users
   */
  async sendToPlatform(event: WebSocketEvent) {
    await this.sendToRoom('platform:all', event);
  }

  /**
   * Send event to all users in a tenant
   */
  async sendToTenant(tenantId: string, event: WebSocketEvent) {
    await this.sendToRoom(`tenant:${tenantId}:all`, event);
  }

  // Private helper methods
  private extractToken(client: Socket): string | null {
    // Try multiple token sources in order of preference
    const token = client.handshake.auth?.token || 
                  client.handshake.query?.token ||
                  client.handshake.headers?.authorization?.replace('Bearer ', '') ||
                  this.extractTokenFromCookies(client.handshake.headers?.cookie);
    
    return token as string;
  }

  private extractTokenFromCookies(cookieHeader: string | undefined): string | null {
    if (!cookieHeader) return null;
    
    try {
      // Parse cookies from the header
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          acc[name] = decodeURIComponent(value);
        }
        return acc;
      }, {} as Record<string, string>);
      
      // Look for Authentication cookie
      return cookies['Authentication'] || null;
    } catch (error) {
      this.logger.warn(`Failed to parse cookies:`, error);
      return null;
    }
  }

  private async validateToken(token: string): Promise<any> {
    try {
      if (!token) {
        this.logger.debug('Token validation failed: No token provided');
        return null;
      }
      
      this.logger.log(`🔑 Validating token: ${token.substring(0, 20)}...`);
      const user = await this.jwtService.verifyAsync(token);
      this.logger.log(`✅ Token validation successful:`, JSON.stringify(user, null, 2));
      return user;
    } catch (error) {
      this.logger.warn(`❌ Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.logger.warn(`🔑 Failed token: ${token?.substring(0, 20)}...`);
      return null;
    }
  }

  private async autoJoinRooms(client: Socket, context: ConnectionContext) {
    // Platform users join platform rooms
    if (context.scope === 'platform') {
      await this.joinRoom(client, 'platform:all');
      
      if (context.roles.includes('platform_admin') || context.roles.includes('super_admin')) {
        await this.joinRoom(client, 'platform:admins');
      }
    }
    
    // Tenant users join tenant rooms
    if (context.scope === 'tenant' && context.tenantId) {
      await this.joinRoom(client, `tenant:${context.tenantId}:all`);
      
      if (context.roles.includes('tenant_admin')) {
        await this.joinRoom(client, `tenant:${context.tenantId}:admins`);
      }
    }

    // User-specific room
    await this.joinRoom(client, `user:${context.userId}`);
  }

  private async joinRoom(client: Socket, roomName: string) {
    await client.join(roomName);
    
    // Track room connections
    if (!this.roomConnections.has(roomName)) {
      this.roomConnections.set(roomName, new Set());
    }
    this.roomConnections.get(roomName)!.add(client.id);
    
    this.logger.debug(`Socket ${client.id} joined room: ${roomName}`);
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      totalUsers: this.userConnections.size,
      totalRooms: this.roomConnections.size,
      platformConnections: Array.from(this.connections.values()).filter(c => c.scope === 'platform').length,
      tenantConnections: Array.from(this.connections.values()).filter(c => c.scope === 'tenant').length,
    };
  }

  /**
   * Debug: Log current connection state
   */
  logConnectionState() {
    this.logger.log(`📊 Connection State Debug:`);
    this.logger.log(`  Total Connections: ${this.connections.size}`);
    this.logger.log(`  Total Users: ${this.userConnections.size}`);
    
    if (this.userConnections.size > 0) {
      this.logger.log(`  User Connections:`);
      this.userConnections.forEach((sockets, userId) => {
        this.logger.log(`    ${userId}: ${sockets.size} sockets`);
      });
    }
    
    if (this.connections.size > 0) {
      this.logger.log(`  Socket Connections:`);
      this.connections.forEach((context, socketId) => {
        this.logger.log(`    ${socketId}: ${context.userId} (${context.scope})`);
      });
    }
  }
} 