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
  @ApiOperation({ summary: 'Enable a 2FA method after verification' })
  @ApiResponse({ status: 200, description: '2FA method enabled successfully' })
  @ApiResponse({ status: 404, description: '2FA method not found' })
  async enable(@AuthUser() user: any, @Body() enableDto: EnableTwoFactorDto) {
    this.logger.log(`Enabling 2FA method ${enableDto.methodId} for platform user ${user.id}`);
    await this.twoFactorService.enableMethod(user.id, enableDto);
    return { message: '2FA method enabled successfully' };
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