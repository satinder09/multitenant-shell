// Base repository interface and abstract implementation
// Provides common CRUD operations and query building capabilities

export interface PaginationOptions {
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  where?: any;
  include?: any;
  select?: any;
}

export interface QueryOptions extends PaginationOptions, FilterOptions {
  sort?: SortOptions;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Base repository interface
export interface IBaseRepository<T, CreateDto, UpdateDto> {
  // Core CRUD operations
  create(data: CreateDto): Promise<T>;
  findById(id: string): Promise<T | null>;
  findMany(options?: QueryOptions): Promise<T[]>;
  findWithPagination(options?: QueryOptions): Promise<PaginatedResult<T>>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
  
  // Advanced operations
  count(where?: any): Promise<number>;
  exists(where: any): Promise<boolean>;
  findFirst(where: any, options?: FilterOptions): Promise<T | null>;
  
  // Batch operations
  createMany(data: CreateDto[]): Promise<T[]>;
  updateMany(where: any, data: Partial<UpdateDto>): Promise<number>;
  deleteMany(where: any): Promise<number>;
}

// Abstract base repository implementation
export abstract class BaseRepository<T, CreateDto, UpdateDto> 
  implements IBaseRepository<T, CreateDto, UpdateDto> {
  
  protected abstract get model(): any;
  protected abstract get modelName(): string;

  async create(data: CreateDto): Promise<T> {
    return this.model.create({
      data,
    });
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
    });
  }

  async findMany(options: QueryOptions = {}): Promise<T[]> {
    const { where, include, select, sort, skip, take } = options;
    
    return this.model.findMany({
      where,
      include,
      select,
      orderBy: sort ? { [sort.field]: sort.direction } : undefined,
      skip,
      take,
    });
  }

  async findWithPagination(options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 10, where, include, select, sort } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        include,
        select,
        orderBy: sort ? { [sort.field]: sort.direction } : undefined,
        skip,
        take: limit,
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async update(id: string, data: UpdateDto): Promise<T> {
    return this.model.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.model.delete({
      where: { id },
    });
  }

  async count(where?: any): Promise<number> {
    return this.model.count({ where });
  }

  async exists(where: any): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }

  async findFirst(where: any, options: FilterOptions = {}): Promise<T | null> {
    const { include, select } = options;
    
    return this.model.findFirst({
      where,
      include,
      select,
    });
  }

  async createMany(data: CreateDto[]): Promise<T[]> {
    const results = await Promise.all(
      data.map(item => this.create(item))
    );
    return results;
  }

  async updateMany(where: any, data: Partial<UpdateDto>): Promise<number> {
    const result = await this.model.updateMany({
      where,
      data,
    });
    return result.count;
  }

  async deleteMany(where: any): Promise<number> {
    const result = await this.model.deleteMany({
      where,
    });
    return result.count;
  }

  // Helper methods for query building
  protected buildWhereClause(filters: any): any {
    if (!filters) return {};
    
    // This can be extended with complex filter logic
    return filters;
  }

  protected buildIncludeClause(includes: string[]): any {
    if (!includes || includes.length === 0) return {};
    
    const includeObj: any = {};
    includes.forEach(include => {
      includeObj[include] = true;
    });
    
    return includeObj;
  }

  protected buildSelectClause(fields: string[]): any {
    if (!fields || fields.length === 0) return undefined;
    
    const selectObj: any = {};
    fields.forEach(field => {
      selectObj[field] = true;
    });
    
    return selectObj;
  }

  // Logging helpers
  protected logQuery(operation: string, options?: any): void {
    console.log(`[${this.modelName}Repository] ${operation}`, options);
  }

  protected logError(operation: string, error: any): void {
    console.error(`[${this.modelName}Repository] ${operation} failed:`, error);
  }
} 