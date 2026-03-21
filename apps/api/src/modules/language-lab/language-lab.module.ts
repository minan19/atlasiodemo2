import { Module } from '@nestjs/common';
import { LanguageLabService } from './language-lab.service';
import { LanguageLabController } from './language-lab.controller';
import { PrismaService } from '../prisma/prisma.service';

import { TranslationService } from './translation.service';

@Module({
  providers: [LanguageLabService, TranslationService, PrismaService],
  controllers: [LanguageLabController],
  exports: [TranslationService],
})
export class LanguageLabModule {}
