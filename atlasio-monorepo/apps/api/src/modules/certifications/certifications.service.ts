import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IssueCertificationDto } from './dto';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { PassThrough } from 'stream';

/** Türkçe karakter desteği olan NotoSans font yolu */
const FONT_REGULAR = join(__dirname, '../../../assets/fonts/NotoSans-Regular.ttf');

@Injectable()
export class CertificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async issue(dto: IssueCertificationDto, actorId?: string) {
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

  listMine(userId: string) {
    return this.prisma.certification.findMany({
      where: { userId },
      include: { Course: true },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async verify(key: string) {
    const cert = await this.prisma.certification.findFirst({
      where: { verifyCode: key },
      include: { User: true, Course: true },
    });
    if (!cert) throw new NotFoundException('Certificate not found or invalid key');
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

  /**
   * Sertifika PDF üretimi (TR/EN), QR doğrulama linki ve seri kodu ile.
   */
  async generatePdf(certId: string, locale: 'tr' | 'en' = 'tr') {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: { User: true, Course: true },
    });
    if (!cert) throw new NotFoundException('Certification not found');

    const verifyUrl = `https://verify.atlasio.tr/${cert.id}`;
    const qrPng = await QRCode.toBuffer(verifyUrl, { type: 'png', margin: 1, width: 220 });

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = new PassThrough();
    doc.pipe(stream);

    // Türkçe karakter desteği için NotoSans kullan
    doc.registerFont('NotoSans', FONT_REGULAR);
    doc.font('NotoSans');

    // Çerçeve / watermark çizgisi
    doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).stroke('#b58b1a');
    doc.fontSize(18).fillColor('#b58b1a').text('Atlasio | Digital Education & Verification', { align: 'center' });
    doc.moveDown(1);

    // Başlık
    const titleTr = 'Başarı Sertifikası';
    const titleEn = 'Certificate of Completion';
    doc.fontSize(28).fillColor('#111').text(locale === 'tr' ? titleTr : titleEn, { align: 'center' });
    doc.moveDown(1.5);

    // İçerik
    const nameLine = `${cert.User?.name ?? cert.User?.email ?? cert.userId}`;
    const courseLine = `${cert.Course?.title ?? cert.courseId}`;
    const dateLine = new Date(cert.issuedAt).toLocaleDateString('tr-TR');

    doc.fontSize(14).fillColor('#333');
    doc.text(locale === 'tr' ? 'Bu sertifika' : 'This certifies that', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(18).fillColor('#000').text(nameLine, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#333');
    doc.text(
      locale === 'tr'
        ? `başarıyla tamamladı: ${courseLine}`
        : `has successfully completed: ${courseLine}`,
      { align: 'center' },
    );
    doc.moveDown(1);
    doc.text(locale === 'tr' ? `Tarih: ${dateLine}` : `Date: ${dateLine}`, { align: 'center' });
    doc.moveDown(1);

    // Seri/verify kodu
    doc.fontSize(12).fillColor('#555');
    doc.text(`Sertifika Kodu / Certificate Code: ${cert.id}`, { align: 'center' });

    // QR
    doc.moveDown(2);
    const qrX = doc.page.width / 2 - 60;
    doc.image(qrPng, qrX, doc.y, { fit: [120, 120] });
    doc.moveDown(6);
    doc.fontSize(10).fillColor('#666').text(verifyUrl, { align: 'center', link: verifyUrl });

    // İmzalar
    doc.moveDown(2);
    doc.fontSize(12).fillColor('#111');
    doc.text('____________________________', { continued: true, align: 'left' });
    doc.text('____________________________', { align: 'right' });
    doc.text(locale === 'tr' ? 'Eğitim Direktörü' : 'Director of Education', { continued: true, align: 'left' });
    doc.text(locale === 'tr' ? 'Onaylayan' : 'Approved by', { align: 'right' });

    doc.end();
    return stream;
  }
}
