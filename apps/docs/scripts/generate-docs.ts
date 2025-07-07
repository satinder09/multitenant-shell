#!/usr/bin/env node

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { domainManager } from '../src/config/domain-manager';

/**
 * Documentation Generator
 * 
 * Automatically generates documentation files from domain configuration
 */
class DocumentationGenerator {
  private outputDir: string;
  private domain: any;
  
  constructor(outputDir: string = 'content') {
    this.outputDir = outputDir;
    this.domain = domainManager.getCurrentDomain();
  }
  
  /**
   * Generate all documentation
   */
  async generate(): Promise<void> {
    console.log(`🚀 Generating documentation for: ${this.domain.branding.name}`);
    
    // Create output directory
    this.ensureDirectory(this.outputDir);
    
    // Generate different types of documentation
    await this.generateHomepage();
    await this.generateGettingStarted();
    await this.generateFeatures();
    await this.generateApiDocs();
    await this.generateIntegrations();
    await this.generateNavigation();
    
    console.log('✅ Documentation generation completed!');
  }
  
  /**
   * Generate homepage content
   */
  private async generateHomepage(): Promise<void> {
    const homepage = this.domain.content.homepage;
    
    const content = `---
title: ${homepage.hero.title}
description: ${homepage.hero.subtitle}
---

# ${homepage.hero.title}

${homepage.hero.subtitle}

<Cards>
  <Card title="🚀 Quick Start" href="${homepage.hero.ctaHref}">
    Get up and running in minutes
  </Card>
  <Card title="📚 Features" href="/docs/features">
    Explore what ${this.domain.branding.name} can do
  </Card>
  <Card title="🔌 API Reference" href="/docs/api">
    Complete API documentation
  </Card>
  <Card title="🛠️ Integrations" href="/docs/integrations">
    Connect with third-party services
  </Card>
</Cards>

## ${homepage.quickStart.title}

${homepage.quickStart.description}

${homepage.quickStart.steps.map((step: any, index: number) => `
### ${index + 1}. ${step.title}

${step.description}

[Learn more](${step.href})
`).join('\n')}

## What's Next?

- [Browse Features](/docs/features) - Discover all available functionality
- [API Reference](/docs/api) - Integrate with your applications
- [Tutorials](/docs/tutorials) - Step-by-step guides
- [Support](/docs/support) - Get help when you need it
`;
    
    this.writeFile('index.mdx', content);
  }
  
  /**
   * Generate getting started guides
   */
  private async generateGettingStarted(): Promise<void> {
    const gettingStartedDir = join(this.outputDir, 'getting-started');
    this.ensureDirectory(gettingStartedDir);
    
    // Quick start guide
    const quickStartContent = `---
title: Quick Start
description: Get up and running with ${this.domain.branding.name} in minutes
---

# Quick Start

Welcome to ${this.domain.branding.name}! This guide will help you get started quickly.

## Prerequisites

- Modern web browser
- Basic understanding of business applications

## Step 1: Account Setup

1. Visit [${this.domain.branding.domain}](https://${this.domain.branding.domain})
2. Click "Sign Up" to create your account
3. Verify your email address
4. Complete your profile

## Step 2: Initial Configuration

1. Set up your organization profile
2. Configure basic settings
3. Invite team members (optional)

## Step 3: First Actions

1. Explore the dashboard
2. Create your first item
3. Try the core features

## What's Next?

- [Configuration Guide](/docs/getting-started/configuration)
- [Feature Overview](/docs/features)
- [API Integration](/docs/api)
`;
    
    this.writeFile(join('getting-started', 'index.mdx'), quickStartContent);
    
    // Configuration guide
    const configContent = `---
title: Configuration
description: Configure ${this.domain.branding.name} for your needs
---

# Configuration

Learn how to configure ${this.domain.branding.name} to match your workflow.

## Basic Settings

### Organization Profile
- Company name and details
- Branding and appearance
- Contact information

### User Management
- User roles and permissions
- Team organization
- Access controls

### Feature Configuration
- Enable/disable features
- Customize workflows
- Set up automation

## Advanced Settings

### API Configuration
- API keys and authentication
- Rate limiting
- Webhook setup

### Integrations
- Third-party service connections
- Data synchronization
- Custom integrations

## Next Steps

- [First Steps](/docs/getting-started/first-steps)
- [Feature Guide](/docs/features)
- [API Reference](/docs/api)
`;
    
    this.writeFile(join('getting-started', 'configuration.mdx'), configContent);
  }
  
