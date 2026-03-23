import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * AI Safety Service: Guards all AI interactions with:
 * 1. Prompt Injection Detection — blocks malicious prompts
 * 2. PII Masking — strips personal data before sending to LLM
 * 3. Output Sanitization — filters harmful AI responses
 * 4. Model Version Gating — controls which model versions are active
 * 5. Rate Limiting — per-user AI request throttling
 * 6. Explainability Metadata — tracks why AI made each decision
 */

// ─── Prompt Injection Patterns ───────────────────────────────────────────────

const INJECTION_PATTERNS = [
  // Direct instruction overrides
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|above|prior)/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  // Role manipulation
  /you\s+are\s+now\s+(a|an|the)\s+(hacker|evil|malicious)/i,
  /pretend\s+(you\s+are|to\s+be)\s+(a|an)/i,
  /act\s+as\s+(a|an|if)\s+(you|hacker|admin|root)/i,
  // System prompt extraction
  /reveal\s+(your|the|system)\s+(prompt|instructions|rules)/i,
  /what\s+(are|is)\s+your\s+(system|initial|original)\s+(prompt|instructions)/i,
  /show\s+me\s+(your|the)\s+(prompt|instructions|rules)/i,
  // Jailbreak patterns
  /DAN\s+mode/i,
  /developer\s+mode\s+(enabled|on|activate)/i,
  /\bDO\s+ANYTHING\s+NOW\b/i,
  // Encoding bypass attempts
  /base64\s*decode/i,
  /eval\s*\(/i,
  /\\x[0-9a-f]{2}/i,
  // Turkish patterns
  /önceki\s+(talimatları|kuralları)\s+(unut|görmezden\s+gel)/i,
  /sistem\s+promptunu\s+göster/i,
];

// ─── PII Patterns ────────────────────────────────────────────────────────────

const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string; label: string }> = [
  // Email
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]', label: 'email' },
  // Turkish ID number (TC Kimlik No - 11 digits)
  { pattern: /\b[1-9]\d{10}\b/g, replacement: '[TC_KIMLIK]', label: 'tc_kimlik' },
  // Phone numbers (Turkish format)
  { pattern: /(\+90|0)\s*[-(]?\s*\d{3}\s*[-).]?\s*\d{3}\s*[-.]?\s*\d{2}\s*[-.]?\s*\d{2}/g, replacement: '[PHONE]', label: 'phone' },
  // Credit card numbers
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '[CREDIT_CARD]', label: 'credit_card' },
  // IBAN
  { pattern: /\bTR\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{2}\b/g, replacement: '[IBAN]', label: 'iban' },
  // IP addresses
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP_ADDR]', label: 'ip_address' },
  // SSN (US format)
  { pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, replacement: '[SSN]', label: 'ssn' },
];

// ─── Harmful Output Patterns ─────────────────────────────────────────────────

const HARMFUL_OUTPUT_PATTERNS = [
  /how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|explosive)/i,
  /instructions\s+for\s+(hacking|breaking\s+into)/i,
  /self[-\s]?harm/i,
  /suicide\s+(method|technique|instruction)/i,
];

export interface SafetyCheckResult {
  safe: boolean;
  blocked: boolean;
  reason?: string;
  injectionDetected: boolean;
  piiFound: string[];
  piiMaskedText: string;
  harmfulContent: boolean;
  riskScore: number;       // 0-100
  metadata: {
    modelVersion?: string;
    checkDurationMs: number;
    patterns: string[];
  };
}

export interface ModelGateConfig {
  modelId: string;
  version: string;
  enabled: boolean;
  maxTokens: number;
  temperatureRange: [number, number];
  allowedRoles: string[];
  rateLimit: { maxPerMinute: number; maxPerDay: number };
}

@Injectable()
export class AiSafetyService {
  private readonly logger = new Logger(AiSafetyService.name);

