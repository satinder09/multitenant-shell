#!/usr/bin/env node
/**
 * Production Readiness Validation Script
 * Comprehensive system health and configuration validation
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class ProductionReadinessChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.score = 0;
    this.maxScore = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  addCheck(name, passed, points = 1, message = '') {
    this.maxScore += points;
    if (passed) {
      this.score += points;
      this.passed.push(`✅ ${name}: ${message || 'PASSED'}`);
      this.log(`✅ ${name}: ${message || 'PASSED'}`, 'success');
    } else {
      this.errors.push(`❌ ${name}: ${message || 'FAILED'}`);
      this.log(`❌ ${name}: ${message || 'FAILED'}`, 'error');
    }
  }

  addWarning(name, message) {
    this.warnings.push(`⚠️ ${name}: ${message}`);
    this.log(`⚠️ ${name}: ${message}`, 'warning');
  }

  async checkEnvironmentVariables() {
    this.log('🔧 Checking environment variables...', 'info');
    
    const requiredVars = [
      'DATABASE_URL',
      'BACKEND_PORT',
      'NODE_ENV'
    ];

    const recommendedVars = [
      'REDIS_URL',
      'JWT_SECRET',
      'CSRF_SECRET',
      'SESSION_SECRET'
    ];

    let envScore = 0;
    const maxEnvScore = requiredVars.length + recommendedVars.length;

    // Check required variables
    for (const envVar of requiredVars) {
      const exists = process.env[envVar] !== undefined;
      if (exists) {
        envScore++;
        this.log(`  ✅ ${envVar}: Set`, 'success');
      } else {
        this.log(`  ❌ ${envVar}: Missing (REQUIRED)`, 'error');
      }
    }

    // Check recommended variables
    for (const envVar of recommendedVars) {
      const exists = process.env[envVar] !== undefined;
      if (exists) {
        envScore++;
        this.log(`  ✅ ${envVar}: Set`, 'success');
      } else {
        this.addWarning('Environment', `${envVar} not set (recommended for production)`);
      }
    }

    this.addCheck(
      'Environment Variables',
      envScore >= requiredVars.length,
      10,
      `${envScore}/${maxEnvScore} variables configured`
    );
  }

  async checkDependencies() {
    this.log('📦 Checking dependencies...', 'info');
    
    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const requiredNodeVersion = '22.0.0';
      const nodeVersionValid = this.compareVersions(nodeVersion.slice(1), requiredNodeVersion) >= 0;
      
      this.addCheck(
        'Node.js Version',
        nodeVersionValid,
        5,
        `${nodeVersion} (required: ${requiredNodeVersion}+)`
      );

      // Check npm version
      const { stdout: npmVersion } = await execAsync('npm --version');
      this.addCheck('npm', true, 1, `v${npmVersion.trim()}`);

      // Check backend dependencies
      const backendPackageJson = path.join(__dirname, '../apps/backend/package.json');
      if (fs.existsSync(backendPackageJson)) {
        this.addCheck('Backend package.json', true, 2, 'Found');
        
        // Check if node_modules exists
        const backendNodeModules = path.join(__dirname, '../apps/backend/node_modules');
        this.addCheck(
          'Backend Dependencies',
          fs.existsSync(backendNodeModules),
          5,
          fs.existsSync(backendNodeModules) ? 'Installed' : 'Run npm install'
        );
      } else {
        this.addCheck('Backend package.json', false, 2, 'Missing');
      }

      // Check frontend dependencies
      const frontendPackageJson = path.join(__dirname, '../apps/frontend/package.json');
      if (fs.existsSync(frontendPackageJson)) {
        this.addCheck('Frontend package.json', true, 2, 'Found');
        
        const frontendNodeModules = path.join(__dirname, '../apps/frontend/node_modules');
        this.addCheck(
          'Frontend Dependencies',
          fs.existsSync(frontendNodeModules),
          5,
          fs.existsSync(frontendNodeModules) ? 'Installed' : 'Run npm install'
        );
      } else {
        this.addCheck('Frontend package.json', false, 2, 'Missing');
      }

    } catch (error) {
      this.addCheck('Dependencies Check', false, 5, `Error: ${error.message}`);
    }
  }

  async checkDatabase() {
    this.log('🗄️ Checking database connectivity...', 'info');
    
    try {
      // Test database connection
      const response = await fetch('http://localhost:4000/health');
      if (response.ok) {
        const health = await response.json();
        const dbStatus = health.checks?.database?.status;
        
        this.addCheck(
          'Database Connection',
          dbStatus === 'up',
          10,
          `Status: ${dbStatus || 'unknown'}`
        );

        if (health.checks?.database?.metrics) {
          this.log('  📊 Database metrics available', 'success');
        }
      } else {
        this.addCheck('Database Connection', false, 10, 'Health endpoint not responding');
      }
    } catch (error) {
      this.addCheck('Database Connection', false, 10, `Error: ${error.message}`);
    }
  }

  async checkSecurity() {
    this.log('🔒 Checking security configuration...', 'info');
    
    try {
      // Check CSRF protection
      const csrfResponse = await fetch('http://localhost:4000/auth/csrf-token');
      this.addCheck(
        'CSRF Protection',
        csrfResponse.ok,
        5,
        csrfResponse.ok ? 'Enabled' : 'Not responding'
      );

      // Check security headers
      if (csrfResponse.ok) {
        const securityHeaders = [
          'x-content-type-options',
          'x-frame-options',
          'strict-transport-security',
          'x-xss-protection'
        ];

        let securityScore = 0;
        for (const header of securityHeaders) {
          if (csrfResponse.headers.get(header)) {
            securityScore++;
          }
        }

        this.addCheck(
          'Security Headers',
          securityScore >= 3,
          5,
          `${securityScore}/${securityHeaders.length} headers present`
        );
      }

      // Check rate limiting
      const rateLimitHeaders = await this.checkRateLimit();
      this.addCheck(
        'Rate Limiting',
        rateLimitHeaders,
        5,
        rateLimitHeaders ? 'Configured' : 'Not detected'
      );

    } catch (error) {
      this.addCheck('Security Configuration', false, 5, `Error: ${error.message}`);
    }
  }

  async checkRateLimit() {
    try {
      const response = await fetch('http://localhost:4000/health');
      return response.headers.get('x-ratelimit-limit') !== null;
    } catch {
      return false;
    }
  }

  async checkPerformance() {
    this.log('⚡ Checking performance configuration...', 'info');
    
    try {
      // Check monitoring endpoints
      const metricsResponse = await fetch('http://localhost:4000/metrics/dashboard');
      this.addCheck(
        'Monitoring System',
        metricsResponse.ok,
        10,
        metricsResponse.ok ? 'Active' : 'Not responding'
      );

      // Check performance optimization
      const perfResponse = await fetch('http://localhost:4000/performance/report');
      this.addCheck(
        'Performance Monitoring',
        perfResponse.ok,
        10,
        perfResponse.ok ? 'Active' : 'Not responding'
      );

      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        const avgResponseTime = metrics.performance?.api?.avg_response_time || 0;
        
        this.addCheck(
          'API Response Time',
          avgResponseTime < 100,
          5,
          `${avgResponseTime}ms (target: <100ms)`
        );
      }

    } catch (error) {
      this.addCheck('Performance Check', false, 10, `Error: ${error.message}`);
    }
  }

  async checkDocker() {
    this.log('🐳 Checking Docker configuration...', 'info');
    
    try {
      // Check if Docker is available
      await execAsync('docker --version');
      this.addCheck('Docker', true, 5, 'Available');

      // Check Dockerfiles
      const backendDockerfile = path.join(__dirname, '../apps/backend/Dockerfile');
      const frontendDockerfile = path.join(__dirname, '../apps/frontend/Dockerfile');
      
      this.addCheck(
        'Backend Dockerfile',
        fs.existsSync(backendDockerfile),
        5,
        fs.existsSync(backendDockerfile) ? 'Present' : 'Missing'
      );

      this.addCheck(
        'Frontend Dockerfile',
        fs.existsSync(frontendDockerfile),
        5,
        fs.existsSync(frontendDockerfile) ? 'Present' : 'Missing'
      );

      // Check docker-compose
      const dockerCompose = path.join(__dirname, '../apps/backend/docker-compose.yml');
      this.addCheck(
        'Docker Compose',
        fs.existsSync(dockerCompose),
        5,
        fs.existsSync(dockerCompose) ? 'Present' : 'Missing'
      );

    } catch (error) {
      this.addCheck('Docker', false, 5, 'Not available');
    }
  }

  async checkCICD() {
    this.log('🔄 Checking CI/CD configuration...', 'info');
    
    const cicdFile = path.join(__dirname, '../.github/workflows/ci-cd.yml');
    const deployFile = path.join(__dirname, '../.github/workflows/deploy.yml');
    
    this.addCheck(
      'CI/CD Pipeline',
      fs.existsSync(cicdFile),
      10,
      fs.existsSync(cicdFile) ? 'Configured' : 'Missing'
    );

    this.addCheck(
      'Deployment Workflow',
      fs.existsSync(deployFile),
      5,
      fs.existsSync(deployFile) ? 'Configured' : 'Missing'
    );
  }

  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  async generateReport() {
    const percentage = Math.round((this.score / this.maxScore) * 100);
    
    console.log('\n' + '='.repeat(80));
    console.log('🏭 PRODUCTION READINESS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Overall Score: ${this.score}/${this.maxScore} (${percentage}%)`);
    
    if (percentage >= 90) {
      this.log('🎉 EXCELLENT - Production Ready!', 'success');
    } else if (percentage >= 80) {
      this.log('✅ GOOD - Nearly Production Ready', 'success');
    } else if (percentage >= 70) {
      this.log('⚠️ FAIR - Some issues need attention', 'warning');
    } else {
      this.log('❌ POOR - Major issues must be resolved', 'error');
    }

    if (this.passed.length > 0) {
      console.log('\n✅ PASSED CHECKS:');
      this.passed.forEach(check => console.log(`  ${check}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.warnings.forEach(warning => console.log(`  ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ FAILED CHECKS:');
      this.errors.forEach(error => console.log(`  ${error}`));
    }

    console.log('\n💡 RECOMMENDATIONS:');
    if (percentage < 100) {
      console.log('  • Address all failed checks before production deployment');
      console.log('  • Review warnings for optimization opportunities');
      console.log('  • Run this script regularly to maintain readiness');
    } else {
      console.log('  • System appears production ready!');
      console.log('  • Continue monitoring after deployment');
    }

    console.log('\n' + '='.repeat(80));
    return percentage >= 80;
  }

  async run() {
    this.log('🚀 Starting Production Readiness Check...', 'info');
    
    await this.checkEnvironmentVariables();
    await this.checkDependencies();
    await this.checkDatabase();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkDocker();
    await this.checkCICD();
    
    const isReady = await this.generateReport();
    
    process.exit(isReady ? 0 : 1);
  }
}

// Run the checker
const checker = new ProductionReadinessChecker();
checker.run().catch(error => {
  console.error('❌ Production readiness check failed:', error);
  process.exit(1);
}); 