import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import type { NotificationsGateway } from './notifications.gateway';

type MailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('NOTIFICATIONS_GATEWAY') private readonly gateway?: NotificationsGateway,
  ) {}

  /** Gerçek zamanlı alarm: WebSocket push + DB kaydı */
  pushAlarm(payload: {
    id: string;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    createdAt: string;
  }) {
    this.gateway?.emitAlarm(payload);
  }

  private buildTransport() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true';

    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async sendScheduledReport(params: {
    recipients: string[];
    subject: string;
    body: string;
    attachment: MailAttachment;
  }) {
    const transport = this.buildTransport();
    if (!transport) {
      this.logger.warn('SMTP is not configured. Scheduled report email skipped.');
      return { sent: false, reason: 'smtp_not_configured' as const };
    }

    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@atlasio.local';
    await transport.sendMail({
      from,
      to: params.recipients.join(','),
      subject: params.subject,
      text: params.body,
      attachments: [params.attachment],
    });

    return { sent: true as const };
  }

  /**
   * Belirli bir kullanıcıya doğrudan e-posta gönderir.
   * Şifre sıfırlama, e-posta doğrulama gibi transactional mailler için kullanılır.
   * SMTP yapılandırması yoksa log'lar ve sessizce devam eder.
   */
  async sendUserEmail(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ sent: boolean; reason?: string }> {
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

  /**
   * Kritik alarm e-postası: yalnızca ADMIN (ve varsa TECH) rollerine gönderilir.
   * SMTP yapılandırması yoksa log'lar ve sessizce devam eder.
   */
  async sendAdminAlert(subject: string, body: string, payload?: any) {
    const transport = this.buildTransport();
    if (!transport) {
      this.logger.warn(`SMTP not configured; admin alert skipped: ${subject}`);
      return { sent: false as const, reason: 'smtp_not_configured' as const };
    }
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'TECH'] as any }, isActive: true },
      select: { email: true },
      take: 100,
    });
    const emails = admins.map((a: any) => a.email).filter(Boolean);
    if (emails.length === 0) return { sent: false as const, reason: 'no_admins' as const };

    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@atlasio.local';
    const json = payload ? `\n\nPayload:\n${JSON.stringify(payload, null, 2)}` : '';
    await transport.sendMail({
      from,
      to: emails.join(','),
      subject,
      text: body + json,
    });
    return { sent: true as const };
  }
}
