import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { OpsWebhookService } from '../ops/ops.webhook.service';

@Injectable()
export class WhiteboardAlertsService {
  private readonly logger = new Logger(WhiteboardAlertsService.name);
  private readonly undoThreshold = Number(process.env.WB_ALERT_UNDO_THRESHOLD ?? 20);
  private readonly windowSeconds = Number(process.env.WB_ALERT_WINDOW ?? 60);
  private readonly payloadThresholdKb = Number(process.env.WB_ALERT_PAYLOAD_KB ?? 128);
  private readonly rateLimitThreshold = Number(process.env.WB_ALERT_RATELIMIT ?? 5); // ardışık engel sayısı
  private readonly layerSpamThreshold = Number(process.env.WB_ALERT_LAYER_SPAM ?? 10);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly opsWebhook: OpsWebhookService,
  ) {}

  /**
   * Basit undo/redo flood uyarısı.
   */
  async maybeAlertUndoFlood(sessionId: string, actor: string | undefined, countInWindow: number) {
    if (countInWindow < this.undoThreshold) return;
    const msg = `Whiteboard undo/redo flood: session=${sessionId}, count=${countInWindow}/${this.windowSeconds}s, actor=${actor ?? 'unknown'}`;
    this.logger.warn(msg);
    await this.opsWebhook.notify('Whiteboard undo flood', msg, { sessionId, actor, count: countInWindow });
    await this.notifications.sendAdminAlert('Whiteboard undo/redo flood', msg, { sessionId, actor, count: countInWindow });
  }

  async alertPayloadTooLarge(sessionId: string, actor: string | undefined, sizeBytes: number) {
    if (sizeBytes < this.payloadThresholdKb * 1024) return;
    const msg = `Whiteboard payload too large: ${Math.round(sizeBytes / 1024)}KB, session=${sessionId}, actor=${actor ?? 'unknown'}`;
    this.logger.warn(msg);
    await this.opsWebhook.notify('Whiteboard payload large', msg, { sessionId, actor, sizeBytes });
    await this.notifications.sendAdminAlert('Whiteboard payload large', msg, { sessionId, actor, sizeBytes });
  }

  async alertRateLimited(sessionId: string, actor: string | undefined, hitCount: number) {
    if (hitCount < this.rateLimitThreshold) return;
    const msg = `Whiteboard rate-limit hits=${hitCount} session=${sessionId} actor=${actor ?? 'unknown'}`;
    this.logger.warn(msg);
    await this.opsWebhook.notify('Whiteboard rate-limit', msg, { sessionId, actor, hitCount });
    await this.notifications.sendAdminAlert('Whiteboard rate-limit', msg, { sessionId, actor, hitCount });
  }

  async alertLayerSpam(sessionId: string, actor: string | undefined, count: number) {
    if (count < this.layerSpamThreshold) return;
    const msg = `Whiteboard layer spam: session=${sessionId}, count=${count}, actor=${actor ?? 'unknown'}`;
    this.logger.warn(msg);
    await this.opsWebhook.notify('Whiteboard layer spam', msg, { sessionId, actor, count });
    await this.notifications.sendAdminAlert('Whiteboard layer spam', msg, { sessionId, actor, count });
  }
}
