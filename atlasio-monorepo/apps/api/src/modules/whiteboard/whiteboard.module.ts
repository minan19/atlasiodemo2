import { Module } from '@nestjs/common';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardController } from './whiteboard.controller';
import { WhiteboardGateway } from './whiteboard.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WhiteboardAlertsService } from './whiteboard.alerts';
import { NotificationsModule } from '../notifications/notifications.module';
import { OpsModule } from '../ops/ops.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, OpsModule],
  controllers: [WhiteboardController],
  providers: [WhiteboardService, WhiteboardGateway, WhiteboardAlertsService],
})
export class WhiteboardModule {}
