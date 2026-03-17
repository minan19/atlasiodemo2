import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhiteboardActionDto } from './dto';
import { Prisma } from '@prisma/client';
import { PassThrough } from 'stream';
import { createGzip } from 'zlib';

@Injectable()
export class WhiteboardService {
  constructor(private readonly prisma: PrismaService) {}

  async start(liveSessionId: string) {
    const live = await this.prisma.liveSession.findUnique({ where: { id: liveSessionId } });
    if (!live) throw new NotFoundException('Live session not found');
    const wb = await this.prisma.whiteboardSession.upsert({
      where: { liveSessionId },
      create: { liveSessionId },
      update: {},
    });
    return wb;
  }

  async createLayer(sessionId: string, name: string, userId?: string) {
    if (!(await this.canManageLayers(sessionId, userId))) {
      throw new NotFoundException('Not allowed');
    }
    const exists = await this.prisma.whiteboardLayer.findUnique({
      where: { sessionId_name: { sessionId, name } },
    });
    if (exists) return { layerId: name, existed: true };
    await this.prisma.whiteboardLayer.create({
      data: { sessionId, name, createdBy: userId },
    });
    await this.prisma.whiteboardAction.create({
      data: {
        sessionId,
        type: 'LAYER_CREATE',
        layerId: name,
        payload: { layerId: name, createdBy: userId },
        userId,
      },
    });
    await this.bumpLayerSpam(sessionId, userId);
    return { layerId: name, existed: false };
  }

  async deleteLayer(sessionId: string, name: string, userId?: string) {
    if (!(await this.canManageLayers(sessionId, userId))) {
      throw new NotFoundException('Not allowed');
    }
    await this.prisma.whiteboardLayer.deleteMany({ where: { sessionId, name } });
    await this.prisma.whiteboardAction.create({
      data: {
        sessionId,
        type: 'LAYER_DELETE',
        layerId: name,
        payload: { layerId: name, deletedBy: userId },
        userId,
      },
    });
    await this.bumpLayerSpam(sessionId, userId);
    return { layerId: name, deleted: true };
  }

  async listLayers(sessionId: string) {
    const rows = await this.prisma.whiteboardLayer.findMany({
      where: { sessionId },
      orderBy: { name: 'asc' },
    });
    const names = ['default', ...rows.map((r: any) => r.name)];
    return Array.from(new Set(names));
  }

  private async canManageLayers(sessionId: string, userId?: string) {
    if (!userId) return false;
    const wb = await this.prisma.whiteboardSession.findUnique({
      where: { id: sessionId },
      include: { LiveSession: true },
    });
    if (!wb) return false;
    if (wb.LiveSession.instructorId === userId) return true;
    const participant = await this.prisma.liveSessionParticipant.findFirst({
      where: { sessionId: wb.liveSessionId, userId },
      select: { role: true },
    });
    return participant?.role === 'INSTRUCTOR' || participant?.role === 'ADMIN';
  }

  // basit layer spam kontrolü
  private layerSpamCounter: Record<string, { ts: number; count: number }> = {};
  private async bumpLayerSpam(sessionId: string, userId?: string) {
    const now = Date.now();
    const windowMs = Number(process.env.WB_ALERT_WINDOW ?? 60000);
    const key = `${sessionId}:${userId ?? 'unknown'}`;
    const bucket = this.layerSpamCounter[key] ?? { ts: now, count: 0 };
    if (now - bucket.ts > windowMs) {
      this.layerSpamCounter[key] = { ts: now, count: 1 };
      return;
    }
    bucket.count += 1;
    this.layerSpamCounter[key] = bucket;
    const count = bucket.count;
    // lazy load alerts to avoid circular dep; service already injected
    const alerts = (this as any).alerts;
    if (alerts?.alertLayerSpam) {
      await alerts.alertLayerSpam(sessionId, userId, count);
    }
  }

  /**
   * Kaydı DB'ye yazar ve oluşturulan aksiyonu (id, createdAt) döner.
   * Layer/shape/text gibi bilgiler payload içinde taşınır.
   */
  async recordAction(dto: WhiteboardActionDto, socketId: string) {
    // audit kaydı: userId payload içinden de gelebilir, DTO da kullanıcıya işlenmiş olacak
    const created = await this.prisma.whiteboardAction.create({
      data: {
        sessionId: dto.sessionId,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue,
        userId: dto.payload?.userId,
        socketId,
        layerId: dto.layerId ?? dto.payload?.layerId ?? 'default',
        targetActionId: dto.targetActionId ?? dto.payload?.targetActionId,
      },
    });
    return created;
  }

