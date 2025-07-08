"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Shield, 
  User, 
  Bell, 
  Settings, 
  QrCode,
  Key,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Info
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TwoFactorSettings } from "@/components/features/TwoFactorSettings"

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState("security")

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your platform configuration and security settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Overview
              </CardTitle>
              <CardDescription>
                Manage your platform's security settings and authentication methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Two-Factor Auth</p>
                      <p className="text-sm text-muted-foreground">Enhanced security</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Setup Required</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Session Security</p>
                      <p className="text-sm text-muted-foreground">Active monitoring</p>
                    </div>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Access Logs</p>
                      <p className="text-sm text-muted-foreground">Activity tracking</p>
                    </div>
                  </div>
                  <Badge variant="outline">Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <TwoFactorSettings />

          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>
                Configure password requirements for platform users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="min-length">Minimum Password Length</Label>
                <Input 
                  id="min-length" 
                  type="number" 
                  value="12" 
                  disabled
                  className="w-24"
                />
                <p className="text-sm text-muted-foreground">
                  Current: 12 characters minimum
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-uppercase">Require uppercase letters</Label>
                  <Switch id="require-uppercase" checked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-numbers">Require numbers</Label>
                  <Switch id="require-numbers" checked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-symbols">Require special characters</Label>
                  <Switch id="require-symbols" checked disabled />
                </div>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Password policy settings are currently read-only. Contact system administrator for changes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>
                Control session behavior and timeout settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input 
                  id="session-timeout" 
                  type="number" 
                  value="60" 
                  disabled
                  className="w-24"
                />
                <p className="text-sm text-muted-foreground">
                  Sessions expire after 60 minutes of inactivity
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="remember-me">Allow "Remember Me" option</Label>
                  <Switch id="remember-me" checked disabled />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="concurrent-sessions">Allow concurrent sessions</Label>
                  <Switch id="concurrent-sessions" checked disabled />
                </div>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Session management settings are currently read-only. These will be configurable in a future update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your platform account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Account settings are coming soon. This section will include profile management, API keys, and platform preferences.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you receive platform notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Notification settings are coming soon. This section will include email alerts, security notifications, and system updates.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Advanced platform configuration and system settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Advanced settings are coming soon. This section will include system configuration, database settings, and integration management.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 