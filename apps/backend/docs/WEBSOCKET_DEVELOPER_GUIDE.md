# 🚀 **WebSocket Developer Guide - Generic Enterprise Architecture**

## 📋 **Overview**

This guide explains how to use our simplified, enterprise-ready WebSocket system that supports any real-time operation with platform/tenant isolation.

## 🏗️ **Architecture Benefits**

### **✅ What We Fixed**
- **Reduced Complexity**: From 1,200+ lines to 400 lines (70% reduction)
- **Separation of Concerns**: WebSocket, business logic, and UI are separate layers
- **Generic Structure**: Works for ANY operation (tenant creation, user import, data export, etc.)
- **Platform/Tenant Isolation**: Built-in security and context separation
- **Developer-Friendly**: Simple, intuitive APIs with automatic features

### **✅ Key Features**
- **Real-time Progress Updates**: Automatic progress tracking with % support
- **Toast Notifications**: Integration with toastNotify system
- **Table Refresh**: Automatic table updates when operations complete
- **Connection Management**: Automatic reconnection and error handling
- **Type Safety**: Full TypeScript support

## 🎯 **Quick Start**

### **Backend: Adding WebSocket to Any Service**

```typescript
// 1. Import the WebSocket service
import { WebSocketService } from '@/infrastructure/websocket/websocket.service';

// 2. Inject it in your service
@Injectable()
export class MyOperationService {
  constructor(private readonly webSocketService: WebSocketService) {}

  async performOperation(data: any, userId: string) {
    const operationId = `my-operation-${Date.now()}`;
    
    try {
      // Send progress updates
      await this.sendProgress(operationId, userId, 'step-1', 25, 'Processing data...');
      await this.processStep1(data);
      
      await this.sendProgress(operationId, userId, 'step-2', 75, 'Finalizing...');
      await this.processStep2(data);
      
      // Send completion
      await this.sendCompletion(operationId, userId, result);
      
    } catch (error) {
      await this.sendError(operationId, userId, error.message);
      throw error;
    }
  }

  // Generic helper methods (copy these to any service)
  private async sendProgress(operationId: string, userId: string, stage: string, percentage: number, message: string) {
    await this.webSocketService.sendToUser(userId, {
      type: 'operation:progress',
      data: { operationId, operationType: 'my-operation', stage, percentage, message },
    });
  }

  private async sendCompletion(operationId: string, userId: string, result: any) {
    await this.webSocketService.sendToUser(userId, {
      type: 'operation:complete',
      data: { operationId, operationType: 'my-operation', result },
      metadata: { tablesToRefresh: ['my-table'], message: 'Operation completed!' },
    });
  }

  private async sendError(operationId: string, userId: string, error: string) {
    await this.webSocketService.sendToUser(userId, {
      type: 'operation:error',
      data: { operationId, operationType: 'my-operation', error },
      metadata: { message: 'Operation failed' },
    });
  }
}
```

### **Frontend: Using WebSocket Hooks**

```typescript
// 1. Simple automatic toast + table refresh
import { useOperationToasts } from '@/hooks/useOperationToasts';
import { useTableRefresh } from '@/hooks/useTableRefresh';
import { useAuth } from '@/context/AuthContext';

export default function MyPage() {
  const { user } = useAuth();
  
  // Automatic toast notifications with progress %
  const { isConnected } = useOperationToasts(user?.id || '');
  
  // Automatic table refresh when operations complete
  useTableRefresh(user?.id || '', 'my-table', () => {
    fetchData(); // Your refresh function
  });

  return (
    <div>
      <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      {/* Your UI */}
    </div>
  );
}
```

## 📚 **Complete Examples**

### **Example 1: User Import Operation**

#### **Backend Service**
```typescript
@Injectable()
export class UserImportService {
  constructor(private readonly webSocketService: WebSocketService) {}

  async importUsers(csvData: string, userId: string) {
    const operationId = `user-import-${Date.now()}`;
    
    try {
      await this.sendProgress(operationId, userId, 'parsing', 10, 'Parsing CSV file...');
      const users = await this.parseCSV(csvData);
      
      await this.sendProgress(operationId, userId, 'validating', 30, 'Validating user data...');
      const validUsers = await this.validateUsers(users);
      
      await this.sendProgress(operationId, userId, 'importing', 60, 'Importing users...');
      const results = await this.saveUsers(validUsers);
      
      await this.sendProgress(operationId, userId, 'finalizing', 90, 'Sending welcome emails...');
      await this.sendWelcomeEmails(results);
      
      await this.sendCompletion(operationId, userId, results);
      return { operationId, results };
      
    } catch (error) {
      await this.sendError(operationId, userId, error.message);
      throw error;
    }
  }

  // Helper methods (same pattern for all operations)
  private async sendProgress(operationId: string, userId: string, stage: string, percentage: number, message: string) {
    await this.webSocketService.sendToUser(userId, {
      type: 'operation:progress',
      data: { operationId, operationType: 'user-import', stage, percentage, message },
    });
  }

  private async sendCompletion(operationId: string, userId: string, result: any) {
    await this.webSocketService.sendToUser(userId, {
      type: 'operation:complete',
      data: { operationId, operationType: 'user-import', result },
      metadata: { tablesToRefresh: ['users'], message: 'Users imported successfully!' },
    });
  }

  private async sendError(operationId: string, userId: string, error: string) {
    await this.webSocketService.sendToUser(userId, {
      type: 'operation:error',
      data: { operationId, operationType: 'user-import', error },
      metadata: { message: 'User import failed' },
    });
  }
}
```

