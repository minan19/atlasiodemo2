import { Body, Controller, Get, Post, UseGuards, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BookingService } from './booking.service';

@ApiTags('booking')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard('jwt'))
@Controller('booking')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Post()
  create(@Body() dto: { instructorId: string; studentId: string; start: string; end: string; meetingLink?: string }) {
    return this.booking.create(dto);
  }

  @Get('instructor/:id')
  byInstructor(@Param('id') id: string) {
    return this.booking.listForInstructor(id);
  }

  @Get('student/:id')
  byStudent(@Param('id') id: string) {
    return this.booking.listForStudent(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.booking.cancel(id);
  }
}
