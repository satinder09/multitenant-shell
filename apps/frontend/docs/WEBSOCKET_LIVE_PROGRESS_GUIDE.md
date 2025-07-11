# 🚀 **WebSocket Live Progress System - Generic Implementation Guide**

## **Overview**

This guide shows how to implement real-time progress tracking for any long-running operation using our generic WebSocket infrastructure. The system provides live updates, toast notifications, and table refreshes for any backend process.

## **🏗️ Architecture Components**

### **1. WebSocket Context (`WebSocketContext.tsx`)**
- Generic WebSocket connection management
- Event subscription system
- Progress tracking
- Toast notifications
- Table refresh handling

### **2. Live Operation Hook (`useLiveOperation.ts`)**
- Generic hook for any long-running operation
- API call management
- WebSocket subscription handling
- State management
- Error handling

### **3. Progress Tracker Component (`ProgressTracker.tsx`)**
- Visual progress display
- Stage tracking
- Time estimation
- Real-time updates

## **🔧 Implementation Steps**

### **Step 1: Backend Setup**

#### **1.1 WebSocket Service Integration**
```typescript
// In your service (e.g., MyOperationService)
import { WebSocketService } from '@/infrastructure/websocket/websocket.module';

@Injectable()
export class MyOperationService {
  constructor(private readonly webSocketService: WebSocketService) {}

  async startOperation(data: any, userId: string) {
    const operationId = randomUUID();
    
    // Start background process
    this.processOperation(operationId, data, userId);
    
    return { operationId, estimatedDuration: 180000 }; // 3 minutes
  }

  private async processOperation(operationId: string, data: any, userId: string) {
    try {
      // Stage 1: Initialization (10%)
      await this.sendProgressUpdate(operationId, {
        operationId,
        stage: 'initialization',
        progress: 10,
        message: 'Starting operation...',
        timestamp: Date.now(),
      });

      // Your operation logic here...
      
      // Stage 2: Processing (50%)
      await this.sendProgressUpdate(operationId, {
        operationId,
        stage: 'processing',
        progress: 50,
        message: 'Processing data...',
        timestamp: Date.now(),
      });

      // Continue with more stages...
      
      // Final: Completion (100%)
      await this.webSocketService.sendOperationComplete(
        operationId,
        'my_operation',
        result
      );
      
    } catch (error) {
      await this.webSocketService.sendOperationFailure(
        operationId,
        'my_operation',
        error
      );
    }
  }

  private async sendProgressUpdate(operationId: string, progressData: any) {
    await this.webSocketService.sendProgressUpdate(progressData);
  }
}
```

#### **1.2 Controller Setup**
```typescript
// In your controller
@Controller('api/my-operations')
export class MyOperationController {
  constructor(private readonly myOperationService: MyOperationService) {}

  @Post()
  async createOperation(@Body() data: any, @Req() req: any) {
    const result = await this.myOperationService.startOperation(data, req.user.id);
    
    return {
      success: true,
      message: 'Operation started',
      data: result,
    };
  }
}
```

### **Step 2: Frontend Implementation**

#### **2.1 Using the Generic Hook**
```typescript
// MyOperationForm.tsx
import { useLiveOperation } from '@/hooks/useLiveOperation';

interface MyOperationRequest {
  name: string;
  data: any;
}

interface MyOperationResponse {
  operationId: string;
  estimatedDuration: number;
}

export const MyOperationForm = () => {
  const [operationState, operationActions] = useLiveOperation<MyOperationRequest, MyOperationResponse>({
    // API Configuration
    apiEndpoint: '/api/my-operations',
    method: 'POST',
    
    // Operation Details
    operationType: 'my_operation',
    operationName: 'My Custom Operation',
    
    // WebSocket Configuration
    enableProgress: true,
    enableToasts: true,
    enableTableRefresh: true,
    
    // Messages
    successMessage: 'Operation completed successfully!',
    errorMessage: 'Operation failed',
    
    // Event Handlers
    onStart: (request) => {
      console.log('Operation started:', request);
    },
    onProgress: (progress) => {
      console.log('Progress:', progress);
    },
    onComplete: (result) => {
      console.log('Operation completed:', result);
    },
    onError: (error) => {
      console.error('Operation failed:', error);
    },
    
    // Table refresh
    tableNames: ['my_operations'],
  });

  const handleSubmit = async (formData: MyOperationRequest) => {
    await operationActions.execute(formData);
  };

  return (
    <div>
      {/* Your form UI */}
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <button 
          type="submit" 
          disabled={operationState.isLoading}
        >
          {operationState.isLoading ? 'Processing...' : 'Start Operation'}
        </button>
      </form>
      
      {/* Progress display */}
      {operationState.progress && (
        <div className="mt-4">
          <div className="flex justify-between">
            <span>{operationState.progress.message}</span>
            <span>{operationState.progress.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${operationState.progress.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
```

#### **2.2 Using the Progress Tracker Component**
```typescript
// MyOperationWithTracker.tsx
import { ProgressTracker } from '@/components/common/ProgressTracker';

const OPERATION_STAGES = [
  { id: 'initialization', name: 'Initialization', description: 'Starting operation', order: 1 },
  { id: 'processing', name: 'Processing', description: 'Processing data', order: 2 },
  { id: 'validation', name: 'Validation', description: 'Validating results', order: 3 },
  { id: 'completion', name: 'Completion', description: 'Finalizing operation', order: 4 },
];

export const MyOperationWithTracker = () => {
  const [operationId, setOperationId] = useState<string | null>(null);
  
  const handleStartOperation = async () => {
    const response = await fetch('/api/my-operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Operation' }),
    });
    
    const result = await response.json();
    setOperationId(result.data.operationId);
  };

  return (
    <div>
      <button onClick={handleStartOperation}>Start Operation</button>
      
      {operationId && (
        <ProgressTracker
          config={{
            operationId,
            operationType: 'my_operation',
            title: 'My Custom Operation',
            description: 'Processing your request',
            stages: OPERATION_STAGES,
            showDetails: true,
            showTimeEstimate: true,
            showStages: true,
            autoStart: true,
          }}
        />
      )}
    </div>
  );
};
```

### **Step 3: WebSocket Event Patterns**

#### **3.1 Standard Progress Events**
```typescript
// Progress events automatically handled by the system
interface ProgressEvent {
  operationId: string;
  operationType: string;
  stage: string;
  progress: number; // 0-100
  message: string;
  details?: any;
  timestamp: number;
  estimatedCompletion?: number;
}

// Events:
// - 'progress.updated' - Progress update
// - 'progress.completed' - Operation completed
// - 'progress.failed' - Operation failed
```

#### **3.2 Custom Event Subscriptions**
```typescript
// Using the WebSocket context directly
import { useWebSocket } from '@/context/WebSocketContext';

const MyComponent = () => {
  const { subscribeToEvent, unsubscribeFromEvent } = useWebSocket();
  
  useEffect(() => {
    const subscriptionId = subscribeToEvent('custom.event.*', (data) => {
      console.log('Custom event received:', data);
    });
    
    return () => unsubscribeFromEvent(subscriptionId);
  }, []);
};
```

### **Step 4: Toast Notifications**

#### **4.1 Automatic Toast Notifications**
```typescript
// Backend - sending toast notifications
await this.webSocketService.sendToRooms(
  'platform.system.alert',
  {
    type: 'toast',
    toast: {
      title: 'Operation Started',
      message: 'Your operation is now running',
      type: 'info',
      duration: 5000,
    },
  },
  ['platform.admin.global']
);
```

#### **4.2 Custom Toast Handling**
```typescript
// Frontend - custom toast handling
const [operationState, operationActions] = useLiveOperation({
  // ... other config
  onToast: (toast) => {
    // Custom toast handling
    if (toast.type === 'success') {
      // Navigate to results page
      router.push('/results');
    }
  },
});
```

### **Step 5: Table Refresh Integration**

#### **5.1 Backend Table Refresh**
```typescript
// In your service
private async refreshTable(action: string, data: any) {
  await this.webSocketService.sendToRooms(
    'platform.table.refresh',
    {
      type: 'table_refresh',
      table: 'my_operations',
      action,
      data,
      affectedIds: [data.id],
      metadata: {
        timestamp: Date.now(),
        initiatedBy: 'system',
      },
    },
    ['platform.admin.global']
  );
}
```

#### **5.2 Frontend Table Refresh Handling**
```typescript
// In your table component
const { onTableRefresh, offTableRefresh } = useWebSocket();

useEffect(() => {
  const subscriptionId = onTableRefresh('my_operations', (event) => {
    console.log('Table refresh event:', event);
    
    // Refresh your table data
    refetch(); // or however you refresh your data
  });
  
  return () => offTableRefresh(subscriptionId);
}, []);
```

## **🎯 Usage Examples**

### **Example 1: File Upload with Progress**
```typescript
const [uploadState, uploadActions] = useLiveOperation({
  apiEndpoint: '/api/files/upload',
  operationType: 'file_upload',
  operationName: 'File Upload',
  enableProgress: true,
  enableToasts: true,
  successMessage: 'File uploaded successfully!',
  errorMessage: 'Upload failed',
});

const handleFileUpload = (file: File) => {
  uploadActions.execute({ file, destination: 'uploads/' });
};
```

### **Example 2: Data Import with Stages**
```typescript
const IMPORT_STAGES = [
  { id: 'validation', name: 'Validation', description: 'Validating file format', order: 1 },
  { id: 'processing', name: 'Processing', description: 'Processing records', order: 2 },
  { id: 'storing', name: 'Storing', description: 'Storing in database', order: 3 },
  { id: 'indexing', name: 'Indexing', description: 'Building search index', order: 4 },
];

const [importState, importActions] = useLiveOperation({
  apiEndpoint: '/api/data/import',
  operationType: 'data_import',
  operationName: 'Data Import',
  enableProgress: true,
  enableToasts: true,
  enableTableRefresh: true,
  tableNames: ['imported_data'],
  successMessage: 'Data imported successfully!',
  errorMessage: 'Import failed',
});
```

### **Example 3: Batch Operations**
```typescript
const [batchState, batchActions] = useLiveOperation({
  apiEndpoint: '/api/batch/process',
  operationType: 'batch_process',
  operationName: 'Batch Processing',
  enableProgress: true,
  enableToasts: true,
  successMessage: 'Batch processing completed!',
  errorMessage: 'Batch processing failed',
  onProgress: (progress) => {
    // Custom progress handling
    if (progress.details?.processedCount) {
      console.log(`Processed: ${progress.details.processedCount} items`);
    }
  },
});
```

## **🔧 Configuration Options**

### **WebSocket Context Options**
```typescript
<WebSocketProvider autoConnect={true}>
  {children}
</WebSocketProvider>
```

### **Operation Configuration**
```typescript
interface OperationConfig {
  // Required
  apiEndpoint: string;
  operationType: string;
  operationName: string;
  
  // Optional
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  enableProgress?: boolean;
  enableToasts?: boolean;
  enableTableRefresh?: boolean;
  successMessage?: string;
  errorMessage?: string;
  tableNames?: string[];
  
  // Event handlers
  onStart?: (request: any) => void;
  onProgress?: (progress: ProgressEvent) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onToast?: (toast: ToastEvent) => void;
}
```

### **Progress Tracker Configuration**
```typescript
interface ProgressConfig {
  operationId: string;
  operationType: string;
  title: string;
  description?: string;
  stages?: ProgressStage[];
  estimatedDuration?: number;
  showDetails?: boolean;
  showTimeEstimate?: boolean;
  showStages?: boolean;
  autoStart?: boolean;
}
```

## **🚀 Installation**

1. **Install dependencies:**
```bash
npm install socket.io-client date-fns
```

2. **Add WebSocket context to your app:**
```typescript
// app/layout.tsx
import { WebSocketProvider } from '@/context/WebSocketContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

3. **Configure environment variables:**
```bash
# .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## **🎉 Benefits**

### **For Developers**
- **Reusable**: One implementation works for all operations
- **Type-safe**: Full TypeScript support
- **Flexible**: Configurable for different use cases
- **Maintainable**: Centralized WebSocket logic

### **For Users**
- **Real-time feedback**: Live progress updates
- **Better UX**: Toast notifications and visual indicators
- **Transparency**: Clear stage progression
- **Reliability**: Automatic error handling

## **🔍 Troubleshooting**

### **Common Issues**

1. **WebSocket not connecting**
   - Check `NEXT_PUBLIC_WS_URL` environment variable
   - Verify JWT token is valid
   - Ensure WebSocket server is running

2. **Progress not updating**
   - Verify `operationId` is correctly passed
   - Check WebSocket subscription is active
   - Confirm backend is sending progress events

3. **Toast notifications not showing**
   - Ensure `enableToasts` is true
   - Check if Sonner is properly configured
   - Verify toast events are being sent

### **Debug Mode**
```typescript
// Enable debug logging
const { getActiveSubscriptions } = useWebSocket();

console.log('Active subscriptions:', getActiveSubscriptions());
```

## **📊 Performance Considerations**

- **Connection limits**: System handles up to 100K connections
- **Message throttling**: Built-in rate limiting
- **Memory management**: Automatic cleanup of subscriptions
- **Reconnection**: Automatic reconnection on disconnect

## **🔒 Security**

- **Authentication**: JWT-based authentication
- **Room isolation**: Tenant-specific room access
- **Rate limiting**: Built-in message throttling
- **Input validation**: All events validated

This generic system provides a robust foundation for implementing real-time progress tracking in any application with minimal code duplication and maximum flexibility! 