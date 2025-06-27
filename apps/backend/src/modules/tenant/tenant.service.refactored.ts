// Refactored Tenant Service using Repository Pattern
// Clean separation between business logic and data access

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { PrismaClient as MasterPrismaClient } from '../../../generated/master-prisma';

// Repository imports
import { 
  ITenantRepository, 
  REPOSITORY_TOKENS,
  TenantEntity 
} from '../../common/repositories';

// DTOs
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { GetTenantsQueryDto } from './dto/get-tenants-query.dto';

@Injectable()
export class TenantServiceRefactored {
  private readonly logger = new Logger(TenantServiceRefactored.name);

  constructor(
    @Inject(REPOSITORY_TOKENS.TENANT_REPOSITORY)
    private readonly tenantRepository: ITenantRepository,
    private readonly config: ConfigService,
  ) {}

  async create(createTenantDto: CreateTenantDto, creatorId: string): Promise<TenantEntity> {
    this.logger.log(`Creating tenant: ${createTenantDto.name} for user: ${creatorId}`);
    
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const dbName = `db_xl_${createTenantDto.name.toLowerCase().replace(/\s/g, '')}_${randomSuffix}`;

    // 1. Create the tenant record using repository
    let tenant: TenantEntity;
    try {
      const tenantData = {
        ...createTenantDto,
        subdomain: createTenantDto.name.toLowerCase().replace(/\s/g, ''),
        dbName,
        encryptedDbUrl: this.encryptUrl(this.getDbUrlForTenant(dbName)),
      };

      tenant = await this.tenantRepository.createWithProvisioning(tenantData, creatorId);
      this.logger.log(`Tenant record created with ID: ${tenant.id}`);
    } catch (error) {
      this.logger.error('Failed to create tenant record', error);
      throw new InternalServerErrorException('Failed to create tenant record.');
    }

    // 2. Provision the database
    try {
      await this.provisionTenantDatabase(dbName);
      this.logger.log(`Database provisioned successfully for tenant: ${tenant.id}`);
    } catch (error) {
      this.logger.error(`Failed to provision database for tenant ${tenant.id}. Rolling back...`, error);
      
      // Rollback: delete the tenant record if provisioning fails
      await this.tenantRepository.delete(tenant.id);
      throw new InternalServerErrorException('Failed to create tenant database.');
    }

    return tenant;
  }

  async findAll(queryDto?: GetTenantsQueryDto) {
    this.logger.log('📋 Executing findAll with repository pattern');
    
    const optimizedQuery = queryDto || {
      page: 1,
      limit: 50,
      sort: { field: 'createdAt', direction: 'desc' as const }
    };
    
    return this.tenantRepository.findWithComplexQuery(optimizedQuery);
  }

  async findWithComplexQuery(queryDto: any) {
    this.logger.log('🔍 Executing complex query via repository');
    return this.tenantRepository.findWithComplexQuery(queryDto);
  }

  async findOne(id: string): Promise<TenantEntity> {
    this.logger.log(`Finding tenant by ID: ${id}`);
    
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantEntity> {
    this.logger.log(`Updating tenant: ${id}`);
    
    // Check if tenant exists
    const existingTenant = await this.tenantRepository.findById(id);
    if (!existingTenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    
    return this.tenantRepository.update(id, updateTenantDto);
  }

  async findBySubdomain(subdomain: string): Promise<TenantEntity | null> {
    this.logger.log(`Finding tenant by subdomain: ${subdomain}`);
    return this.tenantRepository.findBySubdomain(subdomain);
  }

  async activateTenant(id: string): Promise<TenantEntity> {
    this.logger.log(`Activating tenant: ${id}`);
    return this.tenantRepository.updateTenantStatus(id, true);
  }

  async deactivateTenant(id: string): Promise<TenantEntity> {
    this.logger.log(`Deactivating tenant: ${id}`);
    return this.tenantRepository.updateTenantStatus(id, false);
  }

  async grantUserAccess(tenantId: string, userId: string): Promise<void> {
    this.logger.log(`Granting user ${userId} access to tenant ${tenantId}`);
    
    // Verify tenant exists
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }
    
    await this.tenantRepository.grantPermission(tenantId, userId);
  }

  async revokeUserAccess(tenantId: string, userId: string): Promise<void> {
    this.logger.log(`Revoking user ${userId} access from tenant ${tenantId}`);
    await this.tenantRepository.revokePermission(tenantId, userId);
  }

  async getUserTenants(userId: string): Promise<TenantEntity[]> {
    this.logger.log(`Getting tenants for user: ${userId}`);
    return this.tenantRepository.findTenantsWithPermissions(userId);
  }

  async getActiveTenants(): Promise<TenantEntity[]> {
    this.logger.log('Getting all active tenants');
    return this.tenantRepository.findActiveTenants();
  }

  // Private helper methods (business logic)
  private getDbUrlForTenant(dbName: string): string {
    const originalUrl = this.config.get<string>('DATABASE_URL');
    if (!originalUrl) {
      throw new InternalServerErrorException('DATABASE_URL is not configured.');
    }
    const url = new URL(originalUrl);
    url.pathname = `/${dbName}`;
    return url.toString();
  }

  private async provisionTenantDatabase(dbName: string): Promise<void> {
    this.logger.log(`Provisioning new database: ${dbName}`);
    
    // Create a temporary client to connect to the default 'postgres' database
    const defaultDbUrl = this.getDbUrlForTenant('postgres');
    const prisma = new MasterPrismaClient({
      datasources: { db: { url: defaultDbUrl } },
    });

    try {
      // 1. Create the new database
      await prisma.$executeRawUnsafe(`CREATE DATABASE "${dbName}";`);
      this.logger.log(`Database "${dbName}" created.`);
    } catch (error) {
      this.logger.error(`Failed to create database "${dbName}"`, error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
    
    // 2. Run migrations on the new database
    this.logger.log(`Running migrations for database: ${dbName}`);
    const tenantDbUrl = this.getDbUrlForTenant(dbName);
    const schemaPath = 'prisma/tenant-template/schema.prisma';

    try {
      execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
        env: { ...process.env, DATABASE_URL: tenantDbUrl },
        stdio: 'inherit',
      });
      this.logger.log(`Migrations applied successfully to "${dbName}".`);
    } catch (error) {
      this.logger.error(`Failed to apply migrations to "${dbName}"`, error);
      throw error;
    }
  }

  private encryptUrl(url: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = this.config.get<string>('ENCRYPTION_KEY');
    
    if (!secretKey) {
      throw new InternalServerErrorException('ENCRYPTION_KEY is not configured.');
    }

    // Ensure the key is 32 bytes (256 bits)
    const key = crypto.createHash('sha256').update(secretKey).digest();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(url, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to the encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptUrl(encryptedHex: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = this.config.get<string>('ENCRYPTION_KEY');
    
    if (!secretKey) {
      throw new InternalServerErrorException('ENCRYPTION_KEY is not configured.');
    }

    // Ensure the key is 32 bytes (256 bits)
    const key = crypto.createHash('sha256').update(secretKey).digest();
    
    // Split IV and encrypted data
    const parts = encryptedHex.split(':');
    if (parts.length !== 2) {
      throw new InternalServerErrorException('Invalid encrypted URL format.');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
} 