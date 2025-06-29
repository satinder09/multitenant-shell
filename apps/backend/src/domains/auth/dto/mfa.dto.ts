import { IsString, IsNotEmpty, IsOptional, IsBoolean, Length, Matches } from 'class-validator';

export class MfaSetupDto {
  @IsOptional()
  @IsString()
  appName?: string;
}

export class MfaVerifySetupDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Token must be a 6-digit number' })
  token: string;
}

export class MfaLoginDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsBoolean()
  isBackupCode?: boolean;
}

export class MfaDisableDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'Token must be a 6-digit number' })
  confirmationToken: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

export interface MfaStatusResponse {
  enabled: boolean;
  backupCodesRemaining?: number;
  lastUsed?: Date;
}

export interface MfaVerificationResponse {
  success: boolean;
  remainingAttempts?: number;
  lockoutUntil?: Date;
  message?: string;
} 