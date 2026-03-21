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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const crypto_1 = require("crypto");
const payments_service_1 = require("./payments.service");
const dto_1 = require("./dto");
const payment_webhook_guard_1 = require("./payment.webhook.guard");
let PaymentsController = class PaymentsController {
    constructor(payments) {
        this.payments = payments;
    }
    checkout(dto, req) {
        return this.payments.checkout(dto, req.user.id ?? req.user.userId, req.user.tenantId, req.ip);
    }
    async webhook(body, req) {
        const event = req.stripeEvent;
        const providerPaymentId = event?.data?.object?.payment_intent ??
            event?.data?.object?.id ??
            body?.data?.object?.id ??
            body?.providerPaymentId ??
            'unknown';
        const status = event?.type === 'checkout.session.completed' || event?.data?.object?.status === 'succeeded'
            ? 'SUCCEEDED'
            : 'FAILED';
        return this.payments.webhookHandled(providerPaymentId, status === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED');
    }
    async paytrWebhook(body) {
        const merchantId = process.env.PAYTR_MERCHANT_ID;
        const merchantKey = process.env.PAYTR_MERCHANT_KEY;
        const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
        if (!merchantId || !merchantKey || !merchantSalt) {
            throw new common_1.UnauthorizedException('PayTR credentials eksik');
        }
        const { merchant_oid, status, total_amount, hash } = body;
        if (!merchant_oid || !status || !total_amount || !hash) {
            throw new common_1.UnauthorizedException('PayTR webhook: eksik alanlar');
        }
        const hashStr = `${merchantId}${merchant_oid}${total_amount}${status}${merchantSalt}`;
        const expectedHash = (0, crypto_1.createHmac)('sha256', merchantKey).update(hashStr).digest('base64');
        if (expectedHash !== hash) {
            throw new common_1.UnauthorizedException('PayTR webhook: geçersiz imza');
        }
        const paymentStatus = status === 'success' ? 'SUCCEEDED' : 'FAILED';
        await this.payments.webhookHandled(merchant_oid, paymentStatus);
        return 'OK';
    }
    async iyzicoWebhook(body) {
        const apiKey = process.env.IYZICO_API_KEY;
        const secret = process.env.IYZICO_SECRET;
        if (!apiKey || !secret) {
            throw new common_1.UnauthorizedException('iyzico credentials eksik');
        }
        const { token, status, conversationId } = body;
        if (!token || !status || !conversationId) {
            throw new common_1.UnauthorizedException('iyzico webhook: eksik alanlar');
        }
        const expectedSig = (0, crypto_1.createHmac)('sha256', secret)
            .update(`${apiKey}${token}`)
            .digest('base64');
        const receivedSig = body?.signature ?? body?.checkoutFormSig;
        if (receivedSig && receivedSig !== expectedSig) {
            throw new common_1.UnauthorizedException('iyzico webhook: geçersiz imza');
        }
        const paymentStatus = status === 'success' ? 'SUCCEEDED' : 'FAILED';
        await this.payments.webhookHandled(conversationId, paymentStatus);
        return { status: 'OK' };
    }
    history(req) {
        return this.payments.history(req.user.id ?? req.user.userId);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('checkout'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CheckoutDto, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "checkout", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.UseGuards)(payment_webhook_guard_1.PaymentWebhookGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "webhook", null);
__decorate([
    (0, common_1.Post)('webhook/paytr'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "paytrWebhook", null);
__decorate([
    (0, common_1.Post)('webhook/iyzico'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "iyzicoWebhook", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "history", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('payments'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map