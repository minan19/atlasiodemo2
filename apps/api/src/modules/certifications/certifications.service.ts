import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IssueCertificationDto } from './dto';
// pdfkit ships as a CommonJS module without a `default` export. The repo's
// tsconfig does not enable `esModuleInterop`, so a default-style import
// compiles to `require('pdfkit').default` which is `undefined` → "not a
// constructor" at runtime. The TS-style `import X = require(...)` form
// avoids the synthetic-default helper and resolves to the module itself.
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';
import { PassThrough } from 'stream';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

/**
 * Font path helpers — resolves for both dev (ts-node src/) and prod (dist/src/).
 */
import { existsSync } from 'fs';

function findFont(filename: string): string {
  const candidates = [
    join(__dirname, '../../assets/fonts', filename),
    join(__dirname, '../../../assets/fonts', filename),
    join(__dirname, '../../../../assets/fonts', filename),
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0];
}

/** Latin + Turkish diacritics + Cyrillic (tr/en/de/ru/kk) */
const FONT_REGULAR = findFont('NotoSans-Regular.ttf');
/** Arabic script (ar) — covers Arabic Unicode block with proper shaping */
const FONT_ARABIC  = findFont('NotoSansArabic-Regular.ttf');

/**
 * Supported certificate locales.
 * - tr/en/de/ru/kk: NotoSans-Regular (Latin + Cyrillic)
 * - ar: NotoSansArabic-Regular (proper Arabic glyph shaping, RTL layout)
 */
type CertLocale = 'tr' | 'en' | 'de' | 'ar' | 'ru' | 'kk';

interface LocaleStrings {
  brand: string;
  title: string;
  presentedTo: string;
  hasCompleted: string;
  issuedOn: string;
  verifyCode: string;
  signLeft: string;
  signRight: string;
  scanToVerify: string;
}

/**
 * Localised text for the certificate face. Keys mirror the visual sections
 * top-to-bottom so the layout stays in sync with translations.
 */
const STRINGS: Record<CertLocale, LocaleStrings> = {
  tr: {
    brand: 'ATLASIO · Dijital Eğitim ve Doğrulama Platformu',
    title: 'BAŞARI SERTİFİKASI',
    presentedTo: 'Bu sertifika',
    hasCompleted: 'kursunu başarıyla tamamladığını onaylar.',
    issuedOn: 'Veriliş Tarihi',
    verifyCode: 'Doğrulama Kodu',
    signLeft: 'Eğitim Direktörü',
    signRight: 'Onaylayan Yetkili',
    scanToVerify: 'Doğrulamak için tarayın',
  },
  en: {
    brand: 'ATLASIO · Digital Education & Verification Platform',
    title: 'CERTIFICATE OF ACHIEVEMENT',
    presentedTo: 'This certificate is presented to',
    hasCompleted: 'for the successful completion of the course',
    issuedOn: 'Issued On',
    verifyCode: 'Verification Code',
    signLeft: 'Director of Education',
    signRight: 'Authorized Signatory',
    scanToVerify: 'Scan to verify',
  },
  de: {
    brand: 'ATLASIO · Plattform für digitale Bildung und Verifizierung',
    title: 'LEISTUNGSZERTIFIKAT',
    presentedTo: 'Diese Urkunde wird verliehen an',
    hasCompleted: 'für den erfolgreichen Abschluss des Kurses',
    issuedOn: 'Ausstellungsdatum',
    verifyCode: 'Verifizierungscode',
    signLeft: 'Bildungsdirektor',
    signRight: 'Autorisierter Unterzeichner',
    scanToVerify: 'Zur Verifizierung scannen',
  },
  ar: {
    // Note: glyphs render in Latin transliteration until an Arabic font is bundled.
    brand: 'ATLASIO · منصة التعليم الرقمي والتحقق',
    title: 'شهادة إنجاز',
    presentedTo: 'تُمنح هذه الشهادة إلى',
    hasCompleted: 'لإكماله الناجح للدورة',
    issuedOn: 'تاريخ الإصدار',
    verifyCode: 'رمز التحقق',
    signLeft: 'مدير التعليم',
    signRight: 'الموقع المعتمد',
    scanToVerify: 'امسح للتحقق',
  },
  ru: {
    brand: 'ATLASIO · Платформа цифрового образования и верификации',
    title: 'СЕРТИФИКАТ ДОСТИЖЕНИЙ',
    presentedTo: 'Настоящий сертификат вручается',
    hasCompleted: 'за успешное завершение курса',
    issuedOn: 'Дата выдачи',
    verifyCode: 'Код верификации',
    signLeft: 'Директор по образованию',
    signRight: 'Уполномоченное лицо',
    scanToVerify: 'Сканируйте для проверки',
  },
  kk: {
    brand: 'ATLASIO · Цифрлық білім беру және верификация платформасы',
    title: 'ЖЕТІСТІК СЕРТИФИКАТЫ',
    presentedTo: 'Осы сертификат',
    hasCompleted: 'курсын сәтті аяқтағаны үшін табысталады.',
    issuedOn: 'Берілген күні',
    verifyCode: 'Верификация коды',
    signLeft: 'Білім беру директоры',
    signRight: 'Уәкілетті өкіл',
    scanToVerify: 'Тексеру үшін сканерлеңіз',
  },
};

