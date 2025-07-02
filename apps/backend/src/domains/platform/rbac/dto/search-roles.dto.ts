import { IsOptional, IsNumber, IsString, IsObject } from 'class-validator';

export class SearchRolesDto {
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsObject()
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };

  @IsOptional()
  @IsObject()
  complexFilter?: {
    rootGroup: {
      id: string;
      logic: 'AND' | 'OR';
      rules: Array<{
        id: string;
        field: string;
        operator: string;
        value: any;
        fieldPath: string[];
        label: string;
      }>;
      groups: any[];
    };
  };
} 