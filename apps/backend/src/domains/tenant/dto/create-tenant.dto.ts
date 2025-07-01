import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsString()
  @IsOptional()
  dbName?: string; // Optional: will be auto-generated if not provided

  @IsString()
  @IsOptional()
  planType?: string; // Optional, e.g. "basic", "pro", etc.
}
