#!/usr/bin/env node

/**
 * CSRF Domain Fix Script
 * Diagnoses and fixes CSRF token issues after domain configuration changes
 */

const { default: fetch } = require('node-fetch');

async function testCsrfEndpoint(domain = 'lvh.me', port = '3000') {
  console.log('🔍 Testing CSRF Token Endpoint...');
  console.log(`Domain: ${domain}:${port}`);
  
  try {
    // Test frontend CSRF endpoint
    const frontendUrl = `http://${domain}:${port}/api/auth/csrf-token`;
    console.log(`\n📡 Testing Frontend: ${frontendUrl}`);
    
    const frontendResponse = await fetch(frontendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`Frontend Status: ${frontendResponse.status}`);
    console.log(`Frontend Headers:`, Object.fromEntries(frontendResponse.headers.entries()));
    
    if (frontendResponse.ok) {
      const data = await frontendResponse.json();
      console.log(`Frontend Data:`, data);
      console.log('✅ Frontend CSRF endpoint working');
    } else {
      console.log('❌ Frontend CSRF endpoint failed');
      const error = await frontendResponse.text();
      console.log(`Error: ${error}`);
    }
    
    // Test backend CSRF endpoint
    const backendUrl = `http://localhost:4000/auth/csrf-token`;
    console.log(`\n📡 Testing Backend: ${backendUrl}`);
    
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': `http://${domain}:${port}`
      }
    });
    
    console.log(`Backend Status: ${backendResponse.status}`);
    console.log(`Backend Headers:`, Object.fromEntries(backendResponse.headers.entries()));
    
    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log(`Backend Data:`, data);
      console.log('✅ Backend CSRF endpoint working');
    } else {
      console.log('❌ Backend CSRF endpoint failed');
      const error = await backendResponse.text();
      console.log(`Error: ${error}`);
    }
    
  } catch (error) {
    console.error('❌ CSRF test failed:', error.message);
  }
}

async function testLogin(domain = 'lvh.me', port = '3000') {
  console.log('\n🔐 Testing Login Flow...');
  
  try {
    // First get CSRF token
    const csrfResponse = await fetch(`http://${domain}:${port}/api/auth/csrf-token`);
    if (!csrfResponse.ok) {
      throw new Error('Failed to get CSRF token');
    }
    
    const csrfToken = csrfResponse.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      throw new Error('No CSRF token received');
    }
    
    console.log(`✅ CSRF Token obtained: ${csrfToken.substring(0, 10)}...`);
    
    // Try login with dummy credentials (will fail but should not give CSRF error)
    const loginResponse = await fetch(`http://${domain}:${port}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'dummy'
      })
    });
    
    console.log(`Login Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 403) {
      const error = await loginResponse.json();
      if (error.message === 'Invalid CSRF token') {
        console.log('❌ CSRF token still not working');
      } else {
        console.log('✅ CSRF token working (different error)');
      }
    } else if (loginResponse.status === 401) {
      console.log('✅ CSRF token working (authentication failed as expected)');
    } else {
      console.log(`ℹ️  Unexpected status: ${loginResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

async function main() {
  console.log('🚀 CSRF Domain Fix Diagnostic Tool');
  console.log('===================================\n');
  
  const domain = process.argv[2] || 'lvh.me';
  const port = process.argv[3] || '3000';
  
  console.log(`Configuration:`);
  console.log(`- Domain: ${domain}`);
  console.log(`- Port: ${port}`);
  console.log(`- Frontend URL: http://${domain}:${port}`);
  console.log(`- Backend URL: http://localhost:4000`);
  console.log('');
  
  await testCsrfEndpoint(domain, port);
  await testLogin(domain, port);
  
  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Clear browser cache completely');
  console.log('2. Open DevTools (F12)');
  console.log(`3. Navigate to: http://${domain}:${port}/login`);
  console.log('4. In console, run: debugCsrf()');
  console.log('5. Try logging in and watch console logs');
  console.log('');
  console.log('🔧 If issues persist:');
  console.log('1. Restart backend server');
  console.log('2. Restart frontend server');
  console.log('3. Check backend .env file has BASE_DOMAIN=lvh.me');
  console.log('4. Check frontend .env file has NEXT_PUBLIC_BASE_DOMAIN=lvh.me');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCsrfEndpoint, testLogin }; 