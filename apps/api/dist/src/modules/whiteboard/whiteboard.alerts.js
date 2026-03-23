"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WhiteboardAlertsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhiteboardAlertsService = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("../notifications/notifications.service");
const ops_webhook_service_1 = require("../ops/ops.webhook.service");
let WhiteboardAlertsService = WhiteboardAlertsService_1 = class WhiteboardAlertsService {
    constructor(notifications, opsWebhook) {
        this.notifications = notifications;
        this.opsWebhook = opsWebhook;
        this.logger = new common_1.Logger(WhiteboardAlertsService_1.name);
        this.undoThreshold = Number(process.env.WB_ALERT_UNDO_THRESHOLD ?? 20);
        this.windowSeconds = Number(process.env.WB_ALERT_WINDOW ?? 60);
        this.payloadThresholdKb = Number(process.env.WB_ALERT_PAYLOAD_KB ?? 128);
        this.rateLimitThreshold = Number(process.env.WB_ALERT_RATELIMIT ?? 5);
        this.layerSpamThreshold = Number(process.env.WB_ALERT_LAYER_SPAM ?? 10);
    }
    async maybeAlertUndoFlood(sessionId, actor, countInWindow) {
        if (countInWindow < this.undoThreshold)
            return;
        const msg = `Whiteboard undo/redo flood: session=${sessionId}, count=${countInWindow}/${this.windowSeconds}s, actor=${actor ?? 'unknown'}`;
        this.logger.warn(msg);
        await this.opsWebhook.notify('Whiteboard undo flood', msg, { sessionId, actor, count: countInWindow });
        await this.notifications.sendAdminAlert('Whiteboard undo/redo flood', msg, { sessionId, actor, count: countInWindow });
    }
    async alertPayloadTooLarge(sessionId, actor, sizeBytes) {
        if (sizeBytes < this.payloadThresholdKb * 1024)
            return;
        const msg = `Whiteboard payload too large: ${Math.round(sizeBytes / 1024)}KB, session=${sessionId}, actor=${actor ?? 'unknown'}`;
        this.logger.warn(msg);
        await this.opsWebhook.notify('Whiteboard payload large', msg, { sessionId, actor, sizeBytes });
        await this.notifications.sendAdminAlert('Whiteboard payload large', msg, { sessionId, actor, sizeBytes });
    }
    async alertRateLimited(sessionId, actor, hitCount) {
        if (hitCount < this.rateLimitThreshold)
            return;
        const msg = `Whiteboard rate-limit hits=${hitCount} session=${sessionId} actor=${actor ?? 'unknown'}`;
        this.logger.warn(msg);
        await this.opsWebhook.notify('Whiteboard rate-limit', msg, { sessionId, actor, hitCount });
        await this.notifications.sendAdminAlert('Whiteboard rate-limit', msg, { sessionId, actor, hitCount });
    }
    async alertLayerSpam(sessionId, actor, count) {
        if (count < this.layerSpamThreshold)
            return;
        const msg = `Whiteboard layer spam: session=${sessionId}, count=${count}, actor=${actor ?? 'unknown'}`;
        this.logger.warn(msg);
        await this.opsWebhook.notify('Whiteboard layer spam', msg, { sessionId, actor, count });
        await this.notifications.sendAdminAlert('Whiteboard layer spam', msg, { sessionId, actor, count });
    }
};
exports.WhiteboardAlertsService = WhiteboardAlertsService;
exports.WhiteboardAlertsService = WhiteboardAlertsService = WhiteboardAlertsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        ops_webhook_service_1.OpsWebhookService])
], WhiteboardAlertsService);
//# sourceMappingURL=whiteboard.alerts.js.map