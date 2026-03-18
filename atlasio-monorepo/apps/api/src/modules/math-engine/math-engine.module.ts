import { Module } from '@nestjs/common';
import { MathEngineService } from './math-engine.service';
import { MathEngineController } from './math-engine.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [MathEngineService, PrismaService],
  controllers: [MathEngineController],
})
export class MathEngineModule {}
