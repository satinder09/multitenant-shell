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
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { GetTenantsQueryDto } from './dto/get-tenants-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../../../generated/master-prisma';
import { AuthUser } from '../../common/decorators/auth-user.decorator';

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
    // If complex filtering is requested, use the optimized method
    if (query?.complexFilter) {
      return this.tenantService.findWithComplexQuery(query);
    }
    
    // Otherwise use the simple method
    return this.tenantService.findAll();
  }

  @Post('search')
  searchWithComplexFilters(@Body() queryDto: GetTenantsQueryDto) {
    return this.tenantService.findWithComplexQuery(queryDto);
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
