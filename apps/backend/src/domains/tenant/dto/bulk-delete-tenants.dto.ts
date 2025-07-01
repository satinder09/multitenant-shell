import { IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkDeleteTenantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => String)
  ids: string[];
} 