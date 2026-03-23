import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardActionDto } from './dto';
import jwt from 'jsonwebtoken';
import { WhiteboardAlertsService } from './whiteboard.alerts';

type JwtUser = { id?: string; userId?: string; role?: string; roles?: string[] };

// SmartBoard — AI-powered collaborative workspace (WebSocket gateway)
@WebSocketGateway({ namespace: '/whiteboard', cors: { origin: '*' } })
export class WhiteboardGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly service: WhiteboardService,
    private readonly alerts: WhiteboardAlertsService,
  ) {}

  private async authenticate(client: Socket): Promise<JwtUser | null> {
    const token = (client.handshake.auth as any)?.token || client.handshake.headers['authorization']?.toString()?.replace('Bearer ', '');
    if (!token) return null;
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    try {
      const payload = jwt.verify(token, secret) as JwtUser;
      return payload;
    } catch {
      return null;
    }
  }

  private undoWindow: Record<string, { ts: number; count: number }> = {};

  private async alertUndo(sessionId: string, userId?: string) {
    const now = Date.now();
    const bucket = this.undoWindow[sessionId] ?? { ts: now, count: 0 };
    if (now - bucket.ts > 1000 * this.alerts['windowSeconds']) {
      this.undoWindow[sessionId] = { ts: now, count: 1 };
      return;
    }
    bucket.count += 1;
    this.undoWindow[sessionId] = bucket;
    await this.alerts.maybeAlertUndoFlood(sessionId, userId, bucket.count);
  }

  private rateCounter: Record<string, { ts: number; count: number }> = {};

  @SubscribeMessage('join')
  async handleJoin(@MessageBody() data: { sessionId: string; userId?: string }, @ConnectedSocket() client: Socket) {
    const user = await this.authenticate(client);
    if (!user) {
      client.emit('forbidden', { reason: 'auth' });
      client.disconnect();
      return;
    }
    const userId = data.userId ?? user.id ?? user.userId ?? 'unknown';
    await client.join(data.sessionId);
    client.data.userId = userId;
    client.data.role = user.role ?? user.roles?.[0];
    client.data.sessionId = data.sessionId;
    client.emit('joined', { sessionId: data.sessionId });
  }

  @SubscribeMessage('action')
  async handleAction(@MessageBody() dto: WhiteboardActionDto, @ConnectedSocket() client: Socket) {
    const user = client.data?.userId ? { id: client.data.userId, role: client.data.role } : await this.authenticate(client);
    if (!user || (!user.id && !client.data?.userId)) {
      client.emit('forbidden', { reason: 'auth' });
      client.disconnect();
      return;
    }
    dto.userId = dto.userId ?? (client.data?.userId || user.id || 'unknown');
    const rateHit = this.isRateLimited(client.id);
    if (rateHit) {
      await this.alerts.alertRateLimited(dto.sessionId, dto.userId, rateHit);
      client.emit('forbidden', { reason: 'rate-limit' });
      return;
    }
    const payloadSize = JSON.stringify(dto.payload ?? {}).length;
    if (payloadSize > 32 * 1024) {
      client.emit('forbidden', { reason: 'payload-too-large' });
      await this.alerts.alertPayloadTooLarge(dto.sessionId, dto.userId, payloadSize);
      return;
    }
    if (!(await this.service.canWrite(dto.sessionId, dto.userId))) {
      client.emit('forbidden', { reason: 'no write permission' });
      return;
    }
    // UNDO/REDO hedefi aynı session'da mı?
    if ((dto.type === 'UNDO' || dto.type === 'REDO') && !(await this.service.validateTargetAction(dto.sessionId, dto.targetActionId))) {
      client.emit('forbidden', { reason: 'invalid-target' });
      return;
    }

    const saved = await this.service.recordAction(dto, client.id);
    // Eğer UNDO/REDO ise hedef aksiyonu DB'de işaretle
    if (dto.type === 'UNDO' && dto.targetActionId) {
      await this.service.markReverted(dto.targetActionId, true);
      await this.alertUndo(dto.sessionId, dto.userId);
    } else if (dto.type === 'REDO' && dto.targetActionId) {
      await this.service.markReverted(dto.targetActionId, false);
      await this.alertUndo(dto.sessionId, dto.userId);
    }
    // id ve timestamp'i client'lara da gönder: undo/redo ve izleme için tutarlı olur
    this.server.to(dto.sessionId).emit('action', {
      ...dto,
      id: saved.id,
      createdAt: saved.createdAt,
    });
  }

  @SubscribeMessage('snapshot')
  async handleSnapshot(
    @MessageBody() data: { sessionId: string; limit?: number; includeReverted?: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = data.sessionId ?? client.data?.sessionId;
    if (!sessionId) {
      client.emit('forbidden', { reason: 'no-session' });
      return;
    }
    const snap = await this.service.getSnapshot(sessionId, data.limit ?? 2000, data.includeReverted ?? false);
    client.emit('snapshot', snap);
  }

  @SubscribeMessage('playback')
  async handlePlayback(
    @MessageBody()
    data: {
      sessionId: string;
      since?: string;
      until?: string;
      limit?: number;
      includeReverted?: boolean;
      afterId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const sessionId = data.sessionId ?? client.data?.sessionId;
    if (!sessionId) {
      client.emit('forbidden', { reason: 'no-session' });
      return;
    }
    const since = data.since ? new Date(data.since) : undefined;
    const until = data.until ? new Date(data.until) : undefined;
    const actions = await this.service.getActionsRange(
      sessionId,
      since,
      until,
      data.limit ?? 5000,
      data.includeReverted ?? false,
      data.afterId,
    );
    client.emit('playback', { sessionId, count: actions.length, actions });
  }

  private isRateLimited(socketId: string) {
    // Eğitmen/admin için daha yüksek limit
    const role = (this.server.sockets.sockets.get(socketId) as any)?.data?.role;
    const threshold = role === 'INSTRUCTOR' || role === 'ADMIN' ? 50 : 10;
    const now = Date.now();
    const bucket = this.rateCounter[socketId] ?? { ts: now, count: 0 };
    if (now - bucket.ts > 1000) {
      this.rateCounter[socketId] = { ts: now, count: 1 };
      return false;
    }
    bucket.count += 1;
    this.rateCounter[socketId] = bucket;
    return bucket.count > threshold ? bucket.count : 0;
  }
}