  async getActions(sessionId: string, limit = 500) {
    return this.prisma.whiteboardAction.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async validateTargetAction(sessionId: string, targetActionId?: string) {
    if (!targetActionId) return false;
    const target = await this.prisma.whiteboardAction.findUnique({
      where: { id: targetActionId },
      select: { id: true, sessionId: true },
    });
    return !!target && target.sessionId === sessionId;
  }

  async markReverted(targetActionId: string, reverted: boolean) {
    return this.prisma.whiteboardAction.update({
      where: { id: targetActionId },
      data: { reverted },
    });
  }

  async canWrite(sessionId: string, userId?: string) {
    // Basit kural: live session eğitmeni her zaman yazar; diğerleri için ileride grant tablosu eklenebilir.
    const wb = await this.prisma.whiteboardSession.findUnique({ where: { id: sessionId }, include: { LiveSession: true } });
    if (!wb) throw new NotFoundException('Whiteboard session not found');
    if (!userId) return false;
    if (wb.LiveSession.instructorId === userId) return true;
    // Eğer participant rolü INSTRUCTOR veya ADMIN ise yazabilir
    const participant = await this.prisma.liveSessionParticipant.findFirst({
      where: { sessionId: wb.liveSessionId, userId },
      select: { role: true },
    });
    return participant?.role === 'INSTRUCTOR' || participant?.role === 'ADMIN';
  }

  async getSnapshot(sessionId: string, limit = 2000, includeReverted = false) {
    const actions = await this.prisma.whiteboardAction.findMany({
      where: includeReverted ? { sessionId } : { sessionId, reverted: { not: true } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return {
      sessionId,
      count: actions.length,
      actions,
    };
  }

  async getActionsRange(
    sessionId: string,
    since?: Date,
    until?: Date,
    limit = 2000,
    includeReverted = false,
    afterId?: string,
  ) {
    const cursorAction = afterId
      ? await this.prisma.whiteboardAction.findUnique({
          where: { id: afterId },
          select: { createdAt: true, id: true },
        })
      : null;
    return this.prisma.whiteboardAction.findMany({
      where: {
        ...(includeReverted ? { sessionId } : { sessionId, reverted: { not: true } }),
        createdAt: {
          gt: cursorAction?.createdAt,
          gte: cursorAction?.createdAt ? undefined : since,
          lte: until,
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Aktif state: reverted olmayan aksiyonları layer bazında döndürür.
   */
  async getActiveState(sessionId: string, limitPerLayer = 2000) {
    const layers = await this.listLayers(sessionId);
    const byLayer: Record<string, any[]> = {};
    for (const layer of layers) {
      const actions = await this.prisma.whiteboardAction.findMany({
        where: { sessionId, layerId: layer, reverted: { not: true } },
        orderBy: { createdAt: 'asc' },
        take: limitPerLayer,
      });
      byLayer[layer] = actions;
    }
    return { sessionId, layers: byLayer };
  }

  /**
   * Aktif canvas state'ini (reverted hariç) kompakt JSON olarak üretir.
   * Şekil/pattern çözümlenmez; aksiyon listesi layer bazında gruplu dönülür.
   */
  async getActiveCanvas(sessionId: string, limitPerLayer = 2000) {
    const layers = await this.listLayers(sessionId);
    const frames: Record<string, any[]> = {};
    for (const layer of layers) {
      const actions = await this.prisma.whiteboardAction.findMany({
        where: { sessionId, layerId: layer, reverted: { not: true } },
        orderBy: { createdAt: 'asc' },
        take: limitPerLayer,
      });
      frames[layer] = actions.map((a: any) => ({
        id: a.id,
        type: a.type,
        payload: a.payload,
        createdAt: a.createdAt,
        userId: a.userId,
      }));
    }
    return { sessionId, canvas: frames };
  }

  getActiveCanvasStream(sessionId: string, limitPerLayer = 2000) {
    const gzip = createGzip();
    const out = new PassThrough();
    (async () => {
      out.write('{"sessionId":"'+sessionId+'","canvas":{');
      const layers = await this.listLayers(sessionId);
      let firstLayer = true;
      for (const layer of layers) {
        const actions = await this.prisma.whiteboardAction.findMany({
          where: { sessionId, layerId: layer, reverted: { not: true } },
          orderBy: { createdAt: 'asc' },
          take: limitPerLayer,
        });
        if (!firstLayer) out.write(',');
        out.write(`"${layer}":`);
        out.write(JSON.stringify(actions.map((a: any) => ({
          id: a.id,
          type: a.type,
          payload: a.payload,
          createdAt: a.createdAt,
          userId: a.userId,
        }))));
        firstLayer = false;
      }
      out.write('}}');
      out.end();
    })().catch((err) => {
      out.destroy(err);
    });
    return out.pipe(gzip);
  }

  /**
   * Chunk + gzip playback stream.
   */
  async getActionsStream(
    sessionId: string,
    since?: Date,
    until?: Date,
    limit = 5000,
    includeReverted = false,
    afterId?: string,
    chunkSize = 5000,
    gzipLevel = 6,
  ) {
    const gzip = createGzip({ level: gzipLevel });
    const out = new PassThrough();
    out.write('{"sessionId":"'+sessionId+'","actions":[');

    // ilk batch
    let cursor = afterId;
    let first = true;
    while (true) {
      const batch = await this.getActionsRange(sessionId, since, until, chunkSize, includeReverted, cursor);
      if (batch.length === 0) break;
      for (const a of batch) {
        if (!first) out.write(',');
        out.write(JSON.stringify(a));
        first = false;
      }
      if (batch.length < chunkSize) break;
      cursor = batch[batch.length - 1].id;
    }
    out.write(']}');
    out.end();
    return out.pipe(gzip);
  }
}
