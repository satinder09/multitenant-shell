'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Loader2 } from 'lucide-react';
import { TenantAccessOption } from './MasterDashboard';

interface SecureLoginModalProps {
  tenant: TenantAccessOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SecureLoginModal({ tenant, open, onOpenChange }: SecureLoginModalProps) {
  const [duration, setDuration] = useState(60);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSecureLogin = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://lvh.me:4000';
      const response = await fetch(`${backendUrl}/tenant-access/secure-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId: tenant.tenantId,
          duration: duration,
          reason: reason || 'Administrative access'
        })
      });

      if (response.ok) {
        const { redirectUrl } = await response.json();
        // Redirect to tenant with secure session
        window.location.href = redirectUrl;
      } else {
        const error = await response.json();
        console.error('Secure login failed:', error);
        // You could add toast notification here
      }
    } catch (error) {
      console.error('Secure login failed:', error);
      // You could add toast notification here
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDuration(60);
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Login to {tenant.tenantName}
          </DialogTitle>
          <DialogDescription>
            Access this tenant with your master user identity for administrative purposes.
            This session will be logged and audited.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Session Duration</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Access</Label>
            <Textarea
              id="reason"
              placeholder="Brief description of why you need access..."
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm font-medium mb-1">Access Details</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Tenant: {tenant.tenantName}</div>
              <div>Subdomain: {tenant.subdomain}.lvh.me</div>
              <div>Access Level: {tenant.accessLevel}</div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSecureLogin} disabled={loading || !reason.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Secure Login
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 