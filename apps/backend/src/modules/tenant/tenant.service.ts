// apps/backend/src/modules/tenant/tenant.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MasterPrismaService } from '../master-prisma/master-prisma.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { execSync } from 'child_process';
import { PrismaClient as MasterPrismaClient } from '../../../generated/master-prisma';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly masterPrisma: MasterPrismaService,
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

  async findAll() {
    return this.masterPrisma.tenant.findMany();
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

  async findBySubdomain(subdomain: string) {
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
