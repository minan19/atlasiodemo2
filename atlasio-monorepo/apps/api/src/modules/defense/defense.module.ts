import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DefenseService } from './defense.service';
import { DefenseController } from './defense.controller';
import { DefenseOrchestrator } from './defense.orchestrator';
import { SecurityModule } from '../security/security.module';
import { NginxService } from './nginx.service';
import { DefenseCleanupService } from './defense.cleanup';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [DefenseController],
  providers: [DefenseService, DefenseOrchestrator, NginxService, DefenseCleanupService],
})
export class DefenseModule {}
