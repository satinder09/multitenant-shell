// Comprehensive testing utilities for backend
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

// Mock data generators
export class MockDataGenerator {
  static generateUser(overrides: Partial<any> = {}) {
    return {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      email: `test-${Math.random().toString(36).substr(2, 5)}@example.com`,
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static generateTenant(overrides: Partial<any> = {}) {
    return {
      id: 'tenant-' + Math.random().toString(36).substr(2, 9),
      name: 'Test Tenant',
      subdomain: 'test-' + Math.random().toString(36).substr(2, 5),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static generateRole(overrides: Partial<any> = {}) {
    return {
      id: 'role-' + Math.random().toString(36).substr(2, 9),
      name: 'Test Role',
      description: 'Test role description',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static generatePermission(overrides: Partial<any> = {}) {
    return {
      id: 'perm-' + Math.random().toString(36).substr(2, 9),
      name: 'test:permission',
      description: 'Test permission',
      resource: 'test',
      action: 'read',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static generateJwtPayload(overrides: Partial<any> = {}) {
    return {
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      tenantId: 'tenant-123',
      roles: ['user'],
      permissions: ['read:profile'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    };
  }
}

// Mock services
export class MockPrismaService {
  // User operations
  user = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  // Tenant operations
  tenant = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  // Role operations
  role = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  // Permission operations
  permission = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  // Transaction support
  $transaction = jest.fn();

  // Reset all mocks
  resetMocks() {
    Object.values(this.user).forEach(mock => mock.mockReset());
    Object.values(this.tenant).forEach(mock => mock.mockReset());
    Object.values(this.role).forEach(mock => mock.mockReset());
    Object.values(this.permission).forEach(mock => mock.mockReset());
    this.$transaction.mockReset();
  }
}

export class MockConfigService {
  private config: Record<string, any> = {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '1h',
    DATABASE_URL: 'test-database-url',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
  };

  get(key: string, defaultValue?: any) {
    return this.config[key] ?? defaultValue;
  }

  set(key: string, value: any) {
    this.config[key] = value;
  }
}

export class MockJwtService {
  sign = jest.fn().mockReturnValue('mock-jwt-token');
  verify = jest.fn().mockReturnValue(MockDataGenerator.generateJwtPayload());
  decode = jest.fn().mockReturnValue(MockDataGenerator.generateJwtPayload());
}

export class MockCacheService {
  get = jest.fn().mockResolvedValue(null);
  set = jest.fn().mockResolvedValue(true);
  del = jest.fn().mockResolvedValue(true);
  exists = jest.fn().mockResolvedValue(false);
  invalidateByTag = jest.fn().mockResolvedValue(0);
  flushAll = jest.fn().mockResolvedValue(true);
}

// Test module builder
export class TestModuleBuilder {
  private providers: any[] = [];
  private imports: any[] = [];
  private controllers: any[] = [];

  addProvider(provider: any) {
    this.providers.push(provider);
    return this;
  }

  addMockProvider(token: any, mockImplementation: any) {
    this.providers.push({
      provide: token,
      useValue: mockImplementation,
    });
    return this;
  }

  addController(controller: any) {
    this.controllers.push(controller);
    return this;
  }

  addImport(module: any) {
    this.imports.push(module);
    return this;
  }

  withMockDatabase(token = 'PrismaService') {
    return this.addMockProvider(token, new MockPrismaService());
  }

  withMockTenantDatabase(token = 'PrismaTenantService') {
    return this.addMockProvider(token, new MockPrismaService());
  }

  withMockConfig() {
    return this.addMockProvider(ConfigService, new MockConfigService());
  }

  withMockJwt() {
    return this.addMockProvider(JwtService, new MockJwtService());
  }

  withMockCache(token = 'CacheService') {
    return this.addMockProvider(token, new MockCacheService());
  }

  async build(): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: this.imports,
      controllers: this.controllers,
      providers: this.providers,
    }).compile();
  }
}

// Authentication helpers
export class AuthTestHelper {
  static createMockRequest(user?: any, tenant?: any) {
    return {
      user: user || MockDataGenerator.generateUser(),
      tenant: tenant || MockDataGenerator.generateTenant(),
      headers: {
        authorization: 'Bearer mock-token',
      },
    };
  }

  static createMockAuthGuardContext(user?: any, tenant?: any) {
    return {
      switchToHttp: () => ({
        getRequest: () => AuthTestHelper.createMockRequest(user, tenant),
      }),
    };
  }

  static mockJwtGuard() {
    return {
      canActivate: jest.fn().mockReturnValue(true),
    };
  }

  static mockRolesGuard() {
    return {
      canActivate: jest.fn().mockReturnValue(true),
    };
  }
}

// Database test helpers
export class DatabaseTestHelper {
  static async cleanupDatabase(prisma: any) {
    // Clean up test data in reverse dependency order
    await prisma.userRole?.deleteMany();
    await prisma.rolePermission?.deleteMany();
    await prisma.permission?.deleteMany();
    await prisma.role?.deleteMany();
    await prisma.tenantUser?.deleteMany();
    await prisma.user?.deleteMany();
    await prisma.tenant?.deleteMany();
  }

  static async seedTestData(prisma: any) {
    const tenant = await prisma.tenant.create({
      data: MockDataGenerator.generateTenant({ subdomain: 'test-tenant' }),
    });

    const user = await prisma.user.create({
      data: MockDataGenerator.generateUser({ email: 'test@example.com' }),
    });

    const role = await prisma.role.create({
      data: MockDataGenerator.generateRole({ name: 'Test Role' }),
    });

    const permission = await prisma.permission.create({
      data: MockDataGenerator.generatePermission({ name: 'test:read' }),
    });

    return { tenant, user, role, permission };
  }
}

// API testing helpers
export class ApiTestHelper {
  static createMockResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
  }

  static createMockNext() {
    return jest.fn();
  }

  static expectSuccessResponse(response: any, data?: any) {
    expect(response.status).toHaveBeenCalledWith(200);
    if (data) {
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining(data),
        })
      );
    }
  }

  static expectErrorResponse(response: any, statusCode: number, message?: string) {
    expect(response.status).toHaveBeenCalledWith(statusCode);
    if (message) {
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining(message),
          }),
        })
      );
    }
  }
}

