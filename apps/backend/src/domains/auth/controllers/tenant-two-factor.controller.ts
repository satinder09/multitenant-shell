/**
 * 🔐 TENANT TWO-FACTOR AUTHENTICATION CONTROLLER
 * 
 * REST API endpoints for tenant user 2FA operations
 * Handles setup, verification, and management of 2FA methods
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { TwoFactorAuthService } from '../services/two-factor-auth.service';
import { BackupCodesService } from '../services/backup-codes.service';

import {
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerificationRequest,
  TwoFactorVerificationResponse,
  TwoFactorStatus,
  TwoFactorContext,
  TwoFactorError,
} from '../types/two-factor-auth.types';

// DTOs for tenant 2FA operations
export class TenantSetupTwoFactorDto {
  methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
  name?: string;
  phoneNumber?: string;
  email?: string;
}

export class TenantVerifyTwoFactorDto {
  methodId?: string;
  methodType?: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
  code: string;
  trustDevice?: boolean;
}

export class TenantEnableTwoFactorDto {
  methodId: string;
}

@Controller('tenant/2fa')
export class TenantTwoFactorController {
  private readonly logger = new Logger(TenantTwoFactorController.name);

  constructor(
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly backupCodesService: BackupCodesService,
  ) {}

  @Get('status')
  async getTwoFactorStatus(@Req() req: Request): Promise<TwoFactorStatus> {
    const userId = req.user?.['id'];
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const context: TwoFactorContext = {
      userType: 'tenant',
      tenantId,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    try {
      return await this.twoFactorAuthService.getUserTwoFactorStatus(context);
    } catch (error) {
      this.logger.error(`Failed to get 2FA status for tenant user ${userId}`, error);
      throw error;
    }
  }

  @Post('setup')
  async setupTwoFactorMethod(
    @Req() req: Request,
    @Body() setupDto: TenantSetupTwoFactorDto,
  ): Promise<TwoFactorSetupResponse> {
    const userId = req.user?.['id'];
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const context: TwoFactorContext = {
      userType: 'tenant',
      tenantId,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const request: TwoFactorSetupRequest = {
      methodType: setupDto.methodType as any,
      name: setupDto.name,
      phoneNumber: setupDto.phoneNumber,
      email: setupDto.email,
    };

    try {
      this.logger.log(`Setting up 2FA method ${setupDto.methodType} for tenant user ${userId}`);
      return await this.twoFactorAuthService.setupTwoFactorMethod(context, request);
    } catch (error) {
      this.logger.error(`Failed to setup 2FA for tenant user ${userId}`, error);
      if (error instanceof TwoFactorError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactorCode(
    @Req() req: Request,
    @Body() verifyDto: TenantVerifyTwoFactorDto,
  ): Promise<TwoFactorVerificationResponse> {
    const userId = req.user?.['id'];
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const context: TwoFactorContext = {
      userType: 'tenant',
      tenantId,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const request: TwoFactorVerificationRequest = {
      methodId: verifyDto.methodId,
      methodType: verifyDto.methodType as any,
      code: verifyDto.code,
      trustDevice: verifyDto.trustDevice,
    };

    try {
      this.logger.log(`Verifying 2FA code for tenant user ${userId}`);
      return await this.twoFactorAuthService.verifyTwoFactorCode(context, request);
    } catch (error) {
      this.logger.error(`Failed to verify 2FA code for tenant user ${userId}`, error);
      if (error instanceof TwoFactorError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  async enableTwoFactorMethod(
    @Req() req: Request,
    @Body() enableDto: TenantEnableTwoFactorDto,
  ): Promise<{ message: string; backupCodes?: string[] }> {
    const userId = req.user?.['id'];
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const context: TwoFactorContext = {
      userType: 'tenant',
      tenantId,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    try {
      this.logger.log(`Enabling 2FA method ${enableDto.methodId} for tenant user ${userId}`);
      
      await this.twoFactorAuthService.enableTwoFactor(context, enableDto.methodId);
      
      // Generate backup codes for the user
      const backupCodes = await this.backupCodesService.generateBackupCodes();
      
      return {
        message: '2FA enabled successfully',
        backupCodes: backupCodes.plainCodes,
      };
    } catch (error) {
      this.logger.error(`Failed to enable 2FA for tenant user ${userId}`, error);
      if (error instanceof TwoFactorError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Delete('method/:methodId')
  async disableTwoFactorMethod(
    @Req() req: Request,
    @Param('methodId') methodId: string,
  ): Promise<{ message: string }> {
    const userId = req.user?.['id'];
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const context: TwoFactorContext = {
      userType: 'tenant',
      tenantId,
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    try {
      this.logger.log(`Disabling 2FA method ${methodId} for tenant user ${userId}`);
      await this.twoFactorAuthService.disableTwoFactorMethod(context, methodId);
      
      return { message: '2FA method disabled successfully' };
    } catch (error) {
      this.logger.error(`Failed to disable 2FA method for tenant user ${userId}`, error);
      if (error instanceof TwoFactorError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('backup-codes/generate')
  async generateBackupCodes(
    @Req() req: Request,
  ): Promise<{ codes: string[]; instructions: string }> {
    const userId = req.user?.['id'];
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
      this.logger.log(`Generating backup codes for tenant user ${userId}`);
      const backupCodes = await this.backupCodesService.generateBackupCodes();
      
      return {
        codes: backupCodes.plainCodes,
        instructions: this.backupCodesService.getInstructions(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate backup codes for tenant user ${userId}`, error);
      throw error;
    }
  }

  @Post('backup-codes/verify')
  @HttpCode(HttpStatus.OK)
  async verifyBackupCode(
    @Req() req: Request,
    @Body() { code }: { code: string },
  ): Promise<{ success: boolean; remainingCodes: number; message: string }> {
    const userId = req.user?.['id'];
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
      this.logger.log(`Verifying backup code for tenant user ${userId}`);
      
      // TODO: Get user's backup codes from database
      const backupCodesData = {
        codes: [],
        usedCodes: [],
        generatedAt: new Date(),
      };
      
      const result = await this.backupCodesService.verifyBackupCode(code, backupCodesData);
      
      return {
        success: result.isValid,
        remainingCodes: result.remainingCodes,
        message: result.isValid ? 'Backup code verified successfully' : 'Invalid backup code',
      };
    } catch (error) {
      this.logger.error(`Failed to verify backup code for tenant user ${userId}`, error);
      throw error;
    }
  }

  @Get('recovery')
  async getRecoveryInfo(
    @Req() req: Request,
  ): Promise<{
    hasBackupCodes: boolean;
    remainingBackupCodes: number;
    instructions: string;
  }> {
    const userId = req.user?.['id'];
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    try {
      // TODO: Get user's backup codes data from database
      const backupCodesData = {
        codes: [],
        usedCodes: [],
        generatedAt: new Date(),
      };
      
      const hasBackupCodes = this.backupCodesService.hasBackupCodes(backupCodesData);
      const remainingBackupCodes = this.backupCodesService.getRemainingCodesCount(backupCodesData);
      
      return {
        hasBackupCodes,
        remainingBackupCodes,
        instructions: this.backupCodesService.getInstructions(),
      };
    } catch (error) {
      this.logger.error(`Failed to get recovery info for tenant user ${userId}`, error);
      throw error;
    }
  }
} 