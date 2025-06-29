'use client';

import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { UserCheck, LogOut, Shield } from 'lucide-react';
import { useState } from 'react';

export function ImpersonationBanner() {
  const { user } = useAuth();
  const [ending, setEnding] = useState(false);

  // Show banner for both secure login and impersonation
  const isElevatedSession = user?.accessType === 'impersonation' || user?.accessType === 'secure_login';

  if (!isElevatedSession) {
    return null;
  }

  const isImpersonation = user?.accessType === 'impersonation';

  const handleEndImpersonation = async () => {
    setEnding(true);
    try {
      const response = await fetch('/api/tenant-access/impersonate/end', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const { redirectUrl } = await response.json();
        window.location.href = redirectUrl;
      } else {
        console.error('Failed to end impersonation');
      }
    } catch (error) {
      console.error('Error ending impersonation:', error);
    } finally {
      setEnding(false);
    }
  };

  return (
    <Alert className={isImpersonation ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20" : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"}>
      {isImpersonation ? (
        <UserCheck className="h-4 w-4 text-amber-800 dark:text-amber-200" />
      ) : (
        <Shield className="h-4 w-4 text-blue-800 dark:text-blue-200" />
      )}
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isImpersonation ? (
            <span className="text-amber-800 dark:text-amber-200 font-medium">
              You are impersonating {user.impersonatedUserName} ({user.impersonatedUserEmail})
            </span>
          ) : (
            <span className="text-blue-800 dark:text-blue-200 font-medium">
              You are securely logged in as master admin
            </span>
          )}
          {isImpersonation && (
            <span className="text-amber-600 dark:text-amber-300 text-sm">
              • Original user: {user.name} ({user.email})
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEndImpersonation}
          disabled={ending}
          className={isImpersonation ? "border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30" : "border-blue-300 text-blue-800 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/30"}
        >
          {ending ? (
            'Ending...'
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              End {isImpersonation ? 'Impersonation' : 'Secure Session'}
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
} 