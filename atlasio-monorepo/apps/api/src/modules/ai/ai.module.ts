import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AIModuleController } from './ai.controller';
import { AIService } from './ai.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [AIService],
  controllers: [AIModuleController],
  exports: [AIService],
})
export class AIModule {}
