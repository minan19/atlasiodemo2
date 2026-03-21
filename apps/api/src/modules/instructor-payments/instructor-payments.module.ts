import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { InstructorPaymentsController } from './instructor-payments.controller';
import { InstructorPaymentsService } from './instructor-payments.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [InstructorPaymentsController],
  providers: [InstructorPaymentsService],
  exports: [InstructorPaymentsService],
})
export class InstructorPaymentsModule {}