// Performance testing utilities
export class PerformanceTestHelper {
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    return { result, duration };
  }

  static async runLoadTest(fn: () => Promise<any>, options: {
    concurrent: number;
    iterations: number;
    timeout?: number;
  }): Promise<{
    successCount: number;
    errorCount: number;
    averageTime: number;
    maxTime: number;
    minTime: number;
  }> {
    const results: { success: boolean; duration: number }[] = [];
    const timeout = options.timeout || 30000;

    for (let i = 0; i < options.iterations; i++) {
      const promises = Array(options.concurrent).fill(null).map(async () => {
        try {
          const { duration } = await Promise.race([
            PerformanceTestHelper.measureExecutionTime(fn),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), timeout)
            ),
          ]);
          return { success: true, duration };
        } catch (error) {
          return { success: false, duration: timeout };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    const successResults = results.filter(r => r.success);
    const durations = successResults.map(r => r.duration);

    return {
      successCount: successResults.length,
      errorCount: results.length - successResults.length,
      averageTime: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      maxTime: durations.length > 0 ? Math.max(...durations) : 0,
      minTime: durations.length > 0 ? Math.min(...durations) : 0,
    };
  }
}

// Export all utilities
export const testUtils = {
  MockDataGenerator,
  MockPrismaService,
  MockConfigService,
  MockJwtService,
  MockCacheService,
  TestModuleBuilder,
  AuthTestHelper,
  DatabaseTestHelper,
  ApiTestHelper,
  PerformanceTestHelper,
}; 