const COLORS = {
  navy: '#0B1F3A',
  gold: '#C8A96A',
  goldLight: '#E2CF9E',
  ink: '#1A1A1A',
  inkLight: '#5C6677',
  page: '#FFFFFF',
};

@Injectable()
export class CertificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async issue(dto: IssueCertificationDto, actorId?: string) {
    const verifyCode = randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
    const certification = await this.prisma.certification.create({
      data: {
        userId: dto.userId,
        courseId: dto.courseId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        verifyCode,
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
    const cacheKey = `cert:verify:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as {
        valid: boolean;
        status: string;
        holder: string;
        course: string;
        issuedAt: Date;
        expiresAt: Date | null;
      };
    }

    const cert = await this.prisma.certification.findFirst({
      where: { verifyCode: key },
      include: { User: true, Course: true },
    });
    if (!cert) throw new NotFoundException('Certificate not found or invalid key');

    const result = {
      valid: cert.status === 'ACTIVE',
      status: cert.status,
      holder: cert.User?.name ?? cert.User?.email ?? cert.userId,
      course: cert.Course?.title ?? cert.courseId,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
    };

    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
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
   * Generate a print-ready PDF certificate.
   *
   * Layout: A4 landscape (842×595pt), navy + gold corporate palette, double
   * border, ATLASIO monogram top, presentation copy in chosen locale,
   * recipient name in display serif, course name highlighted, signature
   * lines, verification QR (top-right) and code (bottom-center). Stable
   * positioning — no auto-flow text — so output matches preview exactly.
   */
  async generatePdf(certId: string, locale: CertLocale = 'tr') {
    const cert = await this.prisma.certification.findUnique({
      where: { id: certId },
      include: { User: true, Course: true },
    });
    if (!cert) throw new NotFoundException('Certification not found');

    const lang: CertLocale = (['tr', 'en', 'de', 'ar', 'ru', 'kk'] as CertLocale[]).includes(locale)
      ? locale
      : 'tr';
    const s = STRINGS[lang];

    const verifyCode = cert.verifyCode ?? cert.id.slice(0, 12).toUpperCase();
    const verifyUrl = `https://verify.atlasio.tr/${verifyCode}`;
    const qrPng = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      margin: 0,
      width: 320,
      color: { dark: COLORS.navy, light: '#ffffff' },
    });

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      info: {
        Title: `Certificate · ${cert.id}`,
        Author: 'ATLASIO',
        Subject: 'Certificate of Achievement',
        Keywords: `certificate, atlasio, ${verifyCode}`,
      },
    });
    const stream = new PassThrough();
    doc.pipe(stream);

    // Register both fonts; select the Arabic one for `ar` locale.
    doc.registerFont('NotoSans', FONT_REGULAR);
    doc.registerFont('NotoSansArabic', FONT_ARABIC);
    const activeFont = lang === 'ar' ? 'NotoSansArabic' : 'NotoSans';
    // Arabic is RTL — align all text blocks to the right.
    const isRtl = lang === 'ar';
    const textAlign = isRtl ? 'right' : 'center';
    doc.font(activeFont);

    const pageW = doc.page.width; // 842
    const pageH = doc.page.height; // 595

    // ─── Page background ───────────────────────────────────────────────────
    doc.rect(0, 0, pageW, pageH).fill(COLORS.page);

    // ─── Outer + inner double border (gold) ────────────────────────────────
    const outerInset = 24;
    const innerInset = 38;
    doc.lineWidth(2.5)
      .strokeColor(COLORS.gold)
      .rect(outerInset, outerInset, pageW - 2 * outerInset, pageH - 2 * outerInset)
      .stroke();
    doc.lineWidth(0.7)
      .strokeColor(COLORS.gold)
      .rect(innerInset, innerInset, pageW - 2 * innerInset, pageH - 2 * innerInset)
      .stroke();

    // ─── Decorative corner ornaments (gold L-shapes) ───────────────────────
    const corner = (cx: number, cy: number, dirX: 1 | -1, dirY: 1 | -1) => {
      const len = 28;
      doc.lineWidth(2).strokeColor(COLORS.gold);
      doc.moveTo(cx, cy).lineTo(cx + len * dirX, cy).stroke();
      doc.moveTo(cx, cy).lineTo(cx, cy + len * dirY).stroke();
    };
    corner(innerInset + 14, innerInset + 14, 1, 1);
    corner(pageW - innerInset - 14, innerInset + 14, -1, 1);
    corner(innerInset + 14, pageH - innerInset - 14, 1, -1);
    corner(pageW - innerInset - 14, pageH - innerInset - 14, -1, -1);

    // ─── Top brand bar ─────────────────────────────────────────────────────
    doc.fillColor(COLORS.navy)
      .fontSize(11)
      .text(s.brand, 0, innerInset + 22, { width: pageW, align: textAlign, characterSpacing: 1.2 });

    // ─── Monogram (large gold A·X) ─────────────────────────────────────────
    // Faux monogram using two large characters; replaces the absent logo
    // asset and works with any font.
    const monoY = innerInset + 50;
    doc.fillColor(COLORS.gold).fontSize(40).text('A · X', 0, monoY, { width: pageW, align: 'center' });

    // Gold rule under monogram
    const ruleY = monoY + 56;
    const ruleW = 180;
    doc.lineWidth(1.5).strokeColor(COLORS.gold)
      .moveTo((pageW - ruleW) / 2, ruleY)
      .lineTo((pageW + ruleW) / 2, ruleY)
      .stroke();

    // ─── Title ─────────────────────────────────────────────────────────────
    doc.fillColor(COLORS.navy).fontSize(34)
      .text(s.title, 0, ruleY + 18, { width: pageW, align: textAlign, characterSpacing: 3 });

    // ─── Presented to ──────────────────────────────────────────────────────
    doc.fillColor(COLORS.inkLight).fontSize(13)
      .text(s.presentedTo, 0, ruleY + 70, { width: pageW, align: textAlign });

    // ─── Recipient name (large, gold) ──────────────────────────────────────
    const holder = cert.User?.name ?? cert.User?.email ?? cert.userId;
    doc.fillColor(COLORS.gold).fontSize(38)
      .text(holder, 0, ruleY + 92, { width: pageW, align: 'center' });

    // Underline beneath the name
    const nameW = Math.min(420, doc.widthOfString(holder) + 60);
    doc.lineWidth(0.6).strokeColor(COLORS.goldLight)
      .moveTo((pageW - nameW) / 2, ruleY + 142)
      .lineTo((pageW + nameW) / 2, ruleY + 142)
      .stroke();

    // ─── Course context ────────────────────────────────────────────────────
    doc.fillColor(COLORS.inkLight).fontSize(13)
      .text(s.hasCompleted, 0, ruleY + 154, { width: pageW, align: textAlign });

    const courseTitle = cert.Course?.title ?? cert.courseId;
    doc.fillColor(COLORS.navy).fontSize(18)
      .text(`« ${courseTitle} »`, 0, ruleY + 178, { width: pageW, align: 'center' });

    // ─── Bottom row: date · signatures · verify code ───────────────────────
    const baseY = pageH - innerInset - 90;

    // For RTL (Arabic): swap date to right column, code to left column.
    const dateColX  = isRtl ? pageW - 80 - 200 : 80;
    const dateAlign = isRtl ? ('right' as const) : ('left' as const);
    const codeColX  = isRtl ? 80 : pageW - 80 - 200;
    const codeAlign = isRtl ? ('left' as const) : ('right' as const);

    const issuedFmt = new Intl.DateTimeFormat(localeForDate(lang), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(cert.issuedAt));
    doc.fillColor(COLORS.inkLight).fontSize(10)
      .text(s.issuedOn.toUpperCase(), dateColX, baseY, { width: 200, align: dateAlign, characterSpacing: 1.2 });
    doc.fillColor(COLORS.ink).fontSize(13)
      .text(issuedFmt, dateColX, baseY + 16, { width: 200, align: dateAlign });

    // Verify code (opposite column)
    doc.fillColor(COLORS.inkLight).fontSize(10)
      .text(s.verifyCode.toUpperCase(), codeColX, baseY, { width: 200, align: codeAlign, characterSpacing: 1.2 });
    doc.fillColor(COLORS.navy).fontSize(13)
      .text(verifyCode, codeColX, baseY + 16, { width: 200, align: codeAlign, characterSpacing: 1.5 });

    // Signature lines (centered, two columns)
    const signY = baseY + 8;
    const signW = 180;
    // For RTL: left label becomes right label and vice versa
    const leftSignX  = pageW / 2 - signW - 24;
    const rightSignX = pageW / 2 + 24;
    doc.lineWidth(0.8).strokeColor(COLORS.ink)
      .moveTo(leftSignX, signY)
      .lineTo(leftSignX + signW, signY)
      .stroke();
    doc.lineWidth(0.8).strokeColor(COLORS.ink)
      .moveTo(rightSignX, signY)
      .lineTo(rightSignX + signW, signY)
      .stroke();

    const [leftLabel, rightLabel] = isRtl
      ? [s.signRight, s.signLeft]
      : [s.signLeft,  s.signRight];
    doc.fillColor(COLORS.inkLight).fontSize(9.5)
      .text(leftLabel,  leftSignX,  signY + 6, { width: signW, align: 'center', characterSpacing: 0.8 });
    doc.fillColor(COLORS.inkLight).fontSize(9.5)
      .text(rightLabel, rightSignX, signY + 6, { width: signW, align: 'center', characterSpacing: 0.8 });

    // ─── QR code (top-right corner inside frame, left for RTL) ────────────
    const qrSize = 78;
    // RTL: move QR to the left side so it doesn't clash with RTL text flow
    const qrX = isRtl
      ? innerInset + 22
      : pageW - innerInset - qrSize - 22;
    const qrY = innerInset + 22;
    doc.image(qrPng, qrX, qrY, { fit: [qrSize, qrSize] });
    doc.fillColor(COLORS.inkLight).fontSize(7.5)
      .text(s.scanToVerify, qrX - 30, qrY + qrSize + 4, { width: qrSize + 60, align: 'center' });

    // ─── Verify URL (footer, very small) ───────────────────────────────────
    doc.fillColor(COLORS.inkLight).fontSize(8)
      .text(verifyUrl, 0, pageH - innerInset - 14, {
        width: pageW,
        align: 'center',
        link: verifyUrl,
        underline: false,
      });

    doc.end();
    return stream;
  }
}

/**
 * Map our certificate locale to a BCP-47 tag for `Intl.DateTimeFormat`.
 * Cyrillic Kazakh uses kk-KZ; Arabic prefers ar-EG for stable digit display.
 */
function localeForDate(lang: CertLocale): string {
  switch (lang) {
    case 'tr': return 'tr-TR';
    case 'en': return 'en-US';
    case 'de': return 'de-DE';
    case 'ar': return 'ar-EG';
    case 'ru': return 'ru-RU';
    case 'kk': return 'kk-KZ';
  }
}