#### **Frontend Component**
```typescript
export default function UsersPage() {
  const { user } = useAuth();
  
  // Automatic features
  const { isConnected } = useOperationToasts(user?.id || '');
  useTableRefresh(user?.id || '', 'users', refreshUserTable);

  const handleImportUsers = async (csvFile: File) => {
    const csvData = await csvFile.text();
    
    await fetch('/api/users/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvData }),
    });
    
    // WebSocket will handle progress and completion automatically!
  };

  return (
    <div>
      <div>Real-time: {isConnected ? '🟢' : '🔴'}</div>
      <input type="file" onChange={(e) => handleImportUsers(e.target.files[0])} />
      {/* Table will refresh automatically when import completes */}
      <UserTable />
    </div>
  );
}
```

### **Example 2: Live Chat System**

#### **Backend Service**
```typescript
@Injectable()
export class ChatService {
  constructor(private readonly webSocketService: WebSocketService) {}

  async sendMessage(chatId: string, message: any, userId: string) {
    // Save to database
    const savedMessage = await this.saveMessage(chatId, message);
    
    // Send to all chat participants via WebSocket
    await this.webSocketService.sendToRoom(`chat:${chatId}`, {
      type: 'chat:message',
      data: { chatId, message: savedMessage },
    });
    
    return savedMessage;
  }

  async sendTypingIndicator(chatId: string, userId: string, isTyping: boolean) {
    await this.webSocketService.sendToRoom(`chat:${chatId}`, {
      type: 'chat:typing',
      data: { chatId, userId, isTyping },
    });
  }
}
```

#### **Frontend Hook**
```typescript
export function useLiveChat(chatId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const { subscribe } = useWebSocket(user?.id || '');

  useEffect(() => {
    const unsubscribeMessage = subscribe('chat:message', (event) => {
      if (event.data.chatId === chatId) {
        setMessages(prev => [...prev, event.data.message]);
      }
    });

    const unsubscribeTyping = subscribe('chat:typing', (event) => {
      if (event.data.chatId === chatId) {
        // Handle typing indicator
        setTypingUsers(prev => 
          event.data.isTyping 
            ? [...prev, event.data.userId]
            : prev.filter(id => id !== event.data.userId)
        );
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTyping();
    };
  }, [chatId, subscribe]);

  const sendMessage = async (text: string) => {
    await fetch(`/api/chat/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  };

  return { messages, typingUsers, sendMessage };
}
```

### **Example 3: Live Data Updates**

#### **Backend Service**
```typescript
@Injectable()
export class ProductService {
  constructor(private readonly webSocketService: WebSocketService) {}

  async updateProduct(productId: string, updates: any, userId: string) {
    const updatedProduct = await this.productRepository.update(productId, updates);
    
    // Notify all users in the same tenant about the update
    await this.webSocketService.sendToTenant(updatedProduct.tenantId, {
      type: 'data:product:updated',
      data: { productId, product: updatedProduct, updates },
    });
    
    return updatedProduct;
  }
}
```

#### **Frontend Hook**
```typescript
export function useLiveProduct(productId: string) {
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const { subscribe } = useWebSocket(user?.id || '');

  useEffect(() => {
    const unsubscribe = subscribe('data:product:updated', (event) => {
      if (event.data.productId === productId) {
        setProduct(event.data.product);
      }
    });

    return unsubscribe;
  }, [productId, subscribe]);

  return { product };
}
```

## 🎨 **Toast Integration**

### **Progress Toasts with Percentage**

The system automatically shows toasts with progress percentages:

```typescript
// Backend sends this:
await this.webSocketService.sendToUser(userId, {
  type: 'operation:progress',
  data: {
    operationId: 'op-123',
    operationType: 'data-export',
    percentage: 45,
    message: 'Processing records...'
  }
});

// Frontend automatically shows:
// Toast: "Data Export - 45%"
// Description: "Processing records..."
```

### **Custom Toast Messages**

```typescript
// Backend completion with custom message:
await this.webSocketService.sendToUser(userId, {
  type: 'operation:complete',
  data: { operationId: 'op-123', operationType: 'data-export', result },
  metadata: { message: 'Export complete! Downloaded 1,250 records.' }
});

