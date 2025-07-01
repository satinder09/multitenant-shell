'use client';

import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, User, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ImpersonationBanner() {
  const { user } = useAuth();
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
      if (isImpersonation && user.impersonationSessionId) {
        // End impersonation session
        await fetch('/api/auth/impersonation/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId: user.impersonationSessionId })
        });
      } else if (isSecureLogin) {
        // For secure login, just logout from tenant
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        });
      }
      
      // Redirect to platform
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me';
      const frontendPort = process.env.NEXT_PUBLIC_FRONTEND_PORT || '3000';
      window.location.href = `http://${baseDomain}:${frontendPort}/platform`;
    } catch (error) {
      console.error('Error returning to platform:', error);
      setIsReturning(false);
    }
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            {isImpersonation ? (
              <User className="h-5 w-5 text-amber-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
              {isImpersonation ? (
                <span className="text-sm font-medium text-amber-800">
                  Impersonating: {user.impersonatedUserName || user.impersonatedUserEmail}
                </span>
              ) : (
                <span className="text-sm font-medium text-amber-800">
                  Secure Login: Accessing tenant "{tenantSubdomain}"
                </span>
              )}
              <span className="text-xs text-amber-700">
                {isImpersonation ? `in tenant "${tenantSubdomain}"` : `as ${user.name} (${user.email})`}
              </span>
            </div>
            {timeRemaining && (
              <div className="flex items-center space-x-1 text-xs text-amber-700">
                <Clock className="h-3 w-3" />
                <span>{timeRemaining}</span>
              </div>
            )}
          </div>
          
          <Button
            onClick={handleReturnToPlatform}
            disabled={isReturning}
            variant="outline"
            size="sm"
            className="bg-white hover:bg-amber-50 border-amber-300 text-amber-800 hover:text-amber-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {isReturning ? 'Returning...' : 'Return to Platform'}
          </Button>
        </div>
      </div>
    </div>
  );
} 