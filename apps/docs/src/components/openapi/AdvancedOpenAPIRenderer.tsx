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
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
}

interface AdvancedOpenAPIRendererProps {
  spec: OpenAPISpec;
  className?: string;
}

export function AdvancedOpenAPIRenderer({ spec, className = '' }: AdvancedOpenAPIRendererProps) {
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [requestBody, setRequestBody] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedServer, setSelectedServer] = useState(spec.servers[0]?.url || '');
  const [authToken, setAuthToken] = useState('');
  const [activeTab, setActiveTab] = useState<'try' | 'code'>('try');
  const [selectedLanguage, setSelectedLanguage] = useState('curl');

  const languages = [
    { id: 'curl', name: 'cURL', icon: '🌐' },
    { id: 'javascript', name: 'JavaScript', icon: '🟨' },
    { id: 'typescript', name: 'TypeScript', icon: '🔷' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'php', name: 'PHP', icon: '🐘' },
    { id: 'go', name: 'Go', icon: '🐹' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'csharp', name: 'C#', icon: '💜' },
  ];

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-blue-500 text-white',
      POST: 'bg-green-500 text-white',
      PUT: 'bg-yellow-500 text-white',
      DELETE: 'bg-red-500 text-white',
      PATCH: 'bg-purple-500 text-white',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-500 text-white';
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

      // Add authentication
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Add header parameters
      Object.entries(parameters).forEach(([key, value]) => {
        if (value && operationData.parameters?.some((p: any) => p.name === key && p.in === 'header')) {
          headers[key] = value;
        }
      });

      const config: RequestInit = {
        method: method.toUpperCase(),
        headers,
        mode: 'cors',
      };

      const hasBody = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && Boolean(requestBody);

      if (hasBody) {
        config.body = requestBody;
      }

      const response = await fetch(url.toString(), config);
      const data = await response.json();
      
      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCodeSample = (path: string, method: string, operationData: any, language: string) => {
    const url = new URL(path, selectedServer);
    
    // Add query parameters to URL
    Object.entries(parameters).forEach(([key, value]) => {
      if (value && operationData.parameters?.some((p: any) => p.name === key && p.in === 'query')) {
        url.searchParams.append(key, String(value));
      }
    });

    const hasBody = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && Boolean(requestBody);

    switch (language) {
      case 'curl':
        return generateCurlCode(url.toString(), method, hasBody);
      case 'javascript':
        return generateJavaScriptCode(url.toString(), method, hasBody);
      case 'typescript':
        return generateTypeScriptCode(url.toString(), method, hasBody);
      case 'python':
        return generatePythonCode(url.toString(), method, hasBody);
      case 'php':
        return generatePHPCode(url.toString(), method, hasBody);
      case 'go':
        return generateGoCode(url.toString(), method, hasBody);
      case 'java':
        return generateJavaCode(url.toString(), method, hasBody);
      case 'csharp':
        return generateCSharpCode(url.toString(), method, hasBody);
      default:
        return generateCurlCode(url.toString(), method, hasBody);
    }
  };

  const generateCurlCode = (url: string, method: string, hasBody: boolean) => {
    let code = `curl -X ${method.toUpperCase()} "${url}"`;
    
    if (authToken) {
      code += ` \\\n  -H "Authorization: Bearer ${authToken}"`;
    }
    
    if (hasBody) {
      code += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'`;
    }
    
    return code;
  };

  const generateJavaScriptCode = (url: string, method: string, hasBody: boolean) => {
    const headers = ['\'Content-Type\': \'application/json\''];
    if (authToken) {
      headers.push(`'Authorization': 'Bearer ${authToken}'`);
    }

    return `fetch('${url}', {
  method: '${method.toUpperCase()}',
  headers: {
    ${headers.join(',\n    ')}
  },${hasBody ? `\n  body: JSON.stringify(${requestBody}),` : ''}
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`;
  };

  const generateTypeScriptCode = (url: string, method: string, hasBody: boolean) => {
    const headers = ['\'Content-Type\': \'application/json\''];
    if (authToken) {
      headers.push(`'Authorization': 'Bearer ${authToken}'`);
    }

    return `interface ApiResponse {
  // Define your response type here
  [key: string]: any;
}

const fetchData = async (): Promise<ApiResponse> => {
  try {
    const response = await fetch('${url}', {
      method: '${method.toUpperCase()}',
      headers: {
        ${headers.join(',\n        ')}
      },${hasBody ? `\n      body: JSON.stringify(${requestBody}),` : ''}
    });
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

fetchData().then(data => console.log(data));`;
  };

  const generatePythonCode = (url: string, method: string, hasBody: boolean) => {
    const headersArray = ['\'Content-Type\': \'application/json\''];
    if (authToken) {
      headersArray.push(`'Authorization': 'Bearer ${authToken}'`);
    }

    return `import requests
import json

url = '${url}'
headers = {
    ${headersArray.join(',\n    ')}
}
${hasBody ? `\ndata = json.dumps(${requestBody})` : ''}

try:
    response = requests.${method.toLowerCase()}(url, headers=headers${hasBody ? ', data=data' : ''})
    response.raise_for_status()
    print(response.json())
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")`;
  };

  const generatePHPCode = (url: string, method: string, hasBody: boolean) => {
    const headersArray = ['\'Content-Type: application/json\''];
    if (authToken) {
      headersArray.push(`'Authorization: Bearer ${authToken}'`);
    }

    return `<?php
$url = '${url}';
$headers = [
    ${headersArray.map(h => `    ${h}`).join(',\n')}
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method.toUpperCase()}');
${hasBody ? `curl_setopt($ch, CURLOPT_POSTFIELDS, '${requestBody}');` : ''}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    echo 'cURL Error: ' . curl_error($ch);
} else {
    echo 'HTTP Code: ' . $httpCode . "\\n";
    echo 'Response: ' . $response;
}
?>`;
  };

  const generateGoCode = (url: string, method: string, hasBody: boolean) => {
    return `package main

import (
    "fmt"
    "io"
    "net/http"
    ${hasBody ? '"strings"' : ''}
    ${authToken ? '"" // Add required imports' : ''}
)

func main() {
    url := "${url}"
    method := "${method.toUpperCase()}"
    
    ${hasBody ? `payload := strings.NewReader(\`${requestBody}\`)` : 'var payload io.Reader'}
    
    client := &http.Client{}
    req, err := http.NewRequest(method, url, payload)
    if err != nil {
        fmt.Println(err)
        return
    }
    
    req.Header.Add("Content-Type", "application/json")
    ${authToken ? `req.Header.Add("Authorization", "Bearer ${authToken}")` : ''}
    
    res, err := client.Do(req)
    if err != nil {
        fmt.Println(err)
        return
    }
    defer res.Body.Close()
    
    body, err := io.ReadAll(res.Body)
    if err != nil {
        fmt.Println(err)
        return
    }
    
    fmt.Println(string(body))
}`;
  };

  const generateJavaCode = (url: string, method: string, hasBody: boolean) => {
    return `import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class ApiClient {
    public static void main(String[] args) {
        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
            
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create("${url}"))
                .header("Content-Type", "application/json")
                ${authToken ? `.header("Authorization", "Bearer ${authToken}")` : ''}
                .${method.toUpperCase()}(${hasBody ? `HttpRequest.BodyPublishers.ofString("${requestBody}")` : 'HttpRequest.BodyPublishers.noBody()'});
            
            HttpRequest request = requestBuilder.build();
            
            HttpResponse<String> response = client.send(request, 
                HttpResponse.BodyHandlers.ofString());
            
            System.out.println("Status Code: " + response.statusCode());
            System.out.println("Response: " + response.body());
            
        } catch (IOException | InterruptedException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}`;
  };

  const generateCSharpCode = (url: string, method: string, hasBody: boolean) => {
    return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program
{
    private static readonly HttpClient client = new HttpClient();
    
    static async Task Main(string[] args)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.${method.charAt(0).toUpperCase() + method.slice(1).toLowerCase()}, "${url}");
            request.Headers.Add("Content-Type", "application/json");
            ${authToken ? `request.Headers.Add("Authorization", "Bearer ${authToken}");` : ''}
            
            ${hasBody ? `request.Content = new StringContent("${requestBody}", Encoding.UTF8, "application/json");` : ''}
            
            HttpResponseMessage response = await client.SendAsync(request);
            string responseBody = await response.Content.ReadAsStringAsync();
            
            Console.WriteLine($"Status Code: {response.StatusCode}");
            Console.WriteLine($"Response: {responseBody}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}`;
  };

  const renderParameter = (param: any) => {
    const paramKey = `${param.in}-${param.name}`;
    
    return (
      <div key={paramKey} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="md:col-span-1">
          <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            {param.name}
            {param.required && <span className="text-red-500 text-xs">★</span>}
          </label>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
              {param.in}
            </span>
            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
              {param.schema?.type || 'string'}
            </span>
          </div>
          {param.description && (
            <p className="text-xs text-gray-600 mt-2">{param.description}</p>
          )}
        </div>
        
        <div className="md:col-span-3">
          {param.schema?.enum ? (
            <select
              value={parameters[param.name] || ''}
              onChange={(e) => setParameters(prev => ({ ...prev, [param.name]: e.target.value }))}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
      <div className="space-y-4">
        <label className="text-sm font-semibold text-gray-800">Request Body</label>
        <textarea
          value={requestBody}
          onChange={(e) => setRequestBody(e.target.value)}
          placeholder={JSON.stringify(exampleData, null, 2)}
          className="w-full p-3 border rounded-lg font-mono text-sm min-h-[200px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

    const statusColor = response.status < 400 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';

    return (
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Response</h4>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
            {response.status} {response.statusText}
          </span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Response Body</h5>
            <CodeBlock language="json" code={JSON.stringify(response.data, null, 2)} />
          </div>
          
          <div>
            <h5 className="font-medium text-gray-700 mb-2">Response Headers</h5>
            <CodeBlock language="json" code={JSON.stringify(response.headers, null, 2)} />
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          Response received at: {new Date(response.timestamp).toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Enhanced API Info Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">{spec.info.title}</h2>
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              v{spec.info.version}
            </span>
          </div>
        </div>
        <p className="text-gray-700 mb-6">{spec.info.description}</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Base URL</label>
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {spec.servers.map((server) => (
                <option key={server.url} value={server.url}>
                  {server.url} - {server.description}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Authentication Token (Optional)</label>
            <input
              type="password"
              placeholder="Enter your JWT token"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Enhanced API Endpoints */}
      <div className="space-y-6">
        {Object.entries(spec.paths).map(([path, pathData]) => (
          <div key={path} className="space-y-4">
            {Object.entries(pathData as Record<string, any>).map(([method, operationData]) => (
              <div key={`${path}-${method}`} className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setActiveEndpoint(activeEndpoint === `${path}-${method}` ? null : `${path}-${method}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-2 rounded-lg text-sm font-bold ${getMethodColor(method.toUpperCase())}`}>
                        {method.toUpperCase()}
                      </span>
                      <code className="font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg border">
                        {path}
                      </code>
                      <span className="text-sm text-gray-600 font-medium">
                        {operationData.summary}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {operationData.security && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          🔐 Auth Required
                        </span>
                      )}
                      <span className="text-gray-400 text-xl">
                        {activeEndpoint === `${path}-${method}` ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {activeEndpoint === `${path}-${method}` && (
                  <div className="border-t bg-gray-50">
                    {operationData.description && (
                      <div className="p-6 border-b bg-blue-50">
                        <p className="text-sm text-gray-700">{operationData.description}</p>
                      </div>
                    )}
                    
                    {/* Enhanced Tab Navigation */}
                    <div className="p-6">
                      <div className="flex border-b mb-6">
                        <button
                          onClick={() => setActiveTab('try')}
                          className={`px-6 py-3 font-medium text-sm rounded-t-lg ${
                            activeTab === 'try'
                              ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          🚀 Try it out
                        </button>
                        <button
                          onClick={() => setActiveTab('code')}
                          className={`px-6 py-3 font-medium text-sm rounded-t-lg ${
                            activeTab === 'code'
                              ? 'bg-blue-500 text-white border-b-2 border-blue-500'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          💻 Code samples
                        </button>
                      </div>
                      
                      {activeTab === 'try' && (
                        <div className="space-y-6">
                          {/* Parameters */}
                          {operationData.parameters && operationData.parameters.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                📝 Parameters
                              </h4>
                              <div className="space-y-3">
                                {operationData.parameters.map(renderParameter)}
                              </div>
                            </div>
                          )}
                          
                          {/* Request Body */}
                          {operationData.requestBody && renderRequestBody(operationData.requestBody)}
                          
                          {/* Execute Button */}
                          <button
                            onClick={() => executeRequest(path, method, operationData)}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                          >
                            {loading ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                Executing...
                              </>
                            ) : (
                              <>
                                <span>🚀</span>
                                Execute Request
                              </>
                            )}
                          </button>
                          
                          {/* Response */}
                          {renderResponse()}
                        </div>
                      )}
                      
                      {activeTab === 'code' && (
                        <div className="space-y-6">
                          {/* Language Selector */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Choose Language</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {languages.map((lang) => (
                                <button
                                  key={lang.id}
                                  onClick={() => setSelectedLanguage(lang.id)}
                                  className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 ${
                                    selectedLanguage === lang.id
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <span>{lang.icon}</span>
                                  {lang.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Code Sample */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-3">
                              {languages.find(l => l.id === selectedLanguage)?.name} Code Sample
                            </h4>
                            <CodeBlock 
                              language={selectedLanguage} 
                              code={generateCodeSample(path, method, operationData, selectedLanguage)} 
                            />
                          </div>
                        </div>
                      )}
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