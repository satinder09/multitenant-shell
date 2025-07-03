'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Key, Shield, Users } from 'lucide-react';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { browserApi } from '@/shared/services/api-client';

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
  userRoles?: Array<{ user: { email: string } }>;
}

interface ManagePermissionsModalProps {
  isOpen: boolean;
  role: Role | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManagePermissionsModal: React.FC<ManagePermissionsModalProps> = ({
  isOpen,
  role,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  // Load current role permissions when role changes
  useEffect(() => {
    if (role) {
      setSelectedPermissionIds(role.rolePermissions?.map(rp => rp.permission.id) || []);
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
      const response = await browserApi.get('/api/platform-rbac/permissions');
      if (response.success) {
        setPermissions(response.data as Permission[]);
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

  const handleSave = async () => {
    if (!role) return;

    setIsLoading(true);
    try {
      const response = await browserApi.put(`/api/platform-rbac/roles/${role.id}`, {
        name: role.name,
        description: role.description,
        permissionIds: selectedPermissionIds
      });

      if (response.success) {
        toastNotify({ variant: 'success', title: 'Permissions updated successfully' });
        onSuccess?.();
        onClose();
      } else {
        toastNotify({ variant: 'error', title: 'Failed to update permissions', description: response.error });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toastNotify({ variant: 'error', title: 'Failed to update permissions' });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const selectAll = () => {
    setSelectedPermissionIds(permissions.map(p => p.id));
  };

  const selectNone = () => {
    setSelectedPermissionIds([]);
  };

  if (!role) return null;

  const currentPermissions = role.rolePermissions?.map(rp => rp.permission) || [];
  const assignedUsers = role.userRoles?.map(ur => ur.user.email) || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Manage Permissions: {role.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Role Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Role Information</span>
              </div>
              <div className="text-sm">
                <p><strong>Name:</strong> {role.name}</p>
                {role.description && <p><strong>Description:</strong> {role.description}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Assigned Users ({assignedUsers.length})</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {assignedUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {assignedUsers.slice(0, 2).map((email, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {email}
                      </Badge>
                    ))}
                    {assignedUsers.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{assignedUsers.length - 2} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  'No users assigned'
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Current Permissions Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Current Permissions ({currentPermissions.length})</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Key className="h-4 w-4" />
                <span>{selectedPermissionIds.length} selected</span>
              </div>
            </div>
            
            {currentPermissions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentPermissions.slice(0, 5).map((permission) => (
                  <Badge key={permission.id} variant="secondary" className="text-xs">
                    {permission.name}
                  </Badge>
                ))}
                {currentPermissions.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{currentPermissions.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Permission Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Available Permissions</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={selectNone}>
                  Select None
                </Button>
              </div>
            </div>

            {isLoadingPermissions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading permissions...</span>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-md p-4">
                <div className="space-y-3">
                  {permissions.map((permission) => (
                    <div key={permission.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissionIds.includes(permission.id)}
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
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 