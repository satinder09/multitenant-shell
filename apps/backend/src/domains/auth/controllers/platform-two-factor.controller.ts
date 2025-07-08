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
  Put,
} from '@nestjs/common';
import { Request } from 'express';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthUser } from '../../../shared/decorators/auth-user.decorator';


import { TwoFactorAuthService } from'../services/two-factor-auth.service';
import { BackupCodesService } from '../services/backup-codes.service'; 
import { TwoFactorService } from '../services/two-factor.service';

import {
  TwoFactorSetupRequest,
  TwoFactorSetupResponse,
  TwoFactorVerificationRequest,
  TwoFactorVerificationResponse,
  TwoFactorStatus,
  TwoFactorContext,
  TwoFactorError,
} from '../types/two-factor-auth.types';

import { SetupTwoFactorDto } from '../dto/setup-two-factor.dto';
import { VerifyTwoFactorDto } from '../dto/verify-two-factor.dto';
import { EnableTwoFactorDto } from '../dto/enable-two-factor.dto';

@ApiTags('Platform 2FA')
@Controller('platform/2fa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlatformTwoFactorController {
  private readonly logger = new Logger(PlatformTwoFactorController.name);

  constructor(
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly backupCodesService: BackupCodesService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get user 2FA status' })
  @ApiResponse({ status: 200, description: 'User 2FA status retrieved successfully' })
  async getStatus(@AuthUser() user: any) {
    this.logger.log(`Getting 2FA status for platform user ${user.id}`);
    return this.twoFactorService.getUserStatus(user.id);
  }

  @Post('setup')
  @ApiOperation({ summary: 'Setup a new 2FA method' })
  @ApiResponse({ status: 201, description: '2FA method setup initiated' })
  @ApiResponse({ status: 400, description: 'Invalid setup data' })
  async setup(@AuthUser() user: any, @Body() setupDto: SetupTwoFactorDto) {
    this.logger.log(`Setting up 2FA method ${setupDto.methodType} for platform user ${user.id}`);
    return this.twoFactorService.setupMethod(user.id, setupDto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify 2FA code during setup or login' })
  @ApiResponse({ status: 200, description: 'Code verification result' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async verify(@AuthUser() user: any, @Body() verifyDto: VerifyTwoFactorDto) {
    this.logger.log(`Verifying 2FA code for platform user ${user.id}`);
    return this.twoFactorService.verifyCode(user.id, verifyDto);
  }

  @Post('enable')
  @ApiOperation({ summary: 'Enable 2FA method' })
  @ApiResponse({ status: 200, description: '2FA method enabled successfully' })
  async enable(@AuthUser() user: any, @Body() enableDto: EnableTwoFactorDto) {
    this.logger.log(`Enabling 2FA method ${enableDto.methodId} for platform user ${user.id}`);
    const result = await this.twoFactorService.enable(user.id, enableDto);
    return result;
  }

  @Delete('methods/:methodId')
  @ApiOperation({ summary: 'Disable a 2FA method' })
  @ApiResponse({ status: 200, description: '2FA method disabled successfully' })
  @ApiResponse({ status: 404, description: '2FA method not found' })
  async disable(@AuthUser() user: any, @Param('methodId') methodId: string) {
    this.logger.log(`Disabling 2FA method ${methodId} for platform user ${user.id}`);
    await this.twoFactorService.disableMethod(user.id, methodId);
    return { message: '2FA method disabled successfully' };
  }

  @Get('backup-codes')
  @ApiOperation({ summary: 'Generate backup codes' })
  @ApiResponse({ status: 200, description: 'Backup codes generated successfully' })
  async generateBackupCodes(@AuthUser() user: any) {
    const userId = user.id;
    
    try {
      this.logger.log(`Generating backup codes for platform user ${userId}`);
      const backupCodes = await this.backupCodesService.generateBackupCodes(userId);

      return {
        codes: backupCodes.codes,
        instructions: backupCodes.instructions,
      };
    } catch (error) {
      this.logger.error(`Failed to generate backup codes for user ${userId}`, error);
      throw error;
    }
  }

  @Post('verify-backup-code')
  @ApiOperation({ summary: 'Verify backup code' })
  @ApiResponse({ status: 200, description: 'Backup code verified successfully' })
  async verifyBackupCode(@AuthUser() user: any, @Body() body: { code: string }) {
    const userId = user.id;
    const { code } = body;
    
    try {
      this.logger.log(`Verifying backup code for platform user ${userId}`);

      const result = await this.backupCodesService.verifyBackupCode(userId, code);

      return {
        success: result.isValid,
        message: result.message,
        remainingCodes: result.remainingCodes,
      };
    } catch (error) {
      this.logger.error(`Failed to verify backup code for user ${userId}`, error);
      throw error;
    }
  }

  @Get('recovery-info')
  @ApiOperation({ summary: 'Get recovery information' })
  @ApiResponse({ status: 200, description: 'Recovery information retrieved successfully' })
  async getRecoveryInfo(@AuthUser() user: any) {
    const userId = user.id;
    
    try {
      this.logger.log(`Getting recovery info for platform user ${userId}`);

      const hasBackupCodes = await this.backupCodesService.hasBackupCodes(userId);
      const remainingBackupCodes = await this.backupCodesService.getRemainingCodesCount(userId);

      return {
        hasBackupCodes,
        remainingBackupCodes,
        instructions: 'Use backup codes to recover your account if you lose access to your authenticator.',
      };
    } catch (error) {
      this.logger.error(`Failed to get recovery info for user ${userId}`, error);
      throw error;
    }
  }
} 