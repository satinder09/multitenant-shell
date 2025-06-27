'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import { NotificationMessage, getWebSocketClient } from '../../lib/realtime/websocket-client';

interface NotificationCenterProps {
  maxNotifications?: number;
  showUnreadOnly?: boolean;
  className?: string;
}

interface NotificationState {
  notifications: NotificationMessage[];
  unreadCount: number;
  isLoading: boolean;
}

export function NotificationCenter({ 
  maxNotifications = 50, 
  showUnreadOnly = false,
  className 
}: NotificationCenterProps) {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: true,
  });
  const [isOpen, setIsOpen] = useState(false);

  // Load initial notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  // Set up WebSocket subscription
  useEffect(() => {
    const wsClient = getWebSocketClient();
    if (!wsClient) return;

    const unsubscribe = wsClient.subscribeToNotifications((notification: NotificationMessage) => {
      setState(prev => {
        const newNotifications = [notification, ...prev.notifications];
        const limitedNotifications = newNotifications.slice(0, maxNotifications);
        
        return {
          ...prev,
          notifications: limitedNotifications,
          unreadCount: prev.unreadCount + (notification.read ? 0 : 1),
        };
      });

      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
        });
      }
    });

    return unsubscribe;
  }, [maxNotifications]);

  const loadNotifications = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // This would be replaced with actual API call
      const response = await fetch('/api/notifications');
      const data = await response.json();
      
      if (data.success) {
        const notifications = data.data.notifications || [];
        const unreadCount = notifications.filter((n: NotificationMessage) => !n.read).length;
        
        setState({
          notifications,
          unreadCount,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });

      if (response.ok) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setState(prev => {
          const notification = prev.notifications.find(n => n.id === notificationId);
          return {
            ...prev,
            notifications: prev.notifications.filter(n => n.id !== notificationId),
            unreadCount: notification && !notification.read 
              ? Math.max(0, prev.unreadCount - 1)
              : prev.unreadCount,
          };
        });
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
      });

      if (response.ok) {
        setState({
          notifications: [],
          unreadCount: 0,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const getNotificationIcon = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredNotifications = showUnreadOnly 
    ? state.notifications.filter(n => !n.read)
    : state.notifications;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative", className)}
          onClick={requestNotificationPermission}
        >
          <Bell className="h-4 w-4" />
          {state.unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {state.unreadCount > 99 ? '99+' : state.unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {state.unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              {state.notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {state.isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {showUnreadOnly ? 'No unread notifications' : 'No notifications'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.read && "bg-blue-50/50"
                  )}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="h-6 w-6 p-0 hover:bg-red-100"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {filteredNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to notifications page
                  window.location.href = '/notifications';
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
} 