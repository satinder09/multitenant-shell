# 🚀 Developer Guide: Creating New API Endpoints

## Overview
This guide provides step-by-step instructions for internal developers to create new API endpoints in the multitenant-shell project, following our established patterns and architecture.

## 🏗️ **Current Architecture Overview**

### System Architecture
- **Backend**: NestJS with domain-driven architecture (Port 4000)
- **Frontend**: Next.js with App Router (Port 3000) 
- **Docs**: Fumadocs with interactive API documentation (Port 3001)

### Domain Structure
```
apps/backend/src/domains/
├── auth/          # Authentication & authorization
├── tenant/        # Tenant management & users
├── platform/      # Platform administration
├── database/      # Database connections & migrations
└── search/        # Search functionality
```

## 📝 **Step-by-Step Guide: Adding New Endpoints**

### Step 1: Choose the Correct Domain

**Determine which domain your endpoint belongs to:**
- **Auth Domain**: Login, logout, token management, permissions
- **Tenant Domain**: Tenant-specific data, users, organization management
- **Platform Domain**: System administration, multi-tenant management
- **Search Domain**: Search functionality across entities

### Step 2: Create the Controller

**Location**: `apps/backend/src/domains/{domain}/controllers/{feature}.controller.ts`

**Template**:
```typescript
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { TenantGuard } from '@/shared/guards/tenant.guard';

@ApiTags('Feature Management')  // 📋 Always include API tags
@Controller('api/features')     // 🔗 Use consistent URL patterns
@UseGuards(JwtAuthGuard, TenantGuard)  // 🔒 Include appropriate guards
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new feature',
    description: 'Creates a new feature with the provided data'
  })
  @ApiBody({
    description: 'Feature creation data',
    type: CreateFeatureDto,
    examples: {
      example1: {
        summary: 'Basic feature',
        value: {
          name: 'Sample Feature',
          description: 'A sample feature for testing'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Feature created successfully',
    type: FeatureResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request data' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - invalid token' 
  })
  async createFeature(@Body() createFeatureDto: CreateFeatureDto) {
    return this.featureService.create(createFeatureDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all features',
    description: 'Retrieves a list of all features for the current tenant'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Features retrieved successfully',
    type: [FeatureResponseDto]
  })
  async getFeatures() {
    return this.featureService.findAll();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get feature by ID',
    description: 'Retrieves a specific feature by its ID'
  })
  @ApiParam({
    name: 'id',
    description: 'Feature ID',
    type: 'string',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Feature retrieved successfully',
    type: FeatureResponseDto 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Feature not found' 
  })
  async getFeature(@Param('id') id: string) {
    return this.featureService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update feature',
    description: 'Updates an existing feature with new data'
  })
  @ApiParam({
    name: 'id',
    description: 'Feature ID to update',
    type: 'string'
  })
  @ApiBody({
    description: 'Feature update data',
    type: UpdateFeatureDto
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Feature updated successfully',
    type: FeatureResponseDto 
  })
  async updateFeature(
    @Param('id') id: string,
    @Body() updateFeatureDto: UpdateFeatureDto
  ) {
    return this.featureService.update(id, updateFeatureDto);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete feature',
    description: 'Permanently deletes a feature'
  })
  @ApiParam({
    name: 'id',
    description: 'Feature ID to delete',
    type: 'string'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Feature deleted successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Feature not found' 
  })
  async deleteFeature(@Param('id') id: string) {
    return this.featureService.remove(id);
  }
}
```

### Step 3: Create DTOs (Data Transfer Objects)

**Location**: `apps/backend/src/domains/{domain}/dto/{feature}.dto.ts`

