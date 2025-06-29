import { IsOptional, IsString, IsNumber, Min, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetPlatformUsersQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortField?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }
    return value;
  })
  complexFilter?: any;
} 