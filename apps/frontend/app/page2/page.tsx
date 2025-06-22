'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, Bell, Palette } from 'lucide-react';

export default function Page2() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Page 2</h1>
      <p className="text-muted-foreground mb-8">
        Welcome to Page 2, {user?.name || 'User'}! This is another tenant-specific page.
      </p>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure your system preferences and settings.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto-save</span>
                <span className="text-sm font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Notifications</span>
                <span className="text-sm font-medium">On</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Theme</span>
                <span className="text-sm font-medium">Dark</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your security settings and permissions.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Two-factor auth</span>
                <span className="text-sm font-medium">Disabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Session timeout</span>
                <span className="text-sm font-medium">1 hour</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Password expiry</span>
                <span className="text-sm font-medium">90 days</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure your notification preferences.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email alerts</span>
                <span className="text-sm font-medium">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Push notifications</span>
                <span className="text-sm font-medium">Disabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Weekly reports</span>
                <span className="text-sm font-medium">Enabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the appearance of your interface.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Color scheme</span>
                <span className="text-sm font-medium">Blue</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Font size</span>
                <span className="text-sm font-medium">Medium</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Compact mode</span>
                <span className="text-sm font-medium">Off</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 