'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCheck, Building2, Clock } from 'lucide-react';
import { SecureLoginModal } from '@/app/platform/tenants/components/SecureLoginModal';
import { ImpersonationModal } from '@/app/platform/tenants/components/ImpersonationModal';

export interface TenantAccessOption {
  tenantId: string;
  tenantName: string;
  subdomain: string;
  canAccess: boolean;
  canImpersonate: boolean;
  accessLevel: 'read' | 'write' | 'admin';
  lastAccessed?: Date;
}

interface MasterDashboardProps {
  showNavigation?: boolean;
}

export function MasterDashboard({ showNavigation = false }: MasterDashboardProps) {
  console.log('[MasterDashboard] Rendering MasterDashboard component with showNavigation:', showNavigation);
  
  const [tenants, setTenants] = useState<TenantAccessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<TenantAccessOption | null>(null);
  const [showSecureLogin, setShowSecureLogin] = useState(false);
  const [showImpersonation, setShowImpersonation] = useState(false);

  useEffect(() => {
    console.log('[MasterDashboard] useEffect: Fetching tenant access options');
    fetchTenantAccessOptions();
  }, []);

  const fetchTenantAccessOptions = async () => {
    try {
      const response = await fetch('/api/tenant-access', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[MasterDashboard] Fetched tenant access options:', data);
        setTenants(data);
      } else {
        console.error('[MasterDashboard] Failed to fetch tenant access options, status:', response.status);
      }
    } catch (error) {
      console.error('[MasterDashboard] Error fetching tenant access options:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSecureLogin = (tenant: TenantAccessOption) => {
    setSelectedTenant(tenant);
    setShowSecureLogin(true);
  };

  const handleImpersonate = (tenant: TenantAccessOption) => {
    setSelectedTenant(tenant);
    setShowImpersonation(true);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'write':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'read':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">
            Manage and access your tenant instances
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Tenant Grid */}
      {tenants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tenants Available</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You don&apos;t have access to any tenant instances yet. Contact your administrator to get access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
            <TenantCard
              key={tenant.tenantId}
              tenant={tenant}
              onSecureLogin={() => handleSecureLogin(tenant)}
              onImpersonate={() => handleImpersonate(tenant)}
              formatDate={formatDate}
              getAccessLevelColor={getAccessLevelColor}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedTenant && (
        <>
          <SecureLoginModal
            tenant={selectedTenant}
            open={showSecureLogin}
            onOpenChange={setShowSecureLogin}
          />
          
          <ImpersonationModal
            tenant={selectedTenant}
            open={showImpersonation}
            onOpenChange={setShowImpersonation}
            onSuccess={() => {
              setShowImpersonation(false);
              setSelectedTenant(null);
            }}
          />
        </>
      )}
    </div>
  );
}

interface TenantCardProps {
  tenant: TenantAccessOption;
  onSecureLogin: () => void;
  onImpersonate: () => void;
  formatDate: (date: Date) => string;
  getAccessLevelColor: (level: string) => string;
}

function TenantCard({ 
  tenant, 
  onSecureLogin, 
  onImpersonate, 
  formatDate, 
  getAccessLevelColor 
}: TenantCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{tenant.tenantName}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Building2 className="h-4 w-4 mr-1" />
              {tenant.subdomain}.{process.env.NEXT_PUBLIC_BASE_DOMAIN}
            </CardDescription>
          </div>
          <Badge className={getAccessLevelColor(tenant.accessLevel)}>
            {tenant.accessLevel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Access:</span>
            <div className="flex items-center space-x-2">
              {tenant.canAccess && (
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure Login
                </Badge>
              )}
              {tenant.canImpersonate && (
                <Badge variant="outline" className="text-xs">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Impersonate
                </Badge>
              )}
            </div>
          </div>
          
          {tenant.lastAccessed && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-2" />
              Last accessed: {formatDate(tenant.lastAccessed)}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-4">
        {tenant.canAccess && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onSecureLogin}
            className="flex-1"
          >
            <Shield className="w-4 h-4 mr-2" />
            Secure Login
          </Button>
        )}
        
        {tenant.canImpersonate && (
          <Button 
            variant="secondary" 
            size="sm"
            onClick={onImpersonate}
            className="flex-1"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Impersonate
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 