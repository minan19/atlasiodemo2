import { Controller, Post, Get, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@ApiBearerAuth('access-token')
@Controller('departments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  // System/Admin Endpoint
  @Roles('ADMIN')
  @Post()
  createDepartment(@Body() dto: { name: string; headInstructorId: string }, @Req() req: any) {
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.service.createDepartment(tenantId, dto.name, dto.headInstructorId);
  }

  // Head Instructor Endpoints
  @Roles('HEAD_INSTRUCTOR')
  @Get('me')
  getMyDepartments(@Req() req: any) {
    const headInstructorId = req.user.id || req.user.userId;
    const tenantId = req.user.tenantId || req.tenantId || 'public';
    return this.service.getMyDepartments(headInstructorId, tenantId);
  }

  @Roles('HEAD_INSTRUCTOR')
  @Post(':id/instructors')
  addInstructor(@Param('id') departmentId: string, @Body() dto: { instructorId: string }, @Req() req: any) {
    const headInstructorId = req.user.id || req.user.userId;
    return this.service.addInstructorToDepartment(headInstructorId, departmentId, dto.instructorId);
  }
}
