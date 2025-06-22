// encrypt-test.js
const crypto = require('crypto');

const keyString = process.env.TENANT_DB_ENCRYPTION_KEY;
if (!keyString) {
  console.error('✖ TENANT_DB_ENCRYPTION_KEY is not set');
  process.exit(1);
}
const masterKey = crypto.createHash('sha256').update(keyString).digest();
console.log('Key (sha256 hex):', masterKey.toString('hex'));

const url = process.env.TENANT_DATABASE_URL;
if (!url) {
  console.error('✖ TENANT_DATABASE_URL is not set');
  process.exit(1);
}
console.log('Plain URL:', url);

// Encrypt
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', masterKey, iv);
const encrypted = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()]);
const hex = Buffer.concat([iv, encrypted]).toString('hex');
console.log('Encrypted (hex):', hex);
console.log('Encrypted length (bytes):', iv.length + encrypted.length);

// Decrypt to verify
const buf = Buffer.from(hex, 'hex');
const iv2 = buf.slice(0, 16);
const ct2 = buf.slice(16);
const decipher = crypto.createDecipheriv('aes-256-cbc', masterKey, iv2);
let decrypted = decipher.update(ct2, undefined, 'utf8');
decrypted += decipher.final('utf8');
console.log('Decrypted back:', decrypted);
