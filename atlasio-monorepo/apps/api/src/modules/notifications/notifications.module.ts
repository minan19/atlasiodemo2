import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    { provide: 'NOTIFICATIONS_GATEWAY', useExisting: NotificationsGateway },
    NotificationsService,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
