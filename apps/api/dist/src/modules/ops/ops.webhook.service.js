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
var OpsWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpsWebhookService = void 0;
const common_1 = require("@nestjs/common");
const node_fetch_1 = require("node-fetch");
const notifications_service_1 = require("../notifications/notifications.service");
const crypto_1 = require("crypto");
let OpsWebhookService = OpsWebhookService_1 = class OpsWebhookService {
    constructor(notifications) {
        this.notifications = notifications;
        this.logger = new common_1.Logger(OpsWebhookService_1.name);
    }
    async notify(title, message, payload) {
        const url = process.env.OPS_WEBHOOK_URL;
        if (!url)
            return { sent: false, reason: 'no_webhook' };
        try {
            const body = JSON.stringify({ title, message, payload });
            const headers = { 'Content-Type': 'application/json' };
            const secret = process.env.OPS_WEBHOOK_SECRET;
            const ts = Math.floor(Date.now() / 1000).toString();
            if (secret) {
                const hmac = (0, crypto_1.createHmac)('sha256', secret);
                hmac.update(ts + '.' + body);
                const sig = hmac.digest('hex');
                headers['x-ops-timestamp'] = ts;
                headers['x-ops-signature'] = sig;
            }
            await (0, node_fetch_1.default)(url, {
                method: 'POST',
                headers,
                body,
            });
            await this.notifications.sendAdminAlert(`[OPS] ${title}`, message, payload);
            return { sent: true };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Ops webhook send failed: ${msg}`);
            return { sent: false, reason: 'send_failed' };
        }
    }
};
exports.OpsWebhookService = OpsWebhookService;
exports.OpsWebhookService = OpsWebhookService = OpsWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], OpsWebhookService);
//# sourceMappingURL=ops.webhook.service.js.map