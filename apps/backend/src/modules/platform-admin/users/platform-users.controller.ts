import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { PlatformUsersService } from './platform-users.service';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto';
import { UpdatePlatformUserDto } from './dto/update-platform-user.dto';
import { GetPlatformUsersQueryDto } from './dto/get-platform-users-query.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('platform/admin/users')
@UseGuards(JwtAuthGuard)
export class PlatformUsersController {
  constructor(private readonly platformUsersService: PlatformUsersService) {}

  @Post()
  create(@Body(ValidationPipe) createPlatformUserDto: CreatePlatformUserDto) {
    return this.platformUsersService.create(createPlatformUserDto);
  }

  @Get()
  findAll(@Query(ValidationPipe) query: GetPlatformUsersQueryDto) {
    return this.platformUsersService.findWithComplexQuery(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.platformUsersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePlatformUserDto: UpdatePlatformUserDto,
  ) {
    return this.platformUsersService.update(id, updatePlatformUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.platformUsersService.remove(id);
  }
} 