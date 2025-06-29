import { plainToClass, Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync, IsBoolean } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  NODE_ENV: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  TENANT_DATABASE_URL: string;

  @IsString()
  TENANT_DB_ENCRYPTION_KEY: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '1h';

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  PORT?: number = 4000;

  @IsString()
  @IsOptional()
  BASE_DOMAIN?: string = 'lvh.me';

  @IsString()
  @IsOptional()
  FRONTEND_PORT?: string = '3000';

  @IsString()
  @IsOptional()
  REDIS_URL?: string;

  @IsBoolean()
  @Type(() => Boolean)
  @IsOptional()
  ENABLE_DEBUG_LOGGING?: boolean = false;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }

  return validatedConfig;
} 