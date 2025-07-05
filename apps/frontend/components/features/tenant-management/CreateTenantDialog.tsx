import React, { useState, useTransition, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { CreatePlatformTenantDialogProps } from '@/shared/types/platform.types';
import { createTenantAction } from '@/domains/platform/utils/tenantHelpers';

const CreateTenantDialog: React.FC<CreatePlatformTenantDialogProps> = ({
  open,
  onOpenChange,
  onTenantCreated,
}) => {
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await createTenantAction(formData);
        toastNotify({
          variant: 'success',
          title: 'Tenant created successfully',
        });
        onOpenChange(false);
        onTenantCreated();
        // Reset form
        (e.target as HTMLFormElement).reset();
      } catch (err: unknown) {
        setCreateError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  };

  const handleDialogChange = (open: boolean) => {
    if (open) {
      setCreateError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Enter the details for the new tenant. A subdomain will be automatically generated.
            </DialogDescription>
          </DialogHeader>
          {createError && (
            <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive my-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{createError}</span>
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
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner size="sm" /> : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTenantDialog; 