import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { MasterPrismaService } from '../../master-prisma/master-prisma.service';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PlatformUsersService {
  private readonly logger = new Logger(PlatformUsersService.name);

  constructor(private readonly masterPrisma: MasterPrismaService) {}

  async create(createPlatformUserDto: CreatePlatformUserDto) {
    const { name, email, role, password } = createPlatformUserDto;

    // Check if user with this email already exists
    const existingUser = await this.masterPrisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password if provided, otherwise generate a temporary one
    const saltRounds = 10;
    const hashedPassword = password 
      ? await bcrypt.hash(password, saltRounds)
      : await bcrypt.hash('temp_password_' + Date.now(), saltRounds);

    // Create the user
    const user = await this.masterPrisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        isSuperAdmin: role?.toLowerCase() === 'administrator' || role?.toLowerCase() === 'super admin',
      },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Assign role if provided
    if (role) {
      // Find the role by name (case insensitive)
      const dbRole = await this.masterPrisma.role.findFirst({
        where: { 
          name: { 
            equals: role,
            mode: 'insensitive'
          }
        }
      });

      if (dbRole) {
        await this.masterPrisma.userRole.create({
          data: {
            userId: user.id,
            roleId: dbRole.id,
          },
        });
      }
    }

    this.logger.log(`Created platform user: ${user.email}`);
    return {
      ...user,
      role: role || 'user', // Include role in response
      tenantCount: 0, // New users start with 0 tenants
      lastLogin: null,
    };
  }

  async findAll() {
    const users = await this.masterPrisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        // Include tenant permissions count
        permissions: {
          select: {
            tenantId: true,
          },
        },
        // Include user roles
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform the data to match frontend expectations
    return users.map(user => {
      // Get the first role name, or fallback to admin/user based on isSuperAdmin
      const primaryRole = user.userRoles[0]?.role?.name?.toLowerCase() || 
                         (user.isSuperAdmin ? 'admin' : 'user');
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        isActive: true, // Default to active since schema doesn't have isActive field
        createdAt: user.createdAt.toISOString(),
        lastLogin: null, // You may want to track this in your schema
        tenantCount: user.permissions.length,
      };
    });
  }

  async findOne(id: string) {
    const user = await this.masterPrisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            tenantId: true,
          },
        },
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Get the first role name, or fallback to admin/user based on isSuperAdmin
    const primaryRole = user.userRoles[0]?.role?.name?.toLowerCase() || 
                       (user.isSuperAdmin ? 'admin' : 'user');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: primaryRole,
      isActive: true, // Default to active since schema doesn't have isActive field
      createdAt: user.createdAt.toISOString(),
      lastLogin: null,
      tenantCount: user.permissions.length,
    };
  }

  async update(id: string, updatePlatformUserDto: UpdatePlatformUserDto) {
    const { password, ...updateData } = updatePlatformUserDto;

    // Check if user exists
    const existingUser = await this.masterPrisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If email is being updated, check for conflicts
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailConflict = await this.masterPrisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailConflict) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Prepare update data
    const dataToUpdate: any = { ...updateData };

    // Hash new password if provided
    if (password) {
      const saltRounds = 10;
      dataToUpdate.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Handle role changes
    if (updateData.role) {
      // Update isSuperAdmin based on role
      dataToUpdate.isSuperAdmin = updateData.role?.toLowerCase() === 'administrator' || updateData.role?.toLowerCase() === 'super admin';
      
      // Remove existing user roles
      await this.masterPrisma.userRole.deleteMany({
        where: { userId: id },
      });

      // Find and assign new role
      const dbRole = await this.masterPrisma.role.findFirst({
        where: { 
          name: { 
            equals: updateData.role,
            mode: 'insensitive'
          }
        }
      });

      if (dbRole) {
        await this.masterPrisma.userRole.create({
          data: {
            userId: id,
            roleId: dbRole.id,
          },
        });
      }

      delete dataToUpdate.role; // Remove role from update data as it's not a db field
    }

    // Remove isActive from update data as it's not in the schema
    delete dataToUpdate.isActive;

    // Update the user
    const updatedUser = await this.masterPrisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            tenantId: true,
          },
        },
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Get the first role name, or fallback to admin/user based on isSuperAdmin
    const primaryRole = updatedUser.userRoles[0]?.role?.name?.toLowerCase() || 
                       (updatedUser.isSuperAdmin ? 'admin' : 'user');

    this.logger.log(`Updated platform user: ${updatedUser.email}`);
    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: primaryRole,
      isActive: true, // Default to active since schema doesn't have isActive field
      createdAt: updatedUser.createdAt.toISOString(),
      lastLogin: null,
      tenantCount: updatedUser.permissions.length,
    };
  }

  async remove(id: string) {
    // Check if user exists
    const existingUser = await this.masterPrisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Delete the user (this will cascade delete permissions due to foreign key constraints)
    await this.masterPrisma.user.delete({
      where: { id },
    });

    this.logger.log(`Deleted platform user: ${existingUser.email}`);
    return { message: 'User deleted successfully' };
  }
} 