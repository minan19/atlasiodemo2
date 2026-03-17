import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsIn(['ADMIN', 'HEAD_INSTRUCTOR', 'INSTRUCTOR', 'STUDENT', 'GUARDIAN'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiBearerAuth('access-token')
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({ summary: 'Giriş yapan kullanıcının profili' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req: any) {
    return this.users.me(req.user.id ?? req.user.userId);
  }

  @ApiOperation({ summary: 'Profil güncelle (ad / şifre)' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Patch('me')
  updateMe(@Req() req: any, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(req.user.id ?? req.user.userId, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  list() {
    return this.users.list();
  }

  @ApiOperation({ summary: 'Admin: kullanıcı rol/durum güncelle' })
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  adminUpdateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.users.adminUpdateUser(id, dto);
  }
}
