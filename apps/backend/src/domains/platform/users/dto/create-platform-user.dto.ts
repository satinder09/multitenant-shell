import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreatePlatformUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  password?: string; // Optional, can be generated or set via invitation
} 