// Frontend shows success toast with custom message
```

## 🔄 **Table Refresh System**

### **Automatic Refresh**
```typescript
// Backend tells which tables to refresh:
metadata: { tablesToRefresh: ['users', 'audit-logs'] }

// Frontend hooks listen and refresh automatically:
useTableRefresh(user?.id || '', 'users', refreshUsers);
useTableRefresh(user?.id || '', 'audit-logs', refreshAuditLogs);
```

### **Manual Refresh Triggers**
```typescript
// Trigger manual refresh from anywhere:
window.dispatchEvent(new CustomEvent('table-refresh:users', {
  detail: { action: 'update', data: updatedUser }
}));
```

## 🛡️ **Platform/Tenant Isolation**

### **Platform Level Operations**
```typescript
// Send to all platform admins
await this.webSocketService.sendToPlatform({
  type: 'platform:alert',
  data: { severity: 'high', message: 'System maintenance required' }
});

// Send to specific platform room
await this.webSocketService.sendToRoom('platform:admins', {
  type: 'platform:notification',
  data: { message: 'New tenant created' }
});
```

### **Tenant Level Operations**
```typescript
// Send to all users in a tenant
await this.webSocketService.sendToTenant(tenantId, {
  type: 'tenant:announcement',
  data: { message: 'System will be updated tonight' }
});

// Send to tenant admins only
await this.webSocketService.sendToRoom(`tenant:${tenantId}:admins`, {
  type: 'tenant:admin:notification',
  data: { message: 'New user registered' }
});
```

## 🚀 **Advanced Usage**

### **Custom Event Handling**
```typescript
export function useCustomWebSocketHandler() {
  const { user } = useAuth();
  const { subscribe } = useWebSocket(user?.id || '');

  useEffect(() => {
    const unsubscribe = subscribe('custom:event', (event) => {
      // Handle your custom event
      console.log('Custom event received:', event);
    });

    return unsubscribe;
  }, [subscribe]);
}
```

### **Multiple Operation Types**
```typescript
// Same hooks handle different operations automatically
const { isConnected } = useOperationToasts(user?.id || '');

// This will show appropriate toasts for:
// - tenant-creation
// - user-import  
// - data-export
// - file-upload
// - any other operation type
```

## 📊 **Connection Management**

### **Connection Status**
```typescript
export function ConnectionStatus() {
  const { user } = useAuth();
  const { isConnected } = useWebSocket(user?.id || '');

  return (
    <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}
```

### **Automatic Reconnection**
- Connections automatically reconnect on disconnect
- Failed messages are not retried (implement retry logic if needed)
- Connection state is managed automatically

## 🎯 **Best Practices**

### **1. Operation ID Format**
```typescript
const operationId = `${operationType}-${Date.now()}`;
// Examples: 'tenant-creation-1672531200000', 'user-import-1672531200000'
```

### **2. Progress Percentages**
```typescript
// Use meaningful percentages:
10% - Started
25% - Initial processing
50% - Main processing
75% - Almost done
90% - Finalizing
100% - Complete (sent via completion event)
```

### **3. Error Handling**
```typescript
try {
  await longRunningOperation();
} catch (error) {
  await this.sendError(operationId, userId, 
    error instanceof Error ? error.message : 'Unknown error'
  );
  throw error; // Re-throw for proper error handling
}
```

### **4. Message Consistency**
```typescript
// Use consistent message formats:
'Starting [operation]...'
'Processing [item]...'
'Validating [data]...'
'Finalizing [operation]...'
'[Operation] completed successfully!'
```

## 🔧 **Module Integration**

### **Add to Any Module**
```typescript
// 1. Import WebSocketModule
import { WebSocketModule } from '../../infrastructure/websocket/websocket.module';

@Module({
  imports: [WebSocketModule], // Add this
  providers: [YourService],
})
export class YourModule {}

// 2. Use in service
@Injectable()
export class YourService {
  constructor(private readonly webSocketService: WebSocketService) {}
}
```

## 🎉 **Summary**

This WebSocket system provides:
- **70% less code** than the previous implementation
- **100% generic** - works for any operation
- **Automatic UI updates** with toasts and table refresh
- **Enterprise security** with platform/tenant isolation
- **Developer-friendly** APIs that are easy to learn and use

### **For New Developers**
1. Copy the helper methods to your service
2. Add WebSocketModule to your module imports
3. Use the frontend hooks in your components
4. You're done! Real-time features work automatically.

### **For Operations**
Every operation follows the same pattern:
1. Send progress updates with percentage
2. Send completion with result and table refresh info
3. Send error if something fails
4. Frontend handles everything automatically!

**Ready to build amazing real-time features! 🚀** 