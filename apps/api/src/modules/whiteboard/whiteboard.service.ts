import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhiteboardActionDto } from './dto';
import { Prisma } from '@prisma/client';
import { PassThrough } from 'stream';
import { createGzip } from 'zlib';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';

export interface AiAssistAction {
  type: 'TEXT' | 'SHAPE' | 'DRAW';
  payload: Record<string, any>;
}

export interface AiAssistResult {
  suggestion: string;
  actions: AiAssistAction[];
}

@Injectable()
export class WhiteboardService {
  private readonly logger = new Logger(WhiteboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

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
    return this.hasWritePermission(sessionId, userId);
  }

  /**
   * Checks whether a user has write permission for a whiteboard session.
   * INSTRUCTOR and ADMIN always have write access.
   * Other users must have been explicitly granted access via grantWrite().
   */
  async hasWritePermission(sessionId: string, userId?: string, role?: string): Promise<boolean> {
    if (!userId) return false;

    // INSTRUCTOR / ADMIN always allowed
    if (role === 'INSTRUCTOR' || role === 'ADMIN') return true;

    const wb = await this.prisma.whiteboardSession.findUnique({
      where: { id: sessionId },
      include: { LiveSession: true },
    });
    if (!wb) throw new NotFoundException('Whiteboard session not found');

    // Session instructor always allowed
    if (wb.LiveSession.instructorId === userId) return true;

    // Check participant role in the live session
    const participant = await this.prisma.liveSessionParticipant.findFirst({
      where: { sessionId: wb.liveSessionId, userId },
      select: { role: true },
    });
    if (participant?.role === 'INSTRUCTOR' || participant?.role === 'ADMIN') return true;

    // Check Redis grant set
    const isMember = await this.redis.sismember(`wb:write:${sessionId}`, userId);
    return isMember === 1;
  }

  /**
   * Grants write permission to targetUserId for the given whiteboard session.
   * Only the session instructor or an INSTRUCTOR/ADMIN participant may grant.
   */
  async grantWrite(sessionId: string, targetUserId: string, grantedBy: string): Promise<{ granted: boolean; userId: string }> {
    const wb = await this.prisma.whiteboardSession.findUnique({
      where: { id: sessionId },
      include: { LiveSession: true },
    });
    if (!wb) throw new NotFoundException('Whiteboard session not found');

    // Verify grantedBy has authority
    const isInstructor = wb.LiveSession.instructorId === grantedBy;
    const participant = await this.prisma.liveSessionParticipant.findFirst({
      where: { sessionId: wb.liveSessionId, userId: grantedBy },
      select: { role: true },
    });
    const hasAuthority = isInstructor || participant?.role === 'INSTRUCTOR' || participant?.role === 'ADMIN';
    if (!hasAuthority) throw new ForbiddenException('Only instructors or admins can grant write access');

    // Persist in Redis with a 24-hour TTL
    await this.redis.sadd(`wb:write:${sessionId}`, targetUserId);
    await this.redis.expire(`wb:write:${sessionId}`, 60 * 60 * 24);

    // Record action in the audit log
    await this.prisma.whiteboardAction.create({
      data: {
        sessionId,
        type: 'GRANT',
        layerId: 'default',
        payload: { targetUserId, grantedBy } as Prisma.InputJsonValue,
        userId: grantedBy,
      },
    });

    return { granted: true, userId: targetUserId };
  }

  /**
   * Revokes write permission from targetUserId for the given whiteboard session.
   * Only the session instructor or an INSTRUCTOR/ADMIN participant may revoke.
   */
  async revokeWrite(sessionId: string, targetUserId: string, revokedBy: string): Promise<{ revoked: boolean; userId: string }> {
    const wb = await this.prisma.whiteboardSession.findUnique({
      where: { id: sessionId },
      include: { LiveSession: true },
    });
    if (!wb) throw new NotFoundException('Whiteboard session not found');

    // Verify revokedBy has authority
    const isInstructor = wb.LiveSession.instructorId === revokedBy;
    const participant = await this.prisma.liveSessionParticipant.findFirst({
      where: { sessionId: wb.liveSessionId, userId: revokedBy },
      select: { role: true },
    });
    const hasAuthority = isInstructor || participant?.role === 'INSTRUCTOR' || participant?.role === 'ADMIN';
    if (!hasAuthority) throw new ForbiddenException('Only instructors or admins can revoke write access');

    // Remove from Redis grant set
    await this.redis.srem(`wb:write:${sessionId}`, targetUserId);

    // Record action in the audit log
    await this.prisma.whiteboardAction.create({
      data: {
        sessionId,
        type: 'REVOKE',
        layerId: 'default',
        payload: { targetUserId, revokedBy } as Prisma.InputJsonValue,
        userId: revokedBy,
      },
    });

    return { revoked: true, userId: targetUserId };
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
   * AI Assist: generates a whiteboard content suggestion for a given prompt.
   */
  async aiAssist(
    sessionId: string,
    prompt: string,
    context: string | undefined,
    userId: string | undefined,
  ): Promise<AiAssistResult> {
    const wb = await this.prisma.whiteboardSession.findUnique({ where: { id: sessionId } });
    if (!wb) throw new NotFoundException('Whiteboard session not found');

    let result: AiAssistResult;

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      result = await this.callOpenAIForWhiteboard(prompt, context, apiKey);
    } else {
      result = this.getMockWhiteboardAssist(prompt);
    }

    // Record the AI assist as a whiteboard action
    await this.prisma.whiteboardAction.create({
      data: {
        sessionId,
        type: 'AI_ASSIST',
        layerId: 'default',
        payload: { prompt, context, suggestion: result.suggestion, actions: result.actions } as unknown as Prisma.InputJsonValue,
        userId,
      },
    });

    return result;
  }

