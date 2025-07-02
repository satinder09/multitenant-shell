import { FilterSource } from '../../modules/types';

export interface FilterOption {
  value: any;
  label: string;
  color?: string;
  description?: string;
}

export interface FilterDataResponse {
  options: FilterOption[];
  total?: number;
  hasMore?: boolean;
  error?: string;
}

class FilterSourceService {
  private cache = new Map<string, { data: FilterDataResponse; timestamp: number; ttl: number }>();

  /**
   * Load filter options from various sources
   */
  async loadFilterOptions(
    source: FilterSource,
    searchTerm?: string,
    page?: number,
    pageSize?: number
  ): Promise<FilterDataResponse> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(source, searchTerm, page, pageSize);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      let response: FilterDataResponse;

      switch (source.type) {
        case 'static':
          response = this.loadStaticOptions(source);
          break;
        case 'api':
          response = await this.loadApiOptions(source, searchTerm, page, pageSize);
          break;
        case 'query':
          response = await this.loadQueryOptions(source, searchTerm, page, pageSize);
          break;
        case 'table':
          response = await this.loadTableOptions(source, searchTerm, page, pageSize);
          break;
        case 'function':
          response = await this.loadFunctionOptions(source, searchTerm, page, pageSize);
          break;
        default:
          throw new Error(`Unsupported filter source type: ${source.type}`);
      }

      // Apply transform if provided
      if (source.transform && response.options) {
        response.options = source.transform(response.options);
      }

      // Cache the response
      this.setCache(cacheKey, response, source);

      return response;
    } catch (error) {
      console.error('Failed to load filter options:', error);
      
      // Return fallback options if available
      if (source.fallback) {
        return {
          options: source.fallback,
          error: source.errorMessage || 'Failed to load options, showing fallback data'
        };
      }

      return {
        options: [],
        error: source.errorMessage || 'Failed to load filter options'
      };
    }
  }

  /**
   * Load static options
   */
  private loadStaticOptions(source: FilterSource): FilterDataResponse {
    return {
      options: source.options || []
    };
  }

  /**
   * Load options from API endpoint
   */
  private async loadApiOptions(
    source: FilterSource,
    searchTerm?: string,
    page?: number,
    pageSize?: number
  ): Promise<FilterDataResponse> {
    if (!source.api) {
      throw new Error('API configuration is required for api type');
    }

    const { api } = source;
    let url = api.url;
    const method = api.method || 'GET';
    
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add base parameters
    if (api.params) {
      Object.entries(api.params).forEach(([key, value]) => {
        params.append(key, String(value));
      });
    }
    
    // Add search parameter
    if (searchTerm && api.searchable?.enabled) {
      const minLength = api.searchable.minLength || 0;
      if (searchTerm.length >= minLength) {
        params.append(api.searchable.param, searchTerm);
      }
    }
    
    // Add pagination parameters
    if (api.pagination?.enabled && page !== undefined && pageSize !== undefined) {
      params.append(api.pagination.pageParam, String(page));
      params.append(api.pagination.sizeParam, String(pageSize));
    }

    // Append params to URL for GET requests
    if (method === 'GET' && params.toString()) {
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...api.headers
      }
    };

    // Add body for POST requests
    if (method === 'POST') {
      const body = { ...api.body };
      
      // Add search to body
      if (searchTerm && api.searchable?.enabled) {
        body[api.searchable.param] = searchTerm;
      }
      
      // Add pagination to body
      if (api.pagination?.enabled && page !== undefined && pageSize !== undefined) {
        body[api.pagination.pageParam] = page;
        body[api.pagination.sizeParam] = pageSize;
      }
      
      requestOptions.body = JSON.stringify(body);
    }

    // TODO: This service needs to be refactored to use browserApi
    // Currently keeping fetch as this is a utility service that may need redesign
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract data array from response
    let items = data;
    if (api.dataPath) {
      items = this.getNestedValue(data, api.dataPath);
    }
    
    if (!Array.isArray(items)) {
      throw new Error('API response data is not an array');
    }

    // Extract total count
    let total: number | undefined;
    if (api.totalPath) {
      total = this.getNestedValue(data, api.totalPath);
    }

    // Map items to filter options
    const options: FilterOption[] = items.map(item => ({
      value: this.getNestedValue(item, api.mapping.value),
      label: this.getNestedValue(item, api.mapping.label),
      color: api.mapping.color ? this.getNestedValue(item, api.mapping.color) : undefined,
      description: api.mapping.description ? this.getNestedValue(item, api.mapping.description) : undefined
    }));

    return {
      options,
      total,
      hasMore: total ? options.length < total : undefined
    };
  }

  /**
   * Load options from database query
   */
  private async loadQueryOptions(
    source: FilterSource,
    searchTerm?: string,
    page?: number,
    pageSize?: number
  ): Promise<FilterDataResponse> {
    if (!source.query) {
      throw new Error('Query configuration is required for query type');
    }

    // This would typically call a backend API that executes the SQL query
    const response = await fetch('/api/filters/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: source.query.sql,
        params: source.query.params,
        mapping: source.query.mapping,
        search: searchTerm,
        page,
        pageSize
      })
    });

    if (!response.ok) {
      throw new Error(`Query request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Load options from database table
   */
  private async loadTableOptions(
    source: FilterSource,
    searchTerm?: string,
    page?: number,
    pageSize?: number
  ): Promise<FilterDataResponse> {
    if (!source.table) {
      throw new Error('Table configuration is required for table type');
    }

    // This would typically call a backend API that queries the table
    const response = await fetch('/api/filters/table', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...source.table,
        search: searchTerm,
        page,
        pageSize
      })
    });

    if (!response.ok) {
      throw new Error(`Table request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Load options from function
   */
  private async loadFunctionOptions(
    source: FilterSource,
    searchTerm?: string,
    page?: number,
    pageSize?: number
  ): Promise<FilterDataResponse> {
    if (!source.function) {
      throw new Error('Function configuration is required for function type');
    }

    // This would typically call a backend API that executes the function
    // TODO: Replace with browserApi for security
    const response = await fetch('/api/filters/function', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: source.function.name,
        params: source.function.params,
        search: searchTerm,
        page,
        pageSize
      })
    });

    if (!response.ok) {
      throw new Error(`Function request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(source: FilterSource, searchTerm?: string, page?: number, pageSize?: number): string {
    const key = `${source.type}:${JSON.stringify(source)}:${searchTerm || ''}:${page || 0}:${pageSize || 0}`;
    return btoa(key); // Base64 encode to handle special characters
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): FilterDataResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: FilterDataResponse, source: FilterSource): void {
    // Determine TTL from source configuration
    let ttl = 5 * 60 * 1000; // Default 5 minutes

    if (source.api?.cache?.enabled && source.api.cache.ttl) {
      ttl = source.api.cache.ttl;
    } else if (source.query?.cache?.enabled && source.query.cache.ttl) {
      ttl = source.query.cache.ttl;
    } else if (source.table?.cache?.enabled && source.table.cache.ttl) {
      ttl = source.table.cache.ttl;
    } else if (source.function?.cache?.enabled && source.function.cache.ttl) {
      ttl = source.function.cache.ttl;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific pattern
   */
  clearCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const filterSourceService = new FilterSourceService(); 