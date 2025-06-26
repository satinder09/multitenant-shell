import { IsOptional, IsInt, Min, Max, IsString, IsIn, ValidateNested, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FilterRule {
  @IsString()
  id: string;

  @IsString()
  field: string;

  @IsString()
  operator: string;

  value: any;

  @IsArray()
  @IsOptional()
  fieldPath?: string[];

  @IsString()
  @IsOptional()
  label?: string;
}

export class FilterGroup {
  @IsString()
  id: string;

  @IsString()
  @IsIn(['AND', 'OR'])
  logic: 'AND' | 'OR';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterRule)
  @IsOptional()
  rules?: FilterRule[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterGroup)
  @IsOptional()
  groups?: FilterGroup[];
}

export class ComplexFilter {
  @ValidateNested()
  @Type(() => FilterGroup)
  rootGroup: FilterGroup;
}

export class SortParams {
  @IsString()
  field: string;

  @IsString()
  @IsIn(['asc', 'desc'])
  direction: 'asc' | 'desc';
}

export class GetTenantsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SortParams)
  sort?: SortParams;

  @IsOptional()
  @ValidateNested()
  @Type(() => ComplexFilter)
  complexFilter?: ComplexFilter;
} 