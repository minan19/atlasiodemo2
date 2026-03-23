import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

type JwtUser = { id?: string; sub?: string; role?: string };

/**
 * /notifications namespace — admin ve head-instructor'lara
 * gerçek zamanlı alarm push bildirimleri.
 *
 * Frontend bağlantısı:
 *   const socket = io('http://localhost:4100/notifications', { auth: { token } });
 *   socket.on('alarm', (payload) => { ... });
 */
@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) {
    const user = this.authenticate(client);
    if (!user) {
      client.disconnect(true);
      return;
    }

    const role = (user.role ?? '').toUpperCase();
    if (role === 'ADMIN' || role === 'HEAD_INSTRUCTOR') {
      client.join('admins');
      this.logger.debug(`Admin connected: ${user.id ?? user.sub}`);
    } else {
      // Normal kullanıcılar kendi odasına girer (gelecekteki kişisel bildirimler için)
      const uid = user.id ?? user.sub;
      if (uid) client.join(`user:${uid}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Admin odasındaki tüm bağlı istemcilere alarm yayınla */
  emitAlarm(payload: {
    id: string;
    action: string;
    entity?: string | null;
    entityId?: string | null;
    createdAt: string;
  }) {
    this.server.to('admins').emit('alarm', payload);
  }

  /** Belirli bir kullanıcıya kişisel bildirim gönder */
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { ts: Date.now() });
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private authenticate(client: Socket): JwtUser | null {
    const token =
      (client.handshake.auth as Record<string, string>)?.token ??
      client.handshake.headers['authorization']?.toString()?.replace('Bearer ', '');
    if (!token) return null;
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    try {
      return jwt.verify(token, secret) as JwtUser;
    } catch {
      return null;
    }
  }
}
