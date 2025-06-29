import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  permissionIds?: string[];
} 