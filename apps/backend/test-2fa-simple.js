/**
 * 🧪 Simple 2FA Testing Script
 * 
 * Quick manual test of core 2FA functionality
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

console.log('🔐 Testing 2FA Libraries...\n');

// Test 1: Generate TOTP Secret
console.log('1. Testing TOTP Secret Generation:');
try {
  const secret = speakeasy.generateSecret({
    name: 'Test User',
    issuer: 'MultiTenant Shell',
    length: 32,
  });
  
  console.log('   ✅ Secret generated successfully');
  console.log('   📱 Manual entry key:', secret.base32);
  console.log('   🔗 Auth URL:', secret.otpauth_url);
} catch (error) {
  console.log('   ❌ Error generating secret:', error.message);
}

// Test 2: Generate QR Code
console.log('\n2. Testing QR Code Generation:');
try {
  const secret = speakeasy.generateSecret({
    name: 'Test User',
    issuer: 'MultiTenant Shell',
    length: 32,
  });
  
  QRCode.toDataURL(secret.otpauth_url, (err, qrCodeUrl) => {
    if (err) {
      console.log('   ❌ Error generating QR code:', err.message);
    } else {
      console.log('   ✅ QR code generated successfully');
      console.log('   📊 QR code length:', qrCodeUrl.length, 'characters');
    }
  });
} catch (error) {
  console.log('   ❌ Error in QR code test:', error.message);
}

// Test 3: Verify TOTP Code
console.log('\n3. Testing TOTP Verification:');
try {
  const secret = speakeasy.generateSecret({
    name: 'Test User',
    issuer: 'MultiTenant Shell',
    length: 32,
  });
  
  // Generate a current token
  const token = speakeasy.totp({
    secret: secret.base32,
    encoding: 'base32',
    time: Date.now() / 1000
  });
  
  console.log('   🔢 Generated token:', token);
  
  // Verify the token
  const verified = speakeasy.totp.verify({
    secret: secret.base32,
    encoding: 'base32',
    token: token,
    window: 2
  });
  
  console.log('   ✅ Token verification:', verified ? 'SUCCESS' : 'FAILED');
} catch (error) {
  console.log('   ❌ Error in TOTP verification:', error.message);
}

// Test 4: Test Backup Codes
console.log('\n4. Testing Backup Codes Generation:');
try {
  const bcrypt = require('bcrypt');
  const crypto = require('crypto');
  
  // Generate 10 backup codes
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  
  console.log('   ✅ Generated backup codes:', codes.join(', '));
  
  // Test hashing
  const hashedCode = bcrypt.hashSync(codes[0], 10);
  console.log('   🔐 Hashed first code (length):', hashedCode.length);
  
  // Test verification
  const isValid = bcrypt.compareSync(codes[0], hashedCode);
  console.log('   ✅ Backup code verification:', isValid ? 'SUCCESS' : 'FAILED');
} catch (error) {
  console.log('   ❌ Error in backup codes test:', error.message);
}

console.log('\n🎉 2FA Library Testing Complete!');
console.log('\nNext steps:');
console.log('1. Start the backend server: npm run start:dev');
console.log('2. Test endpoints with: apps/backend/test-2fa.http');
console.log('3. Or run unit tests: npm test'); 