'use client';

import React, { useState, useEffect } from 'react';
import { AdvancedOpenAPIRenderer } from './AdvancedOpenAPIRenderer';

interface OpenAPILoaderProps {
  spec: string;
  className?: string;
}

export function OpenAPILoader({ spec, className = '' }: OpenAPILoaderProps) {
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSpec = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Handle both relative paths and full URLs
        const specUrl = spec.startsWith('http') ? spec : `${window.location.origin}${spec}`;
        
        const response = await fetch(specUrl);
        if (!response.ok) {
          throw new Error(`Failed to load OpenAPI spec: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setOpenApiSpec(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load OpenAPI specification');
        console.error('Error loading OpenAPI spec:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSpec();
  }, [spec]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading API documentation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <h3 className="text-red-800 font-semibold mb-2">Error Loading API Documentation</h3>
        <p className="text-red-700">{error}</p>
        <p className="text-sm text-red-600 mt-2">
          Please ensure the OpenAPI specification is available at: <code>{spec}</code>
        </p>
      </div>
    );
  }

  if (!openApiSpec) {
    return (
      <div className={`p-6 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <p className="text-gray-600">No API specification available.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <AdvancedOpenAPIRenderer spec={openApiSpec} />
    </div>
  );
} 