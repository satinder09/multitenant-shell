import React, { useState, useTransition, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle } from 'lucide-react';
import { toastNotify } from '@/shared/utils/ui/toastNotify';
import { browserApi } from '@/shared/services/api-client';

interface EditTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: any;
  onTenantUpdated: () => void;
}

const EditTenantDialog: React.FC<EditTenantDialogProps> = ({
  open,
  onOpenChange,
  tenant,
  onTenantUpdated,
}) => {
  const [isPending, startTransition] = useTransition();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    isActive: false,
  });

  // Update form data when tenant changes
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        isActive: tenant.isActive || false,
      });
    }
  }, [tenant]);

  const handleUpdate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdateError(null);
    
    if (!tenant?.id) {
      setUpdateError('Tenant ID is required');
      return;
    }

    startTransition(async () => {
      try {
        const response = await browserApi.patch(`/api/tenants/${tenant.id}`, {
          name: formData.name,
          isActive: formData.isActive,
        });

        if (response.success) {
          toastNotify({
            variant: 'success',
            title: 'Tenant updated successfully',
            description: `Tenant "${formData.name}" has been updated.`,
          });
          onOpenChange(false);
          onTenantUpdated();
        } else {
          setUpdateError(response.error || 'Failed to update tenant');
        }
      } catch (err: unknown) {
        setUpdateError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleDialogChange = (open: boolean) => {
    if (open) {
      setUpdateError(null);
    }
    onOpenChange(open);
  };

  if (!tenant) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleUpdate}>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update the tenant details. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          {updateError && (
            <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive my-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{updateError}</span>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                className="col-span-3"
                placeholder="Enter tenant name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subdomain" className="text-right">
                Subdomain
              </Label>
              <Input
                id="subdomain"
                className="col-span-3"
                value={tenant.subdomain || ''}
                disabled
                placeholder="Cannot be changed"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                Active
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, isActive: checked as boolean })
                  }
                />
                <Label htmlFor="isActive" className="text-sm">
                  Tenant is active and accessible
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.name.trim()}>
              {isPending ? <Spinner size="sm" /> : 'Update Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTenantDialog; 