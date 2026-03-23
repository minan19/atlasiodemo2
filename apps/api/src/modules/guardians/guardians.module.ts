import { Module } from '@nestjs/common';
import { GuardiansService } from './guardians.service';
import { GuardiansController } from './guardians.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [GuardiansService, PrismaService],
  controllers: [GuardiansController],
  exports: [GuardiansService],
})
export class GuardiansModule {}
