import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { VolunteerContentController } from './volunteer-content.controller';
import { VolunteerContentService } from './volunteer-content.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [VolunteerContentController],
  providers: [VolunteerContentService],
  exports: [VolunteerContentService],
})
export class VolunteerContentModule {}
