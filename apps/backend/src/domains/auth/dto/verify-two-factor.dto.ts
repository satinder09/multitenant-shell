import { IsString, IsOptional, IsEnum, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TwoFactorMethodType } from './setup-two-factor.dto';

export class VerifyTwoFactorDto {
  @ApiProperty({
    description: 'The verification code from the authenticator',
    example: '123456',
    minLength: 6,
    maxLength: 8
  })
  @IsString()
  @Length(6, 8)
  @Matches(/^\d+$/, { message: 'Code must contain only digits' })
  code: string;

  @ApiPropertyOptional({
    description: 'ID of the specific 2FA method to verify against',
    example: 'cuid123'
  })
  @IsOptional()
  @IsString()
  methodId?: string;

  @ApiPropertyOptional({
    enum: TwoFactorMethodType,
    description: 'Type of 2FA method (if methodId not provided)',
    example: TwoFactorMethodType.TOTP
  })
  @IsOptional()
  @IsEnum(TwoFactorMethodType)
  methodType?: TwoFactorMethodType;

  @ApiPropertyOptional({
    description: 'Whether to trust this device for future logins',
    example: false
  })
  @IsOptional()
  trustDevice?: boolean;
} 