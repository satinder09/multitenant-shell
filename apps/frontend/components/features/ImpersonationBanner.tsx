'use client';

import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, User, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthCache } from '@/shared/utils/authCache';
import { browserApi } from '@/shared/services/api-client';

export default function ImpersonationBanner() {
  const { user, refreshUser } = useAuth();
  const { tenantSubdomain } = usePlatform();
  const router = useRouter();
  const [isReturning, setIsReturning] = useState(false);

  // Show banner for both secure login and impersonation sessions
  if (!user?.accessType || (user.accessType !== 'impersonation' && user.accessType !== 'secure_login')) {
    return null;
  }

  const isImpersonation = user.accessType === 'impersonation';
  const isSecureLogin = user.accessType === 'secure_login';
  
  // Calculate time remaining if expiresAt is available
  const getTimeRemaining = () => {
    if (!user.expiresAt) return null;
    const expirationTime = new Date(user.expiresAt);
    const now = new Date();
    const diffMs = expirationTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes % 60}m remaining`;
    } else {
      return `${diffMinutes}m remaining`;
    }
  };

  const handleReturnToPlatform = async () => {
    setIsReturning(true);
    try {
      console.log('🔄 Returning to platform, clearing auth state...');
      
      // Clear auth cache immediately
      AuthCache.clear();
      
      if (isImpersonation && user.impersonationSessionId) {
        // End impersonation session
        await browserApi.post('/api/auth/impersonation/end', { sessionId: user.impersonationSessionId });
      } else if (isSecureLogin) {
        // For secure login, logout from tenant
        await browserApi.post('/api/auth/logout');
      }
      
      // Additional cleanup - clear all session data
      await browserApi.post('/api/auth/clear-session');
      
      // Force refresh user state to clear any cached auth data
      await refreshUser(true);
      
      // Small delay to ensure cookies are cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Redirect to platform with a clean slate
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
      const frontendPort = process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000';
      const platformUrl = `http://${baseDomain}:${frontendPort}/platform`;
      
      console.log('🔄 Redirecting to platform:', platformUrl);
      
      // Use window.location.href for complete page reload to ensure clean state
      window.location.href = platformUrl;
    } catch (error) {
      console.error('Error returning to platform:', error);
      
      // Even if logout fails, clear local state and redirect
      AuthCache.clear();
      
      // Try clearing session as fallback
      try {
        await browserApi.post('/api/auth/clear-session');
      } catch (clearError) {
        console.error('Error clearing session:', clearError);
      }
      
      await refreshUser(true);
      
      // Force redirect anyway
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
      const frontendPort = process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000';
      window.location.href = `http://${baseDomain}:${frontendPort}/platform`;
    } finally {
      // Don't reset isReturning since we're redirecting
    }
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="w-full bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-b border-amber-200/50 backdrop-blur-sm">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isImpersonation ? (
                <div className="p-1.5 rounded-full bg-amber-100">
                  <User className="h-4 w-4 text-amber-700" />
                </div>
              ) : (
                <div className="p-1.5 rounded-full bg-amber-100">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                </div>
              )}
              <div className="flex flex-col">
                {isImpersonation ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-amber-900">
                      Impersonating: {user.impersonatedUserName || user.impersonatedUserEmail}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-medium">
                      Tenant: {tenantSubdomain}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-amber-900">
                      Secure Login: Accessing tenant "{tenantSubdomain}"
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-medium">
                      {user.name}
                    </span>
                  </div>
                )}
                <span className="text-xs text-amber-700/80 mt-0.5">
                  {isImpersonation ? 'Administrative access session' : `Authenticated as ${user.email}`}
                </span>
              </div>
            </div>
            
            {timeRemaining && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 rounded-full border border-amber-200">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">{timeRemaining}</span>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleReturnToPlatform}
            disabled={isReturning}
            variant="outline"
            size="sm"
            className="bg-white/80 hover:bg-white border-amber-300 text-amber-800 hover:text-amber-900 shadow-sm hover:shadow transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isReturning ? 'Returning...' : 'Return to Platform'}
          </Button>
        </div>
      </div>
    </div>
  );
} 