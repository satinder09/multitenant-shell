'use client';

import React, { useState, useEffect } from 'react';
import { CodeBlock } from '@/components/ui/code-block';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, any>;
}

interface SimpleOpenAPIRendererProps {
  spec: OpenAPISpec;
  className?: string;
}

export function SimpleOpenAPIRenderer({ spec, className = '' }: SimpleOpenAPIRendererProps) {
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState(spec.servers[0]?.url || '');

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-800 border-blue-300',
      POST: 'bg-green-100 text-green-800 border-green-300',
      PUT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      DELETE: 'bg-red-100 text-red-800 border-red-300',
      PATCH: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const executeRequest = async (path: string, method: string, operationData: any) => {
    setLoading(true);
    try {
      const url = new URL(path, selectedServer);
      
      // Add query parameters
      Object.entries(parameters).forEach(([key, value]) => {
        if (value && operationData.parameters?.some((p: any) => p.name === key && p.in === 'query')) {
          url.searchParams.append(key, value);
        }
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const config: RequestInit = {
        method: method.toUpperCase(),
        headers,
        mode: 'cors',
      };

      if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && requestBody) {
        config.body = requestBody;
      }

      const response = await fetch(url.toString(), config);
      const data = await response.json();
      
      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
      });
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    } finally {
      setLoading(false);
    }
  };

  const renderParameter = (param: any) => {
    const paramKey = `${param.in}-${param.name}`;
    
    return (
      <div key={paramKey} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-gray-50">
        <div>
          <label className="text-sm font-medium text-gray-700">
            {param.name}
            {param.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="mt-1">
            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
              {param.in}
            </span>
          </div>
          {param.description && (
            <p className="text-sm text-gray-600 mt-1">{param.description}</p>
          )}
        </div>
        
        <div className="md:col-span-2">
          {param.schema?.enum ? (
            <select
              value={parameters[param.name] || ''}
              onChange={(e) => setParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select value</option>
              {param.schema.enum.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type={param.schema?.type === 'integer' ? 'number' : 'text'}
              placeholder={param.example || `Enter ${param.name}`}
              value={parameters[param.name] || ''}
              onChange={(e) => setParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
              className="w-full p-2 border rounded-md"
            />
          )}
        </div>
      </div>
    );
  };

  const renderRequestBody = (requestBodySchema: any) => {
    if (!requestBodySchema) return null;

    const jsonSchema = requestBodySchema.content?.['application/json']?.schema;
    if (!jsonSchema) return null;

    const exampleData = jsonSchema.example || generateExample(jsonSchema);

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Request Body</label>
        <textarea
          value={requestBody}
          onChange={(e) => setRequestBody(e.target.value)}
          placeholder={JSON.stringify(exampleData, null, 2)}
          className="w-full p-2 border rounded-md font-mono text-sm min-h-[200px]"
        />
      </div>
    );
  };

  const generateExample = (schema: any): any => {
    if (!schema) return {};
    
    if (schema.type === 'object' && schema.properties) {
      const example: Record<string, any> = {};
      Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
        if (prop.example !== undefined) {
          example[key] = prop.example;
        } else if (prop.type === 'string') {
          example[key] = prop.enum?.[0] || `sample-${key}`;
        } else if (prop.type === 'number' || prop.type === 'integer') {
          example[key] = 1;
        } else if (prop.type === 'boolean') {
          example[key] = true;
        }
      });
      return example;
    }
    
    return {};
  };

  const renderResponse = () => {
    if (!response) return null;

    const statusColor = response.status < 400 ? 'text-green-600' : 'text-red-600';

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${statusColor}`}>
            {response.status} {response.statusText}
          </span>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Response Body</h4>
            <CodeBlock language="json" code={JSON.stringify(response.data, null, 2)} />
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Response Headers</h4>
            <CodeBlock language="json" code={JSON.stringify(response.headers, null, 2)} />
          </div>
        </div>
      </div>
    );
  };

  const generateCurlCommand = (path: string, method: string) => {
    const url = new URL(path, selectedServer);
    Object.entries(parameters).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });

    let command = `curl -X ${method.toUpperCase()} "${url.toString()}"`;
    
    if (requestBody) {
      command += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'`;
    }
    
    return command;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* API Info */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-semibold">{spec.info.title}</h2>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
            {spec.info.version}
          </span>
        </div>
        <p className="text-gray-600 mb-4">{spec.info.description}</p>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Base URL</label>
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            {spec.servers.map((server) => (
              <option key={server.url} value={server.url}>
                {server.url} - {server.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* API Endpoints */}
      <div className="space-y-4">
        {Object.entries(spec.paths).map(([path, pathData]) => (
          <div key={path} className="space-y-2">
            {Object.entries(pathData as Record<string, any>).map(([method, operationData]) => (
              <div key={`${path}-${method}`} className="bg-white rounded-lg border shadow-sm">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setActiveEndpoint(activeEndpoint === `${path}-${method}` ? null : `${path}-${method}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getMethodColor(method.toUpperCase())}`}>
                        {method.toUpperCase()}
                      </span>
                      <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {path}
                      </code>
                      <span className="text-sm text-gray-600">
                        {operationData.summary}
                      </span>
                    </div>
                    <span className="text-gray-400">
                      {activeEndpoint === `${path}-${method}` ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
                
                {activeEndpoint === `${path}-${method}` && (
                  <div className="p-4 border-t bg-gray-50">
                    {operationData.description && (
                      <p className="text-sm text-gray-600 mb-4">
                        {operationData.description}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Try It Out */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Try it out</h4>
                        
                        {/* Parameters */}
                        {operationData.parameters && operationData.parameters.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="font-medium text-gray-700">Parameters</h5>
                            {operationData.parameters.map(renderParameter)}
                          </div>
                        )}
                        
                        {/* Request Body */}
                        {operationData.requestBody && renderRequestBody(operationData.requestBody)}
                        
                        {/* Execute Button */}
                        <button
                          onClick={() => executeRequest(path, method, operationData)}
                          disabled={loading}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {loading ? 'Loading...' : '▶ Execute'}
                        </button>
                        
                        {/* Response */}
                        {renderResponse()}
                      </div>
                      
                      {/* Right Column - Code Samples */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Code Sample</h4>
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">cURL</h5>
                          <CodeBlock language="bash" code={generateCurlCommand(path, method)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 