'use client';

/**
 * 🏢 TENANT CREATION FORM
 * 
 * Uses the default background API system for automatic progress toasts.
 * Modal closes immediately when form is submitted.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Info } from 'lucide-react';

// Use the simplified API hook
import { useBrowserApi } from '@/hooks/useBrowserApi';

interface TenantCreationFormProps {
  onSuccess?: () => void;
}

export function TenantCreationForm({ onSuccess }: TenantCreationFormProps = {}) {
  const [formData, setFormData] = useState({
    name: '',
    planType: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the browser API hook
  const { api } = useBrowserApi();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Close modal immediately
    if (onSuccess) {
      onSuccess();
    }

    try {
      // Prepare data for API call - only send non-empty fields
      const apiData: any = {
        name: formData.name,
      };
      
      // Only include planType if it's provided
      if (formData.planType) {
        apiData.planType = formData.planType;
      }
      
      // Use background API with default toast system
      // Generate and use explicit operation ID to wire up toasts immediately
      const operationId = `tenant-creation-${Date.now()}`;
      await api.background.post('/api/tenants', apiData, { operationId });
      
      // Clear form
      setFormData({ name: '', planType: '' });
      
    } catch (error) {
      console.error('Error creating tenant:', error);
      // Default error toast will be shown by the background API
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Create New Tenant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Tenant Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter tenant name (e.g., 'Acme Corp')"
              required
              minLength={3}
            />
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>The subdomain will be auto-generated from the name</span>
            </div>
          </div>

          <div>
            <Label htmlFor="planType">Plan Type</Label>
            <Select 
              value={formData.planType} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, planType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" />
              <span>Optional: Select a plan type for the tenant</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Tenant'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData({ name: '', planType: '' })}
            >
              Clear
            </Button>
          </div>
        </form>
        
        {/* Information panel */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Auto-generated Fields</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>• <strong>Subdomain:</strong> Generated from tenant name (lowercase, no spaces)</div>
            <div>• <strong>Database Name:</strong> Auto-generated with unique suffix</div>
            <div>• <strong>Database URL:</strong> Encrypted and stored securely</div>
            <div>• <strong>Status:</strong> Active by default</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}