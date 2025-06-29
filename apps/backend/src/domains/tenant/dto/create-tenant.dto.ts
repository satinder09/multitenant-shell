import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsString()
  @IsNotEmpty()
  dbName: string; // Or schemaName, depending on your multi-tenancy strategy

  @IsString()
  @IsOptional()
  planType?: string; // Optional, e.g. "basic", "pro", etc.
}
