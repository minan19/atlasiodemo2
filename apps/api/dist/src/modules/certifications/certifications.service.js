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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CertificationsService = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const pdfkit_1 = require("pdfkit");
const QRCode = require("qrcode");
const stream_1 = require("stream");
const FONT_REGULAR = (0, path_1.join)(__dirname, '../../../assets/fonts/NotoSans-Regular.ttf');
let CertificationsService = class CertificationsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async issue(dto, actorId) {
        const certification = await this.prisma.certification.create({
            data: {
                userId: dto.userId,
                courseId: dto.courseId,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
        });
        await this.audit.log({
            actorId,
            action: 'certification.issue',
            entity: 'Certification',
            entityId: certification.id,
            meta: { userId: dto.userId, courseId: dto.courseId, expiresAt: dto.expiresAt },
        });
        return certification;
    }
    listAll() {
        return this.prisma.certification.findMany({
            include: { User: true, Course: true },
            orderBy: { issuedAt: 'desc' },
        });
    }
    listMine(userId) {
        return this.prisma.certification.findMany({
            where: { userId },
            include: { Course: true },
            orderBy: { issuedAt: 'desc' },
        });
    }
    async verify(key) {
        const cert = await this.prisma.certification.findFirst({
            where: { verifyCode: key },
            include: { User: true, Course: true },
        });
        if (!cert)
            throw new common_1.NotFoundException('Certificate not found or invalid key');
        return {
            valid: cert.status === 'ACTIVE',
            status: cert.status,
            holder: cert.User?.name ?? cert.User?.email ?? cert.userId,
            course: cert.Course?.title ?? cert.courseId,
            issuedAt: cert.issuedAt,
            expiresAt: cert.expiresAt,
        };
    }
    async markExpiries(now = new Date()) {
        const expired = await this.prisma.certification.updateMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lt: now },
            },
            data: { status: 'EXPIRED' },
        });
        return { updated: expired.count };
    }
    async generatePdf(certId, locale = 'tr') {
        const cert = await this.prisma.certification.findUnique({
            where: { id: certId },
            include: { User: true, Course: true },
        });
        if (!cert)
            throw new common_1.NotFoundException('Certification not found');
        const verifyUrl = `https://verify.atlasio.tr/${cert.id}`;
        const qrPng = await QRCode.toBuffer(verifyUrl, { type: 'png', margin: 1, width: 220 });
        const doc = new pdfkit_1.default({ size: 'A4', margin: 48 });
        const stream = new stream_1.PassThrough();
        doc.pipe(stream);
        doc.registerFont('NotoSans', FONT_REGULAR);
        doc.font('NotoSans');
        doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).stroke('#b58b1a');
        doc.fontSize(18).fillColor('#b58b1a').text('Atlasio | Digital Education & Verification', { align: 'center' });
        doc.moveDown(1);
        const titleTr = 'Başarı Sertifikası';
        const titleEn = 'Certificate of Completion';
        doc.fontSize(28).fillColor('#111').text(locale === 'tr' ? titleTr : titleEn, { align: 'center' });
        doc.moveDown(1.5);
        const nameLine = `${cert.User?.name ?? cert.User?.email ?? cert.userId}`;
        const courseLine = `${cert.Course?.title ?? cert.courseId}`;
        const dateLine = new Date(cert.issuedAt).toLocaleDateString('tr-TR');
        doc.fontSize(14).fillColor('#333');
        doc.text(locale === 'tr' ? 'Bu sertifika' : 'This certifies that', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(18).fillColor('#000').text(nameLine, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#333');
        doc.text(locale === 'tr'
            ? `başarıyla tamamladı: ${courseLine}`
            : `has successfully completed: ${courseLine}`, { align: 'center' });
        doc.moveDown(1);
        doc.text(locale === 'tr' ? `Tarih: ${dateLine}` : `Date: ${dateLine}`, { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(12).fillColor('#555');
        doc.text(`Sertifika Kodu / Certificate Code: ${cert.id}`, { align: 'center' });
        doc.moveDown(2);
        const qrX = doc.page.width / 2 - 60;
        doc.image(qrPng, qrX, doc.y, { fit: [120, 120] });
        doc.moveDown(6);
        doc.fontSize(10).fillColor('#666').text(verifyUrl, { align: 'center', link: verifyUrl });
        doc.moveDown(2);
        doc.fontSize(12).fillColor('#111');
        doc.text('____________________________', { continued: true, align: 'left' });
        doc.text('____________________________', { align: 'right' });
        doc.text(locale === 'tr' ? 'Eğitim Direktörü' : 'Director of Education', { continued: true, align: 'left' });
        doc.text(locale === 'tr' ? 'Onaylayan' : 'Approved by', { align: 'right' });
        doc.end();
        return stream;
    }
};
exports.CertificationsService = CertificationsService;
exports.CertificationsService = CertificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], CertificationsService);
//# sourceMappingURL=certifications.service.js.map