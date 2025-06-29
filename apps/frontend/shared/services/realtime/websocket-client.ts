// WebSocket client for real-time features
import { EventEmitter } from 'events';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  authToken?: string;
  tenantId?: string;
}

export interface WebSocketMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  id?: string;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  tenantId?: string;
  read: boolean;
}

export interface ActivityMessage {
  id: string;
  type: 'user_login' | 'user_logout' | 'data_update' | 'system_event';
  actor: {
    id: string;
    name: string;
    email: string;
  };
  resource?: {
    type: string;
    id: string;
    name: string;
  };
  action: string;
  description: string;
  timestamp: number;
  tenantId?: string;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isManualClose = false;

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;
      this.isManualClose = false;

      try {
        const url = new URL(this.config.url);
        
        // Add auth params
        if (this.config.authToken) {
          url.searchParams.set('token', this.config.authToken);
        }
        if (this.config.tenantId) {
          url.searchParams.set('tenant', this.config.tenantId);
        }

        this.ws = new WebSocket(url.toString());

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connected');
          console.log('WebSocket connected');
          resolve();
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected', event.code, event.reason);
          console.log('WebSocket disconnected:', event.code, event.reason);

          if (!this.isManualClose) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          this.emit('error', error);
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            this.emit('error', error);
          }
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isManualClose = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.emit('disconnected', 1000, 'Manual disconnect');
  }

  send(message: Omit<WebSocketMessage, 'timestamp'>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }

    try {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: Date.now(),
        id: message.id || this.generateMessageId(),
      };

      this.ws.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.emit('error', error);
      return false;
    }
  }

  // Subscribe to specific message types
  subscribe<T = unknown>(messageType: string, callback: (payload: T) => void): () => void {
    const listener = (message: WebSocketMessage) => {
      if (message.type === messageType) {
        callback(message.payload as T);
      }
    };

    this.on('message', listener);

    // Return unsubscribe function
    return () => {
      this.off('message', listener);
    };
  }

  // Subscribe to notifications
  subscribeToNotifications(callback: (notification: NotificationMessage) => void): () => void {
    return this.subscribe('notification', callback);
  }

  // Subscribe to activity feed
  subscribeToActivity(callback: (activity: ActivityMessage) => void): () => void {
    return this.subscribe('activity', callback);
  }

  // Subscribe to data updates
  subscribeToDataUpdates(callback: (update: Record<string, unknown>) => void): () => void {
    return this.subscribe<Record<string, unknown>>('data_update', callback);
  }

  // Get connection status
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Update configuration
  updateConfig(updates: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Reconnect if auth token or tenant changed
    if (updates.authToken || updates.tenantId) {
      if (this.isConnected) {
        this.disconnect();
        setTimeout(() => this.connect(), 100);
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    this.emit('message', message);

    // Handle specific message types
    switch (message.type) {
      case 'ping':
        this.send({ type: 'pong', payload: {} });
        break;
      
      case 'pong':
        // Heartbeat response received
        break;
      
      case 'notification':
        this.emit('notification', message.payload);
        break;
      
      case 'activity':
        this.emit('activity', message.payload);
        break;
      
      case 'data_update':
        this.emit('dataUpdate', message.payload);
        break;
      
      case 'user_status':
        this.emit('userStatus', message.payload);
        break;
      
      case 'system_event':
        this.emit('systemEvent', message.payload);
        break;
      
      default:
        this.emit('unknownMessage', message);
        break;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
      this.connect().catch(error => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping', payload: {} });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default configuration
export const defaultWebSocketConfig: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws',
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

// Create singleton instance
let wsClient: WebSocketClient | null = null;

export function createWebSocketClient(config?: Partial<WebSocketConfig>): WebSocketClient {
  const finalConfig = { ...defaultWebSocketConfig, ...config };
  return new WebSocketClient(finalConfig);
}

export function getWebSocketClient(): WebSocketClient | null {
  return wsClient;
}

export function initializeWebSocket(config?: Partial<WebSocketConfig>): WebSocketClient {
  if (wsClient) {
    wsClient.disconnect();
  }
  
  wsClient = createWebSocketClient(config);
  return wsClient;
} 