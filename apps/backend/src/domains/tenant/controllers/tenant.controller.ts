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
} from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { GetTenantsQueryDto } from '../dto/get-tenants-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../../../generated/master-prisma';
import { AuthUser } from '../../../shared/decorators/auth-user.decorator';
import { BulkUpdateTenantsDto } from '../dto/bulk-update-tenants.dto';
import { BulkDeleteTenantsDto } from '../dto/bulk-delete-tenants.dto';
import { Public } from '../../../shared/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  create(@Body() createTenantDto: CreateTenantDto, @AuthUser() user: User) {
    return this.tenantService.create(createTenantDto, user.id);
  }

  @Get()
  findAll(@Query() query?: GetTenantsQueryDto) {
    console.log('🎯 GET /tenants - Always using optimized query method');
    return this.tenantService.findAll(query);
  }

  @Post('search')
  searchWithComplexFilters(@Body() queryDto: GetTenantsQueryDto) {
    console.log('🚀 POST /tenants/search - Complex search request received');
    return this.tenantService.findWithComplexQuery(queryDto);
  }

  @Patch('bulk')
  bulkUpdate(@Body() dto: BulkUpdateTenantsDto) {
    return this.tenantService.bulkUpdate(dto.ids, dto.data);
  }

  @Delete('bulk')
  bulkDelete(@Body() dto: BulkDeleteTenantsDto) {
    return this.tenantService.bulkDelete(dto.ids);
  }

  @Public()
  @Get('by-subdomain/:subdomain')
  findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.tenantService.findBySubdomain(subdomain);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }
}
