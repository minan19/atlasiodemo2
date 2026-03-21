"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStreamModule = void 0;
const common_1 = require("@nestjs/common");
const event_stream_service_1 = require("./event-stream.service");
const event_stream_controller_1 = require("./event-stream.controller");
const infra_module_1 = require("../../infra/infra.module");
const cognitive_analytics_listener_1 = require("./cognitive-analytics.listener");
const event_emitter_1 = require("@nestjs/event-emitter");
let EventStreamModule = class EventStreamModule {
};
exports.EventStreamModule = EventStreamModule;
exports.EventStreamModule = EventStreamModule = __decorate([
    (0, common_1.Module)({
        imports: [infra_module_1.InfraModule, event_emitter_1.EventEmitterModule.forRoot()],
        controllers: [event_stream_controller_1.EventStreamController],
        providers: [event_stream_service_1.EventStreamService, cognitive_analytics_listener_1.CognitiveAnalyticsListener],
        exports: [event_stream_service_1.EventStreamService],
    })
], EventStreamModule);
//# sourceMappingURL=event-stream.module.js.map