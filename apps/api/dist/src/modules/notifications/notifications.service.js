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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer_1 = require("nodemailer");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    pushAlarm(payload) {
        this.gateway?.emitAlarm(payload);
    }
    buildTransport() {
        const host = process.env.SMTP_HOST;
        const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const secure = process.env.SMTP_SECURE === 'true';
        if (!host || !user || !pass)
            return null;
        return nodemailer_1.default.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
        });
    }
    async sendScheduledReport(params) {
        const transport = this.buildTransport();
        if (!transport) {
            this.logger.warn('SMTP is not configured. Scheduled report email skipped.');
            return { sent: false, reason: 'smtp_not_configured' };
        }
        const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@atlasio.local';
        await transport.sendMail({
            from,
            to: params.recipients.join(','),
            subject: params.subject,
            text: params.body,
            attachments: [params.attachment],
        });
        return { sent: true };
    }
    async sendUserEmail(params) {
        const transport = this.buildTransport();
        if (!transport) {
            this.logger.warn(`SMTP not configured; user email skipped to: ${params.to} — ${params.subject}`);
            return { sent: false, reason: 'smtp_not_configured' };
        }
        const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@atlasio.local';
        await transport.sendMail({
            from,
            to: params.to,
            subject: params.subject,
            text: params.text,
            ...(params.html ? { html: params.html } : {}),
        });
        return { sent: true };
    }
    async sendAdminAlert(subject, body, payload) {
        const transport = this.buildTransport();
        if (!transport) {
            this.logger.warn(`SMTP not configured; admin alert skipped: ${subject}`);
            return { sent: false, reason: 'smtp_not_configured' };
        }
        const admins = await this.prisma.user.findMany({
            where: { role: { in: ['ADMIN', 'TECH'] }, isActive: true },
            select: { email: true },
            take: 100,
        });
        const emails = admins.map((a) => a.email).filter(Boolean);
        if (emails.length === 0)
            return { sent: false, reason: 'no_admins' };
        const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@atlasio.local';
        const json = payload ? `\n\nPayload:\n${JSON.stringify(payload, null, 2)}` : '';
        await transport.sendMail({
            from,
            to: emails.join(','),
            subject,
            text: body + json,
        });
        return { sent: true };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, common_1.Inject)('NOTIFICATIONS_GATEWAY')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Function])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map