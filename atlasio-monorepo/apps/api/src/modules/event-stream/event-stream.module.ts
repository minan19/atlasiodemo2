import { Module } from '@nestjs/common';
import { EventStreamService } from './event-stream.service';
import { EventStreamController } from './event-stream.controller';
import { InfraModule } from '../../infra/infra.module';
import { CognitiveAnalyticsListener } from './cognitive-analytics.listener';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [InfraModule, EventEmitterModule.forRoot()],
  controllers: [EventStreamController],
  providers: [EventStreamService, CognitiveAnalyticsListener],
  exports: [EventStreamService],
})
export class EventStreamModule {}
