import { IsEnum, IsOptional, IsString, IsEmail, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TwoFactorMethodType {
  TOTP = 'TOTP',
  SMS = 'SMS', 
  EMAIL = 'EMAIL',
  WEBAUTHN = 'WEBAUTHN'
}

export class SetupTwoFactorDto {
  @ApiProperty({
    enum: TwoFactorMethodType,
    description: 'Type of two-factor authentication method',
    example: TwoFactorMethodType.TOTP
  })
  @IsEnum(TwoFactorMethodType)
  methodType: TwoFactorMethodType;

  @ApiPropertyOptional({
    description: 'User-friendly name for the 2FA method',
    example: 'My Authenticator App'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Phone number for SMS 2FA',
    example: '+1234567890'
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Email address for email 2FA',
    example: 'user@example.com'
  })
  @IsOptional()
  @IsEmail()
  email?: string;
} 