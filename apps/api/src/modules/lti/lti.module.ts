import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LtiController } from './lti.controller';
import { LtiService } from './lti.service';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule],
  controllers: [LtiController],
  providers: [LtiService],
  exports: [LtiService],
})
export class LtiModule {}
