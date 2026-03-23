"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpsWebhookVerifyMiddleware = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let OpsWebhookVerifyMiddleware = class OpsWebhookVerifyMiddleware {
    async use(req, res, next) {
        const secret = process.env.OPS_WEBHOOK_SECRET;
        if (!secret)
            return next();
        const sig = req.headers['x-ops-signature']?.toString();
        const ts = req.headers['x-ops-timestamp']?.toString();
        if (!sig || !ts)
            throw new common_1.UnauthorizedException('signature missing');
        const tolerance = Number(process.env.OPS_WEBHOOK_TOLERANCE ?? 300);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - Number(ts)) > tolerance)
            throw new common_1.UnauthorizedException('timestamp out of range');
        const body = req.rawBody ?? Buffer.from('');
        const msg = `${ts}.${body.toString()}`;
        const hmac = (0, crypto_1.createHmac)('sha256', secret).update(msg).digest();
        const sigBuf = Buffer.from(sig, 'hex');
        if (hmac.length !== sigBuf.length || !(0, crypto_1.timingSafeEqual)(hmac, sigBuf)) {
            throw new common_1.UnauthorizedException('invalid signature');
        }
        return next();
    }
};
exports.OpsWebhookVerifyMiddleware = OpsWebhookVerifyMiddleware;
exports.OpsWebhookVerifyMiddleware = OpsWebhookVerifyMiddleware = __decorate([
    (0, common_1.Injectable)()
], OpsWebhookVerifyMiddleware);
//# sourceMappingURL=ops.webhook.verify.middleware.js.map