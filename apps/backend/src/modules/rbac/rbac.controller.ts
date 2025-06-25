import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('rbac')
@UseGuards(JwtAuthGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // Role Management
  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Get('roles')
  async findAllRoles() {
    return this.rbacService.findAllRoles();
  }

  @Get('roles/:id')
  async findRoleById(@Param('id') id: string) {
    return this.rbacService.findRoleById(id);
  }

  @Put('roles/:id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  // Permission Management
  @Post('permissions')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  @Get('permissions')
  async findAllPermissions() {
    return this.rbacService.findAllPermissions();
  }

  @Get('permissions/:id')
  async findPermissionById(@Param('id') id: string) {
    return this.rbacService.findPermissionById(id);
  }

  @Delete('permissions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePermission(@Param('id') id: string) {
    return this.rbacService.deletePermission(id);
  }

  // User Role Assignment
  @Post('users/:userId/roles')
  async assignRolesToUser(
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto
  ) {
    dto.userId = userId; // Ensure userId from path is used
    return this.rbacService.assignRolesToUser(dto);
  }

  @Get('users/:userId/roles')
  async getUserRoles(@Param('userId') userId: string) {
    return this.rbacService.getUserRoles(userId);
  }

  @Delete('users/:userId/roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeUserRoles(@Param('userId') userId: string) {
    return this.rbacService.removeUserRoles(userId);
  }

  // Permission Checking
  @Get('users/:userId/permissions')
  async getUserPermissions(@Param('userId') userId: string) {
    return this.rbacService.getUserPermissions(userId);
  }

  @Post('users/:userId/permissions/check')
  async checkPermission(
    @Param('userId') userId: string,
    @Body() body: { permission: string }
  ) {
    const hasPermission = await this.rbacService.hasPermission(userId, body.permission);
    return { hasPermission };
  }

  @Post('users/:userId/permissions/check-any')
  async checkAnyPermission(
    @Param('userId') userId: string,
    @Body() body: { permissions: string[] }
  ) {
    const hasAnyPermission = await this.rbacService.hasAnyPermission(userId, body.permissions);
    return { hasAnyPermission };
  }

  @Post('users/:userId/permissions/check-all')
  async checkAllPermissions(
    @Param('userId') userId: string,
    @Body() body: { permissions: string[] }
  ) {
    const hasAllPermissions = await this.rbacService.hasAllPermissions(userId, body.permissions);
    return { hasAllPermissions };
  }
} 