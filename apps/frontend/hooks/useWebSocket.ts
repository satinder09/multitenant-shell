'use client';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCookie } from '@/shared/utils';

export interface WebSocketEvent {
  type: string;
  data?: any;
  timestamp?: number;
  metadata?: Record<string, any>;
}

type EventHandler = (event: WebSocketEvent) => void;

export function useWebSocket(userId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  
  useEffect(() => {
    if (!userId || userId.trim() === '') {
      console.log('⚠️ [useWebSocket] No userId provided, skipping connection');
      return;
    }
    
    console.log('🔌 [useWebSocket] Connecting to WebSocket with userId:', userId);
    
    // Connect without auth token - backend will extract from HttpOnly cookie
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://lvh.me:4000', {
      withCredentials: true,  // Include cookies in the request
      transports: ['websocket', 'polling'],
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('✅ [useWebSocket] Connected to WebSocket server');
      setIsConnected(true);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('❌ [useWebSocket] Disconnected from WebSocket:', reason);
      setIsConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ [useWebSocket] Connection error:', error);
    });
    
    socket.on('connected', (data) => {
      console.log('🎉 [useWebSocket] Connection confirmed by server:', data);
    });
    
    // Generic event handler
    socket.on('event', (event: WebSocketEvent) => {
      console.log('📨 [useWebSocket] Received event:', event.type, event);
      
      const handlers = eventHandlersRef.current.get(event.type) || new Set();
      handlers.forEach(handler => {
        handler(event);
      });
    });
    
    // Add debugging for all events
    socket.onAny((eventName, ...args) => {
      console.log('📨 [useWebSocket] Raw event received:', eventName, args);
    });
    
    return () => {
      console.log('🔌 [useWebSocket] Disconnecting WebSocket');
      socket.disconnect();
    };
  }, [userId]);
  
  // Subscribe to specific event types
  const subscribe = (eventType: string, handler: EventHandler) => {
    console.log('🔔 [useWebSocket] Subscribing to event type:', eventType);
    
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      console.log('🔕 [useWebSocket] Unsubscribing from event type:', eventType);
      eventHandlersRef.current.get(eventType)?.delete(handler);
    };
  };
  
  return {
    isConnected,
    subscribe,
    socket: socketRef.current,
  };
} 