import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsNotEmpty()
  roleIds: string[];
} 