  /**
   * Generate feature documentation
   */
  private async generateFeatures(): Promise<void> {
    const featuresDir = join(this.outputDir, 'features');
    this.ensureDirectory(featuresDir);
    
    const featureDocs = domainManager.generateFeatureDocs();
    
    // Main features page
    const mainContent = `---
title: Features
description: Explore all ${this.domain.branding.name} features
---

# Features

${this.domain.branding.name} offers a comprehensive set of features to streamline your business operations.

## Feature Categories

${Object.entries(featureDocs.categories).map(([category, features]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)} Features

${(features as any[]).map(feature => `
- **[${feature.title}](${feature.href})** - ${feature.description}
`).join('')}
`).join('\n')}

## All Features

<Cards>
${featureDocs.features.map(feature => `
  <Card title="${feature.title}" href="${feature.href}">
    ${feature.description}
    <div className="text-sm text-gray-600 mt-2">
      Plan: ${feature.plan}
    </div>
  </Card>
`).join('')}
</Cards>
`;
    
    this.writeFile(join('features', 'index.mdx'), mainContent);
    
    // Individual feature pages
    for (const [category, features] of Object.entries(featureDocs.categories)) {
      const categoryContent = `---
title: ${category.charAt(0).toUpperCase() + category.slice(1)} Features
description: ${category} features in ${this.domain.branding.name}
---

# ${category.charAt(0).toUpperCase() + category.slice(1)} Features

${(features as any[]).map(feature => `
## ${feature.title}

${feature.description}

**Plan Required:** ${feature.plan}

[Learn more](${feature.href})
`).join('\n')}
`;
      
      this.writeFile(join('features', `${category}.mdx`), categoryContent);
    }
  }
  
  /**
   * Generate API documentation
   */
  private async generateApiDocs(): Promise<void> {
    const apiDir = join(this.outputDir, 'api');
    this.ensureDirectory(apiDir);
    
    const apiDocs = domainManager.generateApiDocs();
    
    // Main API page
    const mainContent = `---
title: API Reference
description: Complete API documentation for ${this.domain.branding.name}
---

# API Reference

The ${this.domain.branding.name} API provides programmatic access to all features.

## Base URL

\`\`\`
${apiDocs.baseUrl}
\`\`\`

## Authentication

${apiDocs.authentication.description}

### Usage

\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" \\
  ${apiDocs.baseUrl}/endpoint
\`\`\`

## Endpoints by Category

${Object.entries(apiDocs.categories).map(([category, endpoints]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)}

${(endpoints as any[]).map(endpoint => `
#### ${endpoint.name}

\`${endpoint.method} ${endpoint.path}\`

${endpoint.description}

${endpoint.requiresAuth ? '🔒 **Authentication required**' : '🌐 **Public endpoint**'}

[View details](/docs/api/${category}#${endpoint.name.toLowerCase().replace(/\s+/g, '-')})
`).join('\n')}
`).join('\n')}

## Quick Examples

### Get Items

\`\`\`bash
curl -X GET "${apiDocs.baseUrl}/items" \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Create Item

\`\`\`bash
curl -X POST "${apiDocs.baseUrl}/items" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "New Item", "description": "Item description"}'
\`\`\`
`;
    
    this.writeFile(join('api', 'index.mdx'), mainContent);
    
    // Category-specific API pages
    for (const [category, endpoints] of Object.entries(apiDocs.categories)) {
      const categoryContent = `---
title: ${category.charAt(0).toUpperCase() + category.slice(1)} API
description: ${category} endpoints in ${this.domain.branding.name}
---

# ${category.charAt(0).toUpperCase() + category.slice(1)} API

${(endpoints as any[]).map(endpoint => `
## ${endpoint.name}

\`${endpoint.method} ${endpoint.path}\`

${endpoint.description}

${endpoint.requiresAuth ? '### Authentication Required\n\nThis endpoint requires a valid JWT token.' : '### Public Endpoint\n\nThis endpoint does not require authentication.'}

### Example Request

\`\`\`bash
curl -X ${endpoint.method} "${apiDocs.baseUrl}${endpoint.path}" \\
  ${endpoint.requiresAuth ? '-H "Authorization: Bearer YOUR_TOKEN" \\' : ''}
  -H "Content-Type: application/json"
\`\`\`

### Response

\`\`\`json
{
  "status": "success",
  "data": {}
}
\`\`\`
`).join('\n')}
`;
      
      this.writeFile(join('api', `${category}.mdx`), categoryContent);
    }
  }
  
  /**
   * Generate integration documentation
   */
  private async generateIntegrations(): Promise<void> {
    const integrationsDir = join(this.outputDir, 'integrations');
    this.ensureDirectory(integrationsDir);
    
    const integrationDocs = domainManager.generateIntegrationDocs();
    
    // Main integrations page
    const mainContent = `---
