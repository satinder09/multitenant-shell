'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserCheck, Loader2 } from 'lucide-react';
import { TenantAccessOption } from './MasterDashboard';

interface TenantUser {
  id: string;
  email: string;
  name: string;
}

interface ImpersonationModalProps {
  tenant: TenantAccessOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImpersonationModal({ tenant, open, onOpenChange }: ImpersonationModalProps) {
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchTenantUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/tenant-access/tenants/${tenant.tenantId}/users`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        console.error('Failed to fetch tenant users');
        // For demo purposes, add some mock users
        setUsers([
          { id: '1', email: 'admin@tenant.com', name: 'Tenant Admin' },
          { id: '2', email: 'user@tenant.com', name: 'Regular User' },
          { id: '3', email: 'manager@tenant.com', name: 'Manager User' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching tenant users:', error);
      // For demo purposes, add some mock users
      setUsers([
        { id: '1', email: 'admin@tenant.com', name: 'Tenant Admin' },
        { id: '2', email: 'user@tenant.com', name: 'Regular User' },
        { id: '3', email: 'manager@tenant.com', name: 'Manager User' },
      ]);
    } finally {
      setLoadingUsers(false);
    }
  }, [tenant.tenantId]);

  useEffect(() => {
    if (open) {
      fetchTenantUsers();
    }
  }, [open, fetchTenantUsers]);

  const handleImpersonate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tenant-access/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: tenant.tenantId,
          targetUserId: selectedUser,
          reason: reason,
          duration: duration
        })
      });

      if (response.ok) {
        const { redirectUrl } = await response.json();
        window.location.href = redirectUrl;
      } else {
        const error = await response.json();
        console.error('Impersonation failed:', error);
        // You could add toast notification here
      }
    } catch (error) {
      console.error('Impersonation failed:', error);
      // You could add toast notification here
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedUser('');
    setReason('');
    setDuration(30);
    onOpenChange(false);
  };

  const selectedUserData = users.find(user => user.id === selectedUser);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Impersonate User in {tenant.tenantName}
          </DialogTitle>
          <DialogDescription>
            Temporarily assume the identity of a tenant user for debugging or support.
            This action will be logged and audited.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user">Select User to Impersonate</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? "Loading users..." : "Choose a user..."} />
              </SelectTrigger>
              <SelectContent>
                {loadingUsers ? (
                  <SelectItem value="" disabled>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading users...
                    </div>
                  </SelectItem>
                ) : (
                  users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">Impersonation Duration</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Impersonation</Label>
            <Textarea
              id="reason"
              placeholder="Why are you impersonating this user?"
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {selectedUserData && (
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm font-medium mb-1">Selected User</div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Name: {selectedUserData.name}</div>
                <div>Email: {selectedUserData.email}</div>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-800">
            <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              ⚠️ Important Notice
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-300">
              You will be acting as this user. All actions will be logged with your original identity for audit purposes.
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleImpersonate}
            disabled={loading || !selectedUser || !reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Start Impersonation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 