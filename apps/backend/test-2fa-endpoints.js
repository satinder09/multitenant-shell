/**
 * 🧪 2FA Endpoints Testing Script
 * 
 * Tests the actual 2FA REST endpoints to ensure they're working
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000';

// Mock JWT token for testing (replace with real token)
const MOCK_TOKEN = 'mock-jwt-token-for-testing';

console.log('🔐 Testing 2FA Endpoints...\n');

async function testEndpoint(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${MOCK_TOKEN}`,
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    console.log(`   ✅ ${method.toUpperCase()} ${url} - Status: ${response.status}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.log(`   ⚠️  ${method.toUpperCase()} ${url} - Status: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
    } else {
      console.log(`   ❌ ${method.toUpperCase()} ${url} - Error: ${error.message}`);
    }
    return null;
  }
}

async function testPlatform2FA() {
  console.log('1. Testing Platform 2FA Endpoints:');
  
  // Test status endpoint
  await testEndpoint('GET', '/platform/2fa/status');
  
  // Test setup endpoint
  await testEndpoint('POST', '/platform/2fa/setup', {
    methodType: 'TOTP',
    name: 'Test Authenticator'
  });
  
  // Test verification endpoint
  await testEndpoint('POST', '/platform/2fa/verify', {
    methodType: 'TOTP',
    code: '123456'
  });
  
  // Test backup codes generation
  await testEndpoint('POST', '/platform/2fa/backup-codes/generate');
  
  // Test backup codes verification
  await testEndpoint('POST', '/platform/2fa/backup-codes/verify', {
    code: 'ABCD1234'
  });
  
  // Test recovery info
  await testEndpoint('GET', '/platform/2fa/recovery');
  
  console.log('');
}

async function testTenant2FA() {
  console.log('2. Testing Tenant 2FA Endpoints:');
  
  const tenantHeaders = { 'X-Tenant-ID': 'test-tenant-123' };
  
  // Test status endpoint
  await testEndpoint('GET', '/tenant/2fa/status', null, tenantHeaders);
  
  // Test setup endpoint
  await testEndpoint('POST', '/tenant/2fa/setup', {
    methodType: 'TOTP',
    name: 'Tenant Authenticator'
  }, tenantHeaders);
  
  // Test verification endpoint
  await testEndpoint('POST', '/tenant/2fa/verify', {
    methodType: 'TOTP',
    code: '654321'
  }, tenantHeaders);
  
  // Test backup codes generation
  await testEndpoint('POST', '/tenant/2fa/backup-codes/generate', null, tenantHeaders);
  
  // Test backup codes verification
  await testEndpoint('POST', '/tenant/2fa/backup-codes/verify', {
    code: 'EFGH5678'
  }, tenantHeaders);
  
  // Test recovery info
  await testEndpoint('GET', '/tenant/2fa/recovery', null, tenantHeaders);
  
  console.log('');
}

async function testHealthCheck() {
  console.log('3. Testing Server Health:');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log(`   ✅ Health check - Status: ${response.status}`);
  } catch (error) {
    console.log(`   ❌ Health check failed - Server may not be running`);
    console.log(`   💡 Start server with: npm run start:dev`);
  }
  
  console.log('');
}

async function runTests() {
  console.log('🚀 Starting 2FA Endpoint Tests...\n');
  
  await testHealthCheck();
  await testPlatform2FA();
  await testTenant2FA();
  
  console.log('🎉 Testing Complete!\n');
  console.log('📋 Test Summary:');
  console.log('   ✅ = Endpoint exists and responds');
  console.log('   ⚠️  = Endpoint exists but returns error (expected without real auth)');
  console.log('   ❌ = Endpoint not found or server error');
  console.log('');
  console.log('🔐 Next Steps:');
  console.log('1. For real testing, get a valid JWT token from /auth/login');
  console.log('2. Use the token in Authorization header');
  console.log('3. Test with actual user data');
  console.log('4. Use the test-2fa.http file for interactive testing');
}

runTests().catch(console.error); 