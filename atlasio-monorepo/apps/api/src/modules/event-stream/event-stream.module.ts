import { Module } from '@nestjs/common';
import { EventStreamService } from './event-stream.service';
import { EventStreamController } from './event-stream.controller';
import { InfraModule } from '../../infra/infra.module';

@Module({
  imports: [InfraModule],
  controllers: [EventStreamController],
  providers: [EventStreamService],
  exports: [EventStreamService],
})
export class EventStreamModule {}
