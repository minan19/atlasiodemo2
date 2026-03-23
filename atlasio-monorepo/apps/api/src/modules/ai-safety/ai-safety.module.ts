import { Module } from '@nestjs/common';
import { AiSafetyService } from './ai-safety.service';
import { AiSafetyController } from './ai-safety.controller';

@Module({
  controllers: [AiSafetyController],
  providers: [AiSafetyService],
  exports: [AiSafetyService],
})
export class AiSafetyModule {}