title: Integrations
description: Connect ${this.domain.branding.name} with third-party services
---

# Integrations

${this.domain.branding.name} integrates with popular services to enhance your workflow.

## Available Integrations

${Object.entries(integrationDocs.categories).map(([category, integrations]) => `
### ${category.charAt(0).toUpperCase() + category.slice(1)}

${(integrations as any[]).map(integration => `
- **[${integration.name}](${integration.href})** - ${integration.description}
  - Complexity: ${integration.complexity}
`).join('')}
`).join('\n')}

## Integration Guides

<Cards>
${integrationDocs.integrations.map(integration => `
  <Card title="${integration.name}" href="${integration.href}">
    ${integration.description}
    <div className="text-sm text-gray-600 mt-2">
      Difficulty: ${integration.complexity}
    </div>
  </Card>
`).join('')}
</Cards>
`;
    
    this.writeFile(join('integrations', 'index.mdx'), mainContent);
    
    // Individual integration pages
    for (const integration of integrationDocs.integrations) {
      const integrationContent = `---
title: ${integration.name} Integration
description: Connect ${this.domain.branding.name} with ${integration.name}
---

# ${integration.name} Integration

${integration.description}

## Overview

This integration allows ${this.domain.branding.name} to connect with ${integration.name} for enhanced functionality.

**Complexity:** ${integration.complexity}

## Setup Guide

### Prerequisites

- Active ${integration.name} account
- Admin access to ${this.domain.branding.name}
- API credentials from ${integration.name}

### Step 1: Get API Credentials

1. Log into your ${integration.name} account
2. Navigate to API settings
3. Create new API credentials
4. Copy the API key and secret

### Step 2: Configure Integration

1. Go to Settings > Integrations in ${this.domain.branding.name}
2. Find ${integration.name} in the list
3. Click "Connect"
4. Enter your API credentials
5. Test the connection

### Step 3: Configure Sync Settings

1. Choose what data to sync
2. Set sync frequency
3. Configure field mappings
4. Enable the integration

## Features

- Real-time data synchronization
- Automatic field mapping
- Error handling and retry logic
- Detailed sync logs

## Troubleshooting

### Common Issues

1. **Connection Failed** - Check API credentials
2. **Sync Errors** - Review field mappings
3. **Rate Limits** - Adjust sync frequency

### Support

Need help? [Contact Support](/docs/support)
`;
      
      this.writeFile(join('integrations', `${integration.name.toLowerCase().replace(/\s+/g, '-')}.mdx`), integrationContent);
    }
  }
  
  /**
   * Generate navigation configuration
   */
  private async generateNavigation(): Promise<void> {
    const navigation = domainManager.generateNavigation();
    
    const navContent = `// Auto-generated navigation configuration
// This file is automatically generated from domain configuration

export const navigation = ${JSON.stringify(navigation, null, 2)};

export default navigation;
`;
    
    this.writeFile('navigation.ts', navContent);
  }
  
  /**
   * Ensure directory exists
   */
  private ensureDirectory(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  
  /**
   * Write file with content
   */
  private writeFile(relativePath: string, content: string): void {
    const fullPath = join(this.outputDir, relativePath);
    const dir = join(fullPath, '..');
    this.ensureDirectory(dir);
    writeFileSync(fullPath, content);
    console.log(`✅ Generated: ${relativePath}`);
  }
}

// CLI interface
async function main() {
  const outputDir = process.argv[2] || 'content';
  
  try {
    // Initialize domain manager
    await domainManager.loadFromEnvironment();
    
    // Generate documentation
    const generator = new DocumentationGenerator(outputDir);
    await generator.generate();
    
  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DocumentationGenerator }; 