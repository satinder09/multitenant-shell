'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Shield, Bell, Palette, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Page2() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Welcome to Analytics, {user?.name || 'User'}! Monitor your tenant performance.
          </p>
        </div>
        <Button size="sm">
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">System Settings</CardTitle>
                <CardDescription>Configure your system preferences</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto-save</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Notifications</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  On
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Theme</span>
                <Badge variant="outline">Dark</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Language</span>
                <Badge variant="outline">English</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription>Manage security settings and permissions</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Two-factor auth</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Disabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Session timeout</span>
                <Badge variant="outline">1 hour</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Password expiry</span>
                <Badge variant="outline">90 days</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Login attempts</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  5 max
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Configure notification preferences</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email alerts</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Push notifications</span>
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  Disabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Weekly reports</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Real-time alerts</span>
                <Badge variant="outline">Custom</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize interface appearance</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Color scheme</span>
                <Badge variant="outline">Blue</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Font size</span>
                <Badge variant="outline">Medium</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Compact mode</span>
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  Off
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sidebar position</span>
                <Badge variant="outline">Left</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Usage Statistics</CardTitle>
              <CardDescription>Your tenant usage overview</CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage used</span>
                <span className="text-sm font-medium">2.4 GB / 10 GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API calls this month</span>
                <span className="text-sm font-medium">12,450</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active sessions</span>
                <span className="text-sm font-medium">8</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Performance</CardTitle>
              <CardDescription>System performance metrics</CardDescription>
            </div>
            <Badge variant="secondary">Live</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Response time</span>
                <span className="text-sm font-medium text-green-600">125ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-medium text-green-600">99.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Error rate</span>
                <span className="text-sm font-medium text-green-600">0.01%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 