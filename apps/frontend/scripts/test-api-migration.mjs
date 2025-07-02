#!/usr/bin/env node

/**
 * API Migration Test Script
 * Verifies that all API client migrations are working correctly
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

class ApiMigrationTester {
  constructor() {
    this.results = {
      buildSuccess: false,
      securityIssues: [],
      migrationSuccess: [],
      warnings: [],
      errors: []
    };
  }

  async runTests() {
    console.log('🧪 Starting API Migration Test Suite...\n');

    await this.testBuildSuccess();
    await this.testSecurityPatterns();
    await this.testApiClientUsage();
    await this.testCriticalEndpoints();
    
    this.generateReport();
  }

  async testBuildSuccess() {
    console.log('📦 Testing build success...');
    try {
      const { stdout, stderr } = await execAsync('npm run build');
      if (stdout.includes('✓ Compiled successfully')) {
        this.results.buildSuccess = true;
        console.log('✅ Build successful');
      } else {
        this.results.errors.push('Build failed');
        console.log('❌ Build failed');
      }
    } catch (error) {
      this.results.errors.push(`Build error: ${error.message}`);
      console.log('❌ Build error:', error.message);
    }
  }

  async testSecurityPatterns() {
    console.log('\n🔒 Testing security patterns...');
    
    const patterns = [
      {
        name: 'Direct fetch calls',
        pattern: /await\s+fetch\s*\(/g,
        shouldNotExist: true,
        exceptions: [
          'shared/services/api-client.ts', // Internal implementation
          'shared/services/api/base-client.ts', // Internal implementation
          'shared/services/api/server-client.ts', // Internal implementation
          'domains/auth/services/authApiClient.ts', // Internal implementation
          'shared/hooks/ui-hooks.ts', // Marked as deprecated
          'shared/services/core/filter-source.service.ts' // Marked for TODO
        ]
      },
      {
        name: 'browserApi usage',
        pattern: /browserApi\.(get|post|put|patch|delete)/g,
        shouldExist: true
      },
      {
        name: 'createServerApiClient usage',
        pattern: /createServerApiClient/g,
        shouldExist: true
      }
    ];

    for (const pattern of patterns) {
      await this.checkPattern(pattern);
    }
  }

  async checkPattern(pattern) {
    const files = await this.findFiles(['ts', 'tsx']);
    let matches = [];
    
    for (const file of files) {
      // Skip excluded files
      if (pattern.exceptions && pattern.exceptions.some(exc => file.includes(exc))) {
        continue;
      }
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        const fileMatches = [...content.matchAll(pattern.pattern)];
        
        if (fileMatches.length > 0) {
          matches.push({
            file: file.replace(process.cwd(), ''),
            matches: fileMatches.length
          });
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    if (pattern.shouldNotExist && matches.length > 0) {
      this.results.securityIssues.push({
        pattern: pattern.name,
        violations: matches
      });
      console.log(`❌ Found ${pattern.name} in ${matches.length} files`);
      matches.forEach(m => console.log(`   - ${m.file} (${m.matches} matches)`));
    } else if (pattern.shouldExist && matches.length === 0) {
      this.results.securityIssues.push({
        pattern: pattern.name,
        issue: 'Pattern not found - migration may be incomplete'
      });
      console.log(`⚠️  ${pattern.name} not found - migration may be incomplete`);
    } else {
      console.log(`✅ ${pattern.name} check passed (${matches.length} files)`);
      this.results.migrationSuccess.push(pattern.name);
    }
  }

  async findFiles(extensions) {
    const files = [];
    
    const walkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.next', 'dist', 'build'].includes(entry.name)) {
            walkDir(fullPath);
          }
        } else {
          const ext = path.extname(entry.name).slice(1);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    walkDir(process.cwd());
    return files;
  }

  async testApiClientUsage() {
    console.log('\n🔧 Testing API client usage...');
    
    const criticalFiles = [
      'shared/hooks/useGenericFilter.ts',
      'context/AuthContext.tsx',
      'components/features/role-management/CreateRoleModal.tsx',
      'app/api/platform-rbac/roles/[id]/route.ts'
    ];

    for (const file of criticalFiles) {
      await this.testFileApiUsage(file);
    }
  }

  async testFileApiUsage(filePath) {
    const fullPath = path.join(process.cwd(), filePath);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for secure API patterns
      const hasBrowserApi = /browserApi\.(get|post|put|patch|delete)/.test(content);
      const hasServerApi = /createServerApiClient/.test(content);
      const hasDirectFetch = /await\s+fetch\s*\(/.test(content);
      
      if (filePath.includes('route.ts')) {
        // Server-side files should use server API client
        if (hasServerApi && !hasDirectFetch) {
          console.log(`✅ ${filePath} - Using server API client`);
          this.results.migrationSuccess.push(`${filePath} - server API`);
        } else {
          console.log(`❌ ${filePath} - Not using server API client properly`);
          this.results.securityIssues.push({
            file: filePath,
            issue: 'Not using server API client'
          });
        }
      } else {
        // Client-side files should use browser API client
        if (hasBrowserApi && !hasDirectFetch) {
          console.log(`✅ ${filePath} - Using browser API client`);
          this.results.migrationSuccess.push(`${filePath} - browser API`);
        } else {
          console.log(`❌ ${filePath} - Not using browser API client properly`);
          this.results.securityIssues.push({
            file: filePath,
            issue: 'Not using browser API client'
          });
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not test ${filePath}: ${error.message}`);
      this.results.warnings.push(`Could not test ${filePath}`);
    }
  }

  async testCriticalEndpoints() {
    console.log('\n🎯 Testing critical endpoints...');
    
    // Test that critical API routes are using secure patterns
    const apiRoutes = [
      'app/api/auth/login/route.ts',
      'app/api/auth/logout/route.ts',
      'app/api/auth/me/route.ts',
      'app/api/platform-rbac/roles/route.ts',
      'app/api/tenants/route.ts'
    ];

    for (const route of apiRoutes) {
      await this.testApiRoute(route);
    }
  }

  async testApiRoute(routePath) {
    const fullPath = path.join(process.cwd(), routePath);
    
    try {
      if (!fs.existsSync(fullPath)) {
        console.log(`⚠️  ${routePath} - File not found`);
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for security patterns
      const hasCSRFProtection = /csrf|CSRF/.test(content);
      const hasAuthCheck = /Authentication|authorization|auth/.test(content);
      const hasInputValidation = /validate|validation/.test(content);
      
      let score = 0;
      const checks = [];
      
      if (hasCSRFProtection) {
        score++;
        checks.push('✅ CSRF protection');
      } else {
        checks.push('❌ No CSRF protection');
      }
      
      if (hasAuthCheck) {
        score++;
        checks.push('✅ Auth check');
      } else {
        checks.push('❌ No auth check');
      }
      
      if (hasInputValidation) {
        score++;
        checks.push('✅ Input validation');
      } else {
        checks.push('⚠️  No explicit input validation');
      }

      console.log(`${score >= 2 ? '✅' : '⚠️'} ${routePath} (${score}/3)`);
      checks.forEach(check => console.log(`   ${check}`));
      
      if (score >= 2) {
        this.results.migrationSuccess.push(`${routePath} security`);
      } else {
        this.results.warnings.push(`${routePath} needs security review`);
      }
    } catch (error) {
      console.log(`❌ Error testing ${routePath}: ${error.message}`);
      this.results.errors.push(`Error testing ${routePath}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 API MIGRATION TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Build Success: ${this.results.buildSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Migration Success: ${this.results.migrationSuccess.length} items`);
    console.log(`⚠️  Warnings: ${this.results.warnings.length} items`);
    console.log(`❌ Security Issues: ${this.results.securityIssues.length} items`);
    console.log(`💥 Errors: ${this.results.errors.length} items`);

    if (this.results.securityIssues.length > 0) {
      console.log('\n🔒 SECURITY ISSUES:');
      this.results.securityIssues.forEach(issue => {
        console.log(`- ${issue.pattern || issue.file}: ${issue.issue || 'Pattern violations'}`);
        if (issue.violations) {
          issue.violations.forEach(v => console.log(`  - ${v.file} (${v.matches} matches)`));
        }
      });
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.warnings.forEach(warning => console.log(`- ${warning}`));
    }

    if (this.results.errors.length > 0) {
      console.log('\n💥 ERRORS:');
      this.results.errors.forEach(error => console.log(`- ${error}`));
    }

    // Overall assessment
    const totalIssues = this.results.securityIssues.length + this.results.errors.length;
    const successRate = (this.results.migrationSuccess.length / (this.results.migrationSuccess.length + totalIssues)) * 100;
    
    console.log(`\n🎯 OVERALL ASSESSMENT:`);
    console.log(`Migration Success Rate: ${successRate.toFixed(1)}%`);
    
    if (totalIssues === 0 && this.results.buildSuccess) {
      console.log('🎉 MIGRATION COMPLETE - All systems secure!');
    } else if (totalIssues <= 2 && this.results.buildSuccess) {
      console.log('✅ MIGRATION MOSTLY COMPLETE - Minor issues to resolve');
    } else {
      console.log('⚠️  MIGRATION NEEDS ATTENTION - Critical issues found');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the tests
const tester = new ApiMigrationTester();
tester.runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
}); 