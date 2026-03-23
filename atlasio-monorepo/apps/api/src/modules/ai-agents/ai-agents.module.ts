import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiAgentsController } from './ai-agents.controller';
import { AiAgentsService } from './ai-agents.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [AiAgentsService],
  controllers: [AiAgentsController],
  exports: [AiAgentsService],
})
export class AiAgentsModule {}
