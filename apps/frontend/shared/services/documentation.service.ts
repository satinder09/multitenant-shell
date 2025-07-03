/**
 * í³š DOCUMENTATION SERVICE
 * 
 * Comprehensive documentation and developer experience management
 */

import { debug, DebugCategory } from '../utils/debug-tools';

export interface DocumentationConfig {
  enableAutoGeneration: boolean;
  enableInteractive: boolean;
  enableVersioning: boolean;
  outputFormats: string[];
  includeExamples: boolean;
}

export interface DocumentationSection {
  id: string;
  title: string;
  content: string;
  examples: string[];
  lastUpdated: Date;
  version: string;
}

class DocumentationService {
  private config: DocumentationConfig;
  private sections: Map<string, DocumentationSection> = new Map();

  constructor(config: Partial<DocumentationConfig> = {}) {
    this.config = {
      enableAutoGeneration: true,
      enableInteractive: true,
      enableVersioning: true,
      outputFormats: ['html', 'markdown', 'json'],
      includeExamples: true,
      ...config
    };

    this.initializeDocumentation();
    debug.log(DebugCategory.API, 'Documentation Service initialized');
  }

  private initializeDocumentation(): void {
    // Initialize default documentation sections
    const sections: DocumentationSection[] = [
      {
        id: 'getting-started',
        title: 'Getting Started',
        content: 'Quick start guide for the MultiTenant Platform',
        examples: ['npm install', 'npm run dev'],
        lastUpdated: new Date(),
        version: '2.0.0'
      },
      {
        id: 'api-reference',
        title: 'API Reference',
        content: 'Complete API documentation with examples',
        examples: ['GET /api/tenants', 'POST /api/auth/login'],
        lastUpdated: new Date(),
        version: '2.0.0'
      },
      {
        id: 'architecture',
        title: 'Architecture Overview',
        content: 'System architecture and design patterns',
        examples: ['Domain-driven design', 'Microservices pattern'],
        lastUpdated: new Date(),
        version: '2.0.0'
      }
    ];

    sections.forEach(section => {
      this.sections.set(section.id, section);
    });
  }

  generateDocumentation(): string {
    let docs = '# MultiTenant Platform Documentation\n\n';
    
    for (const [id, section] of this.sections) {
      docs += `## ${section.title}\n\n`;
      docs += `${section.content}\n\n`;
      
      if (this.config.includeExamples && section.examples.length > 0) {
        docs += '### Examples\n\n';
        section.examples.forEach(example => {
          docs += `\`\`\`\n${example}\n\`\`\`\n\n`;
        });
      }
    }

    return docs;
  }

  addSection(section: DocumentationSection): void {
    this.sections.set(section.id, section);
    debug.log(DebugCategory.API, 'Documentation section added', { id: section.id });
  }

  updateSection(id: string, updates: Partial<DocumentationSection>): void {
    const section = this.sections.get(id);
    if (section) {
      Object.assign(section, updates, { lastUpdated: new Date() });
      debug.log(DebugCategory.API, 'Documentation section updated', { id });
    }
  }

  getSection(id: string): DocumentationSection | undefined {
    return this.sections.get(id);
  }

  getAllSections(): DocumentationSection[] {
    return Array.from(this.sections.values());
  }
}

export const documentationService = new DocumentationService();
export { DocumentationService };
