'use client';

import { useState, useEffect } from 'react';
import { usePlatform } from '@/context/PlatformContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PlatformPermissionsPage() {
  const { isPlatform } = usePlatform();
  const [permissions, setPermissions] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPlatform) return;
    
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/platform-rbac/permissions');
        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }
        const data = await response.json();
        setPermissions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [isPlatform]);

  if (!isPlatform) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">This page is only accessible from the platform domain.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading permissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Platform Permissions</h1>
        <Button>Add Permission</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Permissions List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {permissions.map((permission) => (
              <div key={permission.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <h3 className="font-medium">{permission.name}</h3>
                  <p className="text-sm text-gray-600">{permission.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="destructive" size="sm">Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 