// apps/backend/src/modules/tenant/tenant.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MasterDatabaseService } from '../../database/master/master-database.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { GetTenantsQueryDto } from '../dto/get-tenants-query.dto';
import { execSync } from 'child_process';
import { PrismaClient as MasterPrismaClient } from '../../../../generated/master-prisma';
import { QueryBuilderUtils, FieldMapping } from '../../../shared/utils/query-builder.utils';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly masterPrisma: MasterDatabaseService,
    private readonly config: ConfigService,
  ) {}

  async create(createTenantDto: CreateTenantDto, creatorId: string) {
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const dbName = `db_xl_${createTenantDto.name.toLowerCase().replace(/\s/g, '')}_${randomSuffix}`;

    // 1. Create the tenant record in the master database
    const tenant = await this.masterPrisma.tenant.create({
      data: {
        name: createTenantDto.name,
        subdomain: createTenantDto.name.toLowerCase().replace(/\s/g, ''),
        dbName: dbName,
        encryptedDbUrl: this.encryptUrl(
          this.getDbUrlForTenant(dbName),
        ),
        // Grant permission to the user who created the tenant
        permissions: {
          create: {
            userId: creatorId,
          },
        },
      },
    });

    // 2. Provision the new database and run migrations
    try {
      await this.provisionTenantDatabase(dbName);
    } catch (error) {
      this.logger.error(`Failed to provision database for tenant ${tenant.id}. Rolling back...`, error);
      // Rollback: delete the tenant record if provisioning fails
      await this.masterPrisma.tenant.delete({ where: { id: tenant.id } });
      throw new InternalServerErrorException('Failed to create tenant database.');
    }

    return tenant;
  }

  private getDbUrlForTenant(dbName: string): string {
    const originalUrl = this.config.get<string>('DATABASE_URL');
    if (!originalUrl) {
      throw new InternalServerErrorException('DATABASE_URL is not configured.');
    }
    const url = new URL(originalUrl);
    url.pathname = `/${dbName}`;
    return url.toString();
  }

  private async provisionTenantDatabase(dbName: string) {
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
      throw error; // Propagate error to be caught by the caller
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
      // Optional: Add logic to drop the created database on migration failure
      throw error;
    }
  }

  async findAll(queryDto?: GetTenantsQueryDto) {
    this.logger.log('📋 Executing optimized findAll with minimal includes');
    
    // Always use the optimized query method, even for simple queries
    const optimizedQuery = queryDto || {
      page: 1,
      limit: 50, // Reasonable default limit
      sort: { field: 'createdAt', direction: 'desc' as const }
    };
    
    return this.findWithComplexQuery(optimizedQuery);
  }

  async findWithComplexQuery(queryDto: any) {
    this.logger.log('🔍 Starting optimized query analysis...');
    
    // Use shared utilities for query building
    const fieldMappings = this.getFieldMappings();
    const requiredIncludes = QueryBuilderUtils.analyzeRequiredIncludes(queryDto.complexFilter);
    const whereClause = QueryBuilderUtils.buildWhereClause(queryDto.complexFilter, fieldMappings);
    const orderBy = QueryBuilderUtils.buildOrderBy(queryDto.sort);
    const pagination = QueryBuilderUtils.buildPagination(queryDto.page, queryDto.limit);

    const includeCount = Object.keys(requiredIncludes).length;
    const hasFilters = Object.keys(whereClause).length > 0;
    
    this.logger.log(`📊 Required includes: ${includeCount > 0 ? JSON.stringify(requiredIncludes, null, 2) : 'NONE (base fields only)'}`);
    this.logger.log(`🎯 Generated where clause: ${hasFilters ? JSON.stringify(whereClause, null, 2) : 'NONE (no filtering)'}`);
    this.logger.log(`📈 Order by: ${JSON.stringify(orderBy)}`);
    this.logger.log(`📄 Pagination: skip=${pagination.skip}, take=${pagination.take}`);

    this.logger.log('🚀 Executing optimized database query with filters applied first...');
    const startTime = Date.now();
    
    // Execute the optimized query
    const [data, total] = await Promise.all([
      this.masterPrisma.tenant.findMany({
        where: whereClause,
        include: requiredIncludes,
        orderBy,
        ...pagination,
      }),
      this.masterPrisma.tenant.count({
        where: whereClause,
      }),
    ]);

    const queryTime = Date.now() - startTime;
    const efficiency = total > 0 ? `${((data.length / total) * 100).toFixed(1)}%` : '100%';
    this.logger.log(`✅ Query completed in ${queryTime}ms - Retrieved ${data.length}/${total} records (${efficiency} efficiency)`);

    // Use shared utility for response formatting
    return QueryBuilderUtils.formatResponse(data, total, queryDto);
  }

  /**
   * Get field mappings for tenant entity
   */
  private getFieldMappings(): Record<string, FieldMapping> {
    return {
      name: {
        type: 'string',
        operators: ['contains', 'equals', 'starts_with', 'ends_with', 'not_contains', 'not_equals']
      },
      subdomain: {
        type: 'string',
        operators: ['contains', 'equals', 'starts_with', 'ends_with', 'not_contains', 'not_equals']
      },
      dbName: {
        type: 'string',
        operators: ['contains', 'equals', 'starts_with', 'ends_with']
      },
      isActive: {
        type: 'boolean',
        operators: ['equals', 'not_equals']
      },
      createdAt: {
        type: 'date',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between']
      },
      updatedAt: {
        type: 'date',
        operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between']
      }
    };
  }

  async findOne(id: string) {
    const tenant = await this.masterPrisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  update(id: string, updateTenantDto: UpdateTenantDto) {
    return this.masterPrisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  /**
   * Bulk update tenants by IDs
   */
  bulkUpdate(ids: string[], data: UpdateTenantDto) {
    return this.masterPrisma.tenant.updateMany({
      where: { id: { in: ids } },
      data,
    });
  }

  /**
   * Bulk delete tenants by IDs
   */
  bulkDelete(ids: string[]) {
    return this.masterPrisma.tenant.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async findBySubdomain(subdomain: string) {
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { subdomain },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found');
    }
    
    // Return the full tenant object for platform context
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      url: `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'lvh.me'}`,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      planType: 'standard', // Default plan type
      features: ['basic'], // Default features
      userCount: 0, // TODO: Calculate actual user count if needed
    };
  }

  async resolveTenantForMiddleware(subdomain: string) {
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { subdomain },
    });
    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found');
    }
    const databaseUrl = this.decryptUrl(tenant.encryptedDbUrl);
    return { id: tenant.id, databaseUrl };
  }

  private decryptUrl(encryptedHex: string): string {
    // 1) Load & derive key
    const keyString = this.config.get<string>(
      'TENANT_DB_ENCRYPTION_KEY',
    );
    if (!keyString) {
      this.logger.error('TENANT_DB_ENCRYPTION_KEY is not set');
      throw new Error('Encryption key missing');
    }
    const key = crypto
      .createHash('sha256')
      .update(keyString)
      .digest();
    this.logger.debug(`Key (sha256 hex): ${key.toString('hex')}`);

    // 2) Parse the hex into Buffer
    let encrypted: Buffer;
    try {
      encrypted = Buffer.from(encryptedHex, 'hex');
    } catch (err) {
      this.logger.error(
        `Failed to parse encryptedHex: not valid hex (${encryptedHex.length} chars)`,
      );
      throw err;
    }
    this.logger.debug(
      `Encrypted buffer length: ${encrypted.length} bytes`,
    );

    // 3) Split IV / ciphertext
    if (encrypted.length <= 16) {
      this.logger.error(
        `Encrypted data too short: ${encrypted.length} bytes (need >16)`,
      );
      throw new Error('Invalid encrypted data length');
    }
    const iv = encrypted.slice(0, 16);
    const ciphertext = encrypted.slice(16);
    this.logger.debug(`IV (hex): ${iv.toString('hex')}`);
    this.logger.debug(
      `Ciphertext length: ${ciphertext.length} bytes`,
    );

    // 4) Decrypt
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        key,
        iv,
      );
      let url = decipher.update(ciphertext, undefined, 'utf8');
      url += decipher.final('utf8');
      this.logger.debug(`Decrypted URL: ${url}`);
      return url;
    } catch (err: any) {
      this.logger.error(
        `Decrypt error: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  private encryptUrl(url: string): string {
    const keyString = this.config.get<string>('TENANT_DB_ENCRYPTION_KEY');
    if (!keyString) {
      this.logger.error('TENANT_DB_ENCRYPTION_KEY is not set');
      throw new Error('Encryption key missing');
    }
    const key = crypto.createHash('sha256').update(keyString).digest();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(url, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + encrypted;
  }
}
