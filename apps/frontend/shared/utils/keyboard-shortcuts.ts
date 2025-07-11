import { useEffect, useCallback, useRef } from 'react';

// Types for keyboard shortcuts
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface KeyboardShortcutHandler {
  shortcut: KeyboardShortcut;
  handler: (event: KeyboardEvent) => void;
  description?: string;
  enabled?: boolean;
}

// Global registry for keyboard shortcuts
class KeyboardShortcutRegistry {
  private shortcuts: Map<string, KeyboardShortcutHandler[]> = new Map();
  private isListening = false;

  private generateKey(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.metaKey) parts.push('meta');
    
    // Safety check for undefined key
    if (shortcut.key && typeof shortcut.key === 'string') {
      parts.push(shortcut.key.toLowerCase());
    }
    
    return parts.join('+');
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const key = this.generateKey({
      key: event.key,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
    });

    const handlers = this.shortcuts.get(key);
    if (handlers) {
      for (const { handler, shortcut, enabled = true } of handlers) {
        if (enabled) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          handler(event);
        }
      }
    }
  };

  register(id: string, shortcutHandler: KeyboardShortcutHandler): () => void {
    const key = this.generateKey(shortcutHandler.shortcut);
    
    if (!this.shortcuts.has(key)) {
      this.shortcuts.set(key, []);
    }
    
    const handlers = this.shortcuts.get(key)!;
    const handlerWithId = { ...shortcutHandler, id };
    handlers.push(handlerWithId);

    // Start listening if not already
    if (!this.isListening) {
      document.addEventListener('keydown', this.handleKeyDown);
      this.isListening = true;
    }

    // Return unregister function
    return () => {
      const handlers = this.shortcuts.get(key);
      if (handlers) {
        const index = handlers.findIndex(h => (h as any).id === id);
        if (index > -1) {
          handlers.splice(index, 1);
          if (handlers.length === 0) {
            this.shortcuts.delete(key);
          }
        }
      }

      // Stop listening if no shortcuts remain
      if (this.shortcuts.size === 0 && this.isListening) {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.isListening = false;
      }
    };
  }

  unregister(id: string) {
    for (const [key, handlers] of this.shortcuts.entries()) {
      const index = handlers.findIndex(h => (h as any).id === id);
      if (index > -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.shortcuts.delete(key);
        }
        break;
      }
    }
  }

  getRegisteredShortcuts(): Array<{ key: string; handlers: KeyboardShortcutHandler[] }> {
    return Array.from(this.shortcuts.entries()).map(([key, handlers]) => ({
      key,
      handlers: handlers.filter(h => h.enabled !== false)
    }));
  }
}

// Global instance
const registry = new KeyboardShortcutRegistry();

// React hook for keyboard shortcuts
export function useKeyboardShortcut(
  shortcut: KeyboardShortcut | KeyboardShortcut[],
  handler: (event: KeyboardEvent) => void,
  options: {
    description?: string;
    enabled?: boolean;
    dependencies?: any[];
  } = {}
) {
  const { description, enabled = true, dependencies = [] } = options;
  const handlerRef = useRef(handler);
  const shortcutIdRef = useRef<string>('');

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Memoize the actual handler to prevent unnecessary re-registrations
  const memoizedHandler = useCallback((event: KeyboardEvent) => {
    handlerRef.current(event);
  }, dependencies);

  useEffect(() => {
    if (!enabled) return;

    const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut];
    const unregisterFunctions: (() => void)[] = [];

    shortcuts.forEach((sc, index) => {
      const id = `${Date.now()}-${Math.random()}-${index}`;
      if (index === 0) shortcutIdRef.current = id;

      const unregister = registry.register(id, {
        shortcut: sc,
        handler: memoizedHandler,
        description,
        enabled,
      });

      unregisterFunctions.push(unregister);
    });

    return () => {
      unregisterFunctions.forEach(fn => fn());
    };
  }, [memoizedHandler, enabled, description, ...dependencies]);
}

// Utility functions for common shortcuts
export const createShortcut = {
  enter: (handler: () => void, options?: { preventDefault?: boolean }): KeyboardShortcut => ({
    key: 'Enter',
    preventDefault: options?.preventDefault ?? true,
  }),

  escape: (handler: () => void): KeyboardShortcut => ({
    key: 'Escape',
    preventDefault: true,
  }),

  ctrlEnter: (handler: () => void): KeyboardShortcut => ({
    key: 'Enter',
    ctrlKey: true,
    preventDefault: true,
  }),

  ctrlS: (handler: () => void): KeyboardShortcut => ({
    key: 's',
    ctrlKey: true,
    preventDefault: true,
  }),

  ctrlK: (handler: () => void): KeyboardShortcut => ({
    key: 'k',
    ctrlKey: true,
    preventDefault: true,
  }),

  slash: (handler: () => void): KeyboardShortcut => ({
    key: '/',
    preventDefault: true,
  }),

  arrowKeys: (handlers: {
    up?: () => void;
    down?: () => void;
    left?: () => void;
    right?: () => void;
  }) => {
    const shortcuts: Array<{ shortcut: KeyboardShortcut; handler: () => void }> = [];
    if (handlers.up) shortcuts.push({ shortcut: { key: 'ArrowUp' }, handler: handlers.up });
    if (handlers.down) shortcuts.push({ shortcut: { key: 'ArrowDown' }, handler: handlers.down });
    if (handlers.left) shortcuts.push({ shortcut: { key: 'ArrowLeft' }, handler: handlers.left });
    if (handlers.right) shortcuts.push({ shortcut: { key: 'ArrowRight' }, handler: handlers.right });
    return shortcuts;
  },
};

// Hook for dialog-specific shortcuts
export function useDialogShortcuts(options: {
  onSubmit?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}) {
  const { onSubmit, onCancel, onClose, enabled = true } = options;

  // Enter key for submit
  useKeyboardShortcut(
    { key: 'Enter', preventDefault: true },
    () => onSubmit?.(),
    { 
      description: 'Submit dialog',
      enabled: enabled && !!onSubmit 
    }
  );

  // Escape key for cancel/close
  useKeyboardShortcut(
    { key: 'Escape', preventDefault: true },
    () => onCancel?.() || onClose?.(),
    { 
      description: 'Cancel/close dialog',
      enabled: enabled && !!(onCancel || onClose)
    }
  );

  // Ctrl+Enter for force submit (in case Enter is handled differently)
  useKeyboardShortcut(
    { key: 'Enter', ctrlKey: true, preventDefault: true },
    () => onSubmit?.(),
    { 
      description: 'Force submit dialog',
      enabled: enabled && !!onSubmit 
    }
  );
}

// Hook for form shortcuts
export function useFormShortcuts(options: {
  onSubmit?: () => void;
  onReset?: () => void;
  onSave?: () => void;
  enabled?: boolean;
}) {
  const { onSubmit, onReset, onSave, enabled = true } = options;

  // Ctrl+S for save
  useKeyboardShortcut(
    { key: 's', ctrlKey: true, preventDefault: true },
    () => onSave?.() || onSubmit?.(),
    { 
      description: 'Save form',
      enabled: enabled && !!(onSave || onSubmit)
    }
  );

  // Ctrl+R for reset (prevent browser refresh)
  useKeyboardShortcut(
    { key: 'r', ctrlKey: true, preventDefault: true },
    () => onReset?.(),
    { 
      description: 'Reset form',
      enabled: enabled && !!onReset
    }
  );
}

// Export the registry for advanced usage
export { registry as keyboardShortcutRegistry };

// Helper to create button click handlers
export function createButtonClickHandler(buttonRef: React.RefObject<HTMLButtonElement>) {
  return () => {
    if (buttonRef.current && !buttonRef.current.disabled) {
      buttonRef.current.click();
    }
  };
}

// Helper to focus elements
export function createFocusHandler(elementRef: React.RefObject<HTMLElement>) {
  return () => {
    if (elementRef.current) {
      elementRef.current.focus();
    }
  };
} 