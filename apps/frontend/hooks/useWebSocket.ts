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
      return;
    }
    
    // Connect without auth token - backend will extract from HttpOnly cookie
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://lvh.me:4000', {
      withCredentials: true,  // Include cookies in the request
      transports: ['websocket', 'polling'],
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      setIsConnected(true);
    });
    
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
    
    socket.on('connected', (data) => {
      // Connection confirmed by server
    });
    
    // Generic event handler
    socket.on('event', (event: WebSocketEvent) => {
      const handlers = eventHandlersRef.current.get(event.type) || new Set();
      handlers.forEach(handler => handler(event));
    });
    
    return () => {
      socket.disconnect();
    };
  }, [userId]);
  
  // Subscribe to specific event types
  const subscribe = (eventType: string, handler: EventHandler) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      eventHandlersRef.current.get(eventType)?.delete(handler);
    };
  };
  
  return {
    isConnected,
    subscribe,
    socket: socketRef.current,
  };
} 