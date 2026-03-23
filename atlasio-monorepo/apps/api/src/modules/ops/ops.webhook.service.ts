import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';
import { NotificationsService } from '../notifications/notifications.service';
import { createHmac } from 'crypto';

@Injectable()
export class OpsWebhookService {
  private readonly logger = new Logger(OpsWebhookService.name);

  constructor(private readonly notifications: NotificationsService) {}

  async notify(title: string, message: string, payload?: any) {
    const url = process.env.OPS_WEBHOOK_URL;
    if (!url) return { sent: false, reason: 'no_webhook' } as const;
    try {
      const body = JSON.stringify({ title, message, payload });
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // HMAC imza (ops webhook tarafında doğrulama için): X-Ops-Timestamp + X-Ops-Signature
      const secret = process.env.OPS_WEBHOOK_SECRET;
      const ts = Math.floor(Date.now() / 1000).toString();
      if (secret) {
        const hmac = createHmac('sha256', secret);
        hmac.update(ts + '.' + body);
        const sig = hmac.digest('hex');
        headers['x-ops-timestamp'] = ts;
        headers['x-ops-signature'] = sig;
      }

      await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
      // ayrıca admin/tech role'lerine mail ile bildirim
      await this.notifications.sendAdminAlert(`[OPS] ${title}`, message, payload);
      return { sent: true as const };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Ops webhook send failed: ${msg}`);
      return { sent: false as const, reason: 'send_failed' };
    }
  }
}
