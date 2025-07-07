import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth,
  ApiCookieAuth 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../../../generated/master-prisma';
import { AuthUser } from '../../../shared/decorators/auth-user.decorator';

// DTOs for comprehensive API documentation
export class CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export class UpdateUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  status?: string;
}

export class GetUsersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@ApiTags('Users')
@ApiCookieAuth('Authentication')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor() {
    // In a real implementation, inject your user service here
    // private readonly usersService: UsersService
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create a new user',
    description: 'Creates a new user in the current tenant with the provided details. Requires authentication and appropriate permissions.'
  })
  @ApiBody({ 
    description: 'User creation data',
    schema: {
      type: 'object',
      required: ['email', 'firstName', 'lastName'],
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          example: 'john.doe@example.com',
          description: 'User email address (must be unique within tenant)'
        },
        firstName: { 
          type: 'string', 
          minLength: 1,
          maxLength: 50,
          example: 'John',
          description: 'User first name'
        },
        lastName: { 
          type: 'string', 
          minLength: 1,
          maxLength: 50,
          example: 'Doe',
          description: 'User last name'
        },
        role: { 
          type: 'string', 
          enum: ['user', 'admin', 'manager'],
          example: 'user',
          description: 'User role within the tenant (optional, defaults to "user")'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        role: { type: 'string', example: 'user' },
        status: { type: 'string', example: 'active' },
        createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
        updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid user data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['email must be a valid email'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid authentication' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to create users' })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - Email address already exists in this tenant',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Email address already exists in this tenant' },
        error: { type: 'string', example: 'Conflict' }
      }
    }
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto, @AuthUser() currentUser: User) {
    // Mock implementation for demonstration
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: createUserDto.email,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      role: createUserDto.role || 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.id
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all users',
    description: 'Retrieves a paginated list of users in the current tenant with optional filtering and sorting capabilities.'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number,
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    schema: { minimum: 1, default: 1 }
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Number of users per page (maximum 100)',
    example: 10,
    schema: { minimum: 1, maximum: 100, default: 10 }
  })
  @ApiQuery({ 
    name: 'search', 
    required: false, 
    type: String,
    description: 'Search term to filter users by name or email',
    example: 'john'
  })
  @ApiQuery({ 
    name: 'role', 
    required: false, 
    type: String,
    enum: ['user', 'admin', 'manager'],
    description: 'Filter users by role',
    example: 'user'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    description: 'Filter users by status',
    example: 'active'
  })
  @ApiQuery({ 
    name: 'sortBy', 
    required: false, 
    type: String,
    enum: ['firstName', 'lastName', 'email', 'createdAt', 'updatedAt'],
    description: 'Field to sort by',
    example: 'lastName'
  })
  @ApiQuery({ 
    name: 'sortOrder', 
    required: false, 
    type: String,
    enum: ['asc', 'desc'],
    description: 'Sort order',
    example: 'asc'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              role: { type: 'string', enum: ['user', 'admin', 'manager'] },
              status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
              lastLogin: { type: 'string', format: 'date-time', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', description: 'Total number of users' },
            page: { type: 'number', description: 'Current page number' },
            limit: { type: 'number', description: 'Users per page' },
            totalPages: { type: 'number', description: 'Total number of pages' },
            hasNext: { type: 'boolean', description: 'Whether there are more pages' },
            hasPrev: { type: 'boolean', description: 'Whether there are previous pages' }
          }
        },
        filters: {
          type: 'object',
          description: 'Applied filters',
          properties: {
            search: { type: 'string', nullable: true },
            role: { type: 'string', nullable: true },
            status: { type: 'string', nullable: true },
            sortBy: { type: 'string', nullable: true },
            sortOrder: { type: 'string', nullable: true }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid authentication' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to view users' })
  @HttpCode(HttpStatus.OK)
  findAll(@Query() query: GetUsersQueryDto) {
    // Mock implementation for demonstration
    const { page = 1, limit = 10, search, role, status, sortBy = 'lastName', sortOrder = 'asc' } = query;
    
    return {
      data: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          status: 'active',
          lastLogin: '2024-01-01T10:30:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'admin',
          status: 'active',
          lastLogin: '2024-01-02T09:15:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ],
      pagination: {
        total: 25,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(25 / Number(limit)),
        hasNext: page < Math.ceil(25 / Number(limit)),
        hasPrev: page > 1
      },
      filters: {
        search,
        role,
        status,
        sortBy,
        sortOrder
      }
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieves a specific user by their unique identifier. Returns detailed user information.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    format: 'uuid',
    description: 'Unique user identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User found and retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string', enum: ['user', 'admin', 'manager'] },
        status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
        lastLogin: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        profile: {
          type: 'object',
          nullable: true,
          properties: {
            phone: { type: 'string', nullable: true },
            department: { type: 'string', nullable: true },
            jobTitle: { type: 'string', nullable: true },
            timezone: { type: 'string', nullable: true }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid authentication' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to view this user' })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id') id: string) {
    // Mock implementation for demonstration
    return {
      id,
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      status: 'active',
      lastLogin: '2024-01-01T10:30:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      profile: {
        phone: '+1-555-0123',
        department: 'Engineering',
        jobTitle: 'Software Developer',
        timezone: 'America/New_York'
      }
    };
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update user',
    description: 'Updates a user with the provided data. Only provided fields will be updated (partial update).'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    format: 'uuid',
    description: 'Unique user identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({ 
    description: 'User update data (all fields are optional)',
    schema: {
      type: 'object',
      properties: {
        email: { 
          type: 'string', 
          format: 'email',
          example: 'john.newemail@example.com',
          description: 'Updated email address'
        },
        firstName: { 
          type: 'string', 
          minLength: 1,
          maxLength: 50,
          example: 'Jonathan',
          description: 'Updated first name'
        },
        lastName: { 
          type: 'string', 
          minLength: 1,
          maxLength: 50,
          example: 'Doe',
          description: 'Updated last name'
        },
        role: { 
          type: 'string', 
          enum: ['user', 'admin', 'manager'],
          example: 'manager',
          description: 'Updated user role'
        },
        status: { 
          type: 'string', 
          enum: ['active', 'inactive', 'suspended'],
          example: 'active',
          description: 'Updated user status'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string', enum: ['user', 'admin', 'manager'] },
        status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
        updatedAt: { type: 'string', format: 'date-time' },
        updatedBy: { type: 'string', format: 'uuid', description: 'ID of user who made the update' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid authentication' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to update this user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - Email address already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Email address already exists' },
        error: { type: 'string', example: 'Conflict' }
      }
    }
  })
  @HttpCode(HttpStatus.OK)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @AuthUser() currentUser: User) {
    // Mock implementation for demonstration
    return {
      id,
      email: updateUserDto.email || 'john.doe@example.com',
      firstName: updateUserDto.firstName || 'John',
      lastName: updateUserDto.lastName || 'Doe',
      role: updateUserDto.role || 'user',
      status: updateUserDto.status || 'active',
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.id
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete user',
    description: 'Permanently deletes a user from the tenant. This action cannot be undone. Consider deactivating users instead of deleting them.'
  })
  @ApiParam({ 
    name: 'id', 
    type: String,
    format: 'uuid',
    description: 'Unique user identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User deleted successfully' },
        deletedUserId: { type: 'string', format: 'uuid' },
        deletedAt: { type: 'string', format: 'date-time' },
        deletedBy: { type: 'string', format: 'uuid', description: 'ID of user who performed the deletion' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Missing or invalid authentication' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions to delete users' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - Cannot delete user with active dependencies',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Cannot delete user with active projects or assignments' },
        error: { type: 'string', example: 'Conflict' },
        dependencies: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['Active projects: 3', 'Pending tasks: 5']
        }
      }
    }
  })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @AuthUser() currentUser: User) {
    // Mock implementation for demonstration
    return {
      success: true,
      message: 'User deleted successfully',
      deletedUserId: id,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser.id
    };
  }
} 