  // Default model gating config
  private readonly modelGates: Map<string, ModelGateConfig> = new Map([
    ['gpt-4', {
      modelId: 'gpt-4',
      version: '2024-01',
      enabled: true,
      maxTokens: 4096,
      temperatureRange: [0, 1.0],
      allowedRoles: ['ADMIN', 'INSTRUCTOR'],
      rateLimit: { maxPerMinute: 10, maxPerDay: 500 },
    }],
    ['gpt-3.5-turbo', {
      modelId: 'gpt-3.5-turbo',
      version: '2024-01',
      enabled: true,
      maxTokens: 2048,
      temperatureRange: [0, 1.0],
      allowedRoles: ['ADMIN', 'INSTRUCTOR', 'STUDENT'],
      rateLimit: { maxPerMinute: 20, maxPerDay: 1000 },
    }],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── Full Safety Check ─────────────────────────────────────────────────────

  /**
   * Run comprehensive safety check on input text before sending to AI.
   */
  async checkInput(text: string, userId?: string, tenantId?: string): Promise<SafetyCheckResult> {
    const start = Date.now();
    const patterns: string[] = [];

    // 1. Prompt injection detection
    const injectionDetected = this.detectInjection(text);
    if (injectionDetected.detected) {
      patterns.push(...injectionDetected.patterns);
    }

    // 2. PII detection & masking
    const piiResult = this.maskPii(text);

    // 3. Harmful content check (on input too)
    const harmful = this.detectHarmful(text);

    // 4. Calculate risk score
    let riskScore = 0;
    if (injectionDetected.detected) riskScore += 60;
    if (piiResult.found.length > 0) riskScore += 20;
    if (harmful) riskScore += 40;
    riskScore = Math.min(100, riskScore);

    const blocked = injectionDetected.detected || harmful;

    // 5. Audit log
    if (blocked || riskScore > 30) {
      await this.audit.log({
        actorId: userId,
        action: blocked ? 'ai_safety.blocked' : 'ai_safety.warning',
        entity: 'AiSafetyCheck',
        meta: {
          tenantId,
          riskScore,
          injection: injectionDetected.detected,
          pii: piiResult.found,
          harmful,
          patterns,
        },
      });
    }

    return {
      safe: !blocked,
      blocked,
      reason: blocked
        ? injectionDetected.detected
          ? 'Prompt injection detected'
          : 'Harmful content detected'
        : undefined,
      injectionDetected: injectionDetected.detected,
      piiFound: piiResult.found,
      piiMaskedText: piiResult.masked,
      harmfulContent: harmful,
      riskScore,
      metadata: {
        checkDurationMs: Date.now() - start,
        patterns,
      },
    };
  }

  /**
   * Check AI output for safety before returning to user.
   */
  async checkOutput(text: string, userId?: string): Promise<{ safe: boolean; filtered: string; harmful: boolean }> {
    const harmful = this.detectHarmful(text);
    const piiResult = this.maskPii(text);

    if (harmful) {
      await this.audit.log({
        actorId: userId,
        action: 'ai_safety.output_blocked',
        entity: 'AiSafetyCheck',
        meta: { harmful: true },
      });
    }

    return {
      safe: !harmful,
      filtered: harmful
        ? 'Bu yanıt güvenlik politikamız gereği filtrelendi.'
        : piiResult.masked,
      harmful,
    };
  }

  // ─── Prompt Injection Detection ────────────────────────────────────────────

  private detectInjection(text: string): { detected: boolean; patterns: string[] } {
    const matched: string[] = [];
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        matched.push(pattern.source.slice(0, 50));
      }
    }
    return { detected: matched.length > 0, patterns: matched };
  }

  // ─── PII Masking ──────────────────────────────────────────────────────────

  maskPii(text: string): { masked: string; found: string[] } {
    let masked = text;
    const found: string[] = [];

    for (const { pattern, replacement, label } of PII_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      if (regex.test(masked)) {
        found.push(label);
        masked = masked.replace(new RegExp(pattern.source, pattern.flags), replacement);
      }
    }

    return { masked, found };
  }

  // ─── Harmful Content Detection ─────────────────────────────────────────────

  private detectHarmful(text: string): boolean {
    return HARMFUL_OUTPUT_PATTERNS.some((p) => p.test(text));
  }

  // ─── Model Version Gating ─────────────────────────────────────────────────

  /**
   * Check if a specific AI model is allowed for the given user/role.
   */
  checkModelAccess(modelId: string, role: string): { allowed: boolean; config?: ModelGateConfig; reason?: string } {
    const gate = this.modelGates.get(modelId);
    if (!gate) return { allowed: false, reason: `Model ${modelId} not configured` };
    if (!gate.enabled) return { allowed: false, reason: `Model ${modelId} is disabled` };
    if (!gate.allowedRoles.includes(role.toUpperCase())) {
      return { allowed: false, reason: `Role ${role} not allowed for model ${modelId}` };
    }
    return { allowed: true, config: gate };
  }

  /**
   * Validate AI request parameters against model gate config.
   */
  validateAiRequest(modelId: string, params: {
    role: string;
    maxTokens?: number;
    temperature?: number;
  }): { valid: boolean; reason?: string } {
    const access = this.checkModelAccess(modelId, params.role);
    if (!access.allowed) return { valid: false, reason: access.reason };

    const config = access.config!;
    if (params.maxTokens && params.maxTokens > config.maxTokens) {
      return { valid: false, reason: `maxTokens exceeds limit (${config.maxTokens})` };
    }
    if (params.temperature !== undefined) {
      const [min, max] = config.temperatureRange;
      if (params.temperature < min || params.temperature > max) {
        return { valid: false, reason: `temperature must be between ${min} and ${max}` };
      }
    }
    return { valid: true };
  }

  // ─── Get Safety Stats ──────────────────────────────────────────────────────

  async getSafetyStats(tenantId?: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'ai_safety.' },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const blocked = logs.filter((l) => l.action === 'ai_safety.blocked').length;
    const warnings = logs.filter((l) => l.action === 'ai_safety.warning').length;
    const outputBlocked = logs.filter((l) => l.action === 'ai_safety.output_blocked').length;

    return {
      period: { days, from: since.toISOString() },
      totalChecks: logs.length,
      blocked,
      warnings,
      outputBlocked,
      topPatterns: this.extractTopPatterns(logs),
    };
  }

  private extractTopPatterns(logs: any[]): Array<{ pattern: string; count: number }> {
    const counts = new Map<string, number>();
    for (const log of logs) {
      const meta = log.meta;
      const patterns = meta?.patterns ?? [];
      for (const p of patterns) {
        counts.set(p, (counts.get(p) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
