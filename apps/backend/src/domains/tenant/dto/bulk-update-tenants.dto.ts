import { IsArray, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTenantDto } from './update-tenant.dto';

export class BulkUpdateTenantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => String)
  ids: string[];

  @ValidateNested()
  @Type(() => UpdateTenantDto)
  data: UpdateTenantDto;
} 