  private async callOpenAIForWhiteboard(
    prompt: string,
    context: string | undefined,
    apiKey: string,
  ): Promise<AiAssistResult> {
    const systemMsg = 'You are an AI whiteboard assistant. Return JSON with: suggestion (string), actions (array of {type: "TEXT"|"SHAPE"|"DRAW", payload: object}). No markdown.';
    const userMsg = context
      ? `Context: ${context}\n\nUser request: ${prompt}`
      : prompt;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI whiteboard assist error ${response.status}, falling back to mock`);
        return this.getMockWhiteboardAssist(prompt);
      }

      const data = await response.json() as any;
      const raw = data.choices?.[0]?.message?.content ?? '{}';
      return JSON.parse(raw) as AiAssistResult;
    } catch (err) {
      this.logger.warn('OpenAI whiteboard assist failed, falling back to mock');
      return this.getMockWhiteboardAssist(prompt);
    }
  }

  private getMockWhiteboardAssist(prompt: string): AiAssistResult {
    return {
      suggestion: `Here is a whiteboard layout suggestion for: "${prompt}". Consider adding a title at the top, main content in the center, and key points along the right side.`,
      actions: [
        {
          type: 'TEXT',
          payload: {
            text: prompt,
            x: 100,
            y: 50,
            fontSize: 24,
            fontWeight: 'bold',
          },
        },
        {
          type: 'SHAPE',
          payload: {
            shape: 'rectangle',
            x: 80,
            y: 120,
            width: 600,
            height: 300,
            strokeColor: '#4A90D9',
            fillColor: 'transparent',
          },
        },
        {
          type: 'TEXT',
          payload: {
            text: 'Add your main content here',
            x: 100,
            y: 150,
            fontSize: 16,
          },
        },
      ],
    };
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

  // ──────────────────────────────────────────────────────────────────────────
  // Magic Switch — Whiteboard içeriğini ders dokümanına dönüştür
  // ──────────────────────────────────────────────────────────────────────────
  async summarizeToDocument(sessionId: string, language: 'tr' | 'en' = 'tr'): Promise<{
    title: string;
    introduction: string;
    sections: { heading: string; content: string }[];
    keyPoints: string[];
    raw?: string;
  }> {
    const actions = await this.prisma.whiteboardAction.findMany({
      where: { sessionId, reverted: false },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });

    // TEXT eylemlerinden içerik çıkar
    const textItems = actions
      .filter((a: any) => a.type === 'TEXT' && (a.payload as any)?.text)
      .map((a: any) => String((a.payload as any).text).trim())
      .filter(Boolean);

    const rawText = textItems.join('\n');
    const apiKey = process.env.OPENAI_API_KEY;
    const isTr = language === 'tr';

    if (apiKey && rawText.length > 10) {
      const langLabel = isTr ? 'Turkish' : 'English';
      const prompt = `Convert the following whiteboard notes into a structured educational document in ${langLabel}. Return JSON: { title, introduction, sections: [{ heading, content }], keyPoints: string[] }.\n\nNotes:\n${rawText.slice(0, 3000)}`;
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1500, response_format: { type: 'json_object' } }),
        });
        const json = await res.json() as any;
        const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
        return { ...parsed, raw: rawText };
      } catch { /* fall through */ }
    }

    // Mock fallback
    return {
      title: isTr ? 'Tahta Ders Özeti' : 'Whiteboard Session Summary',
      introduction: isTr
        ? `Bu belge, tahta oturumunda oluşturulan içeriklerin yapılandırılmış özetidir. Toplam ${actions.length} eylem ve ${textItems.length} metin öğesi bulunmaktadır.`
        : `This document is a structured summary of content created during the whiteboard session. Total: ${actions.length} actions and ${textItems.length} text items.`,
      sections: textItems.slice(0, 6).map((t: string, i: number) => ({
        heading: isTr ? `Bölüm ${i + 1}` : `Section ${i + 1}`,
        content: t,
      })),
      keyPoints: textItems.slice(0, 5),
      raw: rawText,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // AI Brainstorm Sticky Notes — Konu için beyin fırtınası fikirleri üret
  // ──────────────────────────────────────────────────────────────────────────
  async generateStickyNotes(sessionId: string, topic: string, count = 6, language: 'tr' | 'en' = 'tr'): Promise<{
    notes: Array<{ id: string; text: string; color: string }>;
  }> {
    const apiKey = process.env.OPENAI_API_KEY;
    const isTr = language === 'tr';
    const langLabel = isTr ? 'Turkish' : 'English';

    const COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa'];
    let ideas: string[] = [];

    if (apiKey) {
      const prompt = `Generate ${count} short, creative brainstorming ideas or key points for the topic "${topic}" in ${langLabel}. Return JSON: { ideas: string[] }. Each idea should be 5-12 words max.`;
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 400, response_format: { type: 'json_object' } }),
        });
        const json = await res.json() as any;
        const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? '{}');
        ideas = parsed.ideas ?? [];
      } catch { /* fall through */ }
    }

    if (ideas.length === 0) {
      ideas = isTr
        ? [`${topic} temel kavramları`, `${topic} uygulamaları`, `${topic} avantajları`, `${topic} zorlukları`, `${topic} örnekleri`, `${topic} gelecek trendleri`]
        : [`Core concepts of ${topic}`, `Applications of ${topic}`, `Benefits of ${topic}`, `Challenges in ${topic}`, `Examples of ${topic}`, `Future trends in ${topic}`];
    }

    const notes = ideas.slice(0, count).map((text, i) => ({
      id: `sticky-${Date.now()}-${i}`,
      text,
      color: COLORS[i % COLORS.length],
    }));

    return { notes };
  }
}
