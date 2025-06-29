import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsIn(['active', 'inactive', 'evicted'])
  status?: string;

  @IsString()
  @IsOptional()
  planType?: string;
}
