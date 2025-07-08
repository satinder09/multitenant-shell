'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, Shield, Key } from 'lucide-react';

interface TwoFactorVerificationProps {
  availableMethods: string[];
  onVerify: (code: string, type?: 'totp' | 'backup') => Promise<void>;
  isLoading?: boolean;
}

export function TwoFactorVerification({ 
  availableMethods, 
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
    <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
              <p className="text-muted-foreground text-balance">
                Please complete authentication to continue
              </p>
            </div>

            <div className="grid gap-4">
              <div className="text-center">
                <Label htmlFor="code" className="text-sm font-medium">
                  {isBackupCode ? 'Recovery Code' : 'Verification Code'}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {isBackupCode ? 'Enter one of your backup codes' : 'Enter the 6-digit code from your authenticator app'}
                </p>
              </div>
              
              {isBackupCode ? (
                <div className="relative">
                  <Input
                    id="code"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    className="pl-10 font-mono text-center tracking-wider"
                    maxLength={9}
                    autoComplete="one-time-code"
                    autoFocus
                    disabled={isLoading}
                  />
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                </div>
              ) : (
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
                    <div className="mx-3">
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </div>
                  </InputOTP>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || (!isBackupCode && totpCode.length !== 6) || (isBackupCode && backupCode.length < 8)}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>

            {hasTotp && hasBackup && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleMethodSwitch}
                  className="text-sm underline-offset-2 hover:underline text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {isBackupCode ? 'Use authenticator app instead' : 'Use recovery code instead'}
                </button>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 