**Template**:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateFeatureDto {
  @ApiProperty({
    description: 'Feature name',
    example: 'Advanced Analytics',
    minLength: 1,
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Feature description',
    example: 'Provides advanced analytics capabilities',
    maxLength: 500
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateFeatureDto {
  @ApiPropertyOptional({
    description: 'Feature name',
    example: 'Updated Feature Name'
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Feature description',
    example: 'Updated description'
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class FeatureResponseDto {
  @ApiProperty({
    description: 'Feature ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'Feature name',
    example: 'Advanced Analytics'
  })
  name: string;

  @ApiProperty({
    description: 'Feature description',
    example: 'Provides advanced analytics capabilities'
  })
  description: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  updatedAt: Date;
}
```

### Step 4: Create the Service

**Location**: `apps/backend/src/domains/{domain}/services/{feature}.service.ts`

**Template**:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/services/prisma.service';
import { CreateFeatureDto, UpdateFeatureDto } from '../dto/feature.dto';

@Injectable()
export class FeatureService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFeatureDto: CreateFeatureDto) {
    return this.prisma.feature.create({
      data: createFeatureDto,
    });
  }

  async findAll() {
    return this.prisma.feature.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { id },
    });

    if (!feature) {
      throw new NotFoundException(`Feature with ID ${id} not found`);
    }

    return feature;
  }

  async update(id: string, updateFeatureDto: UpdateFeatureDto) {
    await this.findOne(id); // Ensure exists
    
    return this.prisma.feature.update({
      where: { id },
      data: updateFeatureDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists
    
    return this.prisma.feature.delete({
      where: { id },
    });
  }
}
```

### Step 5: Update the Module

**Location**: `apps/backend/src/domains/{domain}/{domain}.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { FeatureController } from './controllers/feature.controller';
import { FeatureService } from './services/feature.service';
// ... other imports

@Module({
  controllers: [
    // ... existing controllers
    FeatureController,  // Add your new controller
  ],
  providers: [
    // ... existing services
    FeatureService,     // Add your new service
  ],
  exports: [
    // ... existing exports
    FeatureService,     // Export if needed by other modules
  ],
})
export class TenantModule {}
```

### Step 6: Generate OpenAPI Documentation

**Run the documentation generation:**
```bash
cd apps/backend
npm run api:generate
```

**This will:**
1. Generate updated `user-api-spec.json`
2. Create new MDX files in `apps/docs/content/api/`
3. Update the interactive documentation

### Step 7: Test Your Endpoint

**1. Backend Testing:**
```bash
# Start backend
cd apps/backend
npm run dev

# Test health check
curl http://localhost:4000/health

# Test your new endpoint
curl -X POST http://localhost:4000/api/features \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Feature",
    "description": "A test feature"
  }'
```

**2. Frontend Integration:**
```typescript
// In your frontend component
const createFeature = async (data: CreateFeatureDto) => {
  const response = await fetch('/api/features', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create feature');
  }
  
  return response.json();
};
```

**3. Documentation Testing:**
```bash
# Start docs server
cd apps/docs
npm run dev

# Visit: http://localhost:3001/docs/api/features
```

## 🔒 **Security Guidelines**

### Required Guards
- **JwtAuthGuard**: Always require authentication
- **TenantGuard**: Ensure tenant isolation
- **AdminGuard**: For admin-only endpoints
- **PermissionGuard**: For role-based access

### Validation
- Use class-validator decorators in DTOs
- Validate all user inputs
- Sanitize data before database operations

## 📊 **Database Guidelines**

### Prisma Schema Updates
```prisma
model Feature {
  id          String   @id @default(cuid())
  name        String
  description String?
  tenantId    String   // Always include for tenant isolation
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("features")
}
```

### Migration Commands
```bash
# Generate migration
npx prisma migrate dev --name add_feature_table

# Apply migration
npx prisma migrate deploy
```

## 🚀 **API Documentation Best Practices**

### Swagger Decorators Checklist
- ✅ `@ApiTags()` - Group related endpoints
- ✅ `@ApiOperation()` - Describe what the endpoint does
- ✅ `@ApiResponse()` - Document all possible responses
- ✅ `@ApiBody()` - Document request body with examples
- ✅ `@ApiParam()` - Document path parameters
- ✅ `@ApiQuery()` - Document query parameters

### Response Status Codes
- **200**: Success (GET, PUT)
- **201**: Created (POST)
- **204**: No Content (DELETE)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (no/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **500**: Internal Server Error

## 🧪 **Testing Guidelines**

### Unit Tests
```typescript
describe('FeatureController', () => {
  it('should create a feature', async () => {
    const createDto = { name: 'Test Feature' };
    const result = await controller.createFeature(createDto);
    expect(result).toHaveProperty('id');
    expect(result.name).toBe('Test Feature');
  });
});
```

### Integration Tests
```typescript
describe('Feature API', () => {
  it('POST /api/features should create feature', async () => {
    return request(app.getHttpServer())
      .post('/api/features')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Test Feature' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
      });
  });
});
```

## 📋 **Quality Checklist**

Before submitting your PR, ensure:

### Code Quality
- [ ] All TypeScript types are properly defined
- [ ] No linting errors (`npm run lint`)
- [ ] Code follows existing patterns
- [ ] Proper error handling implemented

### API Documentation
- [ ] All endpoints have complete Swagger documentation
- [ ] Request/response examples provided
- [ ] Error responses documented
- [ ] API specification generates successfully

### Security
- [ ] Appropriate guards applied
- [ ] Input validation implemented
- [ ] Tenant isolation enforced
- [ ] No sensitive data exposed

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests cover main flows
- [ ] Manual testing completed
- [ ] Documentation tested in browser

### Database
- [ ] Migrations created and tested
- [ ] Schema follows naming conventions
- [ ] Indexes added where needed
- [ ] Data integrity constraints in place

## 🔄 **Integration Workflow**

1. **Backend Development** → **Documentation Generation** → **Frontend Integration**
2. **Test Locally** → **Update Tests** → **Submit PR**
3. **Code Review** → **Deploy** → **Monitor**

## 📞 **Support**

- **Architecture Questions**: Check existing domain patterns
- **Swagger Issues**: Review working examples in `tenant/controllers/users.controller.ts`
- **Database Questions**: Check existing Prisma models
- **Testing Help**: Review existing test files

## 🎯 **Current Working Example**

**Reference Implementation**: `apps/backend/src/domains/tenant/controllers/users.controller.ts`

This controller demonstrates all best practices:
- Complete CRUD operations
- Comprehensive Swagger documentation
- Proper error handling
- Security guards implementation
- DTO validation

Follow this pattern for consistency across all new endpoints.

---

**Last Updated**: January 2025  
**Next Review**: Quarterly or when architecture changes 