import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnableTwoFactorDto {
  @ApiProperty({
    description: 'ID of the 2FA method to enable',
    example: 'cuid123'
  })
  @IsString()
  methodId: string;

  @ApiPropertyOptional({
    description: 'Set this method as the primary 2FA method',
    example: true
  })
  @IsOptional()
  isPrimary?: boolean;
} 