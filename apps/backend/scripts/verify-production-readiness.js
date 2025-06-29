#!/usr/bin/env node

/**
 * ===============================================
 * 🚀 PRODUCTION READINESS VERIFICATION SCRIPT
 * ===============================================
 * Comprehensive validation of all production components
 * Run this before deploying to production
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Logging functions
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.magenta}=== ${msg} ===${colors.reset}\n`)
};

// Verification results
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

/**
 * Add test result
 */
function addResult(category, test, status, message = '') {
    const result = { category, test, status, message, timestamp: new Date().toISOString() };
    results.details.push(result);
    
    switch (status) {
        case 'PASS':
            results.passed++;
            log.success(`✅ ${category}: ${test}`);
            break;
        case 'FAIL':
            results.failed++;
            log.error(`❌ ${category}: ${test} - ${message}`);
            break;
        case 'WARN':
            results.warnings++;
            log.warning(`⚠️  ${category}: ${test} - ${message}`);
            break;
    }
}

/**
 * Check if file exists
 */
function checkFile(filePath, category, description) {
    const fullPath = path.resolve(filePath);
    const exists = fs.existsSync(fullPath);
    
    if (exists) {
        const stats = fs.statSync(fullPath);
        addResult(category, description, 'PASS', `File exists (${(stats.size / 1024).toFixed(2)}KB)`);
        return true;
    } else {
        addResult(category, description, 'FAIL', `File not found: ${filePath}`);
        return false;
    }
}

/**
 * Check directory structure
 */
function checkDirectoryStructure() {
    log.section('Directory Structure Verification');
    
    const requiredDirectories = [
        { path: 'src/domains', desc: 'Domain Architecture' },
        { path: 'src/domains/auth', desc: 'Authentication Domain' },
        { path: 'src/domains/database', desc: 'Database Domain' },
        { path: 'src/domains/platform', desc: 'Platform Domain' },
        { path: 'src/domains/tenant', desc: 'Tenant Domain' },
        { path: 'src/infrastructure', desc: 'Infrastructure Layer' },
        { path: 'src/infrastructure/monitoring', desc: 'Monitoring Infrastructure' },
        { path: 'src/infrastructure/performance', desc: 'Performance Infrastructure' },
        { path: 'src/shared', desc: 'Shared Components' },
        { path: 'scripts', desc: 'Deployment Scripts' },
        { path: 'monitoring', desc: 'Monitoring Configuration' }
    ];
    
    requiredDirectories.forEach(({ path: dirPath, desc }) => {
        const exists = fs.existsSync(dirPath);
        if (exists) {
            addResult('Structure', desc, 'PASS');
        } else {
            addResult('Structure', desc, 'FAIL', `Directory missing: ${dirPath}`);
        }
    });
}

/**
 * Check required files
 */
function checkRequiredFiles() {
    log.section('Required Files Verification');
    
    const requiredFiles = [
        { path: 'package.json', desc: 'Package Configuration' },
        { path: 'Dockerfile', desc: 'Docker Configuration' },
        { path: 'docker-compose.yml', desc: 'Docker Compose Configuration' },
        { path: 'scripts/deploy.sh', desc: 'Deployment Script' },
        { path: 'DEPLOYMENT.md', desc: 'Deployment Documentation' },
        { path: 'monitoring/prometheus.yml', desc: 'Prometheus Configuration' },
        { path: 'src/app.module.ts', desc: 'Application Module' },
        { path: 'src/main.ts', desc: 'Application Entry Point' },
        { path: 'prisma/schema.prisma', desc: 'Database Schema' }
    ];
    
    requiredFiles.forEach(({ path: filePath, desc }) => {
        checkFile(filePath, 'Files', desc);
    });
}

/**
 * Check TypeScript compilation
 */
function checkTypeScriptCompilation() {
    log.section('TypeScript Compilation');
    
    try {
        execSync('npm run build', { stdio: 'pipe' });
        addResult('Build', 'TypeScript Compilation', 'PASS', 'No compilation errors');
    } catch (error) {
        addResult('Build', 'TypeScript Compilation', 'FAIL', 'Compilation errors detected');
    }
}

/**
 * Check Docker configuration
 */
function checkDockerConfiguration() {
    log.section('Docker Configuration');
    
    try {
        // Check Dockerfile
        const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
        
        // Check for multi-stage build
        if (dockerfileContent.includes('AS dependencies') && dockerfileContent.includes('AS builder') && dockerfileContent.includes('AS production')) {
            addResult('Docker', 'Multi-stage Build', 'PASS');
        } else {
            addResult('Docker', 'Multi-stage Build', 'FAIL', 'Multi-stage build not configured');
        }
        
        // Check for security hardening
        if (dockerfileContent.includes('RUN addgroup') && (dockerfileContent.includes('USER node') || dockerfileContent.includes('USER nestjs'))) {
            addResult('Docker', 'Security Hardening', 'PASS', 'Non-root user configured');
        } else {
            addResult('Docker', 'Security Hardening', 'WARN', 'Consider using non-root user');
        }
        
        // Check docker-compose
        const composeContent = fs.readFileSync('docker-compose.yml', 'utf8');
        
        if (composeContent.includes('prometheus:') && composeContent.includes('grafana:')) {
            addResult('Docker', 'Monitoring Stack', 'PASS', 'Prometheus and Grafana configured');
        } else {
            addResult('Docker', 'Monitoring Stack', 'WARN', 'Monitoring stack not fully configured');
        }
        
    } catch (error) {
        addResult('Docker', 'Configuration', 'FAIL', error.message);
    }
}

/**
 * Check monitoring configuration
 */
function checkMonitoringConfiguration() {
    log.section('Monitoring Configuration');
    
    // Check for monitoring services
    const monitoringFiles = [
        { path: 'src/infrastructure/monitoring/metrics.service.ts', desc: 'Metrics Service' },
        { path: 'src/infrastructure/monitoring/metrics-dashboard.controller.ts', desc: 'Metrics Dashboard' },
        { path: 'src/infrastructure/health/health.controller.ts', desc: 'Health Controller' },
        { path: 'monitoring/prometheus.yml', desc: 'Prometheus Config' }
    ];
    
    monitoringFiles.forEach(({ path: filePath, desc }) => {
        checkFile(filePath, 'Monitoring', desc);
    });
    
    // Check for performance monitoring interceptor
    if (fs.existsSync('src/shared/interceptors/performance-monitoring.interceptor.ts')) {
        addResult('Monitoring', 'Performance Interceptor', 'PASS');
    } else {
        addResult('Monitoring', 'Performance Interceptor', 'FAIL', 'Performance monitoring not configured');
    }
}

/**
 * Check security implementation
 */
function checkSecurityImplementation() {
    log.section('Security Implementation');
    
    const securityFiles = [
        { path: 'src/domains/auth/services/auth-security.service.ts', desc: 'Auth Security Service' },
        { path: 'src/domains/auth/controllers/security.controller.ts', desc: 'Security Controller' },
        { path: 'src/shared/guards/tenant-validation.guard.ts', desc: 'Tenant Validation Guard' },
        { path: 'src/shared/guards/input-validation.guard.ts', desc: 'Input Validation Guard' }
    ];
    
    securityFiles.forEach(({ path: filePath, desc }) => {
        checkFile(filePath, 'Security', desc);
    });
    
    // Check package.json for security dependencies
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const securityPackages = ['helmet', 'bcrypt', 'jsonwebtoken', '@nestjs/jwt'];
        const missingPackages = securityPackages.filter(pkg => !deps[pkg]);
        
        if (missingPackages.length === 0) {
            addResult('Security', 'Security Dependencies', 'PASS', 'All security packages installed');
        } else {
            addResult('Security', 'Security Dependencies', 'WARN', `Missing: ${missingPackages.join(', ')}`);
        }
        
    } catch (error) {
        addResult('Security', 'Dependencies Check', 'FAIL', error.message);
    }
}

/**
 * Check performance optimization
 */
function checkPerformanceOptimization() {
    log.section('Performance Optimization');
    
    const performanceFiles = [
        { path: 'src/infrastructure/performance/database-optimization.service.ts', desc: 'Database Optimization' },
        { path: 'src/infrastructure/performance/performance-optimization.controller.ts', desc: 'Performance Controller' },
        { path: 'src/infrastructure/cache/intelligent-cache.service.ts', desc: 'Intelligent Cache' },
        { path: 'src/infrastructure/cache/cache.service.ts', desc: 'Cache Service' }
    ];
    
    performanceFiles.forEach(({ path: filePath, desc }) => {
        checkFile(filePath, 'Performance', desc);
    });
}

/**
 * Check deployment readiness
 */
function checkDeploymentReadiness() {
    log.section('Deployment Readiness');
    
    // Check deployment script
    if (fs.existsSync('scripts/deploy.sh')) {
        try {
            const stats = fs.statSync('scripts/deploy.sh');
            // On Windows, permissions work differently. If file exists and is readable, consider it executable
            const isWindows = process.platform === 'win32';
            const isExecutable = isWindows ? stats.isFile() : (stats.mode & (0o100 | 0o010 | 0o001)) !== 0;
            
            if (isExecutable) {
                addResult('Deployment', 'Deploy Script Executable', 'PASS', isWindows ? 'File exists and accessible' : 'Execute permissions set');
            } else {
                addResult('Deployment', 'Deploy Script Executable', 'WARN', 'Script not executable');
            }
        } catch (error) {
            addResult('Deployment', 'Deploy Script Check', 'FAIL', error.message);
        }
    }
    
    // Check CI/CD configuration
    if (fs.existsSync('../../.github/workflows/deploy.yml')) {
        addResult('Deployment', 'CI/CD Pipeline', 'PASS', 'GitHub Actions configured');
    } else {
        addResult('Deployment', 'CI/CD Pipeline', 'WARN', 'CI/CD pipeline not configured');
    }
    
    // Check documentation
    if (fs.existsSync('DEPLOYMENT.md')) {
        const content = fs.readFileSync('DEPLOYMENT.md', 'utf8');
        if (content.length > 5000) {
            addResult('Deployment', 'Documentation', 'PASS', 'Comprehensive deployment guide');
        } else {
            addResult('Deployment', 'Documentation', 'WARN', 'Documentation could be more detailed');
        }
    }
}

/**
 * Generate production readiness report
 */
function generateReport() {
    log.section('Production Readiness Report');
    
    const totalTests = results.passed + results.failed + results.warnings;
    const successRate = totalTests > 0 ? ((results.passed / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`\n${colors.cyan}📊 PRODUCTION READINESS SUMMARY${colors.reset}`);
    console.log(`================================`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    
    // Readiness assessment
    let readinessLevel = 'NOT READY';
    let readinessColor = colors.red;
    
    if (results.failed === 0 && results.warnings <= 2) {
        readinessLevel = 'PRODUCTION READY ✨';
        readinessColor = colors.green;
    } else if (results.failed <= 2 && results.warnings <= 5) {
        readinessLevel = 'MOSTLY READY 🚀';
        readinessColor = colors.yellow;
    } else if (results.failed <= 5) {
        readinessLevel = 'NEEDS WORK 🔧';
        readinessColor = colors.yellow;
    }
    
    console.log(`\n${readinessColor}🎯 READINESS LEVEL: ${readinessLevel}${colors.reset}\n`);
    
    // Failed tests
    if (results.failed > 0) {
        console.log(`${colors.red}❌ CRITICAL ISSUES TO FIX:${colors.reset}`);
        results.details
            .filter(r => r.status === 'FAIL')
            .forEach(r => console.log(`   • ${r.category}: ${r.test} - ${r.message}`));
        console.log('');
    }
    
    // Warnings
    if (results.warnings > 0) {
        console.log(`${colors.yellow}⚠️  RECOMMENDATIONS:${colors.reset}`);
        results.details
            .filter(r => r.status === 'WARN')
            .forEach(r => console.log(`   • ${r.category}: ${r.test} - ${r.message}`));
        console.log('');
    }
    
    // Next steps
    console.log(`${colors.cyan}🎯 NEXT STEPS:${colors.reset}`);
    if (results.failed > 0) {
        console.log(`   1. Fix critical issues listed above`);
        console.log(`   2. Re-run verification script`);
        console.log(`   3. Address warnings for optimal deployment`);
    } else if (results.warnings > 0) {
        console.log(`   1. Review and address warnings`);
        console.log(`   2. Run final deployment test`);
        console.log(`   3. Deploy to staging environment`);
    } else {
        console.log(`   1. Deploy to staging environment`);
        console.log(`   2. Run load testing`);
        console.log(`   3. Schedule production deployment`);
    }
    
    console.log(`\n${colors.magenta}📝 Detailed report saved to: production-readiness-report.json${colors.reset}\n`);
    
    // Save detailed report
    const report = {
        summary: {
            totalTests,
            passed: results.passed,
            failed: results.failed,
            warnings: results.warnings,
            successRate: parseFloat(successRate),
            readinessLevel,
            timestamp: new Date().toISOString()
        },
        details: results.details
    };
    
    fs.writeFileSync('production-readiness-report.json', JSON.stringify(report, null, 2));
    
    return results.failed === 0;
}

/**
 * Main verification function
 */
async function main() {
    console.log(`${colors.cyan}`);
    console.log(`  ===============================================`);
    console.log(`  🚀 MULTITENANT SHELL PRODUCTION VERIFICATION`);
    console.log(`  ===============================================`);
    console.log(`${colors.reset}\n`);
    
    log.info('Starting comprehensive production readiness verification...\n');
    
    try {
        // Run all verification checks
        checkDirectoryStructure();
        checkRequiredFiles();
        checkTypeScriptCompilation();
        checkDockerConfiguration();
        checkMonitoringConfiguration();
        checkSecurityImplementation();
        checkPerformanceOptimization();
        checkDeploymentReadiness();
        
        // Generate final report
        const isReady = generateReport();
        
        // Exit with appropriate code
        process.exit(isReady ? 0 : 1);
        
    } catch (error) {
        log.error(`Verification failed: ${error.message}`);
        process.exit(1);
    }
}

// Run verification
if (require.main === module) {
    main();
}

module.exports = { main, addResult, log }; 