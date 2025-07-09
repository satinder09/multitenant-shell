"use client"

import React, { useState, useEffect } from 'react'
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
import { Textarea } from "@/components/ui/textarea"
import { toastNotify, createLoadingToast } from '@/shared/utils/ui/toastNotify'
import { alert, confirm, dialog } from '@/shared/utils/ui/dialogUtils'

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
        
        // If 2FA is enabled, try to load existing backup codes
        if (data.isEnabled) {
          await loadBackupCodes()
        }
      } else {
        toastNotify({
          variant: 'error',
          title: 'Failed to Load 2FA Status',
          description: 'Unable to retrieve two-factor authentication status.'
        })
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error)
      toastNotify({
        variant: 'error',
        title: 'Connection Error',
        description: 'Unable to connect to authentication service.'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBackupCodes = async () => {
    try {
      const response = await fetch('/api/auth/2fa/backup-codes')
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded backup codes:', data)
        if (data.codes) {
          setBackupCodes(data.codes)
        }
      } else {
        console.log('No backup codes endpoint or no codes available')
        setBackupCodes([])
      }
    } catch (error) {
      console.log('Error loading backup codes:', error)
      setBackupCodes([])
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
        toastNotify({ variant: 'success', title: '2FA setup initiated!', description: 'Scan the QR code with your authenticator app.', showProgress: true })
      } else {
        const error = await response.json()
        alert({
          title: 'Failed to Setup 2FA',
          description: `Unable to initiate 2FA setup: ${error.message}`,
          variant: 'error',
          buttons: [
            { label: 'Cancel', variant: 'outline', autoClose: true },
            { label: 'Try Again', variant: 'default', onClick: setupTwoFactor, autoClose: true }
          ]
        })
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      toastNotify({ variant: 'error', title: 'Error setting up 2FA' })
    } finally {
      setProcessing(false)
    }
  }

  const verifyTwoFactor = async () => {
    if (!verificationCode.trim()) {
      toastNotify({ variant: 'error', title: 'Please enter a verification code' })
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
          toastNotify({ variant: 'success', title: 'Verification successful!', description: 'Enabling 2FA...' })
          await enableTwoFactor()
        } else {
          toastNotify({ variant: 'error', title: 'Invalid verification code', description: data.message })
        }
      } else {
        const error = await response.json()
        
        // If setup was lost (e.g., server restart), reset the flow
        if (error.message?.includes('restart the setup process')) {
          alert({
            title: 'Setup Session Expired',
            description: 'Your setup session has expired. You will need to start the setup process again.',
            variant: 'warning',
            buttons: [
              { label: 'Start Over', variant: 'default', onClick: resetSetup, autoClose: true }
            ]
          })
          return
        }
        
        alert({
          title: 'Verification Failed',
          description: `Unable to verify the code: ${error.message}`,
          variant: 'error',
          buttons: [
            { label: 'Cancel Setup', variant: 'outline', onClick: confirmCancelSetup, autoClose: true },
            { label: 'Try Again', variant: 'default', autoClose: true }
          ]
        })
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      toastNotify({ variant: 'error', title: 'Error verifying 2FA' })
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
        console.log('2FA Enable Response:', data)
        setBackupCodes(data.backupCodes || [])
        console.log('Backup codes set:', data.backupCodes)
        setSetupStep('complete')
        toastNotify({ variant: 'success', title: '2FA enabled successfully!', showProgress: true })
        await loadTwoFactorStatus()
        
        // Show success dialog with option to view backup codes immediately
        if (data.backupCodes && data.backupCodes.length > 0) {
          alert({
            title: '🎉 2FA Successfully Enabled!',
            description: 'Your account is now protected with two-factor authentication. Make sure to save your backup codes.',
            variant: 'success',
            buttons: [
              { 
                label: 'View Backup Codes', 
                variant: 'default', 
                icon: <Key className="h-4 w-4" />,
                onClick: showBackupCodesDialog,
                autoClose: true
              },
              { 
                label: 'Continue', 
                variant: 'outline',
                autoClose: true
              }
            ]
          })
        }
      } else {
        const error = await response.json()
        alert({
          title: 'Failed to Enable 2FA',
          description: `Unable to enable 2FA: ${error.message}`,
          variant: 'error',
          buttons: [
            { label: 'Cancel Setup', variant: 'outline', onClick: confirmCancelSetup, autoClose: true },
            { label: 'Try Again', variant: 'default', onClick: enableTwoFactor, autoClose: true }
          ]
        })
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error)
      toastNotify({ variant: 'error', title: 'Error enabling 2FA' })
    } finally {
      setProcessing(false)
    }
  }

  const disableTwoFactor = async () => {
    console.log('🔐 Disable 2FA clicked')
    console.log('Status:', status)
    console.log('Primary method:', status?.primaryMethod)
    
    if (!status?.primaryMethod?.id) {
      console.error('No primary method ID found')
      toastNotify({ variant: 'error', title: 'No 2FA method found to disable' })
      return
    }

    try {
      setProcessing(true)
      console.log('Making DELETE request to:', `/api/auth/2fa/method/${status.primaryMethod.id}`)
      
      const response = await fetch(`/api/auth/2fa/method/${status.primaryMethod.id}`, {
        method: 'DELETE'
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        toastNotify({ variant: 'success', title: '2FA disabled successfully' })
        await loadTwoFactorStatus()
        setSetupStep('initial')
      } else {
        const error = await response.json()
        console.error('API Error:', error)
        alert({
          title: 'Failed to Disable 2FA',
          description: `Unable to disable 2FA: ${error.message}`,
          variant: 'error',
          buttons: [
            { label: 'Cancel', variant: 'outline', autoClose: true },
            { label: 'Try Again', variant: 'default', onClick: disableTwoFactor, autoClose: true }
          ]
        })
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      toastNotify({ variant: 'error', title: 'Error disabling 2FA' })
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = async (text: string, successMessage: string = 'Copied to clipboard') => {
    console.log('Attempting to copy text:', text)
    
    try {
      // First try the modern clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        console.log('Using modern clipboard API')
        await navigator.clipboard.writeText(text)
        
        // Verify it was actually copied by reading it back
        try {
          const clipboardText = await navigator.clipboard.readText()
          if (clipboardText === text) {
            console.log('Clipboard verified - copy successful')
            toastNotify({ variant: 'success', title: successMessage, showProgress: true })
            return true
          } else {
            console.log('Clipboard verification failed')
            throw new Error('Clipboard verification failed')
          }
        } catch (readError) {
          console.log('Cannot verify clipboard (permission issue), assuming success')
          toastNotify({ variant: 'success', title: successMessage, showProgress: true })
          return true
        }
      } else {
        console.log('Using fallback clipboard method')
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const result = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        console.log('execCommand result:', result)
        if (result) {
          toastNotify({ variant: 'success', title: successMessage, showProgress: true })
          return true
        } else {
          throw new Error('Copy command failed')
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      
      // Show the content in a dialog for manual copying
      dialog({
        title: 'Copy Failed - Manual Copy Required',
        description: 'Unable to copy to clipboard automatically. Please select and copy the text below:',
        variant: 'warning',
        size: 'lg',
        content: (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg border">
              <div className="font-mono text-sm whitespace-pre-wrap break-all select-all">
                {text}
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Select all the text above and use Ctrl+C (or Cmd+C on Mac) to copy.
              </AlertDescription>
            </Alert>
          </div>
        ),
        buttons: [
          { label: 'Done', variant: 'default', autoClose: true }
        ]
      })
      return false
    }
  }

  const copyBackupCodes = async () => {
    if (backupCodes.length === 0) return
    
    const codesText = backupCodes.join('\n')
    const success = await copyToClipboard(codesText, 'Backup codes copied to clipboard')
    if (success) {
      setCopiedCodes(true)
      setTimeout(() => setCopiedCodes(false), 2000)
    }
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
    toastNotify({ variant: 'success', title: 'Backup codes downloaded', showProgress: true })
  }

  const resetSetup = () => {
    setSetupStep('initial')
    setSetupData(null)
    setVerificationCode('')
    setBackupCodes([])
    setCopiedCodes(false)
  }

  const showBackupCodesDialog = () => {
    console.log('Backup codes for dialog:', backupCodes)
    
    dialog({
      title: 'Your Backup Codes',
      description: 'Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.',
      size: 'lg',
      variant: 'info',
      content: (
        <div className="space-y-4">
          {backupCodes.length > 0 ? (
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No backup codes available. Please try regenerating your codes or contact support.
              </p>
            </div>
          )}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Store these codes securely. Each code can only be used once.
            </AlertDescription>
          </Alert>
        </div>
      ),
             buttons: [
         { 
           label: 'Copy All Codes', 
           variant: 'outline', 
           icon: <Copy className="h-4 w-4" />,
           onClick: copyBackupCodes,
           autoClose: false
         },
         { 
           label: 'Download as File', 
           variant: 'outline', 
           icon: <Download className="h-4 w-4" />,
           onClick: downloadBackupCodes,
           autoClose: false
         },
         { 
           label: 'Close', 
           variant: 'default',
           autoClose: true
         }
       ]
    })
  }

  const generateNewBackupCodes = async () => {
    confirm({
      title: 'Generate New Backup Codes',
      description: 'This will invalidate your existing backup codes and generate new ones. Make sure you have saved your current codes before proceeding.',
      variant: 'warning',
      buttons: [
        { 
          label: 'Cancel', 
          variant: 'outline',
          autoClose: true
        },
        { 
          label: 'Generate New Codes', 
          variant: 'destructive',
          onClick: async () => {
            setProcessing(true)
            const loadingToast = createLoadingToast('Generating new backup codes...')
            
            try {
                             const response = await fetch('/api/auth/2fa/backup-codes', {
                 method: 'GET',
                 headers: {
                   'Content-Type': 'application/json',
                 }
               })

                             if (response.ok) {
                 const data = await response.json()
                 console.log('New backup codes generated:', data)
                 
                 if (data.codes && data.codes.length > 0) {
                   setBackupCodes(data.codes)
                   
                   // Smoothly transition to success toast
                   loadingToast.success('New backup codes generated!')
                   
                   // Show the new codes immediately
                   setTimeout(() => {
                     showBackupCodesDialog()
                   }, 500)
                 } else {
                   throw new Error('No backup codes received')
                 }
               } else {
                const error = await response.json()
                throw new Error(error.message || 'Failed to generate new backup codes')
              }
                         } catch (error) {
               console.error('Error generating backup codes:', error)
               const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
               
               // Smoothly transition to error toast
               loadingToast.error('Failed to generate backup codes', errorMessage)
               
               alert({
                 title: 'Failed to Generate New Backup Codes',
                 description: `Unable to generate new backup codes: ${errorMessage}`,
                 variant: 'error',
                 buttons: [
                   { label: 'Try Again', variant: 'default', onClick: generateNewBackupCodes, autoClose: true },
                   { label: 'Cancel', variant: 'outline', autoClose: true }
                 ]
               })
             } finally {
              setProcessing(false)
            }
          },
          autoClose: true
        }
      ]
    })
  }

  const confirmCancelSetup = () => {
    confirm({
      title: 'Cancel 2FA Setup',
      description: 'Are you sure you want to cancel the setup process? You will need to start over.',
      variant: 'warning',
      buttons: [
        { 
          label: 'Continue Setup', 
          variant: 'outline',
          autoClose: true
        },
        { 
          label: 'Yes, Cancel Setup', 
          variant: 'destructive',
          onClick: resetSetup,
          icon: <X className="h-4 w-4" />
        }
      ]
    })
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
                          onClick={() => copyToClipboard(setupData.secret!, 'Manual entry key copied to clipboard')}
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
                  <Button variant="outline" onClick={confirmCancelSetup} className="flex-1">
                    <X className="mr-2 h-4 w-4" />
                    Cancel Setup
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
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        Your backup codes have been generated successfully. Click below to view and save them.
                      </AlertDescription>
                    </Alert>
                    
                    <Button 
                      onClick={showBackupCodesDialog}
                      className="w-full"
                      variant="outline"
                    >
                      <Key className="mr-2 h-4 w-4" />
                      View & Save Backup Codes
                    </Button>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Button 
                variant="outline" 
                onClick={showBackupCodesDialog}
              >
                <Key className="mr-2 h-4 w-4" />
                View Backup Codes
              </Button>
              
              <Button 
                variant="outline" 
                onClick={generateNewBackupCodes}
              >
                <Key className="mr-2 h-4 w-4" />
                Generate New Codes
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={() => {
                  confirm({
                    title: 'Disable Two-Factor Authentication',
                    description: 'Are you sure you want to disable 2FA? This will make your account less secure and remove the extra layer of protection from your account.',
                    variant: 'critical',
                    buttons: [
                      { 
                        label: 'Keep 2FA Active', 
                        variant: 'outline',
                        autoClose: true
                      },
                      { 
                        label: 'Yes, Disable 2FA', 
                        variant: 'destructive', 
                        onClick: disableTwoFactor,
                        icon: <X className="h-4 w-4" />
                      }
                    ]
                  })
                }}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Disable 2FA
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 