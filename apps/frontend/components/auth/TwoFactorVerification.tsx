'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AlertCircle, Shield, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TwoFactorVerificationProps {
  availableMethods: string[];
  message: string;
  onVerify: (code: string, type?: 'totp' | 'backup') => Promise<void>;
  isLoading?: boolean;
}

export function TwoFactorVerification({ 
  availableMethods, 
  message, 
  onVerify, 
  isLoading = false 
}: TwoFactorVerificationProps) {
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = isBackupCode ? backupCode.trim() : totpCode.trim();
    
    if (!code) {
      setError('Please enter a verification code');
      return;
    }

    // Validate TOTP code length (6 digits)
    if (!isBackupCode && code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    // Validate backup code format (should be 8-9 characters with optional dash)
    if (isBackupCode && code.length < 8) {
      setError('Please enter a valid backup code');
      return;
    }

    setError('');
    
    try {
      await onVerify(code, isBackupCode ? 'backup' : 'totp');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    }
  };

  const handleMethodSwitch = () => {
    setIsBackupCode(!isBackupCode);
    setTotpCode('');
    setBackupCode('');
    setError('');
  };

  const hasTotp = availableMethods.includes('totp');
  const hasBackup = availableMethods.includes('backup');

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-center">Two-Factor Authentication</CardTitle>
        <CardDescription className="text-center">
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label htmlFor="code">
              {isBackupCode ? 'Backup Code' : 'Authentication Code'}
            </Label>
            
            {isBackupCode ? (
              // Regular input for backup codes
              <div className="relative">
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter backup code (e.g., XXXX-XXXX)"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  className="pl-10 font-mono text-center"
                  maxLength={9}
                  autoComplete="one-time-code"
                  autoFocus
                />
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>
            ) : (
              // OTP input for TOTP codes
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={(value) => setTotpCode(value)}
                  disabled={isLoading}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || (!isBackupCode && totpCode.length !== 6) || (isBackupCode && backupCode.length < 8)}
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>

        {hasTotp && hasBackup && (
          <div className="text-center">
            <button
              type="button"
              onClick={handleMethodSwitch}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              disabled={isLoading}
            >
              {isBackupCode ? 'Use authenticator app' : 'Use backup code'}
            </button>
          </div>
        )}

        <div className="text-center text-sm text-gray-600">
          {isBackupCode ? (
            <p>Enter one of your recovery codes (8 characters).</p>
          ) : (
            <p>Enter the 6-digit code from your authenticator app.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 