import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class Verify2FALoginDto {
  @ApiProperty({
    description: 'Temporary session ID from initial login attempt',
    example: 'session_abc123'
  })
  @IsNotEmpty()
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: '2FA verification code or backup code',
    example: '123456'
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Type of 2FA method being used',
    enum: ['totp', 'backup'],
    example: 'totp',
    required: false
  })
  @IsOptional()
  @IsEnum(['totp', 'backup'])
  type?: 'totp' | 'backup';
} 