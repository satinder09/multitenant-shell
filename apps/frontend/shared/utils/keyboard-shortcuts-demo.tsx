import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useKeyboardShortcut, 
  useDialogShortcuts, 
  useFormShortcuts,
  createButtonClickHandler,
  createFocusHandler,
  keyboardShortcutRegistry
} from './keyboard-shortcuts';

export const KeyboardShortcutsDemo: React.FC = () => {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  
  const incrementButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Example 1: Basic keyboard shortcut
  useKeyboardShortcut(
    { key: 'Enter', ctrlKey: true },
    () => setMessage('Ctrl+Enter pressed!'),
    { description: 'Show Ctrl+Enter message' }
  );

  // Example 2: Multiple shortcuts for same action
  useKeyboardShortcut(
    [
      { key: 'ArrowUp' },
      { key: 'k' }
    ],
    () => setCount(prev => prev + 1),
    { description: 'Increment counter (↑ or k)' }
  );

  useKeyboardShortcut(
    [
      { key: 'ArrowDown' },
      { key: 'j' }
    ],
    () => setCount(prev => prev - 1),
    { description: 'Decrement counter (↓ or j)' }
  );

  // Example 3: Button click via keyboard
  useKeyboardShortcut(
    { key: 'Space', ctrlKey: true },
    createButtonClickHandler(incrementButtonRef as React.RefObject<HTMLButtonElement>),
    { description: 'Click increment button (Ctrl+Space)' }
  );

  // Example 4: Focus management
  useKeyboardShortcut(
    { key: '1', altKey: true },
    createFocusHandler(nameInputRef as React.RefObject<HTMLElement>),
    { description: 'Focus name input (Alt+1)' }
  );

  useKeyboardShortcut(
    { key: '2', altKey: true },
    createFocusHandler(emailInputRef as React.RefObject<HTMLElement>),
    { description: 'Focus email input (Alt+2)' }
  );

  // Example 5: Dialog shortcuts
  useDialogShortcuts({
    onSubmit: () => {
      alert('Dialog submitted!');
      setIsDialogOpen(false);
    },
    onCancel: () => setIsDialogOpen(false),
    enabled: isDialogOpen
  });

  // Example 6: Form shortcuts
  useFormShortcuts({
    onSave: () => {
      alert(`Form saved: ${JSON.stringify(formData)}`);
    },
    onReset: () => {
      setFormData({ name: '', email: '' });
      setMessage('Form reset!');
    },
    enabled: true
  });

  // Get all registered shortcuts for display
  const registeredShortcuts = keyboardShortcutRegistry.getRegisteredShortcuts();

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts Demo</CardTitle>
          <CardDescription>
            This demo showcases the keyboard shortcuts utility system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Counter Demo */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Counter Control</h3>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold">{count}</span>
              <Button 
                ref={incrementButtonRef}
                onClick={() => setCount(prev => prev + 1)}
                variant="outline"
              >
                Increment
              </Button>
              <div className="text-sm text-muted-foreground">
                Use ↑/k to increment, ↓/j to decrement, Ctrl+Space to click button
              </div>
            </div>
          </div>

          {/* Message Demo */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Message Display</h3>
            <div className="p-3 bg-muted rounded-md">
              {message || 'Press Ctrl+Enter to show message'}
            </div>
          </div>

          {/* Form Demo */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Form with Shortcuts</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name (Alt+1 to focus)</label>
                <Input
                  ref={nameInputRef}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter name..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email (Alt+2 to focus)</label>
                <Input
                  ref={emailInputRef}
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email..."
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Use Ctrl+S to save, Ctrl+R to reset form
            </div>
          </div>

          {/* Dialog Demo */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Dialog Shortcuts</h3>
            <Button onClick={() => setIsDialogOpen(true)}>
              Open Dialog
            </Button>
            {isDialogOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                  <h4 className="text-lg font-semibold mb-4">Sample Dialog</h4>
                  <p className="text-muted-foreground mb-4">
                    Press Enter to submit, Escape to cancel, or Ctrl+Enter to force submit
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => {
                      alert('Dialog submitted!');
                      setIsDialogOpen(false);
                    }}>
                      Submit
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Registered Shortcuts Display */}
      <Card>
        <CardHeader>
          <CardTitle>Currently Registered Shortcuts</CardTitle>
          <CardDescription>
            All active keyboard shortcuts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {registeredShortcuts.map(({ key, handlers }) => (
              <div key={key} className="space-y-2">
                <Badge variant="outline" className="font-mono">
                  {key}
                </Badge>
                <div className="space-y-1">
                  {handlers.map((handler, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      {handler.description || 'No description'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Basic Shortcut</h4>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`useKeyboardShortcut(
  { key: 'Enter', ctrlKey: true },
  () => console.log('Ctrl+Enter pressed!'),
  { description: 'Submit action' }
);`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Dialog Shortcuts</h4>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`useDialogShortcuts({
  onSubmit: handleSubmit,
  onCancel: handleCancel,
  enabled: isDialogOpen
});`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Button Click Handler</h4>
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
{`const buttonRef = useRef<HTMLButtonElement>(null);

useKeyboardShortcut(
  { key: 'Space', ctrlKey: true },
  createButtonClickHandler(buttonRef),
  { description: 'Click button' }
);`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 