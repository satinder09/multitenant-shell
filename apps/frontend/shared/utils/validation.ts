import { z } from 'zod';
import type { ValidationError, RecordValue } from '../types/common';

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(254, 'Email must be less than 254 characters');

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

// Common string validation
export const requiredStringSchema = z
  .string()
  .trim()
  .min(1, 'This field is required');

export const optionalStringSchema = z
  .string()
  .trim()
  .optional();

// ID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid ID format');

export const cuidSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/, 'Invalid ID format');

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// Sort validation
export const sortSchema = z.object({
  field: z.string().min(1),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

// Search validation
export const searchSchema = z.object({
  search: z.string().trim().max(100).optional(),
  ...paginationSchema.shape,
  sort: sortSchema.optional(),
});

// ============================================================================
// ENHANCED AUTH SCHEMAS (CHUNK 1 IMPROVEMENT)
// ============================================================================

// Enhanced login schema with rememberMe support
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'), // Don't validate strength on login
  rememberMe: z.boolean().default(false).optional(),
});

// Enhanced login form schema (for frontend forms with additional UI state)
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false).optional(),
});

// Registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: requiredStringSchema.max(100, 'Name must be less than 100 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Password change schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Password reset schemas
export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile update schema
export const updateProfileSchema = z.object({
  name: requiredStringSchema.max(100, 'Name must be less than 100 characters').optional(),
  email: emailSchema.optional(),
});

// ============================================================================
// TYPESCRIPT TYPES DERIVED FROM SCHEMAS (CHUNK 1 IMPROVEMENT) 
// ============================================================================

// Auth types
export type LoginData = z.infer<typeof loginSchema>;
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
export type RequestPasswordResetData = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;

// Common types
export type EmailData = z.infer<typeof emailSchema>;
export type PaginationData = z.infer<typeof paginationSchema>;
export type SearchData = z.infer<typeof searchSchema>;
export type SortData = z.infer<typeof sortSchema>;

// Tenant types
export type CreateTenantData = z.infer<typeof createTenantSchema>;
export type UpdateTenantData = z.infer<typeof updateTenantSchema>;

// User types  
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;

// Platform admin types
export type ImpersonationData = z.infer<typeof impersonationSchema>;
export type SecureLoginData = z.infer<typeof secureLoginSchema>;

// Filter types
export type FilterRuleData = z.infer<typeof filterRuleSchema>;
export type FilterGroupData = z.infer<typeof filterGroupSchema>;
export type ComplexFilterData = z.infer<typeof complexFilterSchema>;

// Tenant schemas
export const createTenantSchema = z.object({
  name: requiredStringSchema
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  subdomain: requiredStringSchema
    .max(63, 'Subdomain must be less than 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]/, 'Subdomain must start with a letter or number')
    .regex(/[a-z0-9]$/, 'Subdomain must end with a letter or number'),
});

export const updateTenantSchema = z.object({
  name: requiredStringSchema.max(100).optional(),
  isActive: z.boolean().optional(),
});

// User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  name: requiredStringSchema.max(100),
  password: passwordSchema.optional(), // Optional for invitation flow
  role: requiredStringSchema.max(50),
});

export const updateUserSchema = z.object({
  name: requiredStringSchema.max(100).optional(),
  email: emailSchema.optional(),
  isActive: z.boolean().optional(),
  role: requiredStringSchema.max(50).optional(),
});

// Platform admin schemas
export const impersonationSchema = z.object({
  tenantId: uuidSchema,
  targetUserId: uuidSchema,
  reason: requiredStringSchema.max(255),
  duration: z.number().int().min(1).max(480), // Max 8 hours
});

export const secureLoginSchema = z.object({
  tenantId: uuidSchema,
  reason: requiredStringSchema.max(255),
  duration: z.number().int().min(1).max(480), // Max 8 hours
});

// Filter schemas
export const filterOperatorSchema = z.enum([
  'equals', 'not_equals',
  'contains', 'not_contains', 'starts_with', 'ends_with',
  'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal',
  'between', 'not_between',
  'in', 'not_in',
  'is_empty', 'is_not_empty'
]);

export const filterRuleSchema = z.object({
  id: z.string(),
  field: z.string().min(1),
  operator: filterOperatorSchema,
  value: z.any(),
  label: z.string().optional(),
});

export const filterGroupSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string(),
  logic: z.enum(['AND', 'OR']),
  rules: z.array(filterRuleSchema),
  groups: z.array(filterGroupSchema),
}));

export const complexFilterSchema = z.object({
  rootGroup: filterGroupSchema,
});

// Validation helper functions
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateDataSafe<T>(
  schema: z.ZodSchema<T>, 
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: ValidationError[] = result.error.errors.map((error: any) => ({
    field: error.path.join('.'),
    message: error.message,
    value: error.code === 'invalid_type' ? (data as RecordValue) : undefined,
  }));
  
  return { success: false, errors };
}

// Input sanitization
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\x00/g, '') // Remove null bytes
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Business rule validations
export function validateTenantSubdomain(subdomain: string): boolean {
  const reserved = [
    'www', 'api', 'admin', 'root', 'master', 'platform',
    'mail', 'ftp', 'localhost', 'staging', 'test', 'dev'
  ];
  
  return !reserved.includes(subdomain.toLowerCase());
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include at least one lowercase letter');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include at least one uppercase letter');

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Include at least one number');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Include at least one special character');

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeating characters');
    score -= 1;
  }

  if (/^(?:password|123456|qwerty|abc123)$/i.test(password)) {
    feedback.push('Avoid common passwords');
    score -= 2;
  }

  return {
    isValid: score >= 3 && password.length >= 8,
    score: Math.max(0, score),
    feedback: feedback.length > 0 ? feedback : ['Password is strong']
  };
}

// Rate limiting validation
export function validateRateLimit(
  attempts: number, 
  windowMs: number, 
  maxAttempts: number = 5
): { allowed: boolean; resetTime?: Date } {
  if (attempts >= maxAttempts) {
    return {
      allowed: false,
      resetTime: new Date(Date.now() + windowMs)
    };
  }
  
  return { allowed: true };
} 