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
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

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
  @IsEnum(['TOTP', 'SMS', 'EMAIL', 'WEBAUTHN'])
  methodType: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
  
  @IsOptional()
  @IsString()
  name?: string;
  
  @IsOptional()
  @IsString()
  phoneNumber?: string;
  
  @IsOptional()
  @IsString()
  email?: string;
}

export class TenantVerifyTwoFactorDto {
  @IsOptional()
  @IsString()
  methodId?: string;
  
  @IsOptional()
  @IsEnum(['TOTP', 'SMS', 'EMAIL', 'WEBAUTHN'])
  methodType?: 'TOTP' | 'SMS' | 'EMAIL' | 'WEBAUTHN';
  
  @IsString()
  code: string;
  
  @IsOptional()
  trustDevice?: boolean;
}

export class TenantEnableTwoFactorDto {
  @IsString()
  methodId: string;
}

@Controller('tenant/2fa')
@UseGuards(JwtAuthGuard)
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
      const backupCodes = await this.backupCodesService.generateBackupCodes(userId);
      
      return {
        message: '2FA enabled successfully',
        backupCodes: backupCodes.codes,
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
  @HttpCode(HttpStatus.OK)
  async generateBackupCodes(
    @Req() req: Request,
  ): Promise<{ codes: string[]; instructions: string }> {
    const userId = req.user?.['id'];
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    try {
      this.logger.log(`Generating backup codes for tenant user ${userId}`);
      const backupCodes = await this.backupCodesService.generateBackupCodes(userId);

      return {
        codes: backupCodes.codes,
        instructions: backupCodes.instructions,
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
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    try {
      this.logger.log(`Verifying backup code for tenant user ${userId}`);

      const result = await this.backupCodesService.verifyBackupCode(userId, code);

      return {
        success: result.isValid,
        message: result.message,
        remainingCodes: result.remainingCodes,
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
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      this.logger.log(`Getting recovery info for tenant user ${userId}`);

      const hasBackupCodes = await this.backupCodesService.hasBackupCodes(userId);
      const remainingBackupCodes = await this.backupCodesService.getRemainingCodesCount(userId);

      return {
        hasBackupCodes,
        remainingBackupCodes,
        instructions: 'Use backup codes to recover your account if you lose access to your authenticator.',
      };
    } catch (error) {
      this.logger.error(`Failed to get recovery info for tenant user ${userId}`, error);
      throw error;
    }
  }
} 