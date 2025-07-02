import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';

export interface RelationConfig {
  include?: boolean | string[];
  where?: Record<string, any>;
  aggregate?: {
    count?: string | boolean;
    sum?: string[];
    avg?: string[];
    min?: string[];
    max?: string[];
  };
  alias?: string;
}

export interface VirtualFieldConfig {
  resolver: string;
  type: string;
  dependencies?: string[];
  batchSize?: number;
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

export interface UniversalSearchDto {
  sourceTable: string;
  primaryKey: string;
  fields: string[];
  page: number;
  limit: number;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
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
  fieldMappings: Record<string, {
    type: string;
    operators: string[];
    options?: any[];
  }>;
  // NEW: Multi-table support
  relations?: Record<string, RelationConfig>;
  virtualFields?: Record<string, VirtualFieldConfig>;
  computedFields?: Record<string, string>;
}

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('universal')
  async universalSearch(@Body() searchDto: UniversalSearchDto) {
    console.log(`🔍 Universal Search: Processing search for table "${searchDto.sourceTable}"`);
    return this.searchService.universalSearch(searchDto);
  }
} 