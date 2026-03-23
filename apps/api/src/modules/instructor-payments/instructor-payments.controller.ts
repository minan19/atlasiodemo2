import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles';
import { RolesGuard } from '../auth/roles.guard';
import { InstructorPaymentsService } from './instructor-payments.service';
import { InstructorPayoutRangeDto, ListInstructorPaymentsDto, MarkPayoutPaidDto } from './dto';

@ApiTags('instructor-payments')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('instructor-payments')
export class InstructorPaymentsController {
  constructor(private readonly payments: InstructorPaymentsService) {}

  @Get('me/summary')
  summary(@Query() dto: InstructorPayoutRangeDto, @Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.payments.summarize(userId, dto);
  }

  @Get('me/history')
  history(@Query() dto: ListInstructorPaymentsDto, @Req() req: any) {
    const userId = req.user.id ?? req.user.userId;
    return this.payments.listPayments(userId, dto.limit ?? 10);
  }

  @Get('admin/:instructorId/history')
  @Roles('ADMIN')
  adminHistory(@Param('instructorId') instructorId: string, @Query() dto: ListInstructorPaymentsDto) {
    return this.payments.listPayments(instructorId, dto.limit ?? 20);
  }

  @Get('admin/:instructorId/summary')
  @Roles('ADMIN')
  adminSummary(@Param('instructorId') instructorId: string, @Query() dto: InstructorPayoutRangeDto) {
    return this.payments.summarize(instructorId, dto);
  }

  @Post('admin/:instructorId/generate')
  @Roles('ADMIN')
  generate(@Param('instructorId') instructorId: string, @Body() dto: InstructorPayoutRangeDto, @Req() req: any) {
    const actorId = req.user.id ?? req.user.userId;
    return this.payments.generatePayout(instructorId, dto, actorId);
  }

  @Patch('admin/:paymentId/pay')
  @Roles('ADMIN')
  markPaid(@Param('paymentId') paymentId: string, @Body() dto: MarkPayoutPaidDto, @Req() req: any) {
    const actorId = req.user.id ?? req.user.userId;
    return this.payments.markPaid(paymentId, actorId, dto.notes);
  }
}
