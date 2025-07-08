/**
 * 🔐 PLATFORM TWO-FACTOR AUTHENTICATION CONTROLLER
 * 
 * REST API endpoints for platform admin 2FA operations
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

import { TwoFactorAuthService } from'../services/two-factor-auth.service';
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

// DTOs for API documentation and validation
export class SetupTwoFactorDto {
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

export class VerifyTwoFactorDto {
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

export class EnableTwoFactorDto {
  @IsString()
  methodId: string;
}

@Controller('platform/2fa')
@UseGuards(JwtAuthGuard)
export class PlatformTwoFactorController {
  private readonly logger = new Logger(PlatformTwoFactorController.name);

  constructor(
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly backupCodesService: BackupCodesService,
  ) {}

  @Get('status')
  async getTwoFactorStatus(@Req() req: Request): Promise<TwoFactorStatus> {
    const userId = req.user?.['id'];
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const context: TwoFactorContext = {
      userType: 'platform',
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    try {
      return await this.twoFactorAuthService.getUserTwoFactorStatus(context);
    } catch (error) {
      this.logger.error(`Failed to get 2FA status for user ${userId}`, error);
      throw error;
    }
  }

  @Post('setup')
  async setupTwoFactorMethod(
    @Req() req: Request,
    @Body() setupDto: SetupTwoFactorDto,
  ): Promise<TwoFactorSetupResponse> {
    const userId = req.user?.['id'];
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const context: TwoFactorContext = {
      userType: 'platform',
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
      this.logger.log(`Setting up 2FA method ${setupDto.methodType} for platform user ${userId}`);
      return await this.twoFactorAuthService.setupTwoFactorMethod(context, request);
    } catch (error) {
      this.logger.error(`Failed to setup 2FA for user ${userId}`, error);
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
    @Body() verifyDto: VerifyTwoFactorDto,
  ): Promise<TwoFactorVerificationResponse> {
    const userId = req.user?.['id'];
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const context: TwoFactorContext = {
      userType: 'platform',
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
      this.logger.log(`Verifying 2FA code for platform user ${userId}`);
      return await this.twoFactorAuthService.verifyTwoFactorCode(context, request);
    } catch (error) {
      this.logger.error(`Failed to verify 2FA code for user ${userId}`, error);
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
    @Body() enableDto: EnableTwoFactorDto,
  ): Promise<{ message: string; backupCodes?: string[] }> {
    const userId = req.user?.['id'];
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const context: TwoFactorContext = {
      userType: 'platform',
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    try {
      this.logger.log(`Enabling 2FA method ${enableDto.methodId} for platform user ${userId}`);
      
      await this.twoFactorAuthService.enableTwoFactor(context, enableDto.methodId);
      
      // Generate backup codes for the user
      const backupCodes = await this.backupCodesService.generateBackupCodes();
      
      return {
        message: '2FA enabled successfully',
        backupCodes: backupCodes.plainCodes,
      };
    } catch (error) {
      this.logger.error(`Failed to enable 2FA for user ${userId}`, error);
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
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const context: TwoFactorContext = {
      userType: 'platform',
      userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    };

    try {
      this.logger.log(`Disabling 2FA method ${methodId} for platform user ${userId}`);
      await this.twoFactorAuthService.disableTwoFactorMethod(context, methodId);
      
      return { message: '2FA method disabled successfully' };
    } catch (error) {
      this.logger.error(`Failed to disable 2FA method for user ${userId}`, error);
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
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      this.logger.log(`Generating backup codes for platform user ${userId}`);
      const backupCodes = await this.backupCodesService.generateBackupCodes();
      
      return {
        codes: backupCodes.plainCodes,
        instructions: this.backupCodesService.getInstructions(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate backup codes for user ${userId}`, error);
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
      this.logger.log(`Verifying backup code for platform user ${userId}`);
      
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
      this.logger.error(`Failed to verify backup code for user ${userId}`, error);
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
      this.logger.error(`Failed to get recovery info for user ${userId}`, error);
      throw error;
    }
  }
} 