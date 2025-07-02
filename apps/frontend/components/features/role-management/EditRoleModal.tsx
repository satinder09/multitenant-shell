'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Shield, Key } from 'lucide-react';
import { toastNotify } from '@/shared/utils/ui/toastNotify';

interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  rolePermissions?: Array<{ permission: Permission }>;
}

interface EditRoleModalProps {
  isOpen: boolean;
  role: Role | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  isOpen,
  role,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissionIds: [] as string[]
  });

  // Load form data when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permissionIds: role.rolePermissions?.map(rp => rp.permission.id) || []
      });
    }
  }, [role]);

  // Load available permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen]);

  const loadPermissions = async () => {
    setIsLoadingPermissions(true);
    try {
      const response = await fetch('/api/platform-rbac/permissions');
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      } else {
        toastNotify({ variant: 'error', title: 'Failed to load permissions' });
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      toastNotify({ variant: 'error', title: 'Failed to load permissions' });
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toastNotify({ variant: 'error', title: 'Role name is required' });
      return;
    }

    if (!role) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/platform-rbac/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toastNotify({ variant: 'success', title: 'Role updated successfully' });
        onSuccess?.();
        handleClose();
      } else {
        const error = await response.text();
        toastNotify({ variant: 'error', title: 'Failed to update role', description: error });
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toastNotify({ variant: 'error', title: 'Failed to update role' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId]
    }));
  };

  if (!role) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Edit Role: {role.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter role name..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Selected Permissions</Label>
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {formData.permissionIds.length} permission{formData.permissionIds.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter role description..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            {isLoadingPermissions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading permissions...</span>
              </div>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-4">
                <div className="space-y-3">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={permission.id}
                        checked={formData.permissionIds.includes(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={permission.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {permission.name}
                        </Label>
                        {permission.description && (
                          <p className="text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Role'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 