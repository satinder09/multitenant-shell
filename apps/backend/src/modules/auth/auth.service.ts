// apps/backend/src/modules/auth/auth.service.ts

import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MasterPrismaService } from '../master-prisma/master-prisma.service';
import { TenantPrismaService } from '../prisma-tenant/tenant-prisma.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponse } from './interfaces/login-response.interface';
import { TenantAccessOption } from './tenant-access.controller';
import { AccessType, ImpersonationStatus } from '../../../generated/master-prisma';

@Injectable()
export class AuthService {
  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantPrisma: TenantPrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async validateMasterUser(email: string, pass: string) {
    const user = await this.masterPrisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...safe } = user;
      return safe;
    }
    return null;
  }

  async login(
    dto: Omit<LoginDto, 'tenantId'>,
    tenantId?: string,
  ): Promise<LoginResponse> {
    if (tenantId && tenantId.trim() !== '') {
      // Only check tenant DB for credentials
      try {
        const user = await this.tenantPrisma.db.user.findUnique({ where: { email: dto.email } });
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
          throw new UnauthorizedException('Invalid credentials');
        }
              const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        tenantContext: tenantId,
      };
        const accessToken = this.jwt.sign(payload);
        return { accessToken };
      } catch (error) {
        console.error('Error accessing tenant database:', error);
        throw new UnauthorizedException('Invalid tenant or credentials');
      }
    } else {
      // Only check master DB for credentials (platform login)
      const user = await this.validateMasterUser(dto.email, dto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const payload = {
        sub: user.id,
        isSuperAdmin: user.isSuperAdmin,
        email: user.email,
        name: user.name,
      };
      const accessToken = this.jwt.sign(payload);
      return { accessToken };
    }
  }

  // Get tenant access options for user
  async getTenantAccessOptions(userId: string): Promise<TenantAccessOption[]> {
    const user = await this.masterPrisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tenants = await this.masterPrisma.tenant.findMany({
      where: { isActive: true }
    });

    const options: TenantAccessOption[] = [];

    for (const tenant of tenants) {
      const canAccess = user.isSuperAdmin || 
        await this.hasTenantAccessPermission(userId, tenant.id);
      
      const canImpersonate = user.isSuperAdmin || 
        await this.hasImpersonationPermission(userId, tenant.id);

      if (canAccess || canImpersonate) {
        options.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          subdomain: tenant.subdomain,
          canAccess,
          canImpersonate,
          accessLevel: await this.getAccessLevel(userId, tenant.id),
          lastAccessed: await this.getLastAccessTime(userId, tenant.id)
        });
      }
    }

    return options;
  }

  // Secure login to tenant
  async secureLoginToTenant(
    userId: string,
    tenantId: string,
    durationMinutes: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; redirectUrl: string }> {
    const user = await this.masterPrisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Validate access permission
    const canAccess = user.isSuperAdmin || 
      await this.hasTenantAccessPermission(userId, tenantId);
    
    if (!canAccess) {
      throw new ForbiddenException('No access permission for this tenant');
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const payload = {
      sub: user.id,
      isSuperAdmin: user.isSuperAdmin,
      email: user.email,
      name: user.name,
      tenantContext: tenantId,
      accessType: 'secure_login',
      expiresAt: expiresAt.toISOString(),
      originalUserId: user.id,
      impersonatedUserId: null,
      reason: reason
    };

    // Log the secure access
    await this.logTenantAccess(userId, tenantId, 'SECURE_LOGIN', expiresAt, reason, ipAddress, userAgent);

    const accessToken = this.jwt.sign(payload);
    const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
    const frontendPort = process.env.FRONTEND_PORT || '3000';
    const redirectUrl = `http://${tenant.subdomain}.${baseDomain}:${frontendPort}`;

    return { accessToken, redirectUrl };
  }

  // Start impersonation
  async startImpersonation(
    adminUser: { id: string; email: string; name: string; isSuperAdmin?: boolean; tenantId?: string },
    tenantId: string,
    targetUserId: string,
    reason: string,
    durationMinutes: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; redirectUrl: string }> {
    // Validate impersonation permission
    const canImpersonate = await this.validateImpersonationPermission(
      adminUser.id, 
      tenantId
    );
    
    if (!canImpersonate) {
      throw new ForbiddenException('No impersonation permission for this tenant');
    }

    // Get target user from tenant database
    const targetUser = await this.getTenantUser(tenantId, targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Target user not found in tenant');
    }

    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const startedAt = new Date();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Create impersonation session
    const impersonationSession = await this.masterPrisma.impersonationSession.create({
      data: {
        originalUserId: adminUser.id,
        originalTenantId: adminUser.tenantId || null,
        impersonatedUserId: targetUserId,
        impersonatedTenantId: tenantId,
        startedAt,
        expiresAt,
        reason,
        sessionId: crypto.randomUUID(),
        status: 'ACTIVE'
      }
    });

    const payload = {
      sub: adminUser.id,
      isSuperAdmin: adminUser.isSuperAdmin,
      email: adminUser.email,
      name: adminUser.name,
      tenantContext: tenantId,
      accessType: 'impersonation',
      expiresAt: expiresAt.toISOString(),
      originalUserId: adminUser.id,
      impersonatedUserId: targetUserId,
      impersonatedUserEmail: targetUser.email,
      impersonatedUserName: targetUser.name,
      impersonationSessionId: impersonationSession.id
    };

    // Log impersonation start
    await this.logImpersonationAction(impersonationSession.id, 'started', {
      reason,
      targetUser: { id: targetUserId, email: targetUser.email, name: targetUser.name }
    });

    const accessToken = this.jwt.sign(payload);
    const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
    const frontendPort = process.env.FRONTEND_PORT || '3000';
    const redirectUrl = `http://${tenant.subdomain}.${baseDomain}:${frontendPort}`;

    return { accessToken, redirectUrl };
  }

  // End impersonation
  async endImpersonation(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ redirectUrl: string }> {
    const session = await this.masterPrisma.impersonationSession.findUnique({
      where: { id: sessionId },
      include: { originalUser: true, impersonatedTenant: true }
    });

    if (!session) {
      throw new NotFoundException('Impersonation session not found');
    }

    // Update session status
    await this.masterPrisma.impersonationSession.update({
      where: { id: sessionId },
      data: { 
        status: 'ENDED',
        endedAt: new Date()
      }
    });

    // Log impersonation end
    await this.logImpersonationAction(sessionId, 'ended', {
      ipAddress,
      userAgent
    });

    // Redirect back to master instance
    const baseDomain = process.env.BASE_DOMAIN || 'lvh.me';
    const frontendPort = process.env.FRONTEND_PORT || '3000';
    const redirectUrl = `http://${baseDomain}:${frontendPort}`;

    return { redirectUrl };
  }

  // Validate impersonation permission
  async validateImpersonationPermission(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.masterPrisma.user.findUnique({
      where: { id: userId }
    });

    if (user?.isSuperAdmin) {
      return true;
    }

    // For now, allow any user with tenant access to impersonate
    // In a real implementation, you'd have specific impersonation permissions
    return await this.hasTenantAccessPermission(userId, tenantId);
  }

  // Get tenant users for impersonation
  async getTenantUsers(tenantId: string): Promise<Array<{ id: string; email: string; name: string; isActive: boolean }>> {
    // This would need to be implemented to connect to the tenant database
    // and fetch users. For now, return a placeholder
    return [];
  }

  // Helper methods
  private async hasTenantAccessPermission(userId: string, tenantId: string): Promise<boolean> {
    const permission = await this.masterPrisma.tenantUserPermission.findUnique({
      where: { userId_tenantId: { userId, tenantId } }
    });
    return !!permission;
  }

  private async hasImpersonationPermission(userId: string, tenantId: string): Promise<boolean> {
    // For now, use the same logic as tenant access
    // In a real implementation, you'd have specific impersonation permissions
    return await this.hasTenantAccessPermission(userId, tenantId);
  }

  private async getAccessLevel(userId: string, tenantId: string): Promise<'read' | 'write' | 'admin'> {
    // Implementation to determine access level
    return 'admin'; // Simplified for now
  }

  private async getLastAccessTime(userId: string, tenantId: string): Promise<Date | undefined> {
    const lastAccess = await this.masterPrisma.tenantAccessLog.findFirst({
      where: { userId, tenantId },
      orderBy: { startedAt: 'desc' }
    });
    return lastAccess?.startedAt;
  }

  private async getTenantUser(tenantId: string, userId: string): Promise<any> {
    // This would need to be implemented to connect to the tenant database
    // For now, return a placeholder
    return { id: userId, email: 'user@tenant.com', name: 'Tenant User' };
  }

  private async logTenantAccess(
    userId: string, 
    tenantId: string, 
    accessType: AccessType, 
    expiresAt: Date, 
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.masterPrisma.tenantAccessLog.create({
      data: {
        userId,
        tenantId,
        accessType,
        reason,
        expiresAt,
        ipAddress,
        userAgent
      }
    });
  }

  private async logImpersonationAction(
    sessionId: string, 
    action: string, 
    details?: any
  ): Promise<void> {
    await this.masterPrisma.impersonationAuditLog.create({
      data: {
        impersonationSessionId: sessionId,
        action,
        details
      }
    });
  }

  // Decode a JWT token without verifying (for internal use only)
  decodeToken(token: string): { sub: string; email: string; name: string; tenantContext?: string; [key: string]: unknown } {
    return this.jwt.decode(token);
  }
}
