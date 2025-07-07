'use client';

import React, { useState } from 'react';

interface CodeBlockProps {
  language: string;
  code: string;
  className?: string;
}

export function CodeBlock({ language, code, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`relative group ${className}`}>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
      
      <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
} 