"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Shield, 
  QrCode,
  Key,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Smartphone,
  RefreshCw,
  X
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface TwoFactorStatus {
  isEnabled: boolean
  hasEnabledMethods: boolean
  enabledMethods: any[]
  primaryMethod?: any
  canDisable: boolean
  lastVerifiedAt?: string
}

interface TwoFactorSetupResponse {
  methodId: string
  methodType: string
  qrCode?: string
  secret?: string
  backupCodes?: string[]
  instructions: string
  nextStep: string
}

type SetupStep = 'initial' | 'setup' | 'verify' | 'complete'

export function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState<SetupStep>('initial')
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [copiedCodes, setCopiedCodes] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Load 2FA status
  useEffect(() => {
    loadTwoFactorStatus()
  }, [])

  const loadTwoFactorStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        console.error('Failed to load 2FA status')
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupTwoFactor = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodType: 'TOTP',
          name: 'Platform Authenticator'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSetupData(data)
        setSetupStep('setup')
        toast.success('2FA setup initiated! Scan the QR code with your authenticator app.')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to setup 2FA')
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      toast.error('Error setting up 2FA')
    } finally {
      setProcessing(false)
    }
  }

  const verifyTwoFactor = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter a verification code')
      return
    }

    try {
      setProcessing(true)
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodType: 'TOTP',
          code: verificationCode.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSetupStep('verify')
          toast.success('Verification successful! Enabling 2FA...')
          await enableTwoFactor()
        } else {
          toast.error(data.message || 'Invalid verification code')
        }
      } else {
        const error = await response.json()
        
        // If setup was lost (e.g., server restart), reset the flow
        if (error.message?.includes('restart the setup process')) {
          toast.error('Setup session expired. Starting over...')
          resetSetup()
          return
        }
        
        toast.error(error.message || 'Verification failed')
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      toast.error('Error verifying 2FA')
    } finally {
      setProcessing(false)
    }
  }

  const enableTwoFactor = async () => {
    if (!setupData?.methodId) return

    try {
      setProcessing(true)
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodId: setupData.methodId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setBackupCodes(data.backupCodes || [])
        setSetupStep('complete')
        toast.success('2FA enabled successfully!')
        await loadTwoFactorStatus()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to enable 2FA')
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error)
      toast.error('Error enabling 2FA')
    } finally {
      setProcessing(false)
    }
  }

  const disableTwoFactor = async () => {
    if (!status?.primaryMethod?.id) return

    try {
      setProcessing(true)
      const response = await fetch(`/api/auth/2fa/method/${status.primaryMethod.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('2FA disabled successfully')
        await loadTwoFactorStatus()
        setSetupStep('initial')
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to disable 2FA')
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      toast.error('Error disabling 2FA')
    } finally {
      setProcessing(false)
    }
  }

  const copyBackupCodes = async () => {
    if (backupCodes.length === 0) return
    
    const codesText = backupCodes.join('\n')
    await navigator.clipboard.writeText(codesText)
    setCopiedCodes(true)
    toast.success('Backup codes copied to clipboard')
    setTimeout(() => setCopiedCodes(false), 2000)
  }

  const downloadBackupCodes = () => {
    if (backupCodes.length === 0) return
    
    const codesText = backupCodes.join('\n')
    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded')
  }

  const resetSetup = () => {
    setSetupStep('initial')
    setSetupData(null)
    setVerificationCode('')
    setBackupCodes([])
    setCopiedCodes(false)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Loading 2FA status...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your platform account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Shield className={`h-5 w-5 ${status?.isEnabled ? 'text-green-500' : 'text-gray-400'}`} />
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                {status?.isEnabled ? 'Protecting your account' : 'Not configured'}
              </p>
            </div>
          </div>
          <Badge variant={status?.isEnabled ? 'default' : 'secondary'}>
            {status?.isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {/* Setup Flow */}
        {!status?.isEnabled && (
          <>
            {setupStep === 'initial' && (
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication adds an extra layer of security to your account. 
                    You'll need an authenticator app like Google Authenticator or Authy.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={setupTwoFactor} 
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Smartphone className="mr-2 h-4 w-4" />
                      Setup Two-Factor Authentication
                    </>
                  )}
                </Button>
              </div>
            )}

            {setupStep === 'setup' && setupData && (
              <div className="space-y-4">
                <Alert>
                  <QrCode className="h-4 w-4" />
                  <AlertDescription>
                    Scan this QR code with your authenticator app, then enter the 6-digit code below.
                  </AlertDescription>
                </Alert>
                
                <div className="flex flex-col items-center space-y-4">
                  {setupData.qrCode && (
                    <div className="p-4 bg-white rounded-lg border">
                      <img 
                        src={setupData.qrCode} 
                        alt="2FA QR Code" 
                        className="w-48 h-48"
                      />
                    </div>
                  )}
                  
                  {setupData.secret && (
                    <div className="w-full">
                      <Label htmlFor="secret">Manual Entry Key (if QR code doesn't work)</Label>
                      <div className="flex gap-2 mt-2">
                        <Input 
                          id="secret"
                          value={setupData.secret}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(setupData.secret!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="w-full max-w-sm">
                    <Label htmlFor="verification-code">Enter 6-digit code from your app</Label>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        id="verification-code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="text-center font-mono text-lg"
                      />
                      <Button 
                        onClick={verifyTwoFactor} 
                        disabled={processing || verificationCode.length !== 6}
                      >
                        {processing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetSetup} className="flex-1">
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {setupStep === 'complete' && (
              <div className="space-y-4">
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication has been successfully enabled! 
                    Please save your backup codes in a safe place.
                  </AlertDescription>
                </Alert>
                
                {backupCodes.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Backup Codes</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                      </p>
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                          {backupCodes.map((code, index) => (
                            <div key={index} className="p-2 bg-background rounded border">
                              {code}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={copyBackupCodes}
                        className="flex-1"
                      >
                        {copiedCodes ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Codes
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={downloadBackupCodes}
                        className="flex-1"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button onClick={resetSetup} className="w-full">
                  Done
                </Button>
              </div>
            )}
          </>
        )}

        {/* Enabled State */}
        {status?.isEnabled && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is active and protecting your account.
                {status.lastVerifiedAt && (
                  <span className="block mt-1 text-xs">
                    Last verified: {new Date(status.lastVerifiedAt).toLocaleString()}
                  </span>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Key className="mr-2 h-4 w-4" />
                    Generate New Backup Codes
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate New Backup Codes</DialogTitle>
                    <DialogDescription>
                      This will invalidate your existing backup codes and generate new ones.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This feature is coming soon. Contact support if you need new backup codes.
                      </AlertDescription>
                    </Alert>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="flex-1">
                    <X className="mr-2 h-4 w-4" />
                    Disable 2FA
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to disable 2FA? This will make your account less secure.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Disabling 2FA will remove the extra layer of security from your account. 
                        You can re-enable it at any time.
                      </AlertDescription>
                    </Alert>
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        onClick={disableTwoFactor}
                        disabled={processing}
                        className="flex-1"
                      >
                        {processing ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Disabling...
                          </>
                        ) : (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Yes, Disable 2FA
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 