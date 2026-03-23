import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LiveController } from './live.controller';
import { LiveService } from './live.service';
import { LiveJoinGuard } from './live.join.guard';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [LiveController],
  providers: [LiveService, LiveJoinGuard],
  exports: [LiveService],
})
export class LiveModule {}
