import { Module } from '@nestjs/common';
import { SmartClassroomService } from './smart-classroom.service';
import { SmartClassroomController } from './smart-classroom.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [SmartClassroomService, PrismaService],
  controllers: [SmartClassroomController],
})
export class SmartClassroomModule {}
