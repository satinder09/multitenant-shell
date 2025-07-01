#!/usr/bin/env node
/**
 * MultiTenant Shell Backup System
 * Automated backup and recovery for database and application data
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class BackupSystem {
  constructor() {
    this.config = {
      backupDir: process.env.BACKUP_DIR || './backups',
      retention: {
        daily: 7,    // Keep 7 daily backups
        weekly: 4,   // Keep 4 weekly backups
        monthly: 12  // Keep 12 monthly backups
      },
      compression: true,
      encryption: process.env.BACKUP_ENCRYPTION_KEY || null,
      s3Config: {
        bucket: process.env.BACKUP_S3_BUCKET,
        region: process.env.BACKUP_S3_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    };
    
    this.log('🗄️ Backup System Initialized', 'info');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.config.backupDir, { recursive: true });
      this.log(`📁 Backup directory ready: ${this.config.backupDir}`, 'success');
    } catch (error) {
      throw new Error(`Failed to create backup directory: ${error.message}`);
    }
  }

  async backupDatabase() {
    this.log('💾 Starting database backup...', 'info');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `db-backup-${timestamp}`;
    const backupPath = path.join(this.config.backupDir, `${backupName}.sql`);
    
    try {
      // Get database URL from environment or config
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      // Extract connection details from DATABASE_URL
      const dbUrl = new URL(databaseUrl);
      const dbConfig = {
        host: dbUrl.hostname,
        port: dbUrl.port || 5432,
        database: dbUrl.pathname.slice(1),
        username: dbUrl.username,
        password: dbUrl.password
      };

      // Create pg_dump command
      const pgDumpCmd = [
        'pg_dump',
        `--host=${dbConfig.host}`,
        `--port=${dbConfig.port}`,
        `--username=${dbConfig.username}`,
        `--dbname=${dbConfig.database}`,
        '--verbose',
        '--clean',
        '--no-owner',
        '--no-privileges',
        `--file=${backupPath}`
      ].join(' ');

      // Set password environment variable
      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      
      this.log(`📊 Backing up database: ${dbConfig.database}`, 'info');
      await execAsync(pgDumpCmd, { env });
      
      // Check backup file size
      const stats = await fs.stat(backupPath);
      this.log(`✅ Database backup completed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'success');

      // Compress backup if enabled
      if (this.config.compression) {
        await this.compressFile(backupPath);
      }

      return {
        name: backupName,
        path: backupPath,
        size: stats.size,
        type: 'database'
      };

    } catch (error) {
      this.log(`❌ Database backup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async backupApplicationFiles() {
    this.log('📁 Starting application files backup...', 'info');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `app-backup-${timestamp}`;
    const backupPath = path.join(this.config.backupDir, `${backupName}.tar.gz`);
    
    try {
      // Files and directories to backup
      const backupTargets = [
        'apps/backend/prisma/schema.prisma',
        'apps/backend/src',
        'apps/frontend/app',
        'apps/frontend/components',
        'apps/frontend/shared',
        '.github/workflows',
        'scripts',
        'docker-compose.yml'
      ];

      // Create tar command
      const tarCmd = [
        'tar',
        '-czf',
        backupPath,
        '--exclude=node_modules',
        '--exclude=.git',
        '--exclude=dist',
        '--exclude=.next',
        '--exclude=coverage',
        ...backupTargets
      ].join(' ');

      this.log('📦 Creating application archive...', 'info');
      await execAsync(tarCmd);
      
      const stats = await fs.stat(backupPath);
      this.log(`✅ Application backup completed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'success');

      return {
        name: backupName,
        path: backupPath,
        size: stats.size,
        type: 'application'
      };

    } catch (error) {
      this.log(`❌ Application backup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async backupTenantData() {
    this.log('🏢 Starting tenant data backup...', 'info');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
      // This would typically iterate through tenant databases
      // For now, we'll backup the main database with tenant data
      
      const tenantBackups = [];
      
      // Example: If you have separate tenant databases, iterate through them
      // const tenants = await this.getTenantList();
      // for (const tenant of tenants) {
      //   const tenantBackup = await this.backupTenantDatabase(tenant.id);
      //   tenantBackups.push(tenantBackup);
      // }
      
      // For current implementation, include tenant data in main backup
      this.log('📊 Tenant data included in main database backup', 'info');
      
      return tenantBackups;

    } catch (error) {
      this.log(`❌ Tenant data backup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async compressFile(filePath) {
    try {
      const compressedPath = `${filePath}.gz`;
      const gzipCmd = `gzip "${filePath}"`;
      
      this.log(`🗜️ Compressing: ${path.basename(filePath)}`, 'info');
      await execAsync(gzipCmd);
      
      const stats = await fs.stat(compressedPath);
      this.log(`✅ Compression completed: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'success');
      
      return compressedPath;
    } catch (error) {
      this.log(`⚠️ Compression failed: ${error.message}`, 'warning');
      return filePath; // Return original path if compression fails
    }
  }

  async uploadToS3(backupInfo) {
    if (!this.config.s3Config.bucket || !this.config.s3Config.accessKeyId) {
      this.log('⚠️ S3 configuration not complete, skipping upload', 'warning');
      return false;
    }

    try {
      this.log(`☁️ Uploading to S3: ${backupInfo.name}`, 'info');
      
      // AWS CLI command for upload
      const s3Cmd = [
        'aws s3 cp',
        `"${backupInfo.path}"`,
        `s3://${this.config.s3Config.bucket}/backups/${backupInfo.type}/`,
        '--storage-class STANDARD_IA'
      ].join(' ');

      const env = {
        ...process.env,
        AWS_ACCESS_KEY_ID: this.config.s3Config.accessKeyId,
        AWS_SECRET_ACCESS_KEY: this.config.s3Config.secretAccessKey,
        AWS_DEFAULT_REGION: this.config.s3Config.region
      };

      await execAsync(s3Cmd, { env });
      this.log(`✅ S3 upload completed: ${backupInfo.name}`, 'success');
      
      return true;
    } catch (error) {
      this.log(`❌ S3 upload failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanupOldBackups() {
    this.log('🧹 Cleaning up old backups...', 'info');
    
    try {
      const files = await fs.readdir(this.config.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('db-backup-') || file.startsWith('app-backup-')
      );

      // Sort by creation time (newest first)
      const fileStats = await Promise.all(
        backupFiles.map(async file => {
          const filePath = path.join(this.config.backupDir, file);
          const stats = await fs.stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        })
      );

      fileStats.sort((a, b) => b.mtime - a.mtime);

      // Keep only the specified number of backups
      const toDelete = fileStats.slice(this.config.retention.daily);
      
      for (const fileInfo of toDelete) {
        try {
          await fs.unlink(fileInfo.path);
          this.log(`🗑️ Deleted old backup: ${fileInfo.file}`, 'info');
        } catch (error) {
          this.log(`⚠️ Failed to delete ${fileInfo.file}: ${error.message}`, 'warning');
        }
      }

      this.log(`✅ Cleanup completed. Kept ${this.config.retention.daily} backups`, 'success');

    } catch (error) {
      this.log(`❌ Cleanup failed: ${error.message}`, 'error');
    }
  }

  async createBackupManifest(backups) {
    const manifest = {
      timestamp: new Date().toISOString(),
      backups: backups,
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        hostname: require('os').hostname()
      },
      config: {
        retention: this.config.retention,
        compression: this.config.compression
      }
    };

    const manifestPath = path.join(this.config.backupDir, 'backup-manifest.json');
    
    try {
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      this.log(`📋 Backup manifest created: ${manifestPath}`, 'success');
      return manifestPath;
    } catch (error) {
      this.log(`⚠️ Failed to create manifest: ${error.message}`, 'warning');
    }
  }

  async performFullBackup() {
    this.log('🚀 Starting full system backup...', 'info');
    const startTime = Date.now();
    
    try {
      await this.ensureBackupDirectory();
      
      const backups = [];
      
      // Backup database
      const dbBackup = await this.backupDatabase();
      backups.push(dbBackup);
      
      // Upload to S3 if configured
      if (this.config.s3Config.bucket) {
        await this.uploadToS3(dbBackup);
      }
      
      // Backup application files
      const appBackup = await this.backupApplicationFiles();
      backups.push(appBackup);
      
      if (this.config.s3Config.bucket) {
        await this.uploadToS3(appBackup);
      }
      
      // Backup tenant data
      const tenantBackups = await this.backupTenantData();
      backups.push(...tenantBackups);
      
      // Create backup manifest
      await this.createBackupManifest(backups);
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      
      this.log('🎉 BACKUP COMPLETED SUCCESSFULLY!', 'success');
      this.log(`⏱️ Duration: ${duration} seconds`, 'info');
      this.log(`📊 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`, 'info');
      this.log(`📁 Backups stored in: ${this.config.backupDir}`, 'info');
      
      return {
        success: true,
        duration: parseFloat(duration),
        totalSize,
        backups
      };

    } catch (error) {
      this.log(`❌ BACKUP FAILED: ${error.message}`, 'error');
      throw error;
    }
  }

  async restoreFromBackup(backupName) {
    this.log(`🔄 Starting restore from backup: ${backupName}`, 'info');
    
    try {
      const backupPath = path.join(this.config.backupDir, `${backupName}.sql`);
      const gzBackupPath = `${backupPath}.gz`;
      
      let restorePath = backupPath;
      
      // Check if compressed version exists
      try {
        await fs.access(gzBackupPath);
        this.log('🗜️ Decompressing backup...', 'info');
        await execAsync(`gunzip -k "${gzBackupPath}"`);
        restorePath = backupPath;
      } catch {
        // Use uncompressed version
      }
      
      // Restore database
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      const dbUrl = new URL(databaseUrl);
      const dbConfig = {
        host: dbUrl.hostname,
        port: dbUrl.port || 5432,
        database: dbUrl.pathname.slice(1),
        username: dbUrl.username,
        password: dbUrl.password
      };

      const psqlCmd = [
        'psql',
        `--host=${dbConfig.host}`,
        `--port=${dbConfig.port}`,
        `--username=${dbConfig.username}`,
        `--dbname=${dbConfig.database}`,
        `--file=${restorePath}`
      ].join(' ');

      const env = { ...process.env, PGPASSWORD: dbConfig.password };
      
      this.log('📊 Restoring database...', 'info');
      await execAsync(psqlCmd, { env });
      
      this.log('✅ Database restore completed successfully!', 'success');
      
      return { success: true, backupName };

    } catch (error) {
      this.log(`❌ Restore failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const backupSystem = new BackupSystem();
  
  try {
    switch (command) {
      case 'backup':
        await backupSystem.performFullBackup();
        break;
        
      case 'restore':
        const backupName = process.argv[3];
        if (!backupName) {
          console.error('Usage: node backup-system.js restore <backup-name>');
          process.exit(1);
        }
        await backupSystem.restoreFromBackup(backupName);
        break;
        
      case 'list':
        const backupDir = backupSystem.config.backupDir;
        console.log(`📁 Backups in ${backupDir}:`);
        const files = await fs.readdir(backupDir);
        files.filter(f => f.includes('backup')).forEach(file => {
          console.log(`  📄 ${file}`);
        });
        break;
        
      default:
        console.log('Usage:');
        console.log('  node backup-system.js backup    - Perform full backup');
        console.log('  node backup-system.js restore <name> - Restore from backup');
        console.log('  node backup-system.js list      - List available backups');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = BackupSystem;

// Run CLI if called directly
if (require.main === module) {
  main();
} 