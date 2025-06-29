import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../src/infrastructure/validation/environment.config';

// Global test configuration
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_master';
  process.env.TENANT_DATABASE_URL = 'postgresql://test:test@localhost:5432/test_tenant';
  process.env.TENANT_DB_ENCRYPTION_KEY = 'test-encryption-key-32-characters';
  process.env.ENABLE_DEBUG_LOGGING = 'false';
});

// Mock external services
jest.mock('../src/domains/database/tenant/get-tenant-client', () => ({
  getTenantClient: jest.fn(),
  startClientCleanup: jest.fn(),
  shutdownAllClients: jest.fn(),
}));

// Global test utilities
export const createTestingModule = async (providers: any[] = []) => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        validate: validateEnvironment,
        isGlobal: true,
      }),
    ],
    providers,
  }).compile();
};

// Database test helpers
export const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  // Add other models as needed
};